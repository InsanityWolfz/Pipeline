import { AMMO_FX } from '../../data/ammoFx';
import { MACHINE_SPARKS } from '../../data/fxQuality';
import { PIECES } from '../../data/pieces';
import { STAGES } from '../../data/stages';

// 078: the colours a machine's sparks fly in when it finishes a craft (pure): its own row (the Tempering coil), a
// stage machine's tag (an element's impact colours, a shape's row), else its build group's. Logistics has none.

export function machineSparkColors(pieceId: string): readonly string[] | null {
  const own = MACHINE_SPARKS.byPiece[pieceId];
  if (own) return own;
  const piece = PIECES[pieceId];
  if (!piece) return null;
  const stage = 'stage' in piece && piece.stage ? STAGES[piece.stage] : undefined;
  if (stage) return AMMO_FX.elements[stage.tag]?.impact[0]?.colors ?? MACHINE_SPARKS.byShape[stage.tag] ?? null;
  return MACHINE_SPARKS.byCategory[piece.category] ?? null;
}
