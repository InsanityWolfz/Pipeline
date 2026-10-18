import type { Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { enemyDef } from '../data/enemies';
import { INTAKE } from '../data/foundry';
import { DUST, GLOWS, HARVEST_BURSTS, HARVEST_WORK, HIT_STOP_MS } from '../data/juice';
import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRE_SOUNDS, SOUND_LEVELS, SOUNDS, WINDUP_SOUNDS } from '../data/sounds';
import { isClaimed } from '../sim/claims';
import type { SimEvents } from '../sim/events';
import { pieceRect } from '../sim/pieces';
import { roomById, type SimState } from '../sim/state';
import { AmbientView, type GlowSpot } from './AmbientView';
import { JuiceView } from './JuiceView';
import { SoundView } from './SoundView';
import { attuneBeat } from './attune';
import { intakeAnchor } from './foundryLayout';

// Look and feel (014), driven by what the sim did since the last draw and how
// its state moved on: sound, shake, hit-stop, particles, numbers and light.
// Nothing here feeds back into the sim.

const tileCentre = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

export class FeelView {
  readonly sound: SoundView;
  readonly juice: JuiceView;
  private readonly ambient: AmbientView;
  private readonly dropIn: (id: number) => void;
  private readonly freeze: (id: number, ms: number) => void;
  private roomId = '';
  /** Last frame's state, to catch changes the sim records no event for. */
  private modes = new Map<number, string>();
  private outputs = new Map<number, number>();
  private rolling = false;
  private dryFire = false;
  private dustMs = 0;
  private workMs = 0;
  /** Ms left on the intake's glow swelling after an item went in (019). */
  private intakeMs = 0;

  static preload(scene: Scene): void {
    SoundView.preload(scene);
  }

  /** `dropIn` bounces a just-placed piece in the foundry view; `freeze` holds a struck enemy still (hit-stop). */
  constructor(scene: Scene, dropIn: (id: number) => void, freeze: (id: number, ms: number) => void) {
    this.dropIn = dropIn;
    this.freeze = freeze;
    this.sound = new SoundView(scene);
    this.juice = new JuiceView(scene);
    this.ambient = new AmbientView(scene);
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    if (shown !== this.roomId) this.enterRoom(shown);
    const here = shown === sim.roomId;
    if (here) this.play(sim, events);
    this.watch(sim, shown, deltaMs);
    this.juice.update(deltaMs);
    this.intakeMs = Math.max(0, this.intakeMs - deltaMs);
    this.ambient.update(deltaMs, this.movingGlows(sim, shown));
    this.sound.endFrame();
  }

  private enterRoom(shown: string): void {
    this.roomId = shown;
    const room = roomById(shown);
    const fixed: GlowSpot[] = room.crystal ? [{ ...tileCentre(room.crystal.tx, room.crystal.ty), ...GLOWS.crystal }] : [];
    this.ambient.show(room, fixed);
    this.juice.particles.clear();
    this.sound.ambience(shown);
    this.modes.clear();
  }

  /** Effects for this frame's events. */
  private play(sim: SimState, ev: SimEvents): void {
    const j = this.juice;
    const s = this.sound;
    for (const shot of ev.shots) {
      const key = FIRE_SOUNDS[shot.ammoId];
      // No shake on firing (021): too jarring.
      if (key) s.play(key);
    }
    for (const h of ev.hits) {
      if (h.target === 'enemy') {
        s.play(SOUNDS.hit);
        s.play(SOUNDS.enemyHurt, SOUND_LEVELS.under);
        j.burst(h.damageType === 'fire' ? 'hitFire' : 'hitPhysical', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y, false);
        this.freeze(h.id, HIT_STOP_MS);
      } else {
        s.play(SOUNDS.playerHurt);
        j.burst('hitPlayer', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y, true);
        j.shake('medium');
      }
    }
    for (const d of ev.deaths) {
      s.play(SOUNDS.enemyDeath);
      j.burst('deathMotes', d.x, d.y);
      j.shake('small');
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
      j.burst(HARVEST_BURSTS[h.nodeId] ?? 'harvestChips', h.x, h.y);
    }
    for (const p of ev.places) {
      s.play(SOUNDS.place);
      this.dropIn(p.id);
      const c = tileCentre(p.tx, p.ty);
      j.burst('place', c.x, c.y + TILE_SIZE / 2);
    }
    if (ev.pickUps.length > 0) s.play(SOUNDS.pickUpPiece);
    if (ev.angles.length > 0) s.play(SOUNDS.rotate);
    if (ev.deposits.length > 0 || ev.withdraws.length > 0 || ev.crateTakes.length > 0) s.play(SOUNDS.pickUpPiece, SOUND_LEVELS.under);
    for (const r of ev.refills) {
      s.play(SOUNDS.refill, SOUND_LEVELS.quiet);
      // Sparks at the inlet the item went into.
      const mouth = INTAKE.mouth[r.mouth];
      if (mouth) j.burst('refill', (mouth.tx + 0.5) * TILE_SIZE, (mouth.ty + 1) * TILE_SIZE);
      this.intakeMs = GLOWS.intake.ms;
    }
    if (ev.attunes.length > 0) s.play(SOUNDS.attune);
    if (ev.claims.length > 0) s.play(SOUNDS.claim);
    if (ev.travels.length > 0) s.play(SOUNDS.travel);
    if (ev.gates.length > 0) {
      s.play(SOUNDS.gateOpen);
      j.shake('medium');
    }
    if (ev.tubeTaken || ev.identifies.length > 0 || ev.stashDeposits.length > 0) s.play(SOUNDS.claim, SOUND_LEVELS.quiet);
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
          if (key) this.sound.play(key, SOUND_LEVELS.cue);
        }
        if (e.mode === 'swipe' && kind === 'slammer') {
          this.sound.play(SOUNDS.wardenSlam);
          j.shake('medium');
        }
      }
      this.modes.set(e.id, e.mode);
    }
    for (const id of [...this.modes.keys()]) if (!live.has(id)) this.modes.delete(id);

    const machines = new Set<number>();
    for (const p of sim.foundry.pieces) {
      if (p.kind !== 'machine') continue;
      machines.add(p.id);
      const before = this.outputs.get(p.id);
      if (before !== undefined && p.output > before && shown === FOUNDRY_ROOM) {
        this.sound.play(SOUNDS.machineCraft, SOUND_LEVELS.quiet);
        const r = pieceRect(p);
        j.burst('craftPuff', r.x, r.y - r.h / 2);
      }
      this.outputs.set(p.id, p.output);
    }
    for (const id of [...this.outputs.keys()]) if (!machines.has(id)) this.outputs.delete(id);

    const player = sim.player;
    const rolling = player.rollTick > 0;
    if (rolling && !this.rolling) this.sound.play(SOUNDS.roll);
    this.rolling = rolling;
    const dry = sim.tube.dryFire > 0;
    if (dry && !this.dryFire) this.sound.play(SOUNDS.dryFire);
    this.dryFire = dry;

    const moving = Math.hypot(player.vx, player.vy) > DUST.minSpeed;
    this.dustMs += deltaMs;
    const every = rolling ? DUST.rollMs : DUST.walkMs;
    if ((moving || rolling) && this.dustMs >= every && shown === sim.roomId) {
      this.dustMs = 0;
      j.burst(rolling ? 'rollDust' : 'footDust', player.x, player.y, player.y - 1);
    }

    // A node being worked gives off a little of its burst as it goes (018).
    const worked = sim.harvest ? sim.nodes.find((n) => n.id === sim.harvest?.nodeId) : undefined;
    this.workMs = worked ? this.workMs + deltaMs : 0;
    if (worked && this.workMs >= HARVEST_WORK.burstMs) {
      this.workMs = 0;
      j.burst(HARVEST_BURSTS[worked.nodeId] ?? 'harvestChips', worked.x, worked.y);
    }
  }

  /** Lights that move or come and go: live veins, a claimed pylon, items on conduits, the intake and the tube. */
  private movingGlows(sim: SimState, shown: string): GlowSpot[] {
    const spots: GlowSpot[] = [];
    for (const n of sim.nodes) if (n.roomId === shown && n.nodeId === 'ley-vein' && n.uses > 0) spots.push({ x: n.x, y: n.y, ...GLOWS.vein });
    const pylon = roomById(shown).pylon;
    if (pylon && isClaimed(sim, pylon.site)) spots.push({ ...tileCentre(pylon.tx, pylon.ty), ...GLOWS.pylon });
    if (shown === FOUNDRY_ROOM) {
      for (const p of sim.foundry.pieces) {
        const r = pieceRect(p);
        if (p.kind === 'conduit' || p.kind === 'sorter') spots.push({ x: r.x, y: r.y, ...GLOWS.conduit });
        if (p.kind === 'conduit' && p.item) spots.push({ x: r.x, y: r.y, ...GLOWS.conduitItem });
      }
      // The intake glows once attuned (growing as its rings light), swelling as each item goes in.
      const { pipeGlow } = attuneBeat(sim.link.attunePulse);
      if (sim.link.attuned && pipeGlow > 0) {
        const swell = sim.link.attunePulse > 0 ? pipeGlow : this.intakeMs > 0 ? GLOWS.intake.pulse : 1;
        spots.push({ ...intakeAnchor(), color: GLOWS.intake.color, radius: GLOWS.intake.radius * swell });
      }
    }
    if (sim.hasTube && sim.link.attuned && shown === sim.roomId) {
      // The same growing glow round the tube while its rings light.
      spots.push({ x: sim.player.x, y: sim.player.y, color: GLOWS.tube.color, radius: GLOWS.tube.radius * attuneBeat(sim.link.attunePulse).gunGlow });
    }
    return spots;
  }
}
