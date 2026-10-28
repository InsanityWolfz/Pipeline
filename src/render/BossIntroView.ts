import type { GameObjects, Scene } from 'phaser';
import { BlendModes } from 'phaser';
import { INTRO_LOOK, type BossIntroLook } from '../data/art/bossIntro';
import { DEPTHS } from '../data/assets';
import { enemyDef } from '../data/enemies';
import { PARTICLE_BUDGET, type ParticleBurst } from '../data/juice';
import type { Quality } from '../data/settings';
import { arenaOfPost } from '../sim/arenaWait';
import type { EnemyState } from '../sim/enemies';
import { forgeDefOf } from '../sim/forgewrightParts';
import type { SimState } from '../sim/state';
import { beatsOf, cardBox, cardCurve, introBeat, introFrame, introNow, type IntroBeat } from './bossIntro';
import { bossBarBottom } from './bossLook';
import { colorOf } from './color';
import { settings } from './flow/settingsStore';
import type { JuiceView } from './JuiceView';
import type { SoundView } from './SoundView';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

// 080: a boss intro's show beyond the boss's own poses (enemyArt): the name card on today's stone tablet (UI camera, so
// the shake never moves it), the beat's sound and the game's only shake (JuiceView), the stir's, rise's and beat's
// bursts in the boss's family colours (under PARTICLE_BUDGET, by Graphics quality), a ground ring on the beat, the
// Warden's cracks and the Conductor's bolt. Every beat is placed by intro ticks, so it fits the sim's window.

/** What `ui().bossIntro` reports: the boss in its intro on screen, its beat, the card and the pan; null with none. */
export type BossIntroShown = {
  boss: string;
  short: boolean;
  ticks: number;
  beat: IntroBeat;
  frame: number;
  card: { shown: boolean; alpha: number; scale: number; name: string; arena: string; box: { x: number; y: number; w: number; h: number } | null };
  pan: { active: boolean; dx: number; dy: number };
} | null;

/** A drawn effect of the beat: a ground ring, the Warden's cracks, the Conductor's bolt; ms on the tween clock. */
interface Mark {
  kind: 'ring' | 'cracks' | 'bolt';
  x: number;
  y: number;
  age: number;
  life: number;
}

const MARK_MS = { ring: 600, cracks: 1000, bolt: 180 } as const;

export class BossIntroView {
  private readonly scene: Scene;
  private readonly card: GameObjects.Container;
  private readonly back: GameObjects.Graphics;
  private readonly name: TextLine;
  private readonly arena: TextLine;
  private readonly marks: GameObjects.Graphics;
  private readonly bolt: GameObjects.Graphics;
  /** Each boss's intro ticks as last drawn, so a beat fires once as its tick is crossed (a slow frame steps several). */
  private readonly lastTicks = new Map<number, number>();
  private live: Mark[] = [];
  shown: BossIntroShown = null;

  private readonly juice: () => JuiceView | undefined;
  private readonly sound: () => SoundView | undefined;
  private readonly quality: () => Quality;

  constructor(scene: Scene, juice: () => JuiceView | undefined, sound: () => SoundView | undefined, quality: () => Quality) {
    this.scene = scene;
    this.juice = juice;
    this.sound = sound;
    this.quality = quality;
    this.back = scene.add.graphics().setScrollFactor(0);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud + 3, false, 'title');
    this.arena = new TextLine(scene, 0, 0, DEPTHS.hud + 3, false, 'display');
    this.card = scene.add.container(0, 0, [this.back, this.name.obj, this.arena.obj]).setScrollFactor(0).setDepth(DEPTHS.hud + 2).setVisible(false);
    this.marks = scene.add.graphics().setDepth(DEPTHS.groundFx);
    this.bolt = scene.add.graphics().setDepth(DEPTHS.worldUi - 2).setBlendMode(BlendModes.ADD);
  }

  update(sim: SimState, shown: string, deltaMs: number, pan: { active: boolean; dx: number; dy: number }): void {
    const now = introNow(sim, shown);
    this.stepMarks(deltaMs * this.scene.tweens.timeScale);
    if (!now) {
      this.lastTicks.clear();
      this.shown = null;
      this.card.setVisible(false);
      return;
    }
    const { boss, short } = now;
    const look = INTRO_LOOK.bosses[boss.enemyId];
    // A restarted intro counts from its start again.
    const last = this.lastTicks.get(boss.id) ?? 0;
    const prev = last > boss.modeTicks ? 0 : last;
    if (look) this.fire(boss, look, short, prev, boss.modeTicks);
    this.lastTicks.set(boss.id, boss.modeTicks);
    const b = introBeat(boss.modeTicks, short);
    this.shown = { boss: boss.enemyId, short, ticks: boss.modeTicks, beat: b.beat, frame: introFrame(b.beat, b.at, b.length, short), card: this.drawCard(boss, short), pan };
  }

  /** The beats crossed since the last frame: the stir's tremor, each rise pose's burst, and the beat's blow. */
  private fire(boss: EnemyState, look: BossIntroLook, short: boolean, prev: number, ticks: number): void {
    const B = beatsOf(short);
    const crossed = (t: number): boolean => prev < t + 1 && ticks >= t + 1;
    if (!short && crossed(B.stir)) this.burst(look.stir, boss.x, boss.y);
    // Each rise pose arriving (the short intro's last half of them).
    const cur = introBeat(ticks, short);
    const was = prev > 0 ? introBeat(prev, short) : null;
    const frame = (b: ReturnType<typeof introBeat>) => introFrame(b.beat, b.at, b.length, short);
    if (cur.beat === 'rise' && (was?.beat !== 'rise' || frame(was) !== frame(cur))) this.burst(look.rise, boss.x, boss.y);
    if (crossed(B.beat)) {
      const flip = boss.facing === 'left' ? -1 : 1;
      const side = boss.facing === 'left' || boss.facing === 'right';
      const x = boss.x + (side ? look.beatAt[0] * flip : 0);
      const y = boss.y + look.beatAt[1] + (boss.facing === 'down' ? look.beatAt[0] * 0.4 : 0);
      this.burst(short ? { ...look.beat, count: Math.round(look.beat.count * 0.6) } : look.beat, x, y);
      this.sound()?.play(look.sound);
      this.juice()?.introShake(short);
      this.live.push({ kind: 'ring', x, y, age: 0, life: MARK_MS.ring });
      if (boss.enemyId === 'pylon-warden') this.live.push({ kind: 'cracks', x, y, age: 0, life: MARK_MS.cracks });
      if (boss.enemyId === 'conductor') this.live.push({ kind: 'bolt', x: boss.x, y: boss.y, age: 0, life: MARK_MS.bolt });
    }
  }

  /** A burst at the tier's count (074), thinned to what PARTICLE_BUDGET has left. */
  private burst(b: ParticleBurst, x: number, y: number): void {
    const juice = this.juice();
    if (!juice) return;
    const q = this.quality();
    const room = PARTICLE_BUDGET[q] - juice.particles.count;
    const count = Math.max(0, Math.min(room, Math.round(b.count * INTRO_LOOK.quality[q])));
    if (count > 0) juice.particles.emit({ ...b, count }, x, y);
  }

  /** The beat's marks: an expanding ring on the ground, the Warden's cracks fading over a second, the Conductor's bolt. */
  private stepMarks(dt: number): void {
    this.marks.clear();
    this.bolt.clear();
    this.live = this.live.filter((m) => (m.age += dt) < m.life);
    const flashes = settings().flashes;
    for (const m of this.live) {
      const k = m.age / m.life;
      if (m.kind === 'ring') {
        this.marks.lineStyle(2, colorOf('rock-pale'), 0.6 * (1 - k)).strokeEllipse(m.x, m.y, 24 + 72 * k, (24 + 72 * k) * 0.45);
      } else if (m.kind === 'cracks') {
        this.marks.lineStyle(1.5, colorOf('ink'), 0.7 * (1 - k));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          const r0 = 8;
          const r1 = 30 + (i % 2) * 10;
          this.marks.lineBetween(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0 * 0.5, m.x + Math.cos(a + 0.15) * r1, m.y + Math.sin(a + 0.15) * r1 * 0.5);
        }
      } else {
        // A violet-white bolt onto its staff from above; with Flashes off, no white core and a dim violet (042.10).
        const pts = [0, -260, 8, -200, -6, -160, 6, -120, 0, -96];
        const alpha = flashes ? 1 - k : INTRO_LOOK.dimGlow;
        this.bolt.lineStyle(4, colorOf('storm-glow'), alpha);
        this.bolt.beginPath();
        for (let i = 0; i < pts.length; i += 2) this.bolt[i === 0 ? 'moveTo' : 'lineTo'](m.x + (pts[i] ?? 0), m.y + (pts[i + 1] ?? 0));
        this.bolt.strokePath();
        if (flashes) {
          this.bolt.lineStyle(1.5, colorOf('snow'), 1 - k);
          this.bolt.strokePath();
        }
      }
    }
  }

  /** The name card: the boss's name (Cinzel) over a brass rule and its arena's name, centred under the boss bar. */
  private drawCard(boss: EnemyState, short: boolean): NonNullable<BossIntroShown>['card'] {
    const name = enemyDef(boss.enemyId).name;
    const arena = arenaOfPost(boss)?.name ?? '';
    const { alpha, scale } = cardCurve(boss.modeTicks, short);
    if (alpha <= 0) {
      this.card.setVisible(false);
      return { shown: false, alpha: 0, scale, name, arena, box: null };
    }
    const C = INTRO_LOOK.card;
    this.name.set(name);
    this.arena.set(arena);
    const linesH = this.name.lineHeight + C.ruleGap * 2 + 1 + this.arena.lineHeight;
    const box = cardBox(this.name.width, this.arena.width, linesH, bossBarBottom(forgeDefOf(boss) !== null));
    // Drawn about the card's centre, so it scales in place.
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    this.back.clear();
    drawTablet(this.back, box.x - cx, box.y - cy, box.w, box.h);
    const top = box.y - cy + C.padY;
    this.name.moveTo(Math.round(-this.name.width / 2), top);
    const ruleY = top + this.name.lineHeight + C.ruleGap;
    const ruleW = Math.round(box.w * C.ruleW);
    this.back.fillStyle(colorOf(C.rule), 1).fillRect(-Math.round(ruleW / 2), ruleY, ruleW, 1);
    this.arena.moveTo(Math.round(-this.arena.width / 2), ruleY + 1 + C.ruleGap);
    this.card.setPosition(cx, cy).setScale(scale).setAlpha(alpha).setVisible(true);
    return { shown: true, alpha, scale, name, arena, box };
  }
}
