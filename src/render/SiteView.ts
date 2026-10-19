import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS } from '../data/assets';
import { CLAIM_TICKS } from '../data/claims';
import { TILE_SIZE } from '../data/config';
import { BENCH_FLARE_MS, FIXTURE_SPRITES, ORB_SPRITES, PYLON_SPRITES } from '../data/foundryAssets';
import { HARVEST_BAR } from '../data/hudLayout';
import { FOUNDRY_ROOM } from '../data/rooms';
import { isClaimed } from '../sim/claims';
import { fixtureDef } from '../sim/fixtures';
import { roomById, type SimState } from '../sim/state';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { addVector, addVectorSprite } from './vector/textures';
import { drawBolts } from './hollowsEnemyArt';
import { enemyDef } from '../data/enemies';

// The claimable sites and what claiming brings (009): the room's pylons (032: several; dormant,
// activating, or glowing once claimed) with the claim hold's bar, the foundry's
// fixtures (with 010's bench), and Wisp orbs and (035) Sniper bolts in flight.
/** The frame a fixture shows first. */
function fixtureFrame(kind: string): string {
  if (kind === 'stash') return FIXTURE_SPRITES.stash;
  const anim = kind === 'waystone' ? FIXTURE_SPRITES.waystone : kind === 'port' ? FIXTURE_SPRITES.port : FIXTURE_SPRITES.bench;
  return animFrames(anim)[0] ?? '';
}

export class SiteView {
  private readonly scene: Scene;
  /** One sprite per pylon in the room on screen, by site (032: a room can hold several). */
  private readonly pylons = new Map<string, GameObjects.Sprite>();
  private readonly bar: GameObjects.Graphics;
  /** Sniper bolts in flight (035), redrawn each frame. */
  private readonly bolts: GameObjects.Graphics;
  private readonly fixtures = new Map<string, GameObjects.Sprite>();
  private readonly orbs = new Map<number, { orb: GameObjects.Image; shadow: GameObjects.Image }>();
  /** Scene time until which the bench's lens flares. */
  private flareUntil = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    registerAnim(scene, PYLON_SPRITES.activating);
    registerAnim(scene, PYLON_SPRITES.active);
    registerAnim(scene, FIXTURE_SPRITES.waystone);
    this.bar = scene.add.graphics().setDepth(DEPTHS.worldUi);
    this.bolts = scene.add.graphics().setDepth(DEPTHS.motes - 1);
  }

  /** Pieces were identified since the last draw: the bench flares. */
  identified(): void {
    this.flareUntil = this.scene.time.now + BENCH_FLARE_MS;
  }

  update(sim: SimState, shown: string): void {
    this.drawPylon(sim, shown);
    this.drawFixtures(sim, shown === FOUNDRY_ROOM);
    this.drawOrbs(sim, shown);
    drawBolts(this.bolts, sim.orbs, shown);
  }

  private drawPylon(sim: SimState, shown: string): void {
    const here = roomById(shown).pylons ?? [];
    this.bar.clear();
    for (const [site, sprite] of this.pylons) sprite.setVisible(here.some((p) => p.site === site));
    for (const at of here) {
      let sprite = this.pylons.get(at.site);
      if (!sprite) {
        sprite = addVectorSprite(this.scene, 0, 0, PYLON_SPRITES.off).setOrigin(0.5, 1);
        this.pylons.set(at.site, sprite);
      }
      const x = (at.tx + 0.5) * TILE_SIZE;
      const bottom = (at.ty + 1) * TILE_SIZE;
      sprite.setVisible(true).setPosition(x, bottom).setDepth(bottom);
      const anim = sprite.anims.currentAnim?.key;
      if (!isClaimed(sim, at.site)) {
        if (anim) sprite.stop();
        sprite.setFrame(PYLON_SPRITES.off);
      } else if (sim.activatePulse > 0 && sim.claims[sim.claims.length - 1] === at.site) {
        if (anim !== PYLON_SPRITES.activating.key) sprite.play(PYLON_SPRITES.activating.key);
      } else if (anim !== PYLON_SPRITES.active.key) sprite.play(PYLON_SPRITES.active.key);
      const hold = sim.claimHold;
      if (!hold || hold.site !== at.site) continue;
      const { w, h, gap, border } = HARVEST_BAR;
      const left = Math.round(x - w / 2);
      const top = Math.round(bottom - sprite.displayHeight - gap - h);
      this.bar.fillStyle(colorOf(HARVEST_BAR.back)).fillRect(left - border, top - border, w + 2 * border, h + 2 * border);
      this.bar.fillStyle(colorOf(HARVEST_BAR.color)).fillRect(left, top, Math.round((w * hold.progress) / CLAIM_TICKS), h);
    }
  }

  private drawFixtures(sim: SimState, shown: boolean): void {
    for (const f of shown ? sim.fixtures : []) {
      const def = fixtureDef(f.id);
      let sprite = this.fixtures.get(f.id);
      if (!sprite) {
        const x = (def.tx + 0.5) * TILE_SIZE;
        const bottom = (def.ty + 1) * TILE_SIZE;
        sprite = addVectorSprite(this.scene, x, bottom, fixtureFrame(def.kind)).setOrigin(0.5, 1).setDepth(bottom);
        if (def.kind === 'waystone') sprite.play(FIXTURE_SPRITES.waystone.key);
        this.fixtures.set(f.id, sprite);
      }
      sprite.setVisible(true);
      if (def.kind === 'port') sprite.setFrame(animFrames(FIXTURE_SPRITES.port)[f.item ? 1 : 0] ?? '');
      if (def.kind === 'bench') sprite.setFrame(animFrames(FIXTURE_SPRITES.bench)[this.scene.time.now < this.flareUntil ? 1 : 0] ?? '');
    }
    if (!shown) for (const s of this.fixtures.values()) s.setVisible(false);
  }

  private drawOrbs(sim: SimState, shown: string): void {
    const live = new Set<number>();
    for (const o of sim.orbs) {
      if (o.roomId !== shown || enemyDef(o.enemyId).kind !== 'caster') continue;
      live.add(o.id);
      let d = this.orbs.get(o.id);
      if (!d) {
        d = {
          shadow: addVector(this.scene, 0, 0, ORB_SPRITES.shadow).setDepth(DEPTHS.groundFx),
          orb: addVector(this.scene, 0, 0, ORB_SPRITES.orb),
        };
        this.orbs.set(o.id, d);
      }
      d.shadow.setPosition(Math.round(o.x), Math.round(o.y));
      d.orb.setPosition(Math.round(o.x), Math.round(o.y - ORB_SPRITES.lift)).setDepth(o.y + ORB_SPRITES.lift);
    }
    for (const [id, d] of this.orbs) {
      if (live.has(id)) continue;
      d.orb.destroy();
      d.shadow.destroy();
      this.orbs.delete(id);
    }
  }
}
