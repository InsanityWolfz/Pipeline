import { HEAT, SPARKS } from '../../data/foundryFx';
import { FOUNDRY_LIGHTS } from '../../data/lights';
import type { MachineStatus } from '../../sim/pieces';

// 079: the running forge machines, kept as a small set (render only). FoundryView already visits each machine as it
// draws it; it hands the status here, and the set changes only when a forge machine's status changes or it goes. No
// code walks every piece for it, and idle, starved or blocked machines cost the effects nothing.

/** Machines whose heat, sparks or light 079 draws: the Forge group's Smelter, kiln and Tempering coil. */
const FORGES = new Set<string>([...HEAT.machines, ...SPARKS.machines, ...Object.keys(FOUNDRY_LIGHTS.machines)]);

export const isForge = (pieceId: string): boolean => FORGES.has(pieceId);

/** A forge machine as drawn: its id, its machine, its footprint's middle x and its feet (bottom) y, world px. */
export interface ForgeAt {
  id: number;
  pieceId: string;
  x: number;
  bottom: number;
}

export class RunningForges {
  /** Working forge machines now. */
  readonly running = new Map<number, ForgeAt>();
  /** Every forge machine drawn (a craft's sparks find their machine here, whatever its status after). */
  readonly known = new Map<number, ForgeAt>();
  private readonly status = new Map<number, MachineStatus>();
  /** How many times the set changed (for tests: it changes only on a change). */
  changes = 0;

  /** A machine as FoundryView draws it this frame. Only a forge machine whose status changed moves the set. */
  observe(p: { id: number; pieceId: string; status: MachineStatus }, at: { x: number; bottom: number }): void {
    if (!FORGES.has(p.pieceId)) return;
    let known = this.known.get(p.id);
    if (!known) {
      known = { id: p.id, pieceId: p.pieceId, x: at.x, bottom: at.bottom };
      this.known.set(p.id, known);
    }
    if (this.status.get(p.id) === p.status) return;
    this.status.set(p.id, p.status);
    this.changes += 1;
    if (p.status === 'working') this.running.set(p.id, known);
    else this.running.delete(p.id);
  }

  /** A machine removed or picked up (FoundryView destroys its sprites). */
  remove(id: number): void {
    if (this.known.delete(id)) this.changes += 1;
    this.running.delete(id);
    this.status.delete(id);
  }

  clear(): void {
    this.running.clear();
    this.known.clear();
    this.status.clear();
  }
}
