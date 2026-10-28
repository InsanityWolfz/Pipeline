import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { respecHere } from '../sim/talents';
import { KEYSTONE_ICONS, LANE_ICONS, NODE_ICONS, TALENT_PANEL, TALENT_SPRITES, talentHeader } from '../data/talentAssets';
import { LANE_COLORS, TALENT_LIST, TALENTS, type TalentDef } from '../data/talents';
import { linesText } from '../data/rulesText';
import { xpToNext } from '../sim/leveling';
import type { SimState } from '../sim/state';
import { canTake } from '../sim/talents';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { MenuMotion } from './MenuMotion';
import { onRect, talentAt, talentPanelLayout } from './talentLayout';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import type { ChipId, TalentTab } from '../data/legibility';
import { BuildTab, type BuildTabState } from './BuildTab';
import { TalentTabs } from './TalentTabs';
import { addVector } from './vector/textures';

export type TalentNodeState = 'taken' | 'available' | 'dim';

/** The tree panel as drawn (037), for `ui().talents`: open, the header, each node's state and spot, the hover, the reset button and glowing links. */
export interface TalentPanelState {
  open: boolean;
  header: string;
  nodes: { id: string; state: TalentNodeState; x: number; y: number; r: number }[];
  hover: { id: string; name: string; text: string } | null;
  /** The reset button's box while it shows (only in the foundry), else null. */
  reset: ScreenBox | null;
  glowingLinks: number;
}

export const NO_TALENT_PANEL: TalentPanelState = { open: false, header: '', nodes: [], hover: null, reset: null, glowingLinks: 0 };

/** 040: which tab the panel shows, for `ui().talentPanel`. */
export interface TalentTabState {
  open: boolean;
  tab: TalentTab;
  /** The tabs on the title card, view px, and the panel's box (it moves left in the Build tab). */
  tabs: { id: TalentTab; box: ScreenBox }[];
  panel: ScreenBox;
}

/** What a click on the panel asks for. */
export type TalentClick = { take: string } | { respec: true } | { none: true };

interface NodeView {
  def: TalentDef;
  halo: GameObjects.Image;
  ring: GameObjects.Image;
  stone: GameObjects.Image;
  icon: GameObjects.Image | null;
}

/** A node's hover text (039): its content lines, generated; the start's own line. */
const talentText = (def: TalentDef): string => (def.kind === 'start' ? TALENT_PANEL.startText : linesText(def.lines));

/** A node's stone sprite and its icon (none on the start). */
function looksOf(def: TalentDef): { stone: string; icon: string | null; scale: number } {
  const P = TALENT_PANEL;
  if (def.kind === 'start') return { stone: TALENT_SPRITES.start, icon: null, scale: P.iconScale.start };
  if (def.keystone) return { stone: TALENT_SPRITES.keystone, icon: KEYSTONE_ICONS[def.keystone], scale: P.iconScale.keystone };
  return { stone: TALENT_SPRITES.node, icon: NODE_ICONS[def.id] ?? LANE_ICONS[def.lane], scale: P.iconScale.minor };
}

// The tree panel (037, T): the constellation centred on a tablet, five lanes from the
// centre start; taken nodes glow cyan, nodes that can be taken have a bright ring, the
// rest are dim; links between taken nodes glow; keystones are larger rune-stones. The
// header shows the level, XP and unspent points; hovering a node shows its name and
// effect; clicking a lit node takes it; "Reset talents (free)" shows only in the
// foundry. It never pauses the game. Esc or T closes it. 040: its title card's tabs switch
// between the tree and the Build tab, which it remembers while the game runs; a hovered
// node's summary is the legibility tablet, docked in the info area.
export class TalentPanel {
  private open = false;
  /** Each tab's layout: the Build tab moves the panel left so a breakdown fits beside it (040). */
  private readonly layouts = { talents: talentPanelLayout('talents'), build: talentPanelLayout('build') };
  private tab: TalentTab = 'talents';
  private readonly tablet: GameObjects.Graphics;
  private readonly tabs: TalentTabs;
  private readonly buildTab: BuildTab;
  private readonly links: GameObjects.Graphics;
  private readonly nodes: NodeView[] = [];
  private readonly header: TextLine;
  private readonly hint: TextLine;
  private readonly resetBox: GameObjects.Graphics;
  private readonly resetText: TextLine;
  private hovered: string | null = null;
  private state: TalentPanelState = NO_TALENT_PANEL;
  private inFoundry = false;
  /** 081: the open's fade and rise; the tree and the Build tab fade in on a tab switch. */
  private readonly motion: MenuMotion;

  constructor(scene: Scene) {
    const P = TALENT_PANEL;
    const L = this.layouts.talents;
    const depth = DEPTHS.menu;
    const text = (x: number, y: number, style: 'body' | 'display' | 'title' | 'label' = 'body') => new TextLine(scene, x, y, depth + 3, false, style);
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, d: number): T => {
      o.setScrollFactor(0).setDepth(d);
      return o;
    };
    this.tablet = fixed(scene.add.graphics(), depth);
    this.tabs = new TalentTabs(scene, depth);
    this.buildTab = new BuildTab(scene, depth + 1);
    this.links = fixed(scene.add.graphics(), depth + 1);
    this.header = text(L.header.x, L.header.y);
    this.hint = text(L.hint.x, L.hint.y, 'label').set(P.hint).setFill(P.colors.dim);
    this.resetBox = fixed(scene.add.graphics(), depth + 1);
    drawTablet(this.resetBox, L.reset.x, L.reset.y, L.reset.w, L.reset.h);
    this.resetText = text(0, L.reset.y + P.reset.textY, 'label').set(P.reset.text);
    this.resetText.moveTo(Math.round(L.reset.x + (L.reset.w - this.resetText.width) / 2), L.reset.y + P.reset.textY);
    for (const spot of L.nodes) {
      const def = TALENTS[spot.id];
      if (!def) continue;
      const look = looksOf(def);
      const size = spot.r * 2;
      const halo = fixed(addVector(scene, spot.x, spot.y, TALENT_SPRITES.halo).setBlendMode(BlendModes.ADD), depth + 1);
      halo.setScale((halo.scaleX * (size + P.halo.pad)) / P.halo.sprite);
      const ring = fixed(addVector(scene, spot.x, spot.y, TALENT_SPRITES.ring), depth + 2);
      ring.setScale((ring.scaleX * (size + P.ring.pad)) / P.ring.sprite);
      const stone = fixed(addVector(scene, spot.x, spot.y, look.stone), depth + 2);
      const icon = look.icon ? fixed(addVector(scene, spot.x, spot.y, look.icon), depth + 3) : null;
      icon?.setScale(icon.scaleX * look.scale);
      this.nodes.push({ def, halo, ring, stone, icon });
    }
    this.motion = new MenuMotion(scene, 'talents', depth).adopt([this.tablet, this.header, ...this.tabs.parts]);
    const tree = this.nodes.flatMap((v) => (v.icon ? [v.halo, v.ring, v.stone, v.icon] : [v.halo, v.ring, v.stone]));
    this.motion.adopt([this.links, this.hint, this.resetBox, this.resetText, ...tree, ...this.buildTab.parts], this.motion.tabLayer(depth + 1));
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  get shown(): TalentPanelState {
    return this.state;
  }

  /** The open tab's layout. */
  private get layout() {
    return this.layouts[this.tab];
  }

  /** Which tab shows (040). */
  get tabState(): TalentTabState {
    return { open: this.open, tab: this.tab, tabs: this.layout.tabs.map((t) => ({ id: t.id, box: { ...t.box } })), panel: { ...this.layout.panel } };
  }

  /** The Build tab's rows while it shows (040). */
  get buildRows(): BuildTabState {
    return this.buildTab.state;
  }

  setOpen(open: boolean): void {
    if (open && !this.open) this.motion.show();
    if (!open) this.motion.hide();
    this.open = open;
    this.showParts();
    if (!open) this.hovered = null;
  }

  /** Shows what the open tab draws: the frame always, the tree's parts in the Talents tab (the Build tab draws its own). */
  private showParts(): void {
    const tree = this.open && this.tab === 'talents';
    for (const o of [this.tablet, this.header]) o.setVisible(this.open);
    this.tabs.setVisible(this.open);
    for (const o of [this.links, this.hint]) o.setVisible(tree);
    for (const v of this.nodes) for (const o of [v.halo, v.ring, v.stone, v.icon]) o?.setVisible(tree);
    if (!tree) {
      this.resetBox.setVisible(false);
      this.resetText.setVisible(false);
    }
  }

  /** The node under the pointer, for the hover text (view px); a tab or a Build tab row lights. */
  pointAt(x: number, y: number): void {
    this.hovered = this.open && this.tab === 'talents' ? talentAt(this.layout, x, y) : null;
    if (this.open) this.tabs.pointAt(this.layout, x, y);
    this.buildTab.pointAt(x, y);
  }

  /** A Build tab row's chip under a view point (040: it opens its glossary entry). */
  chipAt(x: number, y: number): ChipId | null {
    return this.open && this.tab === 'build' ? this.buildTab.chipAt(x, y) : null;
  }

  /** A view point on the open panel: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.open && (onRect(this.layout.panel, x, y) || onRect(this.layout.title, x, y));
  }

  /** A click: an available node asks to take it; the reset button (in the foundry) asks for a respec. */
  click(x: number, y: number): TalentClick | null {
    if (!this.open) return null;
    const tab = this.tabs.tabAt(this.layout, x, y);
    if (tab) {
      if (tab !== this.tab) this.motion.switchTab();
      this.tab = tab;
      this.hovered = null;
      this.showParts();
      return { none: true };
    }
    if (this.tab === 'build') return this.overUi(x, y) ? { none: true } : null;
    if (this.inFoundry && onRect(this.layout.reset, x, y)) return { respec: true };
    const id = talentAt(this.layout, x, y);
    const node = this.state.nodes.find((n) => n.id === id);
    if (id && node?.state === 'available') return { take: id };
    return this.overUi(x, y) ? { none: true } : null;
  }

  /**
   * The node under a view point (040): its summary docks in the panel's info area, the bottom strip (037), on the side
   * away from the node, growing up.
   */
  tipAt(x: number, y: number): TipHit | null {
    if (this.open && this.tab === 'build') return this.buildTab.tipAt(x, y);
    const id = this.open ? talentAt(this.layout, x, y) : null;
    const spot = this.layout.nodes.find((n) => n.id === id);
    if (!id || !spot) return null;
    const L = this.layout;
    const at = { x: spot.x - spot.r, y: spot.y - spot.r, w: 2 * spot.r, h: 2 * spot.r };
    // The summary docks in the info strip, never taller than it, so it never covers a node; in the foundry it stays
    // left of the reset button, so a click there always respecs.
    const dock = this.inFoundry ? { ...L.info, w: L.reset.x - TALENT_PANEL.info.gap - L.info.x } : L.info;
    return { source: { kind: 'talent', id }, at, anchor: { box: at, prefer: [], dock }, maxH: dock.h, maxW: dock.w };
  }

  /** Reads the tree every frame (so the hook can report it); draws it while open. */
  update(sim: SimState): void {
    const P = TALENT_PANEL;
    const L = this.layout;
    this.inFoundry = respecHere(sim);
    const stateOf = (id: string): TalentNodeState => (sim.talents.includes(id) ? 'taken' : canTake(sim, id) ? 'available' : 'dim');
    const states = new Map(TALENT_LIST.map((t) => [t.id, stateOf(t.id)]));
    const header = talentHeader(sim.level, sim.xp, xpToNext(sim), sim.talentPoints);
    const hover = this.hovered ? TALENTS[this.hovered] : undefined;
    let glowing = 0;
    const g = this.links.clear();
    for (const t of TALENT_LIST) {
      for (const l of t.links) {
        if (l < t.id) continue;
        const a = L.nodes.find((n) => n.id === t.id);
        const b = L.nodes.find((n) => n.id === l);
        if (!a || !b) continue;
        const sa = states.get(t.id);
        const sb = states.get(l);
        const taken = sa === 'taken' && sb === 'taken';
        const open = !taken && (sa === 'taken' || sb === 'taken');
        if (taken) glowing += 1;
        if (!this.open || this.tab !== 'talents') continue;
        if (taken) g.lineStyle(P.linkWidth.glow, colorOf(P.colors.linkTaken), P.alpha.glow).lineBetween(a.x, a.y, b.x, b.y);
        // Untaken links in their lane's colour: the start's take the lane they lead into, a keystone's the lane they come from.
        const lane = LANE_COLORS[(t.kind === 'start' ? TALENTS[l] : t)?.lane ?? 'centre'];
        const [width, color, alpha] = taken ? [P.linkWidth.taken, P.colors.linkTaken, P.alpha.linkTaken] : open ? [P.linkWidth.open, lane, P.alpha.linkOpen] : [P.linkWidth.dim, lane, P.alpha.link];
        g.lineStyle(width, colorOf(color), alpha).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    this.state = {
      open: this.open,
      header,
      nodes: L.nodes.map((n) => ({ id: n.id, state: states.get(n.id) ?? 'dim', x: n.x, y: n.y, r: n.r })),
      hover: hover ? { id: hover.id, name: hover.name, text: talentText(hover) } : null,
      reset: this.open && this.inFoundry ? { ...L.reset } : null,
      glowingLinks: glowing,
    };
    this.buildTab.update(sim, this.open && this.tab === 'build' ? L.panel : null);
    if (!this.open) return;
    this.tablet.clear();
    drawTablet(this.tablet, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    this.tabs.draw(L, this.tab);
    this.header.set(header).moveTo(L.header.x, L.header.y);
    if (this.tab !== 'talents') return;
    for (const v of this.nodes) {
      const s = states.get(v.def.id) ?? 'dim';
      v.halo.setVisible(s === 'taken');
      v.ring.setVisible(s === 'available');
      const alpha = P.alpha[s];
      v.stone.setAlpha(alpha);
      v.icon?.setAlpha(alpha);
    }
    // The hovered node's summary is the legibility tablet's (040), docked in the info area; the hint shows without one.
    this.hint.setVisible(!hover);
    this.resetBox.setVisible(this.inFoundry);
    this.resetText.setVisible(this.inFoundry);
  }
}
