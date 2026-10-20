import { describe, expect, it } from 'vitest';
import { CARRIED_SLOTS } from '../../src/data/tube';
import { assignSlot, createHotbar, selectedItem } from '../../src/sim/hotbar';
import { noteCarried } from '../../src/sim/knownRounds';
import { stepSim } from '../../src/sim/step';
import { arena, command, placeHusk, PLAYER_AT, run, useAt, volleyAt } from './fight';

// 047 (note 11): two hotbars. Left click fires the intake's volley, or punches with the intake dry; the carried bar
// (keys 1–5) picks an item, and right click uses it: throws a bomb or landmine, or fires a carried round. Neither
// ever does the other's job.

const AIM = { x: PLAYER_AT.x + 120, y: PLAYER_AT.y };

/** The meadow with the tube linked and `arrows` arrows in the intake's first entrance. */
function linkedArena(arrows: number) {
  const s = arena();
  s.link.attuned = true;
  s.firstLineFull = true;
  const [e] = s.link.entrances;
  if (!e) throw new Error('no entrance');
  Object.assign(e, { open: true, ammoId: 'arrow', count: arrows });
  return s;
}

describe('the carried bar', () => {
  it('has five slots, the first selected, empty until something usable is carried', () => {
    expect(CARRIED_SLOTS).toBe(5);
    expect(createHotbar()).toEqual({ slots: [null, null, null, null, null], selected: 0 });
  });

  it('fills the first empty slot with a usable kind picked up for the first time, in pick-up order', () => {
    const s = arena();
    s.hotbar = createHotbar();
    s.carried = [];
    s.inventory = { wood: 3, bomb: 2 };
    noteCarried(s);
    expect(s.hotbar.slots).toEqual(['bomb', null, null, null, null]);
    s.inventory.landmine = 1;
    noteCarried(s);
    expect(s.hotbar.slots).toEqual(['bomb', 'landmine', null, null, null]);
  });

  it('keeps a slot whose items are gone (it shows empty), and never fills it again with a kind already met', () => {
    const s = arena();
    s.hotbar = createHotbar();
    s.carried = [];
    s.inventory = { bomb: 1 };
    noteCarried(s);
    s.inventory.bomb = 0;
    noteCarried(s);
    s.inventory = { bomb: 4, arrow: 2 };
    noteCarried(s);
    expect(s.hotbar.slots).toEqual(['bomb', 'arrow', null, null, null]);
  });

  it('takes a dragged stack onto a slot, moving a kind already on the bar (the two swap); never a raw or a part', () => {
    const s = arena();
    s.hotbar = { slots: ['arrow', 'bomb', null, null, null], selected: 0 };
    s.inventory = { arrow: 5, bomb: 2, 'ley-bolt': 3, wood: 4 };
    assignSlot(s, 3, 'ley-bolt');
    expect(s.hotbar.slots).toEqual(['arrow', 'bomb', null, 'ley-bolt', null]);
    assignSlot(s, 0, 'bomb');
    expect(s.hotbar.slots).toEqual(['bomb', 'arrow', null, 'ley-bolt', null]);
    assignSlot(s, 2, 'wood');
    assignSlot(s, 9, 'arrow');
    expect(s.hotbar.slots).toEqual(['bomb', 'arrow', null, 'ley-bolt', null]);
  });

  it('comes as a command, and keys 1–5 select a slot', () => {
    const s = arena();
    s.inventory = { arrow: 5, bomb: 2 };
    run(s, 1, { assignSlot: { slot: 4, itemId: 'bomb' } });
    run(s, 1, { selectSlot: 4 });
    expect(s.hotbar.selected).toBe(4);
    expect(selectedItem(s)).toBe('bomb');
    expect(s.events.selects).toEqual([{ slot: 4 }]);
  });

  it('keeps its slots through a KO (047.3)', () => {
    const s = arena();
    s.inventory = { arrow: 5, bomb: 2 };
    run(s, 1);
    const before = structuredClone(s.hotbar);
    s.player.health = 0;
    run(s, 200);
    expect(s.hotbar.slots).toEqual(before.slots);
  });
});

describe('left and right click never cross', () => {
  it('left click with the intake dry punches, even with arrows carried, and never fires them', () => {
    const s = arena();
    s.inventory = { arrow: 10 };
    run(s, 1, volleyAt(AIM.x, AIM.y));
    expect(s.events.melees).toHaveLength(1);
    expect(s.arrows).toEqual([]);
    expect(s.inventory.arrow).toBe(10);
  });

  it('right click fires the selected carried round, and never punches', () => {
    const s = arena();
    s.inventory = { arrow: 10 };
    run(s, 1, useAt(AIM.x, AIM.y));
    expect(s.arrows.map((a) => a.ammoId)).toEqual(['arrow']);
    expect(s.inventory.arrow).toBe(9);
    expect(s.events.melees).toEqual([]);
  });

  it('right click throws a selected bomb or landmine', () => {
    for (const item of ['bomb', 'landmine']) {
      const s = arena();
      s.inventory = { [item]: 2 };
      run(s, 1);
      s.hotbar.selected = s.hotbar.slots.indexOf(item);
      run(s, 1, useAt(AIM.x, AIM.y));
      expect(s.bombs.map((b) => b.ammoId), item).toEqual([item]);
      expect(s.inventory[item]).toBe(1);
    }
  });

  it('right click on an empty slot does nothing', () => {
    const s = arena();
    s.inventory = { arrow: 0 };
    run(s, 1, useAt(AIM.x, AIM.y));
    expect([s.arrows, s.bombs, s.events.melees]).toEqual([[], [], []]);
  });

  it('right click never fires the volley; left click fires it and never a carried round', () => {
    const s = linkedArena(5);
    s.inventory = { bomb: 3 };
    run(s, 1);
    s.hotbar.selected = s.hotbar.slots.indexOf('bomb');
    run(s, 1, useAt(AIM.x, AIM.y));
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances.reduce((n, e) => n + e.count, 0)).toBe(5);
    run(s, 40);
    run(s, 1, volleyAt(AIM.x, AIM.y));
    expect(s.tube.fromReservoir).toBe(true);
    expect(s.inventory.bomb).toBe(2);
    expect(s.events.melees).toEqual([]);
  });

  it('a right click held on a Husk keeps firing at the round’s rate', () => {
    const s = arena();
    s.inventory = { arrow: 10 };
    placeHusk(s, AIM.x, AIM.y);
    for (let t = 0; t < 31; t++) stepSim(s, command(useAt(AIM.x, AIM.y)));
    expect(s.inventory.arrow).toBe(7);
  });
});
