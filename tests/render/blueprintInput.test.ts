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

describe('questions (063)', () => {
  it('replace the release menu, block a new drag, and back out first', () => {
    const t = new BlueprintInput();
    t.toggleArea();
    t.press({ tx: 1, ty: 1 });
    t.release();
    const box = t.released;
    if (!box) throw new Error('no box');
    t.ask({ kind: 'overwrite', box, action: 'save' });
    expect(t.released).toBeNull();
    t.press({ tx: 2, ty: 2 });
    expect(t.drag).toBeNull();
    expect(t.back()).toBe(true);
    expect(t.question).toBeNull();
    expect(t.mode).toBe('area');
  });
});

describe('the blueprint list (063)', () => {
  it('opens only once the table is restored, closes on Esc, and taking a blueprint closes it', () => {
    const t = new BlueprintInput();
    t.toggleList();
    expect(t.listOpen).toBe(false);
    t.listLocked = false;
    t.toggleList();
    expect(t.listOpen).toBe(true);
    expect(t.back()).toBe(true);
    expect(t.listOpen).toBe(false);
    t.toggleList();
    t.takeGhost(0);
    expect(t.listOpen).toBe(false);
    expect(t.mode).toBe('ghost');
  });
});

describe('stamping from the ghost (063)', () => {
  it('centres the box on the pressed tile, with its turn and mirror', () => {
    const t = new BlueprintInput();
    expect(t.stampAt({ tx: 5, ty: 5 })).toBeNull();
    t.takeGhost(1);
    t.turn();
    t.ghostSize = { w: 2, h: 4 };
    expect(t.stampAt({ tx: 10, ty: 8 })).toEqual({ slot: 1, tx: 10, ty: 7, turns: 1, mirrored: false });
    t.ghostSize = { w: 3, h: 3 };
    expect(t.stampAt({ tx: 10, ty: 8 })).toEqual({ slot: 1, tx: 9, ty: 7, turns: 1, mirrored: false });
  });
});
