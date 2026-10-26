import { describe, expect, it } from 'vitest';
import { BlueprintInput } from '../../src/render/blueprintInput';

// 063: build mode's tools: the Area tool's drag and released box, the blueprint ghost's turn and mirror, and backing
// out one step at a time (the menu, the drag, then the tool).

describe('the area tool (063)', () => {
  it('drags a box and, on release, holds it for the menu', () => {
    const t = new BlueprintInput();
    t.press({ tx: 3, ty: 3 });
    expect(t.drag).toBeNull();
    t.toggleArea();
    t.press({ tx: 6, ty: 5 });
    t.move({ tx: 2, ty: 8 });
    expect(t.box).toEqual({ tx0: 2, ty0: 5, tx1: 6, ty1: 8 });
    t.release();
    expect(t.released).toEqual({ tx0: 2, ty0: 5, tx1: 6, ty1: 8 });
    expect(t.takeRelease()).toBe(true);
    expect(t.takeRelease()).toBe(false);
    // No new drag while the menu is up.
    t.press({ tx: 1, ty: 1 });
    expect(t.drag).toBeNull();
  });

  it('backs out the menu, then the tool, then has nothing left', () => {
    const t = new BlueprintInput();
    t.toggleArea();
    t.press({ tx: 1, ty: 1 });
    t.release();
    expect(t.back()).toBe(true);
    expect(t.released).toBeNull();
    expect(t.mode).toBe('area');
    expect(t.back()).toBe(true);
    expect(t.mode).toBe('piece');
    expect(t.back()).toBe(false);
  });

  it('toggles off with its key', () => {
    const t = new BlueprintInput();
    t.toggleArea();
    t.toggleArea();
    expect(t.mode).toBe('piece');
  });
});

describe('the blueprint ghost (063)', () => {
  it('turns clockwise and mirrors as it shows: mirror after turns flips the turns', () => {
    const t = new BlueprintInput();
    t.takeGhost(2);
    t.turn();
    expect(t.ghost).toEqual({ slot: 2, turns: 1, mirrored: false });
    t.mirror();
    expect(t.ghost).toEqual({ slot: 2, turns: 3, mirrored: true });
    t.mirror();
    expect(t.ghost).toEqual({ slot: 2, turns: 1, mirrored: false });
    for (let i = 0; i < 3; i++) t.turn();
    expect(t.ghost?.turns).toBe(0);
    expect(t.back()).toBe(true);
    expect(t.mode).toBe('piece');
    expect(t.ghost).toBeNull();
  });
});
