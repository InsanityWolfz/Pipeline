import { expect, test, type Page } from '@playwright/test';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import { hotbarCells } from '../../src/render/bottomHud';
import { inventoryLayout } from '../../src/render/inventoryLayout';
import { boot, cameraSettled, watchErrors } from './helpers';
import { screenPoint, state, step } from './foundryPage';

// The legibility UI (040): with ?playtest, a hover summary on the arrow's hotbar slot, the
// breakdown while Shift is held, a talent's bonus showing in the numbers, the Build tab's
// rows and their breakdown, a chip opening its glossary entry without firing, no breakdown
// anywhere without Shift, and an enemy's status chips on its hover name.

const ui = (page: Page) => page.evaluate(() => window.__GAME__?.ui());

/** Moves the real mouse to a view point. */
async function hover(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.move(p.x, p.y);
}

/** The arrow's hotbar slot, view px. */
function arrowSlot(): { x: number; y: number; w: number; h: number } {
  const cell = hotbarCells().find((c) => c.ammoId === 'arrow');
  if (!cell) throw new Error('no arrow slot');
  return cell;
}

test('hovering the arrow’s hotbar slot shows its summary; Shift shows the breakdown, releasing it the summary again', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await step(page, 1);
  const slot = arrowSlot();
  await hover(page, slot.x + slot.w / 2, slot.y + slot.h / 2);
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
  let tip = (await ui(page))?.tip;
  expect(tip?.source).toEqual({ kind: 'round', id: 'arrow' });
  expect(tip?.chips).toEqual(['arrow', 'shot', 'pierce', 'knockback', 'physical']);
  expect(tip?.lines[0]).toMatch(/^\d+(\.\d)? dmg · \d\.\d\/s$/);
  // It sits above the slot, inside the view.
  expect((tip?.box.y ?? 0) + (tip?.box.h ?? 0)).toBeLessThanOrEqual(slot.y);
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('breakdown');
  tip = (await ui(page))?.tip;
  expect(tip?.lines[0]).toMatch(/^Damage 10/);
  expect(tip?.lines.some((l) => l.startsWith('Linked:'))).toBe(true);
  expect(tip?.box.w).toBeLessThanOrEqual(280);
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await ui(page))?.tip?.mode).toBe('summary');
  expect(errors).toEqual([]);
});

/** Moves the mouse to a box's middle (view px). */
const hoverBox = (page: Page, b: { x: number; y: number; w: number; h: number }) => hover(page, b.x + b.w / 2, b.y + b.h / 2);

/** Takes talents through the hook (XP enough for them first). */
async function takeTalents(page: Page, ...ids: string[]): Promise<void> {
  await page.evaluate((list) => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.gainXp(5000);
    for (const id of list) g.step(1, { takeTalent: id });
  }, ids);
}

/** A summary's lines hold no breakdown: no steps, no px, no Linked. */
const summaryOnly = (lines: readonly string[]) => lines.every((l) => !/ = |\bpx\b|^Linked:|^Damage \d/.test(l));

test('a talent’s bonus shows in the numbers: Fletcher’s Eye makes the arrow 11 dmg, with the bonus hint', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await step(page, 1);
  const slot = arrowSlot();
  await hoverBox(page, slot);
  await expect.poll(async () => (await ui(page))?.tip?.lines[0]).toMatch(/^10 dmg · 4\.0\/s$/);
  expect((await ui(page))?.tip?.lines).toHaveLength(1);
  await takeTalents(page, 'a1');
  expect((await state(page)).talents).toContain('a1');
  // Away and back: the tip reopens with the new number.
  await hover(page, VIEW_WIDTH / 2, VIEW_HEIGHT / 3);
  await expect.poll(async () => (await ui(page))?.tip).toBeNull();
  await hoverBox(page, slot);
  await expect.poll(async () => (await ui(page))?.tip?.lines).toEqual(['11 dmg · 4.0/s', '1 bonus · hold Shift']);
  expect(errors).toEqual([]);
});

test('the T panel’s Build tab lists every known round; hovering a row shows its breakdown beside the panel', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const s = await step(page, 1);
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talentPanel.open).toBe(true);
  let panel = (await ui(page))?.talentPanel;
  expect(panel?.tab).toBe('talents');
  const build = panel?.tabs.find((t) => t.id === 'build');
  if (!build) throw new Error('no Build tab');
  const at = await screenPoint(page, build.box.x + build.box.w / 2, build.box.y + build.box.h / 2);
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => (await ui(page))?.talentPanel.tab).toBe('build');
  const rows = (await ui(page))?.buildTab.rows ?? [];
  // Every round carried is known (040.2), and every row is a round with its numbers.
  const carried = Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0 && rows.some((r) => r.round === id));
  expect(carried.length).toBeGreaterThan(2);
  for (const id of ['arrow', 'bomb', 'ley-bolt']) expect(rows.map((r) => r.round)).toContain(id);
  for (const r of rows) {
    expect(r.damage).toMatch(/^\d+(\.\d)?$/);
    expect(r.perSecond).toMatch(/^\d\.\d\/s$/);
    expect(r.box.h).toBe(14);
  }
  panel = (await ui(page))?.talentPanel;
  const row = rows.find((r) => r.round === 'bomb');
  if (!row || !panel) throw new Error('no bomb row');
  await hoverBox(page, row.box);
  await expect.poll(async () => (await ui(page))?.tip?.source).toEqual({ kind: 'round', id: 'bomb' });
  const tip = (await ui(page))?.tip;
  expect(tip?.mode).toBe('breakdown');
  expect(tip?.box.x).toBeGreaterThanOrEqual(panel.panel.x + panel.panel.w);
  expect((tip?.box.x ?? 0) + (tip?.box.w ?? 0)).toBeLessThanOrEqual(VIEW_WIDTH - 4);
  // The panel remembers its tab while the game runs.
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talentPanel.open).toBe(false);
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talentPanel.tab).toBe('build');
  expect(errors).toEqual([]);
});

test('clicking the Burst chip opens its glossary entry and never fires; Esc closes it', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  // On the real-time clock (no step), so a press drives the tube as in play.
  const bombSlot = hotbarCells().find((c) => c.ammoId === 'bomb');
  if (!bombSlot) throw new Error('no bomb slot');
  await hoverBox(page, bombSlot);
  await expect.poll(async () => (await ui(page))?.tip?.chips).toContain('burst');
  const chip = (await ui(page))?.tip?.chipBoxes.find((c) => c.id === 'burst');
  if (!chip) throw new Error('no Burst chip');
  const before = await state(page);
  // Straight onto the chip (the tablet stays while the cursor crosses to it), held while the world runs on.
  await hoverBox(page, chip.box);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).tick, { timeout: 15_000 }).toBeGreaterThan(before.tick + 30);
  await page.mouse.up();
  await expect.poll(async () => (await ui(page))?.glossary?.keyword).toBe('burst');
  const held = await state(page);
  expect(held.bombs).toEqual([]);
  expect(held.arrows).toEqual([]);
  expect(held.inventory).toEqual(before.inventory);
  const entry = (await ui(page))?.glossary;
  expect(entry?.lines.some((l) => l.startsWith('Payoffs:') && l.includes('Wide Casing'))).toBe(true);
  expect(entry?.box.w).toBeLessThanOrEqual(260);
  expect(entry?.box.h).toBeLessThanOrEqual(170);
  expect((await ui(page))?.paused).toBe(false);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.glossary).toBeNull();
  expect((await ui(page))?.paused).toBe(false);
  expect(errors).toEqual([]);
});

test('without Shift, every summary source shows a summary and never a breakdown line', async ({ page }) => {
  // About 25 s alone (the walk into the foundry and eight sources): room for parallel workers.
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await takeTalents(page, 'a1', 'b1', 'b2');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
    for (const row of ['frost-rune-arrow', 'frost-rune-bomb']) g.step(1, { applyStage: row });
    g.step(1, { identify: true });
    const s = g.step(1);
    const helm = s.gear.find((p) => p.slot === 'helm');
    if (helm) g.step(1, { equip: { id: helm.id } });
    g.step(10);
  });
  // The camera eases on real time: under parallel workers it can take a while.
  await cameraSettled(page, 20_000);
  const seen: string[] = [];
  const check = async (kind: string) => {
    await expect.poll(async () => (await ui(page))?.tip?.source.kind).toBe(kind);
    const tip = (await ui(page))?.tip;
    expect(tip?.mode).toBe('summary');
    expect(summaryOnly(tip?.lines ?? []), JSON.stringify(tip?.lines)).toBe(true);
    expect(tip?.box.w).toBeLessThanOrEqual(200);
    seen.push(kind);
  };
  // The bench: a Stages row, a gear row, a worn cell.
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const stageRow = (await ui(page))?.tagged.benchStages?.rows[0];
  if (!stageRow) throw new Error('no stage row');
  await hoverBox(page, stageRow);
  await check('stage');
  const gear = (await ui(page))?.gearPanel;
  const gearRow = gear?.rows[0];
  if (!gearRow) throw new Error('no gear row');
  await hoverBox(page, gearRow.box);
  await check('gear');
  const worn = gear?.cells.find((c) => c.worn !== null);
  if (!worn) throw new Error('nothing worn');
  await hover(page, worn.box.x + 4, worn.box.y + 4);
  await check('gear');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await ui(page))?.siteOpen).toBe(false);
  // The build bar's stage button.
  await step(page, 1, { toggleBuild: true });
  await expect.poll(async () => (await ui(page))?.buildBar?.shown).toBe(true);
  const cell = (await ui(page))?.buildBar?.cells.find((c) => c.pieceId === 'frost-rune');
  if (!cell) throw new Error('no frost rune button');
  await hoverBox(page, cell);
  await check('stage');
  expect((await ui(page))?.buildTip).toBe('frost-rune');
  await step(page, 1, { toggleBuild: true });
  await expect.poll(async () => (await ui(page))?.buildBar?.shown).toBe(false);
  // The inventory's first ammo row.
  await page.keyboard.press('i');
  await expect.poll(async () => (await ui(page))?.inventory.open).toBe(true);
  const ammo = inventoryLayout().groups.find((g) => g.id === 'ammo');
  if (!ammo) throw new Error('no ammo group');
  await hover(page, ammo.x + 30, ammo.rowsY + 7);
  await check('round');
  await page.keyboard.press('i');
  // A talent node.
  await page.keyboard.press('t');
  await expect.poll(async () => (await ui(page))?.talents.open).toBe(true);
  expect((await ui(page))?.talentPanel.tab).toBe('talents');
  const node = (await ui(page))?.talents.nodes.find((n) => n.id === 'b2');
  if (!node) throw new Error('no Wide Casing');
  await hover(page, node.x, node.y);
  await check('talent');
  await page.keyboard.press('t');
  // The hotbar and the tube slot.
  await hoverBox(page, arrowSlot());
  await check('round');
  const slot = (await ui(page))?.hud?.tubeSlot;
  if (!slot) throw new Error('no tube slot');
  await hover(page, slot.x + 10, slot.y + 10);
  await check('round');
  expect(seen).toEqual(['stage', 'gear', 'gear', 'stage', 'round', 'talent', 'round', 'round']);
  expect(errors).toEqual([]);
});

test('a Husk with frost hits shows Chill and its stacks on its hover name', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  const husk = await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    let s = g.step(1);
    g.drop('arrow+frost', s.player.x, s.player.y);
    g.step(5, { selectAmmo: 'arrow' });
    s = g.spawnEnemy('husk', s.player.x + 90, s.player.y);
    const id = s.enemies.at(-1)?.id ?? -1;
    g.setEnemyHealth(id, 1000);
    // Two frost arrows, each a Chill stack.
    for (let t = 0; t < 60 && (g.getState().enemies.find((e) => e.id === id)?.chill ?? 0) < 2; t++) {
      const e = g.getState().enemies.find((en) => en.id === id);
      if (!e) break;
      g.step(1, { fire: true, aimX: e.x, aimY: e.y - 4 });
    }
    const e = g.step(1).enemies.find((en) => en.id === id);
    return { x: e?.x ?? 0, y: e?.y ?? 0, chill: e?.chill ?? 0 };
  });
  expect(husk.chill).toBeGreaterThan(0);
  // The camera eases on real time: under parallel workers it can take a while.
  await cameraSettled(page, 20_000);
  const cam = (await ui(page))?.camera;
  if (!cam) throw new Error('no camera');
  await hover(page, husk.x - (cam.x - VIEW_WIDTH / 2), husk.y - 10 - (cam.y - VIEW_HEIGHT / 2));
  await expect.poll(async () => (await ui(page))?.hoverName).toBe('Husk');
  expect((await ui(page))?.hoverChips).toEqual([`Chill ${husk.chill}`]);
  expect(errors).toEqual([]);
});

test('every summary the game can show holds at most four drawn rows, with no talents or the whole tree', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) throw new Error('no game');
    g.step(1);
    // A relic with two affixes, and a Rare piece with three.
    g.addGear({ slot: 'helm', rarity: 'relic', weight: null, baseArmor: 2, affixes: [{ kind: 'max-health', value: 12 }, { kind: 'move-speed', value: 0.04 }], relic: 'wardstone-circlet', name: 'Wardstone Circlet' });
    g.addGear({ slot: 'body', rarity: 'rare', weight: 'heavy', baseArmor: 12, affixes: [{ kind: 'max-health', value: 16 }, { kind: 'armor', value: 3 }, { kind: 'roll-distance', value: 0.12 }], relic: null, name: 'Granite Plate' });
  });
  for (const talents of [[], ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'k1', 'l1', 'l2', 'l3', 'k2', 't1', 't2', 't3', 'k3', 's1', 's2', 's3', 's4']]) {
    await takeTalents(page, ...talents);
    const all = (await page.evaluate(() => window.__GAME__?.summaryRows())) ?? [];
    expect(new Set(all.map((r) => r.source.kind))).toEqual(new Set(['round', 'talent', 'stage', 'gear']));
    for (const r of all) {
      expect(r.rows, `${r.source.kind} ${r.source.id}`).toBeLessThanOrEqual(4);
      expect(r.w, `${r.source.kind} ${r.source.id}`).toBeLessThanOrEqual(200);
    }
    // Rounds and talents fit whole (a long "Reaches:" reads as a count); only a full gear piece is cut.
    expect(all.filter((r) => r.cut && (r.source.kind === 'round' || r.source.kind === 'talent'))).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('a click on the gear tip, over the bench’s Stages rows, is the tip’s: no stage is applied', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await boot(page, '?playtest');
  await page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    g.claim('shrine');
    h.toFoundry();
    h.walkTo(2.3 * 32, 12.5 * 32);
    g.step(1, { identify: true });
    g.step(10);
  });
  // The camera eases on real time: under parallel workers it can take a while.
  await cameraSettled(page, 20_000);
  await page.keyboard.press('e');
  await expect.poll(async () => (await ui(page))?.tagged.benchStages?.shown).toBe(true);
  const gearRow = (await ui(page))?.gearPanel?.rows[0];
  if (!gearRow) throw new Error('no gear row');
  await hover(page, gearRow.box.x + gearRow.box.w - 30, gearRow.box.y + gearRow.box.h / 2);
  await expect.poll(async () => (await ui(page))?.tip?.source.kind).toBe('gear');
  const tip = (await ui(page))?.tip;
  const rows = (await ui(page))?.tagged.benchStages?.rows ?? [];
  // A point on the tip and on an affordable Stages row under it.
  const under = rows.find((r) => !r.dimmed && tip && r.x < tip.box.x + tip.box.w - 4 && r.x + r.w > tip.box.x + 4 && r.y < tip.box.y + tip.box.h - 4 && r.y + r.h > tip.box.y + 4);
  if (!tip || !under) throw new Error('no Stages row under the tip');
  const x = Math.max(under.x, tip.box.x) + 4;
  const y = Math.max(under.y, tip.box.y) + 4;
  const before = await state(page);
  const at = await screenPoint(page, x, y);
  await page.mouse.click(at.x, at.y);
  const after = await step(page, 2);
  expect(after.inventory).toEqual(before.inventory);
  expect(after.events.craftFails).toEqual([]);
  expect((await ui(page))?.tip?.source.kind).toBe('gear');
  // The same click with no tip there applies the row, so the check above means something.
  await hover(page, under.x + under.w / 2, under.y + under.h / 2);
  await expect.poll(async () => (await ui(page))?.tip?.source.kind).toBe('stage');
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => JSON.stringify((await step(page, 1)).inventory) !== JSON.stringify(before.inventory)).toBe(true);
  expect(errors).toEqual([]);
});
