import type { Scene } from 'phaser';
import { OVERWORLD } from '../data/overworld';
import type { Room } from '../data/rooms';
import { roomById, roomSize, type SimState } from '../sim/state';
import { MinimapView, type MinimapMarker } from './MinimapView';
import { OverworldView } from './overworld/OverworldView';
import { RoomView } from './room';

// The ground on screen: a tiled room (the foundry) or the overworld's terrain
// with its landmarks (017), plus the corner minimap while outside.
export class RoomViews {
  private readonly scene: Scene;
  private readonly tiles: RoomView;
  private readonly overworld: OverworldView;
  private readonly minimap: MinimapView;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = new RoomView(scene);
    this.overworld = new OverworldView(scene);
    this.minimap = new MinimapView(scene, roomById(OVERWORLD.id));
  }

  /** Draws a room's ground and fits the camera to it. */
  show(room: Room): void {
    this.tiles.show(room);
    this.overworld.show(room.terrain ? room : null);
    const { width, height } = roomSize(room);
    this.scene.cameras.main.setBounds(0, 0, width, height);
  }

  update(sim: SimState): void {
    this.overworld.update(sim);
    this.minimap.update(sim);
  }

  /** The minimap's state, for the test hook. */
  get map(): { shown: boolean; markers: MinimapMarker[] } {
    return { shown: this.minimap.shown, markers: this.minimap.markers };
  }
}
