import { BlendModes, TintModes, type GameObjects, type Scene } from 'phaser';
import { animFrames, ENEMY_ANIMS } from '../data/assets';
import { BULWARK_RIG, BULWARK_SEAM } from '../data/art/bulwark';
import { familyOf, type EnemyFamily } from '../data/art/enemyFamilies';
import { ENEMY_MOTION } from '../data/art/enemyMotion';
import { CORE, WARDEN_RIG } from '../data/art/warden';
import { CHAMPIONS } from '../data/champions';
import { enemyDef, type ForgewrightDef } from '../data/enemies';
import { FORGE_SPRITES } from '../data/forgewrightAssets';
import { bellowsPoint } from '../sim/forgewrightParts';
import type { EnemyState } from '../sim/enemies';
import { bellowsLook } from './ForgewrightView';
import { DEATH_MOTES } from '../data/juice';
import { LANDMARK_LOOK, LANDMARK_SPRITES } from '../data/landmarkAssets';
import type { DeathEvent } from '../sim/events';
import { colorOf } from './color';
import { deathMoteCount, dissolveAt, forgeShares, moteWaves, waveCount, type MoteRoom } from './deathMotes';
import { settings } from './flow/settingsStore';
import type { Mote, Particles } from './Particles';
import { addVector, addVectorSprite, textureScale } from './vector/textures';

// 076: deaths dissolve into ley motes. The rig's struck `death` pose shows for a beat, then the body narrows,
// stretches upward and fades while an additive copy in the family's first mote colour rises and fades with it, and
// the family's motes leave the body in three waves, thinned to the tier's caps and the particle budget. Runs on the
// tween clock (as the particles do), so a review shot can slow it. A KO clears them with the room. The Forgewright's
// bellows dissolve with it.

const D = ENEMY_MOTION.dissolve;

/** A boss's light that fades with its body: the Warden's chest core, the Bulwark's back seam. Rig px from the feet. */
const HALOS: Readonly<Record<string, { at: readonly [number, number]; side: number; r: number; color: string; alpha: number; scale: number }>> = {
  [CORE.enemyId]: { at: CORE.at, side: CORE.side, r: CORE.halo, color: CORE.haloColor, alpha: CORE.peak, scale: WARDEN_RIG.scale },
  bulwark: { at: BULWARK_SEAM.at, side: BULWARK_SEAM.side, r: BULWARK_SEAM.halo, color: BULWARK_SEAM.haloColor, alpha: BULWARK_SEAM.peak, scale: BULWARK_RIG.scale },
};

interface Dissolve {
  death: DeathEvent;
  /** Where its motes rise from: the hurtbox (a bellows' own box), and whether it dissolves at a boss's pace. */
  box: { w: number; h: number; offsetY: number };
  boss: boolean;
  /** A boss's core or seam halo, by enemy id. */
  halo?: GameObjects.Graphics;
  haloId?: string;
  family: EnemyFamily;
  /** Champion scale (032), 1 otherwise. */
  k: number;
  body: GameObjects.Sprite;
  tint: GameObjects.Sprite;
  base: number;
  glow?: GameObjects.Image;
  ms: number;
  /** The motes planned for each wave, and the next wave to throw. */
  waves: number[];
  next: number;
}

export class DissolveView {
  private readonly scene: Scene;
  private readonly particles: () => Particles | undefined;
  /** The enemy as last drawn (EnemyView's), for what a death's event doesn't carry: the Forgewright's bellows. */
  private readonly lastOf: (id: number) => EnemyState | undefined;
  private readonly live: Dissolve[] = [];

  constructor(scene: Scene, particles: () => Particles | undefined, lastOf: (id: number) => EnemyState | undefined) {
    this.scene = scene;
    this.particles = particles;
    this.lastOf = lastOf;
  }

  /** Dissolves running now, for the test hook. */
  get count(): number {
    return this.live.length;
  }

  /** A death: its struck pose at its feet, facing as it fell. */
  start(death: DeathEvent): void {
    const def = enemyDef(death.enemyId);
    const anim = ENEMY_ANIMS[def.anims]?.[`death-${death.facing === 'up' || death.facing === 'down' ? death.facing : 'side'}`];
    if (!anim) return;
    const frame = animFrames(anim)[0] ?? '';
    const k = death.champion ? CHAMPIONS.scale : 1;
    const bottom = death.y + (def.feetBox.h * k) / 2;
    const flip = death.facing === 'left';
    const body = addVectorSprite(this.scene, death.x, bottom, frame).setDepth(bottom).setFlipX(flip);
    const base = body.scaleX * k;
    body.setScale(base);
    const family = familyOf(def.id);
    const tint = addVectorSprite(this.scene, death.x, bottom, frame).setDepth(bottom + 0.001).setFlipX(flip).setScale(base).setBlendMode(BlendModes.ADD).setTint(colorOf(family.motes[0])).setTintMode(TintModes.FILL).setAlpha(0);
    const total = deathMoteCount(def.id, death.champion === true, this.room());
    // The Forgewright's standing bellows take their quarters out of its one capped total.
    const standing = def.kind === 'forgewright' ? (this.lastOf(death.id)?.bellows.filter((b) => b.health > 0) ?? []) : [];
    const shares = forgeShares(total, standing.length);
    const d: Dissolve = { death, box: def.hurtbox, boss: def.boss, family, k, body, tint, base, ms: 0, waves: moteWaves(shares.body, D.waves), next: 0 };
    if (death.champion) {
      const G = CHAMPIONS.glow;
      d.glow = addVector(this.scene, death.x, death.y + def.hurtbox.offsetY * k, LANDMARK_SPRITES.championGlow).setTint(colorOf(G.color)).setBlendMode(BlendModes.ADD).setDepth(bottom - 0.001);
      d.glow.setScale((G.radius * CHAMPIONS.scale) / LANDMARK_LOOK.championGlowPx / textureScale()).setAlpha(G.alpha[1]);
    }
    if (HALOS[def.id] && death.facing !== 'up') {
      d.halo = this.scene.add.graphics().setBlendMode(BlendModes.ADD).setDepth(bottom + 0.002);
      d.haloId = def.id;
    }
    this.live.push(d);
    this.draw(d);
    if (def.kind === 'forgewright') this.bellows(death, def, shares.bellows);
  }

  /** The Forgewright's bellows, if standing, dissolve with it, each with its share (a quarter) of its motes. */
  private bellows(death: DeathEvent, def: ForgewrightDef, shares: readonly number[]): void {
    const e = this.lastOf(death.id);
    if (!e) return;
    const family = familyOf(def.id);
    let n = 0;
    e.bellows.forEach((b, i) => {
      if (b.health <= 0) return;
      const share = shares[n] ?? 0;
      n += 1;
      const at = bellowsPoint(e, def, i);
      const frame = FORGE_SPRITES.bellows[bellowsLook(b.patch)];
      const body = addVectorSprite(this.scene, at.x, at.y, frame).setDepth(at.y).setFlipX(i === 0);
      const tint = addVectorSprite(this.scene, at.x, at.y, frame).setDepth(at.y + 0.001).setFlipX(i === 0).setBlendMode(BlendModes.ADD).setTint(colorOf(family.motes[0])).setTintMode(TintModes.FILL).setAlpha(0);
      this.live.push({ death: { ...death, x: at.x, y: at.y }, box: def.bellows.hurtbox, boss: true, family, k: 1, body, tint, base: body.scaleX, ms: 0, waves: moteWaves(share, D.waves), next: 0 });
    });
  }

  /** What is flying now, for thinning a death's motes. */
  private room(): MoteRoom {
    const p = this.particles();
    return { quality: settings().quality, liveMotes: p?.deathMotes ?? 0, liveParticles: p?.count ?? 0, liveWeather: p?.ledger.live.weather ?? 0 };
  }

  /** The tween-clock ms the last finished dissolve ran (-1 before any): a test reads the dissolve's length on the clock it runs on. */
  lastDoneMs = -1;

  /** Moves every dissolve on by `deltaMs` of the tween clock. */
  update(deltaMs: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const d = this.live[i];
      if (!d) continue;
      d.ms += deltaMs;
      if (!this.draw(d)) {
        this.lastDoneMs = d.ms;
        this.destroy(d);
        this.live.splice(i, 1);
      }
    }
  }

  /** Clears them all, as a KO clears the room. */
  clear(): void {
    for (const d of this.live) this.destroy(d);
    this.live.length = 0;
  }

  /** Draws a dissolve for its time; false once it's done. */
  private draw(d: Dissolve): boolean {
    const boss = d.boss;
    const look = dissolveAt(d.ms, boss, settings().flashes);
    // Its waves are thrown on time, and all of them even if a slow frame jumps past its end.
    const struck = boss ? D.bossStruckMs : D.struckMs;
    const fade = boss ? D.bossFadeMs : D.fadeMs;
    while (d.next < d.waves.length && d.ms >= struck + (fade * d.next) / D.waves) {
      this.throwWave(d, d.waves[d.next] ?? 0);
      d.next += 1;
    }
    if (look.phase === 'done') return false;
    d.body.setScale(d.base * look.sx, d.base * look.sy).setAlpha(look.alpha);
    d.tint.setScale(d.base * look.sx, d.base * look.sy).setAlpha(look.tint);
    d.glow?.setAlpha(CHAMPIONS.glow.alpha[1] * look.alpha);
    if (d.halo) this.drawHalo(d, look.alpha);
    return true;
  }

  /** One wave of the family's motes from random points of the hurtbox, thinned to what the caps leave now. */
  private throwWave(d: Dissolve, planned: number): void {
    const p = this.particles();
    if (!p || planned <= 0) return;
    const room = this.room();
    const n = waveCount(planned, room);
    const hb = d.box;
    const motes: Mote[] = Array.from({ length: n }, () => ({
      x: d.death.x + (Math.random() - 0.5) * hb.w * d.k,
      y: d.death.y + (hb.offsetY + (Math.random() - 0.5) * hb.h) * d.k,
      color: d.family.motes[Math.floor(Math.random() * d.family.motes.length)] ?? d.family.motes[0],
    }));
    const boss = d.boss;
    p.emitMotes(motes, {
      speed: DEATH_MOTES.speed,
      gravity: DEATH_MOTES.gravity,
      lifeMs: boss ? DEATH_MOTES.bossLifeMs : DEATH_MOTES.lifeMs,
      size: boss ? DEATH_MOTES.bossSize : DEATH_MOTES.size,
      add: DEATH_MOTES.additive[room.quality],
      depth: d.body.depth + 1,
    });
  }

  /** The boss's core or seam light, fading with its body. */
  private drawHalo(d: Dissolve, alpha: number): void {
    const h = d.haloId ? HALOS[d.haloId] : undefined;
    const g = d.halo;
    if (!h || !g) return;
    const side = d.death.facing === 'left' || d.death.facing === 'right';
    const flip = d.death.facing === 'left' ? -1 : 1;
    const sx = (d.body.scaleX / d.base) * h.scale * d.k;
    const sy = (d.body.scaleY / d.base) * h.scale * d.k;
    const x = d.body.x + (side ? h.side * flip : h.at[0]) * sx;
    g.clear().fillStyle(colorOf(h.color), h.alpha * alpha).fillCircle(x, d.body.y + h.at[1] * sy, h.r * sx);
  }

  private destroy(d: Dissolve): void {
    d.body.destroy();
    d.tint.destroy();
    d.glow?.destroy();
    d.halo?.destroy();
  }
}
