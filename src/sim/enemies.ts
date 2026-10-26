import type { DamageType } from '../data/ammo';
import { TILE_SIZE } from '../data/config';
import { OVERWORLD_ROOM, ringOf } from '../data/overworld';
import type { Ring } from '../data/ringScale';
import { enemyDef } from '../data/enemies';
import { defOf } from './champions';
import { chillEnemy } from './cold';
import { igniteEnemy } from './fire';
import { straightAmmo } from '../data/ammo';
import { FIRE } from '../data/tags';
import { startKnock, type Knockable } from './knockback';
import type { Facing } from './player';
import type { SimState } from './state';
import { createBellows, plated, type BellowsState } from './forgewrightParts';
import { createRods, nearestRod, type RodState } from './conductorRods';
import { recordBlock } from './shield';

// Enemies as plain data: creation, damage and hurtboxes. Their behaviour is in enemyAi.ts, separation in separation.ts.

/**
 * `lob` and `throw` (034): the Bulwark rearing back, then holding the throw. 035: `stun`, a Charger dazed by a wall;
 * `dig`, a Burrower digging in; `peek`, a Sniper stepping out of cover to a clear line. 041: the Bulwark's `roar` as it
 * enrages, and its rear stomp's `stomp-windup`, `stomp` and `stomp-recover`. 060: the Forgewright's ember spray
 * (`spray-windup`, `spray`), its Forge Flood (`flood-windup`, `flood`) and its `vent` stagger.
 */
export type EnemyMode =
  | 'idle'
  | 'chase'
  | 'windup'
  | 'swipe'
  | 'recover'
  | 'return'
  | 'lob'
  | 'throw'
  | 'stun'
  | 'dig'
  | 'peek'
  | 'roar'
  | 'stomp-windup'
  | 'stomp'
  | 'stomp-recover'
  | 'spray-windup'
  | 'spray'
  | 'flood-windup'
  | 'flood'
  | 'vent';

export interface EnemyState extends Knockable {
  id: number;
  enemyId: string;
  /** Enemies never change rooms. */
  roomId: string;
  /** What it belongs to (017): `field` (the tutorial pack), a site id (its guards), `pop-…` (a population pack), or ''. */
  group: string;
  /** Feet centre, px. */
  x: number;
  y: number;
  /** Where it was placed; it walks back here when it loses the player. */
  homeX: number;
  homeY: number;
  /** This tick's own movement (not knockback), px per tick. */
  vx: number;
  vy: number;
  facing: Facing;
  mode: EnemyMode;
  /** Ticks into the current wind-up, swipe or recover, counting the first as 1. */
  modeTicks: number;
  /** Ticks in a row spent outside the player's aggro box while engaged. */
  offScreenTicks: number;
  /** Ticks before another wind-up can start. */
  cooldown: number;
  health: number;
  /** Unit swipe direction, locked when a wind-up starts. */
  swipeDirX: number;
  swipeDirY: number;
  /** Ticks of hit flash left, for render. */
  flash: number;
  /** Chill stacks from cold hits (029); each slows it. */
  chill: number;
  /** Ticks before the chill runs out and the stacks drop to 0. */
  chillTicks: number;
  /** Ticks left frozen: it doesn't move or think. */
  frozen: number;
  /** Ticks after a thaw in which cold hits add no stacks. */
  refreeze: number;
  /** Fire (060): ticks of burn left (0: not burning), its damage a second, and ticks to its next once-a-second beat. */
  burnTicks: number;
  burnDps: number;
  burnNext: number;
  /** A champion (032), by name, or null: the sim reads its scaled def (`defOf`). */
  champion: { name: string } | null;
  /** Its danger ring (041): its home tile's, set when it's created and kept as it walks. Its def is scaled by it. */
  ring: Ring;
  /** Its continuous facing, radians (034): a shielded enemy's shield points this way and turns, never snapping. */
  angle: number;
  /** Ticks before its next bomb lob (034: the Bulwark's), or its next ember spray (060: the Forgewright's). */
  lobCooldown: number;
  /** Ticks of shield flash left after a blocked hit (034), for render. */
  blockFlash: number;
  /** A Burrower under the ground (035): nothing can hit it, and it neither blocks nor is pushed apart. */
  underground: boolean;
  /** Where its attack is anchored (035): a Charger's lane start, a Burrower's locked spot, px. */
  spotX: number;
  spotY: number;
  /** A Charger's charge has struck the player (035): once per charge. */
  struck: boolean;
  /** Its last move ran into something solid (035: a charging Charger is stunned by it). */
  bumped: boolean;
  /** Ticks left Stunned (039: Rollbreaker's roll, or a Charger's wall daze): it holds and doesn't act. */
  stunned: number;
  /** Its Stun is a Charger's wall daze alone (039.6), which keeps the daze's own timing: see stun.ts. */
  dazed: boolean;
  /** Ticks left rising from the ground (041: the Bulwark's adds): it can't act, be hit or block until 0. */
  rising: number;
  /** The Bulwark's fight (041): enraged below 30%; its rear-stomp counter and cooldown; its adds risen this fight. */
  enraged: boolean;
  behind: number;
  stompCooldown: number;
  addsRisen: boolean;
  /** 041.16: ticks before its next pair of adds (counted once the first have risen); its back wave's countdown, the ticks its wind-up has run (0: none), and the unit direction it's locked to. */
  addsCooldown: number;
  waveCooldown: number;
  waveTicks: number;
  waveDirX: number;
  waveDirY: number;
  /**
   * The Forgewright (060, forgewrightParts.ts): its heat (0 to its def's max), ticks left venting (0: plated), its two
   * bellows (none on anything else), and the half of its hall its Forge Flood is locked to (-1 west, 1 east, 0 none).
   */
  heat: number;
  vent: number;
  bellows: BellowsState[];
  floodSide: number;
  /** A cinder mote that burst on its own (061): it goes with no drop, XP or death burst. */
  spent: boolean;
  /**
   * The Conductor (064, conductorRods.ts, conductorAi.ts): its six arena rods (none on anything else); the rod it
   * stands at and the rod a blink's warning names (-1: none); ticks to its next blink, and ticks left of a blink's
   * warning; the attack it is making (-1: none; 0 lash, 1 storm call, 2 rod chain) and each attack's own cooldown; and
   * its rod chain's lines, a bit per neighbouring pair of rods (rod i and i + 1), and whether the chain has struck.
   */
  rods: RodState[];
  rod: number;
  blinkTo: number;
  blinkCooldown: number;
  blinkWarn: number;
  attack: number;
  attackCooldowns: number[];
  chainMask: number;
  chainHit: boolean;
  /** A kiln-tender's beam (061): its target's id (-1: none), and its own health as the beam began (any less breaks it). */
  beamTarget: number;
  beamHeld: number;
}

/** A home's danger ring (041, the rule 037's XP used): `ringOf` its tile in the overworld, 0 in any other room. */
export const ringAt = (roomId: string, x: number, y: number): Ring => (roomId === OVERWORLD_ROOM ? ringOf(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)) : 0);

export function createEnemy(id: number, enemyId: string, at: { x: number; y: number }, roomId: string, group = ''): EnemyState {
  const def = enemyDef(enemyId);
  const ring = ringAt(roomId, at.x, at.y);
  return {
    id,
    enemyId,
    roomId,
    group,
    x: at.x,
    y: at.y,
    homeX: at.x,
    homeY: at.y,
    vx: 0,
    vy: 0,
    facing: 'down',
    mode: 'idle',
    modeTicks: 0,
    offScreenTicks: 0,
    cooldown: 0,
    health: defOf({ enemyId, champion: null, ring }).maxHealth,
    swipeDirX: 0,
    swipeDirY: 1,
    flash: 0,
    chill: 0,
    chillTicks: 0,
    frozen: 0,
    refreeze: 0,
    burnTicks: 0,
    burnDps: 0,
    burnNext: 0,
    champion: null,
    ring,
    angle: Math.PI / 2,
    lobCooldown: def.kind === 'bulwark' ? def.lob.cooldownTicks : def.kind === 'forgewright' ? def.spray.cooldownTicks : 0,
    blockFlash: 0,
    underground: false,
    spotX: at.x,
    spotY: at.y,
    struck: false,
    bumped: false,
    stunned: 0,
    dazed: false,
    rising: 0,
    enraged: false,
    behind: 0,
    stompCooldown: 0,
    addsRisen: false,
    addsCooldown: 0,
    waveCooldown: def.kind === 'bulwark' ? def.wave.everyTicks : 0,
    waveTicks: 0,
    waveDirX: 0,
    waveDirY: 0,
    heat: 0,
    vent: 0,
    bellows: createBellows(enemyId),
    floodSide: 0,
    spent: false,
    rods: createRods(enemyId),
    // 064: the Conductor's rod is the one nearest where it's placed (its start: the spire's start rod).
    rod: def.kind === 'conductor' ? nearestRod(at) : -1,
    blinkTo: -1,
    blinkCooldown: def.kind === 'conductor' ? def.blink.everyTicks : 0,
    blinkWarn: 0,
    attack: -1,
    attackCooldowns: def.kind === 'conductor' ? [0, 0, 0] : [],
    chainMask: 0,
    chainHit: false,
    beamTarget: -1,
    beamHeld: 0,
    knockX: 0,
    knockY: 0,
    knockTicks: 0,
  };
}

/** Starts chasing the player. */
export function aggro(e: EnemyState): void {
  e.mode = 'chase';
  e.modeTicks = 0;
  e.offScreenTicks = 0;
}

/** How a hit lands: a round's Knockback (039: px before the enemy's weight; 0 for none) and its flash. A cold hit chills (029). */
export interface HitStyle {
  knock: number;
  flash: boolean;
  /** Recorded on the hit event so render can colour it; it changes no rule. */
  damageType: DamageType;
  /** A punch (023): its hit event is marked so render plays the punch's thud for it. */
  melee?: boolean;
  /** A burning arrow (054): its hit event is marked so render flashes it; it changes no rule. */
  burning?: boolean;
  /** 060: a burn's once-a-second beat. It never sets a burn going again; render shows it as a small number, with no hit stop or hit sound. */
  burn?: boolean;
  /** 064: a lightning arc's hit. It never arcs again; render draws it as a chained hit. */
  arc?: boolean;
}

/** An arrow's hit, with its Knockback. */
const ARROW_HIT: HitStyle = { knock: straightAmmo('arrow').knockback, flash: true, damageType: 'physical' };

/** Damages an enemy, knocking it along (dirX, dirY). A hit always aggros an idle or returning enemy. */
export function damageEnemy(
  state: SimState,
  e: EnemyState,
  amount: number,
  dirX: number,
  dirY: number,
  style: HitStyle = ARROW_HIT,
): void {
  const def = defOf(e);
  // 060: the Forgewright's plating takes every hit on its body until it vents (its bellows' hits never come here).
  if (plated(e)) {
    recordBlock(state, e, e.x, e.y + def.hurtbox.offsetY);
    if (e.mode === 'idle' || e.mode === 'return') aggro(e);
    return;
  }
  e.health = Math.max(0, e.health - amount);
  if (style.flash) e.flash = def.hitFlashTicks;
  // Knockback (039): the round's push times the enemy's weight (a boss weighs 0, frozen or not).
  const push = style.knock * def.weight;
  if (push > 0) startKnock(e, dirX, dirY, push, def.hitKnockTicks);
  if (style.damageType === 'cold' && e.health > 0) chillEnemy(state, e);
  // 060: a fire hit sets it burning, the killing hit too (it dies burning, and its burn spreads); a burn's beat never does.
  if (style.damageType === 'fire' && !style.burn) igniteEnemy(state, e, amount * FIRE.burnShare);
  if (e.mode === 'idle' || e.mode === 'return') aggro(e);
  state.events.hits.push({
    target: 'enemy',
    id: e.id,
    x: e.x,
    y: e.y,
    damage: amount,
    damageType: style.damageType,
    ...(style.melee ? { melee: true as const } : {}),
    ...(style.burning ? { burning: true as const } : {}),
    ...(style.burn ? { burn: true as const } : {}),
    ...(style.arc ? { arc: true as const } : {}),
  });
}

/**
 * Immune (054): nothing can damage it now — a Burrower underground (035), an add still rising (041). A shield's front
 * isn't immunity (it can be hit from behind). Render draws its bar blue with a shield while it holds.
 */
export const immune = (e: Pick<EnemyState, 'underground' | 'rising'>): boolean => e.underground || e.rising > 0;

/** Whether shots, punches and bursts can reach it: whenever it isn't immune (054). */
export const targetable = (e: Pick<EnemyState, 'underground' | 'rising'>): boolean => !immune(e);

/** It passes through other enemies (035): a Burrower underground, a Charger mid-charge (061: a hound mid-dash), an add rising (041). Separation leaves it be. */
export const passesThrough = (e: EnemyState): boolean => e.underground || e.rising > 0 || (e.mode === 'swipe' && (defOf(e).kind === 'charger' || defOf(e).kind === 'hound'));

/** True if a ground point is inside the enemy's hurtbox. */
export function inHurtbox(e: EnemyState, x: number, y: number): boolean {
  const { hurtbox } = defOf(e);
  return Math.abs(x - e.x) <= hurtbox.w / 2 && Math.abs(y - (e.y + hurtbox.offsetY)) <= hurtbox.h / 2;
}
