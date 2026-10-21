import { ITEMS } from '../data/items';
import type { GameObjects, Scene, Textures } from 'phaser';
import { DEPTHS, OVERWORLD_TEXTURES } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import { MINIMAP } from '../data/minimap';
import { OVERWORLD } from '../data/overworld';
import { HOLLOWS, inHollows } from '../data/hollows';
import { LANDMARK_LIST, type LandmarkMarker } from '../data/landmarks';
import { MAP_ICONS } from '../data/landmarkAssets';
import type { Room } from '../data/rooms';
import { revealed } from '../sim/fog';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { inkCss } from './vector/draw';
import { addVector, textureScale } from './vector/textures';

// The minimap (017): the overworld's ground in the top-right corner, with the player, and each place as an icon once
// it's been seen. 051 (B.5): a fog of war hides every tile never on screen (src/sim/fog.ts); water, trees and rocks
// are off it; the foundry's stairs, the shrine's pylon and the Bulwark's arena show as icons once their tile is
// revealed, a landmark once discovered (032), a claimed pylon as its cyan dot; hovering one names it.
// Hidden in the foundry (the foundry's own map takes its place, 051 B.6), and never takes clicks meant for the world.

export interface MinimapMarker {
  /** A dot (MINIMAP.markers), a place's icon (MINIMAP.icons) or a discovered landmark's icon (032). */
  kind: keyof typeof MINIMAP.markers | keyof typeof MINIMAP.icons | LandmarkMarker;
  /** The landmark an icon marks (032). */
  landmark?: string;
  /** 051: what hovering it says (none for the player and schematics). */
  name?: string;
  /** View px. */
  x: number;
  y: number;
}

/** The icon frame a marker kind shows, if it's an icon. */
const iconOf = (kind: MinimapMarker['kind']): string | undefined =>
  kind in MINIMAP.icons ? MAP_ICONS[MINIMAP.icons[kind as keyof typeof MINIMAP.icons]] : kind in MAP_ICONS ? MAP_ICONS[kind as LandmarkMarker] : undefined;

export class MinimapView {
  private readonly frame: GameObjects.Graphics;
  private readonly map: GameObjects.Image;
  private readonly fog: GameObjects.Image;
  private readonly fogTex: Textures.CanvasTexture | null;
  private readonly marks: GameObjects.Graphics;
  private readonly label: TextLine;
  private readonly labelPanel: GameObjects.Graphics;
  /** Each icon on show, by its marker's key, made on first sight. */
  private readonly icons = new Map<string, GameObjects.Image>();
  private readonly scene: Scene;
  private readonly x: number;
  private readonly y: number;
  /** Texels per tile in the map's textures. */
  private readonly k: number;
  /** The fog words already cleared on the fog texture. */
  private drawnFog: number[] = [];
  private pointer: { x: number; y: number } | null = null;
  /** What it shows now, for the test hook. */
  shown = false;
  markers: MinimapMarker[] = [];
  /** 051: the name hovering shows, or null. */
  hover: string | null = null;

  constructor(scene: Scene, room: Room) {
    this.scene = scene;
    const w = room.rows[0]?.length ?? 0;
    const h = room.rows.length;
    // Each tile is a crisp square of `k` texels, drawn at the screen's scale (020: no nearest filtering).
    const k = Math.max(1, Math.ceil(MINIMAP.scale * textureScale()));
    this.k = k;
    const tex = scene.textures.exists(OVERWORLD_TEXTURES.minimap) ? null : scene.textures.createCanvas(OVERWORLD_TEXTURES.minimap, w * k, h * k);
    if (tex) {
      for (const [ty, row] of room.rows.entries()) {
        for (const [tx, symbol] of [...row].entries()) {
          tex.context.fillStyle = inkCss((inHollows(tx, ty) ? MINIMAP.hollowsTerrain[symbol] : undefined) ?? MINIMAP.terrain[symbol] ?? 'grass-bright');
          tex.context.fillRect(tx * k, ty * k, k, k);
        }
      }
      tex.refresh();
    }
    // 051: the fog over it, a tile cleared as it's revealed.
    const old = scene.textures.exists(OVERWORLD_TEXTURES.minimapFog);
    if (old) scene.textures.remove(OVERWORLD_TEXTURES.minimapFog);
    this.fogTex = scene.textures.createCanvas(OVERWORLD_TEXTURES.minimapFog, w * k, h * k);
    if (this.fogTex) {
      this.fogTex.context.fillStyle = inkCss(MINIMAP.fog);
      this.fogTex.context.fillRect(0, 0, w * k, h * k);
      this.fogTex.refresh();
    }
    const width = w * MINIMAP.scale;
    const height = h * MINIMAP.scale;
    this.x = VIEW_WIDTH - MINIMAP.margin - width;
    this.y = MINIMAP.margin;
    const f = MINIMAP.frame;
    this.frame = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    drawTablet(this.frame, this.x - f.width, this.y - f.width, width + f.width * 2, height + f.width * 2);
    this.map = scene.add.image(this.x, this.y, OVERWORLD_TEXTURES.minimap).setOrigin(0).setScale(MINIMAP.scale / k).setScrollFactor(0).setDepth(DEPTHS.hud + 1);
    this.fog = scene.add.image(this.x, this.y, OVERWORLD_TEXTURES.minimapFog).setOrigin(0).setScale(MINIMAP.scale / k).setScrollFactor(0).setDepth(DEPTHS.hud + 1.2);
    this.marks = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud + 2);
    this.labelPanel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud + 3);
    this.label = new TextLine(scene, 0, 0, DEPTHS.hud + 4, false, 'body');
  }

  /** The pointer in view px (051: hovering an icon names it), or null off the screen. */
  pointAt(x: number, y: number): void {
    this.pointer = { x, y };
  }

  update(sim: SimState): void {
    this.shown = sim.roomId === OVERWORLD.id;
    for (const o of [this.frame, this.map, this.fog, this.marks]) o.setVisible(this.shown);
    if (!this.shown) {
      for (const icon of this.icons.values()) icon.setVisible(false);
      this.markers = [];
      this.showLabel(null);
      return;
    }
    this.clearFog(sim.fog);
    const at = (px: number, py: number) => ({ x: this.x + (px / TILE_SIZE) * MINIMAP.scale, y: this.y + (py / TILE_SIZE) * MINIMAP.scale });
    const tile = (t: { tx: number; ty: number }) => at((t.tx + 0.5) * TILE_SIZE, (t.ty + 0.5) * TILE_SIZE);
    const seen = (t: { tx: number; ty: number }) => revealed(sim.fog, t.tx, t.ty);
    const shrineClaimed = sim.claims.includes(OVERWORLD.shrine.site);
    const arena = HOLLOWS.arena;
    // A landmark shows only once discovered (032): its icon, or the cyan claimed dot on its pylon once claimed.
    const landmarks: MinimapMarker[] = LANDMARK_LIST.filter((l) => sim.discovered.includes(l.id)).map((l) =>
      l.pylon && sim.claims.includes(l.pylon.site)
        ? { kind: 'claimed', landmark: l.id, name: l.name, ...tile(l.pylon) }
        : { kind: l.marker, landmark: l.id, name: l.name, ...at(((l.area.x0 + l.area.x1 + 1) / 2) * TILE_SIZE, ((l.area.y0 + l.area.y1 + 1) / 2) * TILE_SIZE) },
    );
    const arenaMid = { tx: Math.floor((arena.bounds.x0 + arena.bounds.x1) / 2), ty: Math.floor((arena.bounds.y0 + arena.bounds.y1) / 2) };
    this.markers = [
      ...(seen(OVERWORLD.entrance.door) ? [{ kind: 'entrance' as const, name: MINIMAP.names.entrance, ...tile(OVERWORLD.entrance.door) }] : []),
      ...(seen(OVERWORLD.shrine.pylon) ? [{ kind: shrineClaimed ? ('claimed' as const) : ('shrine' as const), name: MINIMAP.names.shrine, ...tile(OVERWORLD.shrine.pylon) }] : []),
      ...(seen(arenaMid) || seen(arena.start) ? [{ kind: 'arena' as const, name: arena.name, ...tile(arenaMid) }] : []),
      ...landmarks,
      // 033: a ping over each schematic lying on the ground out here.
      ...sim.groundItems.filter((g) => g.roomId === OVERWORLD.id && ITEMS[g.itemId]?.kind === 'schematic').map((g): MinimapMarker => ({ kind: 'schematic', ...at(g.x, g.y) })),
      { kind: 'player', ...at(sim.player.x, sim.player.y) },
    ];
    this.drawIcons();
    this.marks.clear();
    for (const m of this.markers) {
      if (!(m.kind in MINIMAP.markers)) continue;
      const style = MINIMAP.markers[m.kind as keyof typeof MINIMAP.markers];
      this.marks.fillStyle(colorOf('ink'), 1).fillCircle(m.x, m.y, style.r + 1);
      this.marks.fillStyle(colorOf(style.color), 1).fillCircle(m.x, m.y, style.r);
      if (m.kind !== 'schematic') continue;
      const P = MINIMAP.ping;
      const t = (this.scene.time.now % P.ms) / P.ms;
      this.marks.lineStyle(P.width, colorOf(P.color), 1 - t).strokeCircle(m.x, m.y, style.r + P.reach * t);
    }
    const p = this.pointer;
    const hovered = p ? this.markers.filter((m) => m.name && Math.hypot(m.x - p.x, m.y - p.y) <= MINIMAP.hover.reach).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : undefined;
    this.showLabel(hovered ?? null);
  }

  /** Clears the fog texture over every tile revealed since the last draw. */
  private clearFog(fog: readonly number[]): void {
    const tex = this.fogTex;
    if (!tex) return;
    let changed = false;
    for (const [w, bits] of fog.entries()) {
      const was = this.drawnFog[w] ?? 0;
      if (bits === was) continue;
      const fresh = (bits & ~was) >>> 0;
      for (let b = 0; b < 32; b++) {
        if (((fresh >>> b) & 1) === 0) continue;
        const i = w * 32 + b;
        tex.context.clearRect((i % OVERWORLD.width) * this.k, Math.floor(i / OVERWORLD.width) * this.k, this.k, this.k);
      }
      this.drawnFog[w] = bits;
      changed = true;
    }
    if (changed) tex.refresh();
  }

  /** Icons: one image per icon marker on show, under the dots. */
  private drawIcons(): void {
    const shownKeys = new Set<string>();
    for (const m of this.markers) {
      const frame = iconOf(m.kind);
      if (!frame) continue;
      const key = m.landmark ?? m.kind;
      shownKeys.add(key);
      let icon = this.icons.get(key);
      if (!icon || icon.frame.name !== frame) {
        icon?.destroy();
        icon = addVector(this.scene, m.x, m.y, frame).setScrollFactor(0).setDepth(DEPTHS.hud + 1.5);
        icon.setScale(icon.scaleX * MINIMAP.landmarkScale);
        this.icons.set(key, icon);
      }
      icon.setPosition(m.x, m.y).setVisible(true);
    }
    for (const [key, icon] of this.icons) if (!shownKeys.has(key)) icon.setVisible(false);
  }

  /** The hovered marker's name in a small tablet left of the map, level with it; hidden for null. */
  private showLabel(m: MinimapMarker | null): void {
    this.hover = m?.name ?? null;
    this.label.setVisible(m !== null);
    this.labelPanel.clear();
    if (!m?.name) return;
    const H = MINIMAP.hover;
    this.label.set(m.name);
    const w = this.label.width + 2 * H.pad;
    const h = this.label.lineHeight + 2 * H.pad;
    const x = Math.round(this.x - MINIMAP.frame.width - H.gap - w);
    const y = Math.round(m.y - h / 2);
    drawTablet(this.labelPanel, x, y, w, h);
    this.label.moveTo(x + H.pad, y + H.pad);
  }
}
