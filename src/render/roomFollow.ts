/** How RoomFollow reaches the scene: draw a room, fade through a door, centre the camera on the player. */
export interface RoomFollowHooks {
  /** The player's room now (the sim's roomId). */
  playerRoom: () => string;
  show: (roomId: string) => void;
  /** Fades out, calls `atDark`, fades back in (SceneCameras.fadeThrough); may do nothing before the cameras exist. */
  fadeThrough: (atDark: () => void) => void;
  centreOnPlayer: () => void;
}

// The room on screen (split out of GameScene). It lags the player's room through a door's fade: it fades out, swaps
// the room at dark and fades back in. A KO has its own fade, so the room swaps straight away.
export class RoomFollow {
  /** The room on screen. */
  shownRoomId: string;
  /** A door's fade is running. */
  fading = false;
  private readonly hooks: RoomFollowHooks;

  constructor(roomId: string, hooks: RoomFollowHooks) {
    this.shownRoomId = roomId;
    this.hooks = hooks;
  }

  /** Draws a room's ground and fits the camera to it. */
  show(roomId: string): void {
    this.shownRoomId = roomId;
    this.hooks.show(roomId);
  }

  /** Keeps the room on screen in step with the player's. */
  follow(ko: boolean): void {
    if (this.fading || this.shownRoomId === this.hooks.playerRoom()) return;
    if (ko) {
      this.show(this.hooks.playerRoom());
      return;
    }
    this.fading = true;
    this.hooks.fadeThrough(() => {
      this.show(this.hooks.playerRoom());
      this.hooks.centreOnPlayer();
      this.fading = false;
    });
  }
}
