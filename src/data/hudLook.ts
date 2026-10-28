import { NOTICE } from './flowLayout';
import { TUTORIAL_LAYOUT, PORT_LOOK } from './foundryAssets';
import { CRAFT_MENU_LAYOUT, HOVER_NAME, MENU_FEEDBACK } from './hudLayout';
import { PICKUP_FEED } from './hudPanels';
import { DISCOVERY_BANNER } from './landmarkAssets';
import { WAYPOINT } from './targets';

// 081: the HUD's polish, as data. One tablet look for the baked frames (art/hud.ts) and the live panels
// (render/tablet.ts), the HUD pieces' lit edges, the menus' motion, and the readability floor. Palette ids and px.
// hudLayout.ts keeps the layout, which 081 never moves.

/**
 * The stone tablet (020, 081): an ink edge one px round the box; carved stone shading from `top` down to `fill` at
 * `fillAlpha`, in `bands` flat steps (so it looks the same on WebGL and the Canvas fallback); a lit `bevel` along the
 * top, a dark `base` along the foot and a thin carved `inner` line `inner.inset` px in, so the edge reads as cut; brass
 * corner brackets `corner` px long, each lit (`brassLit`) for `lit` px at its top-left end, as light falls from the top
 * left.
 */
export const TABLET = {
  top: 'carve',
  fill: 'carve-dark',
  fillAlpha: 0.94,
  bands: 4,
  edge: 'ink',
  bevel: 'carve-light',
  base: 'mortar',
  inner: { color: 'mortar', alpha: 0.5, inset: 2 },
  brass: 'brass',
  brassLit: 'brass-light',
  lit: 2,
  corner: 4,
} as const;

/**
 * The HUD pieces' lit edges (081). `well`: a cell's or row's well cut into the stone, its top `top` and its foot
 * `foot`, a lit lip (`lip`) along its foot. `ring`: the cyan rings' rim light on their top-left arc. `hpFill`: a lit
 * top line and a dark foot line on the HP and boss fills. `xp`: the XP row's well edged in `edge` with a lit lip
 * under it, its fill's top px in `top`. `minimap`: an inner shadow `w` px along the map's top and left. `tabGlow`: a
 * soft glow round the open tab's brass stripe, `spread` px of `color` fading out.
 */
export const HUD_EDGES = {
  well: { top: 'ink', foot: 'carve-dark', lip: { color: 'carve-light', alpha: 0.4 } },
  ring: { color: 'cyan-glow', alpha: 0.9 },
  hpFill: { top: { color: 'snow', alpha: 0.25 }, foot: { color: 'ink', alpha: 0.2 } },
  xp: { edge: 'ink', lip: { color: 'carve-light', alpha: 0.4 }, top: 'cyan-glow' },
  minimap: { color: 'ink', alpha: 0.35, w: 3 },
  tabGlow: { color: 'gold-trim', alpha: 0.35, spread: 2 },
} as const;

/** 081: the boss bar's baked frame (`hud-boss-bar`), the bar's outer box today: 244 x 10 round the 240 x 6 fill. */
export const BOSS_BAR_FRAME = { w: 244, h: 10, inset: 2 } as const;

/**
 * Menu motion (081), ms of tween time. A menu opens in `openMs` (fading in and rising `rise` px into place, eased
 * out) and closes at once; a hover rim fades in and out in `hoverMs`; a tab's rows fade in in `tabMs`; a pressed row's
 * brass flash fades in `pressMs`. Every one ends inside `maxMs` (the spec's rule 5).
 */
export const MENU_MOTION = {
  openMs: 120,
  rise: 4,
  hoverMs: 80,
  tabMs: 80,
  pressMs: MENU_FEEDBACK.pressMs,
  maxMs: 150,
} as const;

/** WCAG's 4.5:1: text on a tablet keeps at least this contrast against it, over any ground (081 rule 4). */
export const CONTRAST_FLOOR = 4.5;

/**
 * Every tablet that carries text (081), for the readability test: the piece's alpha (drawTablet's `alpha`), the text's
 * own alpha, its fill (palette id), and what lies under it: the world (any ground, snow to ink) or a menu's panel.
 */
export interface TextTablet {
  id: string;
  alpha: number;
  textAlpha: number;
  text: string;
  over: 'world' | 'panel';
}

const onWorld = (id: string, alpha: number, text = 'snow'): TextTablet => ({ id, alpha, textAlpha: 1, text, over: 'world' });

export const TEXT_TABLETS: readonly TextTablet[] = [
  onWorld('objective-band', TUTORIAL_LAYOUT.objectivePanel.alpha),
  onWorld('notice', NOTICE.alpha),
  onWorld('pickup-feed', PICKUP_FEED.alpha),
  onWorld('hover-name', HOVER_NAME.alpha),
  onWorld('discovery-banner', DISCOVERY_BANNER.alpha, 'brass-light'),
  onWorld('waypoint-plate', WAYPOINT.plate.alpha),
  onWorld('port-plate', PORT_LOOK.plateAlpha),
  onWorld('menu-panel', 1),
  onWorld('title-card', 1, 'brass-light'),
  onWorld('wake-text', 1, 'brass-light'),
  { id: 'craft-tab-closed', alpha: CRAFT_MENU_LAYOUT.tabClosedAlpha, textAlpha: CRAFT_MENU_LAYOUT.tabClosedAlpha, text: 'snow', over: 'panel' },
];
