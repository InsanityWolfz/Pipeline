import type { Scene } from 'phaser';
import { OVERWORLD } from '../data/overworld';
import type { Room } from '../data/rooms';
import { ROOM_TOP_MARGIN } from '../data/roomArt';
import type { SimEvents } from '../sim/events';
import { roomById, roomSize, type SimState } from '../sim/state';
import { MinimapView } from './MinimapView';
import type { UiState } from './testHook';
import { OverworldView } from './overworld/OverworldView';
import { RoomView } from './room';
import { IntakeView } from './IntakeView';
import { SupplyView } from './SupplyView';
import { PortView } from './PortView';

/** What the room views report to the test hook's `ui()`. */
export type RoomUiState = Pick<UiState, 'minimap' | 'supply' | 'intakeCaps' | 'intakeLift' | 'intakeFirePulses' | 'ports'>;

/** The room views' part of `ui()` before the scene has built them. */
export const NO_ROOM_UI: RoomUiState = { minimap: { shown: false, markers: [] }, supply: { started: 0, inFlight: [] }, intakeCaps: 0, intakeLift: null, intakeFirePulses: [], ports: [] };

// The ground on screen: a tiled room (the foundry) or the overworld's terrain
// with its landmarks (017), plus the corner minimap while outside, and the
// claimed pylon's harvest running home along the ley line (018), the foundry
// intake built into the foundry's north wall (019), and the supply ports' faces and plates (028).
export class RoomViews {
  private readonly scene: Scene;
  private readonly tiles: RoomView;
  private readonly overworld: OverworldView;
  private readonly minimap: MinimapView;
  private readonly supply: SupplyView;
  private readonly intake: IntakeView;
  private readonly ports: PortView;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = new RoomView(scene);
    this.overworld = new OverworldView(scene);
    this.minimap = new MinimapView(scene, roomById(OVERWORLD.id));
    this.supply = new SupplyView(scene);
    this.intake = new IntakeView(scene);
    this.ports = new PortView(scene);
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
    this.ports.update(sim, shown);
  }

  /**
   * For the test hook: the minimap and its markers, the supply line's motes (018), and the intake's caps still drawn
   * and how far they are through lifting off (024: 0..1, or null when none are), the entrances' fire pulses on the
   * pipe (028), and the ports as drawn (028).
   */
  get state(): RoomUiState {
    return {
      minimap: { shown: this.minimap.shown, markers: this.minimap.markers },
      supply: { started: this.supply.started, inFlight: this.supply.inFlight },
      intakeCaps: this.intake.capsShown,
      intakeLift: this.intake.liftShown,
      intakeFirePulses: this.intake.firePulsesShown,
      ports: this.ports.shown,
    };
  }
}
