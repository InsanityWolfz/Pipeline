import type { GameObjects, Scene, Tweens } from 'phaser';
import { MENU_MOTION } from '../data/hudLook';
import { MENU_MOTION_SHOWN, OpenMotion, reducedMotion, SEEK_MS } from './menuCurves';
import type { TextLine } from './textLine';

/**
 * The alpha a menu's container is drawn at: never quite 0, since Phaser takes no input on the children of a container
 * at alpha 0, and a menu takes clicks from its first frame. (0.001 of a pixel shows nothing.)
 */
const shown = (alpha: number): number => Math.max(alpha, 0.001);

/** A menu's part: a game object with a depth, or a line of text. */
type Part = (GameObjects.GameObject & GameObjects.Components.Depth) | TextLine;

/**
 * A menu's motion (081): its parts in one Container (scroll factor 0, at the menu's depth, children ordered by their
 * own depths), so the open's fade and 4 px rise move them as one while each part keeps its own x, y and alpha (what
 * `ui()` reads is the final layout from the first frame). Opens in 120 ms on tween time, closes at once, and lands at
 * once with reduced motion. A tab layer (a child container) fades its rows in on a tab switch. Tweens are made on
 * those events only; nothing here runs per frame.
 */
export class MenuMotion {
  readonly root: GameObjects.Container;
  private readonly scene: Scene;
  private readonly name: string;
  private readonly open = new OpenMotion();
  private tween: Tweens.Tween | null = null;
  private layer: GameObjects.Container | null = null;
  private tabTween: Tweens.Tween | null = null;

  constructor(scene: Scene, name: string, depth: number) {
    this.scene = scene;
    this.name = name;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  }

  /** Takes these parts into the menu, kept in depth order. */
  adopt(parts: readonly Part[], into: GameObjects.Container = this.root): this {
    for (const p of parts) into.add('obj' in p ? p.obj : p);
    into.sort('depth');
    if (into !== this.root) this.root.sort('depth');
    return this;
  }

  /** The layer a tab's rows sit in (made on first ask, at `depth` among the menu's parts). */
  tabLayer(depth: number): GameObjects.Container {
    if (!this.layer) {
      this.layer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
      this.root.add(this.layer);
      this.root.sort('depth');
    }
    return this.layer;
  }

  /** The menu opened: it fades in and rises into place (at once with reduced motion). Input is live throughout. */
  show(): void {
    this.stop();
    const reduced = reducedMotion();
    const look = this.open.start(reduced);
    this.root.setAlpha(shown(look.alpha)).setY(look.rise);
    const R = MENU_MOTION_SHOWN;
    R.menu = this.name;
    R.opens++;
    R.reduced = reduced;
    this.report();
    if (reduced) return;
    this.tween = this.scene.tweens.addCounter({ from: 0, to: MENU_MOTION.openMs, duration: MENU_MOTION.openMs, ease: 'Linear', onUpdate: this.onOpen, onComplete: this.onDone });
    // A new tween spends its first update taking its start values; stepping it past that now (silently, by a hair)
    // lets the very next frame move the menu, so no frame is lost to the open.
    this.tween.seek(SEEK_MS);
  }

  /** The menu closed: gone at once, nothing left running. */
  hide(): void {
    this.stop();
    const look = this.open.settle();
    this.root.setAlpha(shown(look.alpha)).setY(look.rise);
    this.layer?.setAlpha(1);
    if (MENU_MOTION_SHOWN.menu === this.name) this.report();
  }

  /** A tab switch: the new tab's rows fade in (80 ms); the panel doesn't re-open. */
  switchTab(): void {
    if (!this.layer) return;
    this.tabTween?.stop();
    this.tabTween = null;
    MENU_MOTION_SHOWN.tabs++;
    if (reducedMotion()) {
      this.layer.setAlpha(1);
      return;
    }
    this.layer.setAlpha(shown(0));
    this.tabTween = this.scene.tweens.add({ targets: this.layer, alpha: 1, duration: MENU_MOTION.tabMs, ease: 'Cubic.easeOut', onComplete: this.onTabDone }).seek(SEEK_MS);
  }

  private readonly onOpen = (tween: Tweens.Tween): void => {
    const look = this.open.at(tween.getValue() ?? MENU_MOTION.openMs);
    this.root.setAlpha(shown(look.alpha)).setY(look.rise);
    this.report();
  };

  private readonly onDone = (): void => {
    this.tween = null;
    const look = this.open.settle();
    this.root.setAlpha(shown(look.alpha)).setY(look.rise);
    this.report();
  };

  private readonly onTabDone = (): void => {
    this.tabTween = null;
  };

  private stop(): void {
    this.tween?.stop();
    this.tween = null;
    this.tabTween?.stop();
    this.tabTween = null;
  }

  private report(): void {
    const R = MENU_MOTION_SHOWN;
    R.running = this.open.running;
    R.ms = this.open.ms;
    R.alpha = this.open.look.alpha;
    R.rise = this.open.look.rise;
  }
}
