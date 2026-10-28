import { MENU_MOTION } from '../data/hudLook';

// 081: the menus' motion as pure curves over tween time, so a test can step them. The tweens that drive them
// (MenuMotion.ts, menuFeedback.ts) only feed in their elapsed ms; the HUD itself has no motion.

/**
 * A new Phaser tween spends its first update taking its start values. Each motion's tween is stepped this far (ms of
 * tween time, silently) when made, so the very next frame moves it and no frame is lost.
 */
export const SEEK_MS = 0.001;

/** Ease out (cubic): fast at first, settling into place. */
export const easeOut = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/** A fade `ms` into a `duration` ms motion, 0 to 1, eased out; done (1) at `duration`. */
export const fadeAt = (ms: number, duration: number): number => (duration <= 0 ? 1 : easeOut(ms / duration));

/** An opening menu's look: its alpha (0 to 1) and how far below its place it still sits, px. */
export interface OpenLook {
  alpha: number;
  rise: number;
}

/**
 * A menu's open (120 ms): the panel and everything in it fade in and rise 4 px into place, as one. Stepping it
 * writes its one `look` object, so it allocates nothing. Reduced motion starts it at its end.
 */
export class OpenMotion {
  readonly look: OpenLook = { alpha: 1, rise: 0 };
  /** Tween ms into the open; `MENU_MOTION.openMs` once settled. */
  ms: number = MENU_MOTION.openMs;

  /** Starts an open: at its first frame, or at its end with reduced motion. */
  start(reduced: boolean): OpenLook {
    return this.at(reduced ? MENU_MOTION.openMs : 0);
  }

  /** The look `ms` in. */
  at(ms: number): OpenLook {
    this.ms = Math.min(MENU_MOTION.openMs, Math.max(0, ms));
    const e = fadeAt(this.ms, MENU_MOTION.openMs);
    this.look.alpha = e;
    this.look.rise = MENU_MOTION.rise * (1 - e);
    return this.look;
  }

  /** Ends it where it would settle (a close, or reduced motion). */
  settle(): OpenLook {
    return this.at(MENU_MOTION.openMs);
  }

  get running(): boolean {
    return this.ms < MENU_MOTION.openMs;
  }
}

/** The menus' motion as drawn, for `ui().menuMotion`: the last menu opened and its open, and the fades so far. */
export interface MenuMotionShown {
  /** The menu that last opened ('' before any). */
  menu: string;
  /** Its open is under way (`ms` of tween time in), or settled. */
  running: boolean;
  ms: number;
  alpha: number;
  rise: number;
  /** How many opens, hover fades and tab fades have started; whether the last open saw reduced motion. */
  opens: number;
  hovers: number;
  tabs: number;
  reduced: boolean;
}

/** The one report every menu's motion writes (one menu opens at a time). */
export const MENU_MOTION_SHOWN: MenuMotionShown = { menu: '', running: false, ms: 0, alpha: 1, rise: 0, opens: 0, hovers: 0, tabs: 0, reduced: false };

/** Whether the player's system asks for reduced motion, read when it's needed (081: at each open, as JuiceView reads it for shake). */
export function reducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
