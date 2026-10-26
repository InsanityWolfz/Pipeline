import type { GameObjects } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { CRATE_SPRITE, HOPPER_SPRITES, ICON_RISE, machineLook } from '../data/foundryAssets';
import { animFrames } from '../data/assets';
import { isFlatKind, pieceDef } from '../data/pieces';
import { pieceRect } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { splitterLook, tunnelLook } from './flatPieces';
import { conduitLook, pieceIcon } from './foundryLayout';
import { viewOf } from './FoundryView';
import { showFrame } from './vector/textures';

/** A piece as a ghost draws it: where, facing which way, and its shape (a conduit's side, a splitter's mirror). */
export interface GhostPiece {
  pieceId: string;
  tx: number;
  ty: number;
  facing: Facing;
  /** A conduit's intake side; its back when left out. */
  inFrom?: Facing;
  mirrored?: boolean;
}

// A piece's ghost (split from BuildView for 063's blueprint ghost): its resting body in the shape it would take, a
// flat piece on its tile and a standing one by its feet, tinted, and a machine's product icon on its top face.

/** The resting frame of a piece's body as placed with `facing`. */
export function bodyFrame(pieceId: string, facing: Facing, inFrom: Facing): string {
  const def = pieceDef(pieceId);
  const view = viewOf(facing);
  if (def.kind === 'machine') return machineLook(def.id, view).idle;
  if (def.kind === 'conduit') return animFrames(conduitLook(facing, inFrom).anim)[0] ?? '';
  return def.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE;
}

/** Shows `p` on a ghost's body image and icon image, tinted `tint`. */
export function showGhost(body: GameObjects.Image, icon: GameObjects.Image, p: GhostPiece, tint: number): void {
  const def = pieceDef(p.pieceId);
  const { facing } = p;
  const inFrom = p.inFrom ?? facing;
  const r = pieceRect(p);
  const bottom = r.y + r.h / 2;
  if (def.kind === 'splitter') {
    // 033: the splitter's ghost shows its side, which the flip key flips.
    const look = splitterLook(facing, p.mirrored ?? false);
    showFrame(body, look.frame).setFlip(look.flipX, look.flipY);
  } else if (def.kind === 'tunnel-in' || def.kind === 'tunnel-out') {
    const look = tunnelLook(def.kind, facing);
    showFrame(body, look.frame).setFlip(look.flipX, false);
  } else {
    const flip = def.kind === 'conduit' ? conduitLook(facing, inFrom).flip : facing === 'left';
    showFrame(body, bodyFrame(p.pieceId, facing, inFrom)).setFlip(flip, false);
  }
  if (isFlatKind(def.kind)) body.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2);
  else body.setOrigin(0.5, 1).setPosition(r.x, bottom);
  body.setTint(tint).setVisible(true);
  const machine = def.kind === 'machine';
  icon.setVisible(machine).setTint(tint);
  if (machine) icon.setFrame(pieceIcon(p.pieceId)).setPosition(r.x, bottom - ICON_RISE[def.footprint][viewOf(facing)]);
}
