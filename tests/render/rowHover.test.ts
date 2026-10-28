import { describe, expect, it } from 'vitest';
import type { GameObjects, Scene } from 'phaser';
import { MENU_MOTION } from '../../src/data/hudLook';
import { RowHover } from '../../src/render/menuFeedback';

// 081: a hovered row's rim fades in, and the row the cursor leaves fades out (80 ms) rather than snapping: sweeping
// down or up a menu never leaves a frame with no rim lit. A fake scene runs the tweens by hand.

interface FakeImage {
  frame: string;
  x: number;
  y: number;
  alpha: number;
  visible: boolean;
  depth: number;
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  parentContainer: null;
}

interface FakeTween {
  target: FakeImage;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  onComplete: (() => void) | undefined;
  dead: boolean;
}

function fakeImage(y: number): FakeImage & Record<string, unknown> {
  const o = {
    frame: 'plain',
    x: 0,
    y,
    alpha: 1,
    visible: true,
    depth: 10,
    originX: 0,
    originY: 0,
    scaleX: 1,
    scaleY: 1,
    parentContainer: null,
  } as FakeImage & Record<string, unknown>;
  const self = <T extends unknown[]>(f: (...a: T) => void) => (...a: T) => {
    f(...a);
    return o;
  };
  Object.assign(o, {
    setFrame: self((f: string) => (o.frame = f)),
    setPosition: self((x: number, yy: number) => ((o.x = x), (o.y = yy))),
    setOrigin: self(() => undefined),
    setScale: self(() => undefined),
    setScrollFactor: self(() => undefined),
    setDepth: self((d: number) => (o.depth = d)),
    setVisible: self((v: boolean) => (o.visible = v)),
    setAlpha: self((a: number) => (o.alpha = a)),
  });
  return o;
}

function fakeScene() {
  const tweens: FakeTween[] = [];
  const made: FakeImage[] = [];
  const scene = {
    events: { emit: () => true },
    tweens: {
      add(config: { targets: FakeImage; alpha: number | { from: number; to: number }; duration: number; onComplete?: () => void }) {
        // As Phaser 4.2.1 does: a seek resets a property tween to its start value, which a bare `to` leaves unset (read
        // as 0), so only a named `from` survives the seek RowHover makes.
        const [from, to] = typeof config.alpha === 'number' ? [0, config.alpha] : [config.alpha.from, config.alpha.to];
        const t: FakeTween = { target: config.targets, from, to, duration: config.duration, elapsed: 0, onComplete: config.onComplete, dead: false };
        tweens.push(t);
        return { seek: () => void (t.target.alpha = t.from), stop: () => (t.dead = true) };
      },
      killTweensOf(target: FakeImage) {
        for (const t of tweens) if (t.target === target) t.dead = true;
      },
    },
  };
  /** Runs the live tweens `ms` on. */
  const step = (ms: number) => {
    for (const t of tweens) {
      if (t.dead) continue;
      t.elapsed = Math.min(t.duration, t.elapsed + ms);
      t.target.alpha = t.from + ((t.to - t.from) * t.elapsed) / t.duration;
      if (t.elapsed >= t.duration) {
        t.dead = true;
        t.onComplete?.();
      }
    }
  };
  const overlay = (frame: string) => {
    const o = fakeImage(0);
    o.frame = frame;
    made.push(o);
    return o as unknown as GameObjects.Image;
  };
  return { scene: scene as unknown as Scene, step, made, tweens, overlay };
}

const FRAMES = { plain: 'plain', hover: 'hover', press: 'press' };

/** One frame of a menu: the cursor on row `at`, every row painted in order, the tweens run on a 16 ms frame. */
function frame(h: RowHover, rows: FakeImage[], at: number, step: (ms: number) => void): void {
  h.set(at);
  rows.forEach((r, i) => h.paint(i, r as unknown as GameObjects.Image));
  step(16);
}

/** The overlays lit over row `r` (on it and showing). */
const on = (made: FakeImage[], r: FakeImage) => made.filter((o) => o.visible && o.alpha > 0 && o.y === r.y);

describe('RowHover (081): the rim fades out of the row the cursor leaves', () => {
  for (const [name, order] of [
    ['down', [0, 1, 2, 3]],
    ['up', [3, 2, 1, 0]],
  ] as const) {
    it(`sweeping ${name}, the old row's rim is still lit a frame after the cursor leaves it, and fades out in 80 ms`, () => {
      const { scene, step, made, overlay } = fakeScene();
      const h = new RowHover(scene, FRAMES, overlay);
      const rows = [0, 20, 40, 60].map(fakeImage);
      frame(h, rows, order[0], step);
      for (let k = 0; k < 6; k++) step(16);
      for (let i = 1; i < order.length; i++) {
        const from = rows[order[i - 1] ?? 0];
        const to = rows[order[i] ?? 0];
        if (!from || !to) throw new Error('no row');
        frame(h, rows, order[i] ?? 0, step);
        // A frame after leaving, the old row's rim still shows, and the new row's is coming in on its own overlay.
        expect(on(made, from).length, `row ${order[i - 1]} a frame after`).toBe(1);
        expect(made.filter((o) => o.y === to.y && o.visible).length).toBe(1);
        expect(on(made, from)[0]).not.toBe(made.find((o) => o.y === to.y && o.visible));
        for (let k = 0; k < Math.ceil(MENU_MOTION.hoverMs / 16) + 1; k++) step(16);
        expect(on(made, from).length, `row ${order[i - 1]} after 80 ms`).toBe(0);
        expect(on(made, to)[0]?.alpha).toBe(1);
      }
      // Two overlays at most, reused: none made per row.
      expect(made.length).toBeLessThanOrEqual(3);
      // Every row image stays on its plain frame; the overlays carry the hover.
      expect(rows.every((r) => r.frame === 'plain')).toBe(true);
    });
  }

  it('a quick sweep (a row a frame) keeps a rim lit on every frame', () => {
    const { scene, step, made, overlay } = fakeScene();
    const h = new RowHover(scene, FRAMES, overlay);
    const rows = [0, 20, 40, 60].map(fakeImage);
    for (const at of [0, 1, 2, 3, 2, 1, 0]) {
      frame(h, rows, at, step);
      expect(made.some((o) => o.visible && o.alpha > 0.05)).toBe(true);
    }
  });

  it('closing hides every rim at once', () => {
    const { scene, step, made, overlay } = fakeScene();
    const h = new RowHover(scene, FRAMES, overlay);
    const rows = [0, 20].map(fakeImage);
    frame(h, rows, 0, step);
    frame(h, rows, 1, step);
    h.close();
    expect(made.every((o) => !o.visible)).toBe(true);
  });
});
