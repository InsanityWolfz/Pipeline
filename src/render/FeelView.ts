import type { Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { enemyDef } from '../data/enemies';
import { DUST_EVERY_MS, GLOWS, LEAD_HOLD_MS } from '../data/juice';
import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRE_SOUNDS, SOUNDS, WINDUP_SOUNDS } from '../data/sounds';
import { isClaimed } from '../sim/claims';
import type { SimEvents } from '../sim/events';
import { pieceRect } from '../sim/pieces';
import { roomById, type SimState } from '../sim/state';
import { AmbientView, type GlowSpot } from './AmbientView';
import { JuiceView } from './JuiceView';
import { SoundView } from './SoundView';

// Look and feel (014), driven by what the sim did since the last draw and how
// its state moved on: sound, shake, hit-stop, particles, numbers and light.
// Nothing here feeds back into the sim.

const tileCentre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

export class FeelView {
  readonly sound: SoundView;
  readonly juice: JuiceView;
  private readonly ambient: AmbientView;
  private roomId = '';
  /** Last frame's state, to catch changes the sim records no event for. */
  private modes = new Map<number, string>();
  private outputs = new Map<number, number>();
  private rolling = false;
  private dryFire = false;
  private dustMs = 0;
  private sinceFireMs = Infinity;

  static preload(scene: Scene): void {
    SoundView.preload(scene);
  }

  constructor(scene: Scene) {
    this.sound = new SoundView(scene);
    this.juice = new JuiceView(scene);
    this.ambient = new AmbientView(scene);
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number, aim: { x: number; y: number } | null): void {
    if (shown !== this.roomId) this.enterRoom(shown);
    const here = shown === sim.roomId;
    if (here) this.play(sim, events);
    this.watch(sim, shown, deltaMs);
    this.sinceFireMs = sim.tube.firing ? 0 : this.sinceFireMs + deltaMs;
    if (sim.building || this.sinceFireMs > LEAD_HOLD_MS) this.juice.leadToward(sim.player, null);
    else this.juice.leadToward(sim.player, aim);
    if (sim.building) this.juice.resetLead();
    this.juice.update(deltaMs);
    this.ambient.update(deltaMs, this.movingGlows(sim, shown));
    this.sound.endFrame();
  }

  private enterRoom(shown: string): void {
    this.roomId = shown;
    const room = roomById(shown);
    const fixed: GlowSpot[] = room.crystal ? [{ ...tileCentre(room.crystal.tx, room.crystal.ty), ...GLOWS.crystal }] : [];
    this.ambient.show(room, fixed);
    this.juice.particles.clear();
    this.juice.resetLead();
    this.sound.ambience(shown);
    this.modes.clear();
  }

  /** Effects for this frame's events. */
  private play(sim: SimState, ev: SimEvents): void {
    const j = this.juice;
    const s = this.sound;
    for (const shot of ev.shots) {
      const key = FIRE_SOUNDS[shot.ammoId];
      if (key) s.play(key);
      j.shake('small');
    }
    for (const h of ev.hits) {
      if (h.target === 'enemy') {
        s.play(SOUNDS.hit);
        s.play(SOUNDS.enemyHurt, 0.7);
        j.burst(ev.bursts.length > 0 ? 'hitFire' : 'hitPhysical', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y - 24, false);
        j.hitStop('hit');
      } else {
        s.play(SOUNDS.playerHurt);
        j.burst('hitPlayer', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y - 30, true);
        j.shake('medium');
      }
    }
    for (const d of ev.deaths) {
      s.play(SOUNDS.enemyDeath);
      j.burst('deathMotes', d.x, d.y);
      j.hitStop('kill');
    }
    for (const b of ev.bursts) {
      s.play(SOUNDS.burst);
      j.burst('embers', b.x, b.y);
      j.shake('medium');
    }
    if (ev.ko) {
      s.play(SOUNDS.playerKo);
      j.shake('big');
    }
    for (const p of ev.pickups) {
      s.play(SOUNDS.pickup);
      j.burst('pickup', p.x, p.y);
    }
    for (const h of ev.harvests) {
      s.play(SOUNDS.harvest);
      j.burst('harvestChips', h.x, h.y);
    }
    for (const p of ev.places) {
      s.play(SOUNDS.place);
      const c = tileCentre(p.tx, p.ty);
      j.burst('place', c.x, c.y + TILE_SIZE / 2);
    }
    if (ev.pickUps.length > 0) s.play(SOUNDS.pickUpPiece);
    if (ev.angles.length > 0) s.play(SOUNDS.rotate);
    if (ev.deposits.length > 0 || ev.withdraws.length > 0 || ev.crateTakes.length > 0) s.play(SOUNDS.pickUpPiece, 0.7);
    for (const r of ev.refills) {
      s.play(SOUNDS.refill, 0.6);
      const piece = sim.foundry.pieces.find((p) => p.id === r.id);
      if (piece) {
        const rect = pieceRect(piece);
        j.burst('refill', rect.x, rect.y);
      }
    }
    if (ev.attunes.length > 0) s.play(SOUNDS.attune);
    if (ev.claims.length > 0) s.play(SOUNDS.claim);
    if (ev.travels.length > 0) s.play(SOUNDS.travel);
    if (ev.gates.length > 0) {
      s.play(SOUNDS.gateOpen);
      j.shake('medium');
    }
    if (ev.tubeTaken || ev.identifies.length > 0 || ev.stashDeposits.length > 0) s.play(SOUNDS.claim, 0.6);
  }

  /** Changes with no event: wind-ups, machine crafts, rolls, dry fire and footsteps. */
  private watch(sim: SimState, shown: string, deltaMs: number): void {
    const j = this.juice;
    const live = new Set<number>();
    for (const e of sim.enemies) {
      if (e.roomId !== shown) continue;
      live.add(e.id);
      const was = this.modes.get(e.id);
      const kind = enemyDef(e.enemyId).kind;
      if (was !== undefined && was !== e.mode) {
        if (e.mode === 'windup') {
          const key = WINDUP_SOUNDS[kind];
          if (key && kind !== 'slammer') this.sound.play(key, 0.8);
        }
        if (e.mode === 'swipe' && kind === 'slammer') {
          this.sound.play(SOUNDS.wardenSlam);
          j.shake('medium');
        }
      }
      this.modes.set(e.id, e.mode);
    }
    for (const id of [...this.modes.keys()]) if (!live.has(id)) this.modes.delete(id);

    for (const p of sim.foundry.pieces) {
      if (p.kind !== 'machine') continue;
      const before = this.outputs.get(p.id);
      if (before !== undefined && p.output > before && shown === FOUNDRY_ROOM) {
        this.sound.play(SOUNDS.machineCraft, 0.6);
        const r = pieceRect(p);
        j.burst('craftPuff', r.x, r.y - r.h / 2);
      }
      this.outputs.set(p.id, p.output);
    }

    const player = sim.player;
    const rolling = player.rollTick > 0;
    if (rolling && !this.rolling) this.sound.play(SOUNDS.roll);
    this.rolling = rolling;
    const dry = sim.tube.dryFire > 0;
    if (dry && !this.dryFire) this.sound.play(SOUNDS.dryFire);
    this.dryFire = dry;

    const moving = Math.hypot(player.vx, player.vy) > 0.2;
    this.dustMs += deltaMs;
    const every = rolling ? DUST_EVERY_MS.roll : DUST_EVERY_MS.walk;
    if ((moving || rolling) && this.dustMs >= every && shown === sim.roomId) {
      this.dustMs = 0;
      j.burst(rolling ? 'rollDust' : 'footDust', player.x, player.y, player.y - 1);
    }
  }

  /** Lights that move or come and go: live veins, a claimed pylon, items on conduits, sockets and the tube. */
  private movingGlows(sim: SimState, shown: string): GlowSpot[] {
    const spots: GlowSpot[] = [];
    for (const n of sim.nodes) if (n.roomId === shown && n.nodeId === 'ley-vein' && n.uses > 0) spots.push({ x: n.x, y: n.y, ...GLOWS.vein });
    const pylon = roomById(shown).pylon;
    if (pylon && isClaimed(sim, shown)) spots.push({ ...tileCentre(pylon.tx, pylon.ty), ...GLOWS.pylon });
    if (shown === FOUNDRY_ROOM) {
      for (const p of sim.foundry.pieces) {
        const r = pieceRect(p);
        if (p.kind === 'conduit' && p.item) spots.push({ x: r.x, y: r.y, ...GLOWS.conduitItem });
        if (p.kind === 'socket') spots.push({ x: r.x, y: r.y, ...GLOWS.socket, radius: GLOWS.socket.radius * (p.pulse > 0 ? 1.4 : 1) });
      }
    }
    if (sim.hasTube && sim.link.attuned && shown === sim.roomId) spots.push({ x: sim.player.x, y: sim.player.y, ...GLOWS.tube });
    return spots;
  }
}
