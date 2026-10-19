import type { GameObjects, Scene } from 'phaser';
import { portPerMinute } from '../data/claims';
import { TILE_SIZE } from '../data/config';
import { portPlate } from '../data/descriptions';
import { FOUNDRY_LAYOUT, PORT_LOOK } from '../data/foundryAssets';
import { itemDef } from '../data/items';
import { FOUNDRY_ROOM } from '../data/rooms';
import { pylonsOf } from '../sim/claims';
import { fixtureDef } from '../sim/fixtures';
import type { SimState } from '../sim/state';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** A port as drawn, for the test hook: its raw, the icon frame on its face and its plate's text. */
export interface PortShown {
  raw: string;
  icon: string;
  plate: string;
}

interface PortParts {
  icon: GameObjects.Image;
  plate: GameObjects.Graphics;
  text: TextLine;
  /** The plate's text as last drawn, so it's only redrawn when it changes. */
  shown: string;
}

// The supply ports' faces and plates (028). SiteView draws each port's body; this
// puts its raw's icon on the round face, and hangs a small plate under it reading
// how many pylons feed it and its rate ("×1 pylon · 15/min").
export class PortView {
  private readonly scene: Scene;
  private readonly parts = new Map<string, PortParts>();
  /** What shows, for the test hook. */
  shown: PortShown[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(sim: SimState, shown: string): void {
    const here = shown === FOUNDRY_ROOM;
    this.shown = [];
    for (const f of here ? sim.fixtures : []) {
      const def = fixtureDef(f.id);
      if (def.kind !== 'port' || def.raw === undefined) continue;
      const parts = this.parts.get(f.id) ?? this.create(f.id, def.raw, def);
      const pylons = pylonsOf(sim, f);
      const text = portPlate(pylons, portPerMinute(pylons));
      if (text !== parts.shown) this.drawPlate(parts, text, def);
      for (const o of [parts.icon, parts.plate, parts.text]) o.setVisible(true);
      this.shown.push({ raw: def.raw, icon: itemDef(def.raw).icon, plate: text });
    }
    const live = new Set(here ? sim.fixtures.map((f) => f.id) : []);
    for (const [id, p] of this.parts) if (!live.has(id)) for (const o of [p.icon, p.plate, p.text]) o.setVisible(false);
  }

  /** The icon on a port's face, in front of the port's body, and its plate's parts. */
  private create(id: string, raw: string, at: { tx: number; ty: number }): PortParts {
    const x = (at.tx + 0.5) * TILE_SIZE;
    const bottom = (at.ty + 1) * TILE_SIZE;
    const icon = addVector(this.scene, x + PORT_LOOK.face.x, bottom + PORT_LOOK.face.y, itemDef(raw).icon);
    icon.setScale(icon.scaleX * PORT_LOOK.iconScale).setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge);
    // The plate lies on the floor below the port: pieces standing south of it draw over it.
    const plate = this.scene.add.graphics();
    const text = new TextLine(this.scene, 0, 0, bottom, true, 'label');
    const parts = { icon, plate, text, shown: '' };
    this.parts.set(id, parts);
    return parts;
  }

  /** The plate's tablet sized to its text, centred under the port. */
  private drawPlate(parts: PortParts, text: string, at: { tx: number; ty: number }): void {
    const { platePad: pad, plateGap, plateAlpha } = PORT_LOOK;
    parts.shown = text;
    parts.text.set(text);
    const x = (at.tx + 0.5) * TILE_SIZE;
    const top = (at.ty + 1) * TILE_SIZE + plateGap;
    const w = Math.ceil(parts.text.width) + 2 * pad.x;
    const h = parts.text.lineHeight + 2 * pad.y;
    const left = Math.round(x - w / 2);
    const depth = top + h;
    parts.plate.clear().setDepth(depth);
    drawTablet(parts.plate, left, top, w, h, plateAlpha);
    parts.text.moveTo(left + pad.x, top + pad.y + 1);
    parts.text.obj.setDepth(depth + FOUNDRY_LAYOUT.onTopNudge);
  }
}
