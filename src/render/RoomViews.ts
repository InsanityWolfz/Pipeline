import type { Scene } from 'phaser';
import { OVERWORLD } from '../data/overworld';
import type { Room } from '../data/rooms';
import { ROOM_TOP_MARGIN } from '../data/roomArt';
import type { SimEvents } from '../sim/events';
import { roomById, roomSize, type SimState } from '../sim/state';
import { MinimapView, type MinimapMarker } from './MinimapView';
import { OverworldView } from './overworld/OverworldView';
import { RoomView } from './room';
import { IntakeView } from './IntakeView';
import { SupplyView } from './SupplyView';

// The ground on screen: a tiled room (the foundry) or the overworld's terrain
// with its landmarks (017), plus the corner minimap while outside, and the
// claimed pylon's harvest running home along the ley line (018), and the foundry
// intake built into the foundry's north wall (019).
export class RoomViews {
  private readonly scene: Scene;
  private readonly tiles: RoomView;
  private readonly overworld: OverworldView;
  private readonly minimap: MinimapView;
  private readonly supply: SupplyView;
  private readonly intake: IntakeView;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = new RoomView(scene);
    this.overworld = new OverworldView(scene);
    this.minimap = new MinimapView(scene, roomById(OVERWORLD.id));
    this.supply = new SupplyView(scene);
    this.intake = new IntakeView(scene);
  }

  /** Draws a room's ground and fits the camera to it. */
  show(room: Room): void {
    this.tiles.show(room);
    this.overworld.show(room.terrain ? room : null);
    const { width, height } = roomSize(room);
    // A tiled room shows a little more wall above its top row (019); the overworld's edge is its edge.
    const above = room.terrain ? 0 : ROOM_TOP_MARGIN;
    this.scene.cameras.main.setBounds(0, -above, width, height + above);
  }

  /** `events` are the ticks' since the last draw; the supply line starts a mote for each raw a port produced. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.overworld.update(sim);
    this.minimap.update(sim);
    this.supply.update(sim, events, shown, deltaMs);
    this.intake.update(sim, events, shown, sim.building, deltaMs);
  }

  /** The supply line's motes, for the test hook. */
  get motes(): { started: number; inFlight: { itemId: string; progress: number }[] } {
    return { started: this.supply.started, inFlight: this.supply.inFlight };
  }

  /** The minimap's state, for the test hook. */
  get map(): { shown: boolean; markers: MinimapMarker[] } {
    return { shown: this.minimap.shown, markers: this.minimap.markers };
  }
}
