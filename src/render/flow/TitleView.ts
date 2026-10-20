import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, TITLE_SCENE_KEY } from '../../data/assets';
import { FLOW_ROWS } from '../../data/flowLayout';
import { TITLE_ROWS, TITLE_SCREEN, type TitleRow } from '../../data/titleScreen';
import { colorOf } from '../color';
import { TextLine } from '../textLine';
import { MenuColumn, type MenuRowShown } from './MenuColumn';
import { paintTitle } from './titlePainter';

// The title screen (042): the painted scene, the intake pipe's glow breathing, ley motes drifting slowly across it,
// the "Pipeline" logo in the display font with a soft cyan glow, and the menu: New game, Continue, Settings, Quit.

/** What the Continue row shows: whether it can be used, and the line under it (or none). */
export interface ContinueShown {
  usable: boolean;
  line: string | null;
}

export interface TitleUi {
  rows: MenuRowShown[];
  logo: string;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: number;
}

const between = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class TitleView {
  private readonly scene: Scene;
  private readonly back: GameObjects.Image;
  private readonly pipe: GameObjects.Graphics;
  private readonly motes: GameObjects.Graphics;
  private readonly glow: GameObjects.Graphics;
  private readonly logo: TextLine;
  private readonly menu: MenuColumn;
  private readonly moteList: Mote[] = [];
  private elapsed = 0;
  private visible = true;

  constructor(scene: Scene, screenScale: number) {
    this.scene = scene;
    const T = TITLE_SCREEN;
    const s = paintTitle(scene, screenScale);
    this.back = scene.add.image(0, 0, TITLE_SCENE_KEY).setOrigin(0).setScale(1 / s).setScrollFactor(0).setDepth(DEPTHS.menu - 10);
    this.pipe = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 9);
    const P = T.pipeGlow;
    for (let i = P.rings; i >= 1; i--) this.pipe.fillStyle(colorOf(P.color), 1 / P.rings).fillEllipse(P.x, P.y, (P.rx * 2 * i) / P.rings, (P.ry * 2 * i) / P.rings);
    this.motes = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 8);
    const M = T.motes;
    for (let i = 0; i < M.count; i++)
      this.moteList.push({ x: Math.random() * 640, y: 40 + Math.random() * 300, vx: between(M.speed), vy: -between(M.rise), r: between(M.size), alpha: between(M.alpha), phase: Math.random() * Math.PI * 2 });
    const L = T.logo;
    this.glow = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.menu - 7);
    for (let i = L.glow.rings; i >= 1; i--) this.glow.fillStyle(colorOf(L.glow.color), L.glow.alpha).fillEllipse(L.cx, L.y + L.glow.dy, (L.glow.rx * 2 * i) / L.glow.rings, (L.glow.ry * 2 * i) / L.glow.rings);
    this.logo = new TextLine(scene, 0, L.y, DEPTHS.menu - 6, false, 'title', L.scale / 2).set(L.text);
    this.logo.moveTo(Math.round(L.cx - this.logo.width / 2), L.y);
    this.menu = new MenuColumn(scene, T.menu.x, T.menu.y, FLOW_ROWS);
    this.setContinue({ usable: false, line: null });
  }

  /** Shows the Continue row as the save allows. */
  setContinue(c: ContinueShown): void {
    this.menu.set(
      TITLE_ROWS.map((id) => ({
        id,
        label: TITLE_SCREEN.rows[id],
        ...(id === 'continue' ? { usable: c.usable, ...(c.line ? { sub: c.line } : {}) } : {}),
      })),
    );
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const o of [this.back, this.pipe, this.motes, this.glow]) o.setVisible(visible);
    this.logo.setVisible(visible);
    this.menu.setVisible(visible);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** The pipe's glow breathes; the motes drift and twinkle. Real time: the title isn't the sim. */
  update(deltaMs: number): void {
    if (!this.visible) return;
    this.elapsed += deltaMs;
    const P = TITLE_SCREEN.pipeGlow;
    const breath = 0.5 - 0.5 * Math.cos((this.elapsed / P.periodMs) * Math.PI * 2);
    this.pipe.setAlpha(P.alpha[0] + (P.alpha[1] - P.alpha[0]) * breath);
    const M = TITLE_SCREEN.motes;
    const dt = deltaMs / 1000;
    this.motes.clear();
    for (const m of this.moteList) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x > 644) m.x = -4;
      if (m.y < 20) m.y = 340;
      const twinkle = 0.6 + 0.4 * Math.sin(m.phase + (this.elapsed / M.twinkleMs) * Math.PI * 2);
      this.motes.fillStyle(colorOf(M.color), m.alpha * twinkle).fillCircle(m.x, m.y, m.r);
    }
  }

  pointAt(x: number, y: number): void {
    this.menu.pointAt(x, y);
  }

  /** The row a click picks, or null. */
  click(x: number, y: number): TitleRow | null {
    const hit = this.menu.click(x, y);
    return hit ? (TITLE_ROWS.find((r) => r === hit.id) ?? null) : null;
  }

  get ui(): TitleUi {
    return { rows: this.menu.shown, logo: TITLE_SCREEN.logo.text };
  }
}
