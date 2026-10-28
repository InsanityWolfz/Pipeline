import type { Scene } from 'phaser';
import { STAGES } from '../data/stages';
import { TILE_SIZE } from '../data/config';
import { enemyDef } from '../data/enemies';
import { INTAKE } from '../data/foundry';
import { DUST, GLOWS, HARVEST_BURSTS, HARVEST_WORK, HIT_STOP_MS } from '../data/juice';
import { FOUNDRY_ROOM } from '../data/rooms';
import { SOUND_LEVELS, SOUNDS, WINDUP_SOUNDS } from '../data/sounds';
import { wornRelic } from '../sim/stats';
import type { SimEvents } from '../sim/events';
import { pieceRect } from '../sim/pieces';
import { roomById, type SimState } from '../sim/state';
import { AmbientView, type GlowSpot } from './AmbientView';
import { intakeGlowRadius, movingGlows } from './movingGlows';
import { intakeAnchor } from './foundryLayout';
import { JuiceView } from './JuiceView';
import { SoundView } from './SoundView';
import { playHollows, SealSound } from './hollowsFeel';
import { playEmberworks, VentFeel } from './emberworksFeel';
import { playStormcrown } from './stormcrownFeel';
import { ARENAS } from '../data/arenas';
import { arenaLocked } from '../sim/arenaLock';
import { playMines } from './mineFeel';
import { playShots, WorkFeel } from './tierFeel';
import { HollowsEnemyFeel } from './hollowsEnemyFeel';
import type { ParticleLedger } from './particleBudget';
import type { Quality } from '../data/settings';

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
  private readonly work = new WorkFeel();
  private rolling = false;
  private dustMs = 0;
  private workMs = 0;
  /** Ms left on the intake's glow swelling after an item went in (019). */
  private intakeMs = 0;
  /** Region 2's four's charges, eruptions, bashes and bolts (035). */
  private readonly hollowsEnemies = new HollowsEnemyFeel();
  /** 045: the arena seal's hum and drop (055: either arena's). */
  readonly seal = new SealSound();
  private readonly vents = new VentFeel();

  static preload(scene: Scene): void {
    SoundView.preload(scene);
  }

  /** `dropIn` bounces a just-placed piece in the foundry view; `freeze` holds a struck enemy still (hit-stop). */
  private readonly scene: Scene;

  /** 078: `fx` is the scene's particle ledger and the Graphics quality the particles scale by. */
  private readonly ledger: ParticleLedger;

  constructor(scene: Scene, dropIn: (id: number) => void, freeze: (id: number, ms: number) => void, fx: { ledger: ParticleLedger; quality: () => Quality }) {
    this.dropIn = dropIn;
    this.freeze = freeze;
    this.scene = scene;
    this.ledger = fx.ledger;
    this.sound = new SoundView(scene);
    this.juice = new JuiceView(scene, fx.ledger, fx.quality);
    this.ambient = new AmbientView(scene);
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    if (shown !== this.roomId) this.enterRoom(shown);
    const here = shown === sim.roomId;
    if (here) this.play(sim, events);
    this.watch(sim, shown, deltaMs);
    this.juice.update(deltaMs);
    this.intakeMs = Math.max(0, this.intakeMs - deltaMs);
    this.ambient.update(deltaMs, movingGlows(sim, shown, this.intakeMs > 0));
    this.sound.endFrame();
  }

  private enterRoom(shown: string): void {
    this.roomId = shown;
    const room = roomById(shown);
    const fixed: GlowSpot[] = room.crystal ? [{ ...tileCentre(room.crystal.tx, room.crystal.ty), ...GLOWS.crystal }] : [];
    this.ambient.show(room, fixed);
    this.juice.particles.clear();
    // 078: 014's room motes count under the weather's share indoors; the overworld's weather reports its own.
    this.ledger.set('weather', this.ambient.moteCount);
    this.sound.ambience(shown);
    this.modes.clear();
  }

  /** Effects for this frame's events. */
  private play(sim: SimState, ev: SimEvents): void {
    const j = this.juice;
    const s = this.sound;
    // No shake on firing (021): too jarring. Each shot's sound is its family's (tierFeel.ts).
    playShots(ev.shots, (key) => s.play(key));
    // Cold and the Split (029): a freeze rings and frosts, a thaw throws off ice, a Split chimes.
    for (const f of ev.freezes) {
      s.play(SOUNDS.freeze);
      j.burst('hitCold', f.x, f.y);
    }
    for (const t of ev.thaws) j.burst('thawShards', t.x, t.y);
    // 060: an enemy catching fire (a hit's or a spread's) puffs embers; the crackle plays once a frame however many caught.
    for (const i of ev.ignites) j.burst('ignite', i.x, i.y);
    if (ev.ignites.length > 0) s.play(SOUNDS.burnCrackle, SOUND_LEVELS.quiet);
    if (ev.splits.length > 0) s.play(SOUNDS.split, SOUND_LEVELS.cue);
    // The relics (036): a relic identified at the bench, the ward breaking on a block, Last Ember's save.
    if (ev.identifies.some((piece) => piece.relic !== null)) s.play(SOUNDS.relicIdentify, SOUND_LEVELS.cue);
    const relicSound = (rule: 'ward' | 'ember') => wornRelic(sim, rule)?.sound;
    const ward = relicSound('ward');
    const ember = relicSound('ember');
    if (ev.wardBlocks.length > 0 && ward) s.play(ward);
    if (ev.emberSaves.length > 0 && ember) s.play(ember);
    // 037: a level-up chimes, a taken talent sets into its socket, a respec runs the lights down.
    if (ev.levelUps.length > 0) s.play(SOUNDS.levelUp, SOUND_LEVELS.cue);
    if (ev.talents.length > 0) s.play(SOUNDS.talentTake);
    if (ev.respecs.length > 0) s.play(SOUNDS.respec);
    // Healing starting in a safe spot (030) chimes once; nothing while it carries on, or when it only changes source.
    if (ev.heals.some((h) => h.kind === 'start') && !ev.heals.some((h) => h.kind === 'stop')) s.play(SOUNDS.healStart, SOUND_LEVELS.quiet);
    // A stage hand-applied at the bench (029) sounds like a hand craft (the crafting menu plays its own).
    if (ev.crafts.some((c) => STAGES[c.recipeId])) s.play(SOUNDS.craft);
    // A punch (023) thuds on a hit, or whiffs; its hits otherwise land like any other.
    for (const m of ev.melees) s.play(m.hits.length > 0 ? SOUNDS.meleeHit : SOUNDS.meleeWhiff);
    for (const h of ev.hits) {
      if (h.target === 'enemy' && h.burn) {
        // 060: a burn's beat is a small number only: no hit sound, burst or hit stop.
        j.damageNumber(h.damage, h.x, h.y, false, true);
      } else if (h.target === 'enemy') {
        if (!h.melee) s.play(SOUNDS.hit);
        s.play(SOUNDS.enemyHurt, SOUND_LEVELS.under);
        // 078: a round's hit plays its impact (ShotFxView, by the round that made it); a punch keeps 014's burst.
        if (h.melee) j.burst('hitPhysical', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y, false);
        this.freeze(h.id, HIT_STOP_MS);
      } else {
        s.play(SOUNDS.playerHurt);
        j.burst('hitPlayer', h.x, h.y);
        j.damageNumber(h.damage, h.x, h.y, true);
        j.shake('medium');
      }
    }
    // 076: a death's motes rise off the body as it dissolves (DissolveView); its sound plays here, once each.
    ev.deaths.forEach(() => {
      s.play(SOUNDS.enemyDeath);
      j.shake('small');
    });
    // 078: a burst's blast (debris, smoke, shock ring, scorch) is ShotFxView's; its sound and shake request stay.
    ev.bursts.forEach(() => {
      s.play(SOUNDS.burst);
      j.shake('medium');
    });
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
    if (ev.stamps.some((st) => st.placed > 0)) s.play(SOUNDS.stamp); // 063: one stamp, not a place sound per piece
    for (const p of ev.places) {
      if (ev.stamps.length === 0) s.play(SOUNDS.place);
      this.dropIn(p.id);
      const c = tileCentre(p.tx, p.ty);
      j.burst('place', c.x, c.y + TILE_SIZE / 2);
    }
    if (ev.pickUps.length > 0) s.play(SOUNDS.pickUpPiece);
    if (ev.deposits.length > 0 || ev.withdraws.length > 0) s.play(SOUNDS.pickUpPiece, SOUND_LEVELS.under);
    for (const r of ev.refills) {
      s.play(SOUNDS.refill, SOUND_LEVELS.quiet);
      // Sparks at the inlet the item went into.
      const inlet = INTAKE.entrances[r.entrance];
      if (inlet) j.burst('refill', (inlet.tx + 0.5) * TILE_SIZE, (inlet.ty + 1) * TILE_SIZE);
      this.intakeMs = GLOWS.intake.ms;
    }
    for (const open of ev.intakeOpens) {
      // The cap lifts off (024, one entrance per restore since 033): a brass clank and a rising chime, and flecks from its inlet.
      s.play(SOUNDS.intakeOpen);
      const inlet = INTAKE.entrances[open.entrance];
      if (inlet) j.burst('capLift', (inlet.tx + 0.5) * TILE_SIZE, (inlet.ty + 1) * TILE_SIZE);
      this.intakeMs = GLOWS.intake.ms;
    }
    if (ev.attunes.length > 0) s.play(SOUNDS.attune);
    // 033: restoring, a schematic landing with its sparks, and a banked schematic's diagram appearing.
    if (ev.restores.length > 0) s.play(SOUNDS.restore);
    for (const d of ev.schematicDrops) j.burst('schematic', d.x, d.y);
    if (ev.schematicDrops.length > 0) s.play(SOUNDS.schematicChime);
    if (ev.schematicReveals.length > 0) s.play(SOUNDS.reveal);
    if (ev.claims.length > 0) s.play(SOUNDS.claim);
    if (ev.travels.length > 0) s.play(SOUNDS.travel);
    // 034: the Hollows' shield, bombs, pound, summon and barrier; the barrier's fall has its own sound.
    const barrier = playHollows(ev, j, s, this.scene.cameras.main.worldView);
    // 060: the Emberworks' barrier across its ramps falls the same way.
    const emberFell = playEmberworks(ev, j, s, this.scene.cameras.main.worldView);
    // 064: and the Stormcrown's.
    const stormFell = playStormcrown(ev, j, s, this.scene.cameras.main.worldView);
    // 038: landmines arming and bursting, and the bomblets.
    playMines(ev, j, s);
    this.hollowsEnemies.events(ev, j, s);
    if (ev.gates.length > (barrier ? 1 : 0) + (emberFell ? 1 : 0) + (stormFell ? 1 : 0)) {
      s.play(SOUNDS.gateOpen);
      j.shake('medium');
    }
    if (ev.tubeTaken || ev.identifies.length > 0 || ev.stashDeposits.length > 0) s.play(SOUNDS.claim, SOUND_LEVELS.quiet);
  }

  /** Changes with no event: wind-ups, machine crafts, rolls and footsteps. */
  private watch(sim: SimState, shown: string, deltaMs: number): void {
    const j = this.juice;
    this.hollowsEnemies.watch(sim, shown, deltaMs, j, this.sound);
    this.seal.update(ARENAS.some((a) => arenaLocked(sim, a, shown)), this.sound);
    // 060: a cinder vent in view flaring open.
    this.vents.watch(sim, shown, this.scene.cameras.main.worldView, j, this.sound);
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

    this.work.update(sim, shown, (key, level) => this.sound.play(key, level));
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

  /** 079: the room's motes now (they count in the foundry's particle cap). */
  get moteCount(): number {
    return this.ambient.moteCount;
  }

  /** 079: the intake's mouth and its glow's radius while it glows (for its light), else null. */
  intakeGlow(sim: SimState): { x: number; y: number; glowRadius: number } | null {
    const r = intakeGlowRadius(sim, this.intakeMs > 0);
    return r > 0 ? { ...intakeAnchor(), glowRadius: r } : null;
  }
}
