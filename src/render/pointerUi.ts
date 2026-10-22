import { canPlace, conduitInFrom, unlockedPieces } from '../sim/placement';
import type { SimState } from '../sim/state';
import type { Controls } from './controls';
import { ghostShape } from './dragPath';
import type { GameScene } from './GameScene';
import { highlightOf } from './TutorialUi';

/** What the cursor's UI needs from the scene beyond its public views. */
export interface PointerUiInput {
  controls: Controls | undefined;
  /** A drawn foundry piece's sprite top (FoundryView.topOf). */
  topOf: (id: number) => number | undefined;
  /** The KO card is up (WakeView.isShown). */
  wakeShown: () => boolean;
  shown: string;
  inFoundry: boolean;
}

// Each frame's cursor-driven UI (split out of GameScene.draw): the build ghost and tunnel marks under the cursor, menu
// rows lit under it, the arrow or crosshair pointer, hover panels and the legibility tips. Holds no game rules.
export function drawPointerUi(g: GameScene, sim: SimState, { controls, topOf, wakeShown, shown, inFoundry }: PointerUiInput): void {
  const cursor = controls && inFoundry && controls.overWorld() ? controls.cursorTile() : null;
  g.buildView?.update(
    sim.building,
    unlockedPieces(sim),
    cursor,
    controls?.facing ?? 'right',
    controls?.mirrored ?? false,
    (...a) => canPlace(sim, ...a),
    (t, f) => ghostShape(controls?.heldLay() ?? null, t, f, (u, d) => conduitInFrom(sim, u.tx, u.ty, d)),
    highlightOf(sim),
  );
  g.tunnelView?.update(sim.foundry, inFoundry, { building: sim.building, selected: g.buildView?.selected ?? '', cursor, facing: controls?.facing ?? 'right' });
  // Menu rows light under the cursor (020).
  const pointer = controls?.viewPointer();
  if (pointer) for (const menu of [g.siteMenus, g.pause, g.hud, g.sandboxPanel, g.roomViews]) menu?.pointAt(pointer.x, pointer.y);
  // The arrow pointer while a menu is open or over the build bar, else the crosshair (021).
  // 056: the sandbox's tabs are always up, so they turn the pointer to the arrow only under them.
  const inMenu = [g.menu, g.pause, g.siteMenus, g.hud?.inventory, g.hud?.talents, g.legibility].some((m) => m?.isOpen) || wakeShown();
  g.cursorView?.update(inMenu || (pointer !== undefined && [g.buildView, g.legibility, g.sandboxPanel].some((v) => v?.overUi(pointer.x, pointer.y))));
  const point = controls?.overWorld() ? controls.cursorPoint() : null;
  g.hover?.update(sim, shown, point, topOf, g.cameras.main.worldView);
  g.legibility?.update(sim, g.pause?.isOpen ? null : (pointer ?? null), controls?.shiftHeld() ?? false, g.game.loop.delta);
}
