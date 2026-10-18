import { describe, expect, it } from 'vitest';
import { FEET_BOX } from '../../src/data/player';
import { HARVEST_REACH, nodeDef } from '../../src/data/nodes';
import { LOAD_TICKS } from '../../src/data/tube';
import { cancelHarvest } from '../../src/sim/harvest';
import { nodeRects } from '../../src/sim/nodes';
import { arena, fireAt, HUSK, placeHusk, placeNode, PLAYER_AT, run, runUntil, SWIPE_LANDS } from './fight';

const TREE = nodeDef('tree');
/** Gap that puts the tree's box `gap` px right of the player's feet box. */
const rightOf = (gap: number): number => PLAYER_AT.x + FEET_BOX.w / 2 + gap + TREE.feetBox.w / 2;

/** A harvest of the tree right next to the player, `ticks` into it (the E tick is 1). */
function harvesting(ticks = 1) {
  const s = arena();
  const n = placeNode(s, 'tree', rightOf(4), PLAYER_AT.y);
  run(s, 1, { interact: true });
  run(s, ticks - 1);
  return { s, n };
}

describe('harvesting', () => {
  it('starts on E with a node in reach and counts the E tick as 1', () => {
    const { s, n } = harvesting();
    expect(s.harvest).toEqual({ nodeId: n.id, progress: 1 });
  });

  it('reaches exactly HARVEST_REACH px and no farther', () => {
    const near = arena();
    placeNode(near, 'tree', rightOf(HARVEST_REACH), PLAYER_AT.y);
    run(near, 1, { interact: true });
    expect(near.harvest).not.toBeNull();
    const far = arena();
    placeNode(far, 'tree', rightOf(HARVEST_REACH + 0.5), PLAYER_AT.y);
    run(far, 1, { interact: true });
    expect(far.harvest).toBeNull();
  });

  it('picks the nearest node in reach', () => {
    const s = arena();
    placeNode(s, 'tree', rightOf(10), PLAYER_AT.y);
    const near = placeNode(s, 'rubble', PLAYER_AT.x - 24, PLAYER_AT.y);
    run(s, 1, { interact: true });
    expect(s.harvest?.nodeId).toBe(near.id);
  });

  it('completes on tick 30: one use gone and one item on the ground outside every node', () => {
    const { s, n } = harvesting(TREE.harvestTicks - 1);
    expect(s.groundItems).toHaveLength(0);
    run(s, 1);
    expect(s.harvest).toBeNull();
    expect(n.uses).toBe(TREE.uses - 1);
    expect(s.groundItems.map((g) => g.itemId)).toEqual(['wood']);
    expect(s.events.harvests).toEqual([{ id: n.id, nodeId: 'tree', itemId: 'wood', x: n.x, y: n.y }]);
    const g = s.groundItems[0];
    for (const r of nodeRects(s.nodes)) {
      const inside = Math.abs((g?.x ?? 0) - r.x) < r.w / 2 && Math.abs((g?.y ?? 0) - r.y) < r.h / 2;
      expect(inside).toBe(false);
    }
  });

  it('drops an item the player can walk over and pick up', () => {
    const { s } = harvesting(TREE.harvestTicks);
    const g = s.groundItems[0];
    if (!g) throw new Error('no drop');
    runUntil(s, () => s.inventory.wood === 1, 120, {
      moveX: g.x > s.player.x + 2 ? 1 : g.x < s.player.x - 2 ? -1 : 0,
      moveY: g.y > s.player.y + 2 ? 1 : g.y < s.player.y - 2 ? -1 : 0,
    });
    expect(s.events.pickups[0]?.itemId).toBe('wood');
  });

  it('does nothing with no node in reach, or a depleted one', () => {
    const s = arena();
    run(s, 1, { interact: true });
    expect(s.harvest).toBeNull();
    const n = placeNode(s, 'tree', rightOf(4), PLAYER_AT.y);
    n.uses = 0;
    run(s, 1, { interact: true });
    expect(s.harvest).toBeNull();
  });

  it.each([
    ['moving', { moveX: 1 as const }],
    ['rolling', { dodge: true }],
    ['firing', fireAt(PLAYER_AT.x - 100, PLAYER_AT.y)],
    ['loading', { load: true }],
    ['switching ammo', { selectAmmo: 'bomb' }],
  ])('is cancelled by %s, losing progress and using nothing', (_name, c) => {
    const { s, n } = harvesting(10);
    run(s, 1, c);
    expect(s.harvest).toBeNull();
    run(s, TREE.harvestTicks);
    expect(n.uses).toBe(TREE.uses);
    expect(s.groundItems).toHaveLength(0);
  });

  it('is not cancelled by selecting the ammo already selected', () => {
    const { s } = harvesting(10);
    run(s, 1, { selectAmmo: 'arrow' });
    expect(s.harvest?.progress).toBe(11);
  });

  it('is cancelled by opening the menu', () => {
    const { s, n } = harvesting(10);
    cancelHarvest(s);
    expect(s.harvest).toBeNull();
    run(s, TREE.harvestTicks);
    expect(n.uses).toBe(TREE.uses);
  });

  it('is cancelled by a swipe hit', () => {
    const s = arena();
    const n = placeNode(s, 'tree', rightOf(4), PLAYER_AT.y);
    placeHusk(s, PLAYER_AT.x - 20, PLAYER_AT.y);
    // The Husk winds up straight away; start harvesting partway through its wind-up.
    run(s, 20);
    run(s, 1, { interact: true });
    expect(s.harvest).not.toBeNull();
    run(s, SWIPE_LANDS - 21);
    expect(s.player.health).toBe(100 - HUSK.swipe.damage);
    expect(s.harvest).toBeNull();
    expect(n.uses).toBe(TREE.uses);
  });

  it('stops loading when it starts, keeping loaded rounds', () => {
    const s = arena();
    placeNode(s, 'tree', rightOf(4), PLAYER_AT.y);
    run(s, 1, { load: true });
    run(s, LOAD_TICKS + 3);
    expect(s.tube.loaded).toBe(1);
    run(s, 1, { interact: true });
    expect(s.tube.loading).toBe(false);
    expect(s.tube.loadProgress).toBe(0);
    expect(s.tube.loaded).toBe(1);
    expect(s.inventory.arrow).toBe(29);
  });
});

describe('nodes', () => {
  it('deplete after their uses and regrow after exactly regrowTicks', () => {
    const s = arena();
    const n = placeNode(s, 'tree', rightOf(4), PLAYER_AT.y);
    for (let i = 0; i < TREE.uses; i++) {
      run(s, 1, { interact: true });
      run(s, TREE.harvestTicks - 1);
    }
    expect(n.uses).toBe(0);
    expect(n.regrow).toBe(TREE.regrowTicks);
    run(s, 1, { interact: true });
    expect(s.harvest).toBeNull();
    run(s, TREE.regrowTicks - 2);
    expect(n.uses).toBe(0);
    run(s, 1);
    expect(n.uses).toBe(TREE.uses);
    expect(n.regrow).toBe(0);
  });

  it('block the player, who slides along them', () => {
    const s = arena();
    const n = placeNode(s, 'tree', PLAYER_AT.x + 40, PLAYER_AT.y);
    run(s, 60, { moveX: 1 });
    expect(s.player.x).toBe(n.x - TREE.feetBox.w / 2 - FEET_BOX.w / 2);
    const s2 = arena();
    const n2 = placeNode(s2, 'tree', PLAYER_AT.x + 40, PLAYER_AT.y + 4);
    run(s2, 60, { moveX: 1, moveY: -1 });
    expect(s2.player.x).toBeGreaterThan(n2.x);
  });

  it('block Husks too, depleted or not', () => {
    const s = arena();
    const n = placeNode(s, 'rubble', PLAYER_AT.x + 60, PLAYER_AT.y);
    n.uses = 0;
    const e = placeHusk(s, PLAYER_AT.x + 120, PLAYER_AT.y);
    run(s, 120);
    expect(e.x).toBeGreaterThanOrEqual(n.x + nodeDef('rubble').feetBox.w / 2 + HUSK.feetBox.w / 2 - 1e-9);
  });

  it('let ley bolts and bombs fly over them', () => {
    const s = arena();
    placeNode(s, 'tree', PLAYER_AT.x + 60, PLAYER_AT.y);
    const e = placeHusk(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    s.inventory['ley-bolt'] = 1;
    s.inventory.bomb = 1;
    run(s, 1, { selectAmmo: 'ley-bolt' });
    run(s, 1, { load: true });
    run(s, LOAD_TICKS);
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => e.health < HUSK.maxHealth, 60);
    // A bomb aimed at the node itself lands on it and bursts there.
    run(s, 1, { selectAmmo: 'bomb' });
    run(s, 1, { load: true });
    run(s, LOAD_TICKS);
    run(s, 1, fireAt(PLAYER_AT.x + 60, PLAYER_AT.y));
    runUntil(s, () => s.events.bursts.length > 0, 60);
    expect(s.events.bursts[0]?.x).toBeCloseTo(PLAYER_AT.x + 60);
  });

  it('let arrows fly over them', () => {
    const s = arena();
    placeNode(s, 'tree', PLAYER_AT.x + 60, PLAYER_AT.y);
    const e = placeHusk(s, PLAYER_AT.x + 140, PLAYER_AT.y);
    run(s, 1, { load: true });
    run(s, LOAD_TICKS);
    run(s, 1, fireAt(PLAYER_AT.x + 400, PLAYER_AT.y));
    runUntil(s, () => s.arrows.length === 0, 60);
    expect(e.health).toBeLessThan(HUSK.maxHealth);
  });
});
