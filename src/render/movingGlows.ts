import { TILE_SIZE } from '../data/config';
import { FOUNDRY_ROOM } from '../data/rooms';
import { GLOWS } from '../data/juice';
import { isFlatKind } from '../data/pieces';
import { isClaimed } from '../sim/claims';
import { pieceRect } from '../sim/pieces';
import { roomById, type SimState } from '../sim/state';
import type { GlowSpot } from './AmbientView';
import { attuneBeat } from './attune';
import { intakeAnchor } from './foundryLayout';

// The feel's moving lights (014, 019), split from FeelView (078).

const tileCentre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

/**
 * Lights that move or come and go: live veins, claimed pylons, items on conduits, the intake and the tube. `swelling`: an
 * item went into the intake a moment ago (019).
 */
export function movingGlows(sim: SimState, shown: string, swelling: boolean): GlowSpot[] {
  const spots: GlowSpot[] = [];
  for (const n of sim.nodes) if (n.roomId === shown && n.nodeId === 'ley-vein' && n.uses > 0) spots.push({ x: n.x, y: n.y, ...GLOWS.vein });
  for (const pylon of roomById(shown).pylons ?? []) if (isClaimed(sim, pylon.site)) spots.push({ ...tileCentre(pylon.tx, pylon.ty), ...GLOWS.pylon });
  if (shown === FOUNDRY_ROOM) {
    for (const p of sim.foundry.pieces) {
      const r = pieceRect(p);
      if (isFlatKind(p.kind)) spots.push({ x: r.x, y: r.y, ...GLOWS.conduit });
      if (p.kind === 'conduit' && p.item) spots.push({ x: r.x, y: r.y, ...GLOWS.conduitItem });
    }
    // The intake glows once attuned (growing as its rings light), swelling as each item goes in.
    const { pipeGlow } = attuneBeat(sim.link.attunePulse);
    if (sim.link.attuned && pipeGlow > 0) {
      const swell = sim.link.attunePulse > 0 ? pipeGlow : swelling ? GLOWS.intake.pulse : 1;
      spots.push({ ...intakeAnchor(), color: GLOWS.intake.color, radius: GLOWS.intake.radius * swell });
    }
  }
  if (sim.hasTube && sim.link.attuned && shown === sim.roomId) {
    // The same growing glow round the tube while its rings light.
    spots.push({ x: sim.player.x, y: sim.player.y, color: GLOWS.tube.color, radius: GLOWS.tube.radius * attuneBeat(sim.link.attunePulse).gunGlow });
  }
  return spots;
}
