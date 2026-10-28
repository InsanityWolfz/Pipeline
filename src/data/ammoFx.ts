import type { PARTICLES } from './juice';
import type { TierId } from './tiers';

// 078: how every round looks in flight and where it lands, as data rows render composes (src/render/fx/roundFx.ts).
// The family sets the shape, the element the colour, the tier the core and glints; a shape row changes the path or
// adds pieces. A new ammo, tag or tier is one row here. Counts are Medium's (FX_QUALITY scales them). Every colour
// is a palette id; no row uses the telegraph reds (`danger`, `hit-red`), and `flame-dark` is only the fire trail's.

/**
 * A burst of particles from a point. `aim`: along the round's flight (`cone` radians round it), straight up (`cone`
 * round that) or all round. `grow` is the size it ends at; `alpha` its starting opacity. `role: 'smoke'` lets an
 * element recolour a blast's smoke. A burst whose life passes `FX_LOOK.sparkMs` lingers, so it draws under telegraphs.
 */
export interface FxBurst {
  readonly colors: readonly string[];
  readonly count: number;
  readonly speed: readonly [number, number];
  readonly aim?: 'flight' | 'up' | 'down' | 'round';
  readonly cone?: number;
  readonly gravity: number;
  readonly lifeMs: readonly [number, number];
  readonly size: number;
  readonly grow?: number;
  readonly alpha?: number;
  readonly lift?: number;
  readonly additive?: boolean;
  readonly role?: 'smoke';
}

/** A flash 078 draws (the ley ring, the arrow's tick, the lightning star): its texture, size px, life ms, frames. None with Flashes off. */
export interface FlashFx {
  readonly look: 'ring' | 'tick' | 'star';
  readonly size: number;
  readonly ms: number;
  readonly frames: number;
  readonly color: string;
  readonly alpha: number;
}

/** A ground mark (scorch, rime, splash): `size` px across, or × the blast's radius with `perRadius`; fades over `ms`. */
export interface MarkFx {
  readonly look: 'scorch' | 'rime' | 'splash';
  readonly color: string;
  readonly size: number;
  readonly perRadius?: boolean;
  readonly alpha: number;
  readonly ms: number;
}

/** A shock ring on the ground growing to the blast's radius over `ms`. */
export interface ShockFx {
  readonly color: string;
  readonly ms: number;
  readonly alpha: number;
}

export type TrailKind = 'streak' | 'ribbon' | 'smoke' | 'tumble' | 'glint';
export type ImpactKind = 'splinter' | 'ley-splash' | 'blast' | 'mine-blast' | 'flick' | 'mini-blast';

export interface FamilyFx {
  /** Ribbons (`streak`, `ribbon`) are `length` px long and `width` wide; the others draw no ribbon. */
  readonly trail: { readonly kind: TrailKind; readonly length: number; readonly width: number; readonly alpha: number; readonly color: string; readonly core: string; readonly additive: boolean };
  /** Soft bits shed in flight, at the tier's trail-bit rate (`smoke`: the fuse smoke's own rate), or none. */
  readonly shed: FxBurst | null;
  readonly shedRate: 'bits' | 'smoke';
  readonly impact: { readonly kind: ImpactKind; readonly bursts: readonly FxBurst[]; readonly ring?: FlashFx; readonly tick?: FlashFx; readonly shock?: ShockFx; readonly mark?: MarkFx };
  /** A straight round that vanished with no hit (a wall, its range), or null for none. */
  readonly end: { readonly bursts: readonly FxBurst[]; readonly ring?: FlashFx; readonly ringScale?: number } | null;
  readonly muzzle: readonly FxBurst[];
  /** A landmine landing (it arms): dust. Turns a second in flight (a tumble). */
  readonly landing?: FxBurst;
  readonly spin?: number;
}

export interface ElementFx {
  readonly trail: { readonly color: string; readonly core: string; readonly additive?: boolean; readonly flicker?: number; readonly jitter?: number };
  readonly shed: FxBurst | null;
  /** Added to every impact; its mark replaces the family's (frost's rime, fire's small scorch); lightning's star. */
  readonly impact: readonly FxBurst[];
  readonly mark?: MarkFx;
  readonly star?: FlashFx;
  /** Blasts: the smoke's colours, bursts added, and the mark that replaces the scorch. */
  readonly blast: { readonly smoke?: readonly string[]; readonly add: readonly FxBurst[]; readonly mark?: MarkFx };
  /** The muzzle sparks' second colour. */
  readonly muzzle: string;
  /** A hit no round can be matched to: today's burst for the element (none: `PHYSICAL_FALLBACK`). */
  readonly fallback?: keyof typeof PARTICLES;
}

/** A hit with no element and no round matched: today's physical hit burst. */
export const PHYSICAL_FALLBACK: keyof typeof PARTICLES = 'hitPhysical';

export interface ShapeFx {
  /** The trail's length, × the family's (homing's long wake). */
  readonly trailScale?: number;
  /** A Split's star and Shards at its hit; a cluster's bomblets at its burst (both drawn elsewhere, kept). */
  readonly split?: boolean;
  readonly cluster?: boolean;
}

export interface TierFx {
  /** The trail's core and its faint edge (High). */
  readonly core: string;
  readonly edge: string;
  readonly impact: readonly FxBurst[];
  readonly muzzle: readonly FxBurst[];
}

export interface AmmoFxTables {
  readonly families: Readonly<Record<string, FamilyFx>>;
  readonly elements: Readonly<Record<string, ElementFx>>;
  readonly shapes: Readonly<Record<string, ShapeFx>>;
  readonly tiers: Readonly<Record<string, TierFx>>;
}

const DEG = Math.PI / 180;
/** Hit height: impacts throw from the round's height, not the ground. */
const HIT_LIFT = 12;

const spark = (colors: readonly string[], count: number, o: Partial<FxBurst> = {}): FxBurst => ({ colors, count, speed: [60, 140], aim: 'round', gravity: 80, lifeMs: [160, 300], size: 2, lift: HIT_LIFT, ...o });
const glints = (colors: readonly string[], count: number): FxBurst => spark(colors, count, { speed: [40, 100], gravity: 40, lifeMs: [120, 220], size: 1 });
const muzzleSparks = (colors: readonly string[], count: number, cone: number): FxBurst => ({ colors, count, speed: [90, 170], aim: 'flight', cone, gravity: 0, lifeMs: [80, 160], size: 1 });
const smoke = (colors: readonly string[], count: number, o: Partial<FxBurst> = {}): FxBurst => ({ colors, count, speed: [8, 22], aim: 'up', cone: 1.2, gravity: -20, lifeMs: [600, 1000], size: 3, grow: 6, alpha: 0.45, role: 'smoke', ...o });
const debris = (count: number): FxBurst => ({ colors: ['rock-dark', 'rock', 'dirt'], count, speed: [60, 160], aim: 'round', gravity: 260, lifeMs: [250, 400], size: 2, lift: 4 });
const dust = (count: number): FxBurst => ({ colors: ['dirt-light', 'dirt'], count, speed: [15, 40], aim: 'round', gravity: 120, lifeMs: [200, 320], size: 1 });
const BOMB_MUZZLE = [smoke(['ash-light', 'ash-pale'], 3, { lifeMs: [300, 400], grow: 4, speed: [10, 30], aim: 'flight', cone: 0.8 }), muzzleSparks(['cinder-light'], 2, 30 * DEG)];
const SCORCH: MarkFx = { look: 'scorch', color: 'ash-dark', size: 0.6, perRadius: true, alpha: 0.35, ms: 1500 };

export const AMMO_FX: AmmoFxTables = {
  families: {
    arrow: {
      trail: { kind: 'streak', length: 28, width: 1.4, alpha: 0.55, color: 'rock-pale', core: 'snow', additive: false },
      shed: null,
      shedRate: 'bits',
      impact: {
        kind: 'splinter',
        bursts: [spark(['wood-light', 'rock-pale', 'snow'], 5, { aim: 'flight', cone: 60 * DEG, speed: [70, 150], gravity: 220, lifeMs: [200, 350] })],
        tick: { look: 'tick', size: 6, ms: 80, frames: 1, color: 'snow', alpha: 0.9 },
      },
      end: { bursts: [dust(2)] },
      muzzle: [muzzleSparks(['snow', 'rock-pale'], 3, 20 * DEG)],
    },
    'ley-bolt': {
      trail: { kind: 'ribbon', length: 22, width: 3, alpha: 0.8, color: 'cyan', core: 'cyan-glow', additive: true },
      shed: { colors: ['cyan-glow', 'cyan'], count: 1, speed: [4, 12], aim: 'round', gravity: -10, lifeMs: [300, 300], size: 1, additive: true },
      shedRate: 'bits',
      impact: {
        kind: 'ley-splash',
        bursts: [spark(['cyan-glow', 'cyan'], 6, { speed: [50, 120], gravity: 60, additive: true })],
        ring: { look: 'ring', size: 10, ms: 120, frames: 2, color: 'cyan-glow', alpha: 0.9 },
        mark: { look: 'splash', color: 'cyan', size: 12, alpha: 0.25, ms: 500 },
      },
      end: { bursts: [spark(['cyan-glow', 'cyan'], 3, { speed: [40, 100], gravity: 60, additive: true })], ring: { look: 'ring', size: 10, ms: 120, frames: 2, color: 'cyan-glow', alpha: 0.9 }, ringScale: 0.6 },
      muzzle: [muzzleSparks(['cyan-glow', 'cyan'], 4, 25 * DEG)],
    },
    bomb: {
      trail: { kind: 'smoke', length: 0, width: 0, alpha: 0, color: 'ash-light', core: 'cinder-light', additive: false },
      shed: { colors: ['ash-light', 'ash-pale'], count: 1, speed: [8, 12], aim: 'up', cone: 0.4, gravity: 0, lifeMs: [500, 500], size: 2, grow: 5, alpha: 0.35, role: 'smoke' },
      shedRate: 'smoke',
      impact: { kind: 'blast', bursts: [debris(10), smoke(['ash-light', 'ash-pale'], 6)], shock: { color: 'rock-pale', ms: 150, alpha: 0.5 }, mark: SCORCH },
      end: null,
      muzzle: BOMB_MUZZLE,
    },
    landmine: {
      trail: { kind: 'tumble', length: 0, width: 0, alpha: 0, color: 'iron-light', core: 'cyan-glow', additive: false },
      shed: null,
      shedRate: 'bits',
      impact: {
        kind: 'mine-blast',
        bursts: [{ colors: ['iron-light', 'iron', 'cyan-glow', 'snow'], count: 14, speed: [60, 160], aim: 'round', gravity: 200, lifeMs: [220, 400], size: 2, lift: 6 }, smoke(['ash-light', 'ash-pale'], 3)],
        shock: { color: 'rock-pale', ms: 120, alpha: 0.5 },
        mark: { ...SCORCH, size: 0.7 },
      },
      end: null,
      muzzle: BOMB_MUZZLE,
      landing: dust(4),
      spin: 1.5,
    },
    shard: {
      trail: { kind: 'ribbon', length: 24, width: 2.5, alpha: 0.85, color: 'cyan', core: 'cyan-glow', additive: true },
      shed: null,
      shedRate: 'bits',
      impact: { kind: 'flick', bursts: [spark(['cyan-glow', 'cyan'], 3, { speed: [40, 90], lifeMs: [120, 240], size: 1, additive: true })] },
      end: null,
      muzzle: [],
    },
    bomblet: {
      trail: { kind: 'glint', length: 0, width: 0, alpha: 0, color: 'cinder-light', core: 'cinder-light', additive: false },
      shed: null,
      shedRate: 'bits',
      impact: { kind: 'mini-blast', bursts: [debris(4), smoke(['ash-light', 'ash-pale'], 2, { lifeMs: [450, 700], grow: 4 })] },
      end: null,
      muzzle: [],
    },
  },
  elements: {
    frost: {
      trail: { color: 'water-light', core: 'snow' },
      shed: { colors: ['foam', 'snow', 'water-light'], count: 1, speed: [3, 10], aim: 'down', cone: 1.4, gravity: 25, lifeMs: [450, 700], size: 1 },
      impact: [spark(['foam', 'snow', 'water-light'], 4, { speed: [40, 100], gravity: 260, lifeMs: [250, 400] })],
      mark: { look: 'rime', color: 'foam', size: 12, alpha: 0.3, ms: 900 },
      blast: { smoke: ['foam', 'snow', 'water-light'], add: [], mark: { look: 'rime', color: 'foam', size: 0.6, perRadius: true, alpha: 0.3, ms: 1500 } },
      muzzle: 'foam',
      fallback: 'hitCold',
    },
    fire: {
      trail: { color: 'flame-dark', core: 'cinder-light', flicker: 0.15 },
      shed: { colors: ['cinder', 'cinder-light'], count: 1, speed: [6, 16], aim: 'up', cone: 1, gravity: -40, lifeMs: [300, 500], size: 1, additive: true },
      impact: [spark(['cinder', 'cinder-light'], 4, { speed: [30, 80], gravity: -70, lifeMs: [250, 400], additive: true })],
      mark: { look: 'scorch', color: 'ash-dark', size: 8, alpha: 0.3, ms: 900 },
      blast: { smoke: ['ash', 'ash-dark'], add: [spark(['cinder', 'cinder-light'], 4, { speed: [30, 90], gravity: -60, lifeMs: [300, 400], lift: 4, additive: true })], mark: { ...SCORCH, alpha: 0.45 } },
      muzzle: 'cinder-light',
      fallback: 'hitFire',
    },
    lightning: {
      trail: { color: 'storm-glow', core: 'snow', additive: true, jitter: 1.5 },
      shed: null,
      impact: [spark(['snow', 'storm-glow', 'cyan-glow'], 4, { speed: [110, 220], gravity: 0, additive: true })],
      star: { look: 'star', size: 9, ms: 90, frames: 2, color: 'snow', alpha: 0.95 },
      blast: { add: [spark(['snow', 'storm-glow', 'cyan-glow'], 4, { speed: [80, 180], gravity: 0, lift: 4, additive: true })] },
      muzzle: 'storm-glow',
      fallback: 'hitLightning',
    },
  },
  shapes: {
    homing: { trailScale: 2 },
    split: { split: true },
    cluster: { cluster: true },
  },
  tiers: {
    steel: { core: 'iron-light', edge: 'snow', impact: [glints(['iron-light', 'snow'], 3)], muzzle: [glints(['snow'], 1)] },
    glass: { core: 'snow', edge: 'foam', impact: [glints(['foam', 'snow', 'cyan-glow'], 3)], muzzle: [glints(['snow'], 1)] },
    stormsteel: { core: 'storm-pale', edge: 'storm-glow', impact: [glints(['storm-glow', 'snow', 'storm-pale'], 3)], muzzle: [glints(['storm-glow'], 1)] },
    'storm-glass': { core: 'snow', edge: 'storm-pale', impact: [glints(['foam', 'storm-pale'], 3), glints(['storm-glow'], 1)], muzzle: [glints(['foam'], 1)] },
  } satisfies Record<TierId, TierFx>,
};

/** The families of a Split's Shard and a cluster's bomblet, which take their parent round's element and tier. */
export const SHARD_FAMILY = 'shard';
export const BOMBLET_FAMILY = 'bomblet';
