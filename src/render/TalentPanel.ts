import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { FOUNDRY_ROOM } from '../data/rooms';
import { KEYSTONE_ICONS, LANE_ICONS, TALENT_PANEL, TALENT_SPRITES, talentHeader } from '../data/talentAssets';
import { TALENT_LIST, TALENTS, type TalentDef } from '../data/talents';
import { xpToNext } from '../sim/leveling';
import type { SimState } from '../sim/state';
import { canTake } from '../sim/talents';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { onRect, talentAt, talentPanelLayout } from './talentLayout';
import { TextLine } from './textLine';
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

/** What a click on the panel asks for. */
export type TalentClick = { take: string } | { respec: true } | { none: true };

interface NodeView {
  def: TalentDef;
  halo: GameObjects.Image;
  ring: GameObjects.Image;
  stone: GameObjects.Image;
  icon: GameObjects.Image | null;
}

/** A node's stone sprite and its icon (none on the start). */
function looksOf(def: TalentDef): { stone: string; icon: string | null; scale: number } {
  const P = TALENT_PANEL;
  if (def.kind === 'start') return { stone: TALENT_SPRITES.start, icon: null, scale: P.iconScale.start };
  if (def.effect.kind === 'keystone') return { stone: TALENT_SPRITES.keystone, icon: KEYSTONE_ICONS[def.effect.rule], scale: P.iconScale.keystone };
  return { stone: TALENT_SPRITES.node, icon: LANE_ICONS[def.lane], scale: P.iconScale.minor };
}

// The tree panel (037, T): the constellation centred on a tablet, five lanes from the
// centre start; taken nodes glow cyan, nodes that can be taken have a bright ring, the
// rest are dim; links between taken nodes glow; keystones are larger rune-stones. The
// header shows the level, XP and unspent points; hovering a node shows its name and
// effect; clicking a lit node takes it; "Reset talents (free)" shows only in the
// foundry. It never pauses the game. Esc or T closes it.
export class TalentPanel {
  private open = false;
  private readonly layout = talentPanelLayout();
  private readonly frame: { setVisible(visible: boolean): unknown }[] = [];
  private readonly links: GameObjects.Graphics;
  private readonly nodes: NodeView[] = [];
  private readonly header: TextLine;
  private readonly name: TextLine;
  private readonly text: TextLine;
  /** The effect's second line, when it doesn't fit on one. */
  private readonly text2: TextLine;
  /** The hovered node whose effect the two lines hold. */
  private wrapped: string | null = null;
  private readonly hint: TextLine;
  private readonly resetBox: GameObjects.Graphics;
  private readonly resetText: TextLine;
  private hovered: string | null = null;
  private state: TalentPanelState = NO_TALENT_PANEL;
  private inFoundry = false;

  constructor(scene: Scene) {
    const P = TALENT_PANEL;
    const L = this.layout;
    const depth = DEPTHS.menu;
    const text = (x: number, y: number, style: 'body' | 'display' | 'title' | 'label' = 'body') => new TextLine(scene, x, y, depth + 3, false, style);
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, d: number): T => {
      o.setScrollFactor(0).setDepth(d);
      return o;
    };
    const tablet = fixed(scene.add.graphics(), depth);
    drawTablet(tablet, L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    const card = fixed(addVector(scene, L.title.x, L.title.y, SPRITES.inventoryTitle).setOrigin(0), depth);
    const title = text(0, L.title.y + P.title.titleY, 'title').set(P.title.text);
    title.moveTo(Math.round(L.title.x + (L.title.w - title.width) / 2), L.title.y + P.title.titleY);
    this.links = fixed(scene.add.graphics(), depth + 1);
    this.header = text(L.header.x, L.header.y);
    this.name = text(L.info.x, L.info.y + P.info.nameY, 'display');
    this.text = text(L.info.x, L.info.y + P.info.textY);
    this.text2 = text(L.info.x, L.info.y + P.info.textY + P.info.lineHeight);
    this.hint = text(L.hint.x, L.hint.y, 'label').set(P.hint).setFill(P.colors.dim);
    this.resetBox = fixed(scene.add.graphics(), depth + 1);
    drawTablet(this.resetBox, L.reset.x, L.reset.y, L.reset.w, L.reset.h);
    this.resetText = text(0, L.reset.y + P.reset.textY, 'label').set(P.reset.text);
    this.resetText.moveTo(Math.round(L.reset.x + (L.reset.w - this.resetText.width) / 2), L.reset.y + P.reset.textY);
    this.frame.push(tablet, card, title, this.links, this.header, this.hint);
    for (const spot of L.nodes) {
      const def = TALENTS[spot.id];
      if (!def) continue;
      const look = looksOf(def);
      const size = spot.r * 2;
      const halo = fixed(addVector(scene, spot.x, spot.y, TALENT_SPRITES.halo).setBlendMode(BlendModes.ADD), depth + 1);
      halo.setScale((halo.scaleX * (size + 10)) / 30);
      const ring = fixed(addVector(scene, spot.x, spot.y, TALENT_SPRITES.ring), depth + 2);
      ring.setScale((ring.scaleX * (size + 4)) / 24);
      const stone = fixed(addVector(scene, spot.x, spot.y, look.stone), depth + 2);
      const icon = look.icon ? fixed(addVector(scene, spot.x, spot.y, look.icon), depth + 3) : null;
      icon?.setScale(icon.scaleX * look.scale);
      this.nodes.push({ def, halo, ring, stone, icon });
    }
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  get shown(): TalentPanelState {
    return this.state;
  }

  setOpen(open: boolean): void {
    this.open = open;
    for (const o of this.frame) o.setVisible(open);
    for (const v of this.nodes) for (const o of [v.halo, v.ring, v.stone, v.icon]) o?.setVisible(open);
    for (const o of [this.name, this.text, this.text2]) o.setVisible(open);
    if (!open) {
      this.hovered = null;
      this.resetBox.setVisible(false);
      this.resetText.setVisible(false);
    }
  }

  /** The node under the pointer, for the hover text (view px). */
  pointAt(x: number, y: number): void {
    this.hovered = this.open ? talentAt(this.layout, x, y) : null;
  }

  /** A view point on the open panel: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    return this.open && (onRect(this.layout.panel, x, y) || onRect(this.layout.title, x, y));
  }

  /** A click: an available node asks to take it; the reset button (in the foundry) asks for a respec. */
  click(x: number, y: number): TalentClick | null {
    if (!this.open) return null;
    if (this.inFoundry && onRect(this.layout.reset, x, y)) return { respec: true };
    const id = talentAt(this.layout, x, y);
    const node = this.state.nodes.find((n) => n.id === id);
    if (id && node?.state === 'available') return { take: id };
    return this.overUi(x, y) ? { none: true } : null;
  }

  /** The hovered node's effect on one line, or broken at a word onto two when it's wider than the strip. */
  private wrap(def: TalentDef | null): void {
    if ((def?.id ?? null) === this.wrapped) return;
    this.wrapped = def?.id ?? null;
    const words = (def?.text ?? '').split(' ');
    const max = this.layout.info.w;
    let cut = words.length;
    while (cut > 1 && this.text.set(words.slice(0, cut).join(' ')).width > max) cut -= 1;
    this.text.set(words.slice(0, cut).join(' '));
    this.text2.set(words.slice(cut).join(' '));
  }

  /** Reads the tree every frame (so the hook can report it); draws it while open. */
  update(sim: SimState): void {
    const P = TALENT_PANEL;
    const L = this.layout;
    this.inFoundry = sim.roomId === FOUNDRY_ROOM;
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
        if (!this.open) continue;
        if (taken) g.lineStyle(P.linkWidth.glow, colorOf(P.colors.linkTaken), P.alpha.glow).lineBetween(a.x, a.y, b.x, b.y);
        const [width, color, alpha] = taken ? [P.linkWidth.taken, P.colors.linkTaken, P.alpha.linkTaken] : open ? [P.linkWidth.open, P.colors.linkOpen, P.alpha.linkOpen] : [P.linkWidth.dim, P.colors.link, P.alpha.link];
        g.lineStyle(width, colorOf(color), alpha).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    this.state = {
      open: this.open,
      header,
      nodes: L.nodes.map((n) => ({ id: n.id, state: states.get(n.id) ?? 'dim', x: n.x, y: n.y, r: n.r })),
      hover: hover ? { id: hover.id, name: hover.name, text: hover.text } : null,
      reset: this.open && this.inFoundry ? { ...L.reset } : null,
      glowingLinks: glowing,
    };
    if (!this.open) return;
    this.header.set(header);
    for (const v of this.nodes) {
      const s = states.get(v.def.id) ?? 'dim';
      v.halo.setVisible(s === 'taken');
      v.ring.setVisible(s === 'available');
      const alpha = P.alpha[s];
      v.stone.setAlpha(alpha);
      v.icon?.setAlpha(alpha);
    }
    this.name.set(hover?.name ?? '').setFill(hover ? P.colors[stateOf(hover.id)] : undefined);
    this.wrap(hover ?? null);
    this.hint.setVisible(!hover);
    this.resetBox.setVisible(this.inFoundry);
    this.resetText.setVisible(this.inFoundry);
  }
}
