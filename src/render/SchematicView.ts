import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { ITEMS, itemDef } from '../data/items';
import { RESEARCH_LOOK, RESEARCH_SPRITES, SCHEMATIC_BANNER } from '../data/researchAssets';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import type { Banner } from './Banner';
import { colorOf } from './color';
import { shownItem, shownKey } from './itemShown';
import { addVector } from './vector/textures';

/** What the schematic view shows, for the test hook: the light pillars standing, and the banner's schematic line while it shows. */
export interface SchematicsShown {
  pillars: { x: number; y: number }[];
  banner: { kicker: string; name: string } | null;
}

export const NO_SCHEMATICS_SHOWN: SchematicsShown = { pillars: [], banner: null };

const isSchematic = (itemId: string): boolean => ITEMS[itemId]?.kind === 'schematic';

// The schematic's pop (033): a pillar of ley light stands over each schematic lying on
// the ground in the room on show until it's picked up (FeelView adds the sparks and the
// chime as it lands, MinimapView the ping), and the shared banner reads "Unknown
// schematic" on pickup and names it once banking reveals it. Time on the tween clock.
export class SchematicView {
  private readonly scene: Scene;
  private readonly banner: Banner;
  private readonly pillars = new Map<number, GameObjects.Image>();
  private time = 0;

  constructor(scene: Scene, banner: Banner) {
    this.scene = scene;
    this.banner = banner;
  }

  get shown(): SchematicsShown {
    const on = this.banner.current;
    return {
      pillars: [...this.pillars.values()].filter((p) => p.visible).map((p) => ({ x: p.x, y: p.y })),
      banner: on?.kind === 'schematic' ? { kicker: on.kicker, name: on.name } : null,
    };
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    const P = RESEARCH_LOOK.pillar;
    const breathe = (Math.sin((this.time / P.breatheMs) * Math.PI * 2) + 1) / 2;
    const live = new Set<number>();
    for (const g of sim.groundItems) {
      if (g.roomId !== shown || !isSchematic(g.itemId)) continue;
      live.add(g.id);
      const pillar =
        this.pillars.get(g.id) ??
        addVector(this.scene, Math.round(g.x), Math.round(g.y), RESEARCH_SPRITES.pillar).setOrigin(0.5, 1).setTint(colorOf(P.color)).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.worldUi - 3);
      this.pillars.set(g.id, pillar);
      pillar.setVisible(true).setAlpha(P.alpha[0] + (P.alpha[1] - P.alpha[0]) * breathe);
    }
    for (const [id, pillar] of this.pillars) {
      if (live.has(id)) continue;
      pillar.destroy();
      this.pillars.delete(id);
    }
    for (const p of events.pickups) {
      if (!isSchematic(p.itemId)) continue;
      this.banner.push({ kind: 'schematic', id: shownKey(sim, p.itemId), kicker: SCHEMATIC_BANNER.found, name: shownItem(sim, p.itemId).name });
    }
    for (const r of events.schematicReveals) {
      this.banner.push({ kind: 'schematic', id: r.itemId, kicker: SCHEMATIC_BANNER.revealed, name: itemDef(r.itemId).name });
    }
  }
}
