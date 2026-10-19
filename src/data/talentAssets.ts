import type { KeystoneRule, TalentLane } from './talents';

// Asset keys, the tree panel's layout and the effects' look (037). Render draws by these
// keys; the shapes are in src/data/art/talents.ts. Times ms (on the tween clock), sizes
// view px for the panel and the HUD, world px for effects, alphas 0..1. Pending Shaun's review.

export const TALENT_SPRITES = {
  /** The panel's nodes: a minor node's carved socket, a keystone's larger rune-stone, the centre start. */
  node: 'talent-node',
  keystone: 'talent-keystone',
  start: 'talent-start',
  /** Round a taken node: a cyan glow. Round an available one: a bright ring. */
  halo: 'talent-halo',
  ring: 'talent-ring',
  /** The lanes' icons on their minor nodes (Arrows, Bombs and Ley are their ammo's), and each keystone's. */
  laneArrows: 'talent-lane-arrows',
  laneBombs: 'talent-lane-bombs',
  laneLey: 'talent-lane-ley',
  laneSurvival: 'talent-lane-survival',
  laneTube: 'talent-lane-tube',
  blastfletch: 'talent-blastfletch',
  shatterpoint: 'talent-shatterpoint',
  overpressure: 'talent-overpressure',
  /** The HUD's pip while points are unspent. */
  pip: 'talent-pip',
  /** The level-up ring flash round the player. */
  levelRing: 'level-ring',
  /** Blastfletch's Pool, Shatterpoint's ice burst, a Cold Shard in flight, Overpressure's heat on the tube. */
  pool: 'pool',
  iceBurst: 'ice-burst',
  coldShard: 'shard-cold',
  heatShimmer: 'heat-shimmer',
} as const;

/** Each lane's icon on its minor nodes. */
export const LANE_ICONS: Readonly<Record<TalentLane, string>> = {
  centre: TALENT_SPRITES.start,
  arrows: TALENT_SPRITES.laneArrows,
  bombs: TALENT_SPRITES.laneBombs,
  ley: TALENT_SPRITES.laneLey,
  survival: TALENT_SPRITES.laneSurvival,
  tube: TALENT_SPRITES.laneTube,
};

/** Each keystone's icon. */
export const KEYSTONE_ICONS: Readonly<Record<KeystoneRule, string>> = {
  blastfletch: TALENT_SPRITES.blastfletch,
  shatterpoint: TALENT_SPRITES.shatterpoint,
  overpressure: TALENT_SPRITES.overpressure,
};

/**
 * The tree panel (T): a tablet centred on screen under its title card. A header line (level, XP, unspent points), the
 * constellation centred `constellationY` px down (node positions from TALENTS), a strip for the hovered node's name and
 * effect (or the hint), and "Reset talents (free)" bottom right, shown only in the foundry. Node sizes are their
 * sprites' diameters; a node is hit within its radius plus `hitPad`. Px from the panel's top-left; text at the top of
 * its capitals.
 */
export const TALENT_PANEL = {
  title: { text: 'Talents', w: 128, h: 22, gap: 4, titleY: 4 },
  /** The centre start's hover line: it has no content lines (039), so the panel says what it is. */
  startText: 'The centre: always yours.',
  w: 300,
  h: 300,
  header: { y: 7 },
  constellationY: 136,
  size: { start: 22, minor: 18, keystone: 26 },
  /**
   * A taken node's halo and an available node's ring are drawn `pad` px wider than the node, their sprites being
   * `sprite` px across at scale 1.
   */
  halo: { pad: 10, sprite: 30 },
  ring: { pad: 4, sprite: 24 },
  /** The lane icon on a node is drawn at this scale of its 16 px frame. */
  iconScale: { start: 1, minor: 0.7, keystone: 0.95 },
  hitPad: 2,
  /** The info area (037): where a node's summary docks (040), above the reset button by `infoGap` px. */
  info: { y: 248 },
  infoGap: 2,
  reset: { w: 104, h: 14, textY: 4, text: 'Reset talents (free)' },
  pad: 8,
  hint: 'Hover a node to read it; click a lit one to take it.',
  /** Text and link colours (palette ids) and alphas for each node state. */
  /** Text and links: taken links glow cyan; the others take their outer node's lane colour (LANE_COLORS), as does the hovered name. */
  colors: { taken: 'cyan', available: 'snow', dim: 'rock-pale', points: 'gold-trim', linkTaken: 'cyan' },
  alpha: { taken: 1, available: 1, dim: 0.38, link: 0.3, linkOpen: 0.55, linkTaken: 1, glow: 0.35 },
  linkWidth: { dim: 1, open: 1, taken: 1.6, glow: 4 },
} as const;

/** The panel's header line: "Level 7 · 120 / 240 XP · 2 points" ("max level" at the cap). */
export function talentHeader(level: number, xp: number, toNext: number, points: number): string {
  const xpText = toNext > 0 ? `${xp} / ${toNext} XP` : 'max level';
  return `Level ${level} · ${xpText} · ${points} point${points === 1 ? '' : 's'}`;
}

/** The level-up line (037): "Level 7 · talent point (T)". */
export const levelUpLine = (level: number): string => `Level ${level} · talent point (T)`;

/**
 * The level-up (037): a cyan ring flashing out from the player (`ring`: scale from → to over `ms`, lifted `lift` px to
 * the body), and the short line centred `lineAbove` px above the bottom HUD's tube slot, holding `holdMs` then fading
 * over `fadeMs`. The XP bar's tick: its fill's end brightens to snow and fades over `tickMs`.
 */
export const LEVEL_UP = {
  ring: { ms: 900, from: 0.6, to: 1.8, lift: 10 },
  lineAbove: 8,
  holdMs: 2200,
  fadeMs: 400,
  tickMs: 300,
  tickWidth: 4,
} as const;

/**
 * The keystones' effects (037): Blastfletch's Pools shimmer (its sprite scaled to the area's radius,
 * `spriteRadius` px at scale 1, breathing between `alpha` over `breatheMs`); Shatterpoint's ice burst grows from →
 * to over `ms`; Overpressure's heat shimmer over the tube's mouth shows from `minRamp` of the ramp, at up to `alpha`.
 */
export const KEYSTONE_LOOK = {
  pool: { spriteRadius: 24, alpha: [0.35, 0.7] as const, breatheMs: 260 },
  /** A Pool-burst: the Pool's sprite flashing out at its radius, from → to over `ms`, `depthAbove` px in front of what it hits. */
  poolBurst: { ms: 320, from: 0.5, to: 1.2, depthAbove: 24 },
  iceBurst: { ms: 550, from: 1.2, to: 2.4, lift: 12, depthAbove: 24 },
  /** `ahead` px along the aim (`aheadY` of it on the ground's y, which reads foreshortened), `wobble` of its width each `wobbleMs`. */
  heat: { minRamp: 0.05, alpha: 1, scale: 1.3, lift: 16, ahead: 22, aheadY: 0.5, wobble: 0.12, wobbleMs: 180, depthAbove: 2 },
} as const;
