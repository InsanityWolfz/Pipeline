import { lobbedAmmo, type MineAmmo } from '../data/ammo';
import { CLUSTER, hasBehaviour } from '../data/tags';
import { blastArea } from './blast';
import type { BombState } from './bombs';
import type { SimState } from './state';
import { ofBase, playerStats } from './stats';
import { rotate } from './volley';

// Landmines and bomblets (038). A landmine flies as a bomb does (bombs.ts) but lands
// armed: it lies where it landed, burning its fuse, and bursts `fuseTicks` later on every
// enemy within its radius. Only the timer sets it off. A cluster bomb's burst scatters
// bomblets round its point, which burst together `CLUSTER.delayTicks` later. Both are
// lobbed bursts (`blastArea`): no shield blocks them and they never hurt the player.
// A room change (a door or travel) or a KO clears them, and mines still in flight.

/** A landmine lying armed: where, its fuse burnt so far and its length, and its burst, fixed at the throw. */
export interface MineState {
  id: number;
  ammoId: string;
  roomId: string;
  x: number;
  y: number;
  fuse: number;
  fuseTicks: number;
  damage: number;
  radius: number;
}

/** A bomblet on its way out from a cluster bomb's burst: from there to its spot, bursting when `ticks` runs out. */
export interface BombletState {
  id: number;
  /** The cluster bomb it came from: its damage type is the bomb's. */
  ammoId: string;
  roomId: string;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  /** Ticks left before it bursts, of `delay`. */
  ticks: number;
  delay: number;
  damage: number;
  radius: number;
}

/** Armed mines and bomblets on their way, and the id for the next of either. */
export interface MinesState {
  armed: MineState[];
  bomblets: BombletState[];
  nextId: number;
}

export const createMines = (): MinesState => ({ armed: [], bomblets: [], nextId: 0 });

/** Clears every armed mine and bomblet (a KO; a room change). Ids carry on. */
export function clearMines(state: Pick<SimState, 'mines'>): void {
  state.mines.armed = [];
  state.mines.bomblets = [];
}

/** A landmine lands (from bombs.ts): it arms where it lies, its fuse at 0. */
export function armMine(state: SimState, b: BombState, ammo: MineAmmo): void {
  const id = state.mines.nextId++;
  state.mines.armed.push({ id, ammoId: b.ammoId, roomId: b.roomId, x: b.x, y: b.y, fuse: 0, fuseTicks: ammo.fuseTicks, damage: b.damage, radius: b.radius });
  state.events.mineArms.push({ id, x: b.x, y: b.y });
}

/**
 * A cluster bomb's burst (from bombs.ts): CLUSTER.count bomblets round its point at CLUSTER.distance, the first along the
 * bomb's flight and the rest evenly round, clockwise on screen. Each takes the bomb's damage bonus and the bomblets'
 * radius from playerStats (037's talents).
 */
export function scatterBomblets(state: SimState, b: BombState): void {
  if (!hasBehaviour(b.ammoId, 'cluster')) return;
  const len = Math.hypot(b.toX - b.fromX, b.toY - b.fromY);
  const [dx, dy] = len > 0 ? [(b.toX - b.fromX) / len, (b.toY - b.fromY) / len] : [1, 0];
  const stats = playerStats(state).ammo;
  const damage = CLUSTER.damage * ofBase(stats.damage, b.ammoId);
  for (let k = 0; k < CLUSTER.count; k++) {
    const [ux, uy] = rotate(dx, dy, (k * 360) / CLUSTER.count);
    state.mines.bomblets.push({
      id: state.mines.nextId++,
      ammoId: b.ammoId,
      roomId: b.roomId,
      fromX: b.x,
      fromY: b.y,
      x: b.x + ux * CLUSTER.distance,
      y: b.y + uy * CLUSTER.distance,
      ticks: CLUSTER.delayTicks,
      delay: CLUSTER.delayTicks,
      damage,
      radius: stats.bombletRadius,
    });
  }
}

/**
 * The player changes area (038.8: through a door, or by travel): every armed mine and bomblet vanishes, and so do
 * mines and cluster bombs still in flight (their bomblets would only be left behind).
 */
export function leaveArea(state: Pick<SimState, 'mines' | 'bombs'>): void {
  clearMines(state);
  state.bombs = state.bombs.filter((b) => lobbedAmmo(b.ammoId).kind !== 'mine' && !hasBehaviour(b.ammoId, 'cluster'));
}

/** Once a tick, before bombs fly (so a mine that lands this tick starts at fuse 0): bomblets count down and burst; armed fuses burn and burst. */
export function stepMines(state: SimState): void {
  state.mines.bomblets = state.mines.bomblets.filter((b) => {
    b.ticks -= 1;
    if (b.ticks > 0) return true;
    blastArea(state, b.roomId, b.x, b.y, b.radius, b.damage, lobbedAmmo(b.ammoId).damageType);
    state.events.bombletBursts.push({ x: b.x, y: b.y, radius: b.radius });
    return false;
  });
  state.mines.armed = state.mines.armed.filter((m) => {
    m.fuse += 1;
    if (m.fuse < m.fuseTicks) return true;
    blastArea(state, m.roomId, m.x, m.y, m.radius, m.damage, lobbedAmmo(m.ammoId).damageType);
    state.events.mineBursts.push({ x: m.x, y: m.y, radius: m.radius });
    return false;
  });
}
