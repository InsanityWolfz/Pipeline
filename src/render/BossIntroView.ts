import type { GameObjects, Scene } from 'phaser';
import { BlendModes } from 'phaser';
import { INTRO_LOOK, type BossIntroLook } from '../data/art/bossIntro';
import { DEPTHS } from '../data/assets';
import { enemyDef } from '../data/enemies';
import type { ParticleBurst } from '../data/juice';
import { emitWithin } from './bossBurst';
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
import { UI_CAMERA } from './scale';

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
  /** `at` is where the card is placed (view px); `onUiCamera` whether the unshaken UI camera draws it; `uiShaking` whether that camera shakes. */
  card: {
    shown: boolean;
    alpha: number;
    scale: number;
    name: string;
    arena: string;
    box: { x: number; y: number; w: number; h: number } | null;
    at: { x: number; y: number } | null;
    onUiCamera: boolean;
    uiShaking: boolean;
  };
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
      const y = boss.y + look.beatAt[1] + (boss.facing === 'down' ? look.beatAt[0] * INTRO_LOOK.beatDownShare : 0);
      this.burst(short ? { ...look.beat, count: Math.round(look.beat.count * INTRO_LOOK.shortBeatShare) } : look.beat, x, y);
      this.sound()?.play(look.sound);
      this.juice()?.introShake(short);
      const M = INTRO_LOOK.marks;
      this.live.push({ kind: 'ring', x, y, age: 0, life: M.ring.ms });
      if (boss.enemyId === 'pylon-warden') this.live.push({ kind: 'cracks', x, y, age: 0, life: M.cracks.ms });
      if (boss.enemyId === 'conductor') this.live.push({ kind: 'bolt', x: boss.x, y: boss.y, age: 0, life: M.bolt.ms });
    }
  }

  /** A burst at the tier's count (074), thinned to what PARTICLE_BUDGET has left (bossBurst.ts). */
  private burst(b: ParticleBurst, x: number, y: number): void {
    emitWithin(this.juice()?.particles, b, INTRO_LOOK.quality, this.quality(), x, y);
  }

  /** The beat's marks: an expanding ring on the ground, the Warden's cracks fading over a second, the Conductor's bolt. */
  private stepMarks(dt: number): void {
    this.marks.clear();
    this.bolt.clear();
    this.live = this.live.filter((m) => (m.age += dt) < m.life);
    const flashes = settings().flashes;
    const M = INTRO_LOOK.marks;
    for (const m of this.live) {
      const k = m.age / m.life;
      if (m.kind === 'ring') {
        const R = M.ring;
        const w = R.from + R.grow * k;
        this.marks.lineStyle(R.width, colorOf(R.color), R.alpha * (1 - k)).strokeEllipse(m.x, m.y, w, w * R.squash);
      } else if (m.kind === 'cracks') {
        // Hairline cracks in the ground, two jagged segments each, fading over a second.
        const C = M.cracks;
        const [r0 = 0, r1 = 0, r2 = 0] = C.radii;
        const [j1 = 0, j2 = 0] = C.jag;
        const [b1 = 0, b2 = 0] = C.bend;
        this.marks.lineStyle(C.width, colorOf(C.color), C.alpha * (1 - k));
        for (let i = 0; i < C.count; i++) {
          const a = (i / C.count) * Math.PI * 2 + C.turn;
          const pt = (r: number, da: number): [number, number] => [m.x + Math.cos(a + da) * r, m.y + Math.sin(a + da) * r * C.squash];
          const [x0, y0] = pt(r0, 0);
          const [x1, y1] = pt(r1 + (i % 2) * j1, b1);
          const [x2, y2] = pt(r2 + (i % 3) * j2, b2);
          this.marks.lineBetween(x0, y0, x1, y1).lineBetween(x1, y1, x2, y2);
        }
      } else {
        // A violet-white bolt onto its staff from above; with Flashes off, no white core and a dim violet (042.10).
        const B = M.bolt;
        const alpha = flashes ? 1 - k : INTRO_LOOK.dimGlow;
        this.bolt.lineStyle(B.width, colorOf(B.color), alpha);
        this.bolt.beginPath();
        for (let i = 0; i < B.path.length; i += 2) this.bolt[i === 0 ? 'moveTo' : 'lineTo'](m.x + (B.path[i] ?? 0), m.y + (B.path[i + 1] ?? 0));
        this.bolt.strokePath();
        if (flashes) {
          this.bolt.lineStyle(B.core, colorOf(B.coreColor), 1 - k);
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
      return { shown: false, alpha: 0, scale, name, arena, box: null, at: null, ...this.cardCamera() };
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
    return { shown: true, alpha, scale, name, arena, box, at: { x: this.card.x, y: this.card.y }, ...this.cardCamera() };
  }

  /** Which camera draws the card (SceneCameras routes scroll-factor-0 objects off the main one), and whether that one shakes. */
  private cardCamera(): { onUiCamera: boolean; uiShaking: boolean } {
    const cams = this.scene.cameras;
    return { onUiCamera: this.card.cameraFilter === cams.main.id, uiShaking: cams.getCamera(UI_CAMERA)?.shakeEffect.isRunning ?? false };
  }
}
