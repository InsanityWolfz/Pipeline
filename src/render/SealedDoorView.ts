import type { Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { SEALED_DOOR_LINE, SEALED_DOOR_TEXT } from '../data/hints';
import type { GateId } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { roomById, type SimState } from '../sim/state';
import { TextLine } from './textLine';

// 067: a door sealed by its gate (the foundry's stairs until the shrine's pylon is claimed) says why when E is pressed
// at it or it's walked into: its gate's line floats over the door for a moment after the last push, then fades.

const lineOf = (gate: GateId): string | null => (gate in SEALED_DOOR_TEXT ? SEALED_DOOR_TEXT[gate as keyof typeof SEALED_DOOR_TEXT] : null);

export class SealedDoorView {
  private readonly line: TextLine;
  /** Ms left before the line starts fading; it's gone once this passes -fadeMs. */
  private leftMs = -SEALED_DOOR_LINE.fadeMs;
  private room = '';

  constructor(scene: Scene) {
    this.line = new TextLine(scene, 0, 0, DEPTHS.prompt, true, 'float').setVisible(false);
  }

  /** The line as drawn, for `ui()`: its text while it shows, else null. */
  get shown(): string | null {
    return this.line.obj.visible ? this.line.obj.text : null;
  }

  /** `events` since the last draw; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, shown: string, events: SimEvents, deltaMs: number): void {
    const pushed = events.sealedDoors.find((e) => lineOf(e.gate) !== null);
    const door = pushed && (roomById(sim.roomId).doorways ?? []).find((d) => d.gate === pushed.gate);
    const text = pushed && lineOf(pushed.gate);
    if (door && text) {
      this.room = sim.roomId;
      this.line.set(text);
      this.line.moveTo(Math.round((door.tx + 0.5) * TILE_SIZE - this.line.width / 2), door.ty * TILE_SIZE - SEALED_DOOR_LINE.rise - this.line.lineHeight);
      this.leftMs = SEALED_DOOR_LINE.holdMs;
    } else this.leftMs = Math.max(-SEALED_DOOR_LINE.fadeMs, this.leftMs - deltaMs);
    const on = this.leftMs > -SEALED_DOOR_LINE.fadeMs && shown === this.room;
    this.line.setVisible(on).setAlpha(on ? Math.min(1, 1 + this.leftMs / SEALED_DOOR_LINE.fadeMs) : 0);
  }
}
