import type { Scene } from 'phaser';
import { OVERWORLD } from '../data/overworld';
import type { Room } from '../data/rooms';
import { ROOM_TOP_MARGIN } from '../data/roomArt';
import type { SimEvents } from '../sim/events';
import { roomById, roomSize, type SimState } from '../sim/state';
import { MinimapView } from './MinimapView';
import type { UiState } from './testHook';
import { OverworldView } from './overworld/OverworldView';
import { RoomView } from './room';
import { IntakeView } from './IntakeView';
import { SupplyView } from './SupplyView';
import { PortView } from './PortView';
import { HealingView, NO_HEALING_SHOWN } from './HealingView';
import { LandmarkView, NO_LANDMARKS_SHOWN } from './LandmarkView';
import { Banner, hintShown, NO_HINT_SHOWN } from './Banner';
import { CARRIED_HINT } from '../data/hints';
import { keyLabel } from './keyHint';
import { settings } from './flow/settingsStore';
import { NO_RESEARCH_SHOWN, ResearchView } from './ResearchView';
import { NO_SCHEMATICS_SHOWN, SchematicView } from './SchematicView';
import { HollowsView, NO_HOLLOWS_SHOWN } from './HollowsView';
import { NO_RELICS_SHOWN, RelicView } from './RelicView';
import { NO_TALENT_FX, TalentFxView } from './TalentFxView';
import { MineView, NO_MINES_SHOWN } from './MineView';

/** What the room views report to the test hook's `ui()`. */
export type RoomUiState = Pick<UiState, 'minimap' | 'supply' | 'intakeCaps' | 'intakeLift' | 'intakeFirePulses' | 'ports' | 'healing' | 'landmarks' | 'research' | 'schematics' | 'hollows' | 'relics' | 'talentFx' | 'mines' | 'hint'>;

/** The room views' part of `ui()` before the scene has built them. */
export const NO_ROOM_UI: RoomUiState = { minimap: { shown: false, markers: [] }, supply: { started: 0, inFlight: [] }, intakeCaps: 0, intakeLift: null, intakeFirePulses: [], ports: [], healing: NO_HEALING_SHOWN, landmarks: NO_LANDMARKS_SHOWN, research: NO_RESEARCH_SHOWN, schematics: NO_SCHEMATICS_SHOWN, hollows: NO_HOLLOWS_SHOWN, relics: NO_RELICS_SHOWN, talentFx: NO_TALENT_FX, mines: NO_MINES_SHOWN, hint: NO_HINT_SHOWN };

// The ground on screen: a tiled room (the foundry) or the overworld's terrain
// with its landmarks (017), plus the corner minimap while outside, and the
// claimed pylon's harvest running home along the ley line (018), the foundry
// intake built into the foundry's north wall (019), the supply ports' faces and plates (028), the Ley
// Springs with the signs of healing (030), the landmarks' dressing and discovery banner (032), and the
// foundry's lost parts as diagrams and the schematics' light pillars and banners (033), and Stonefall Hollows'
// barrier, altar and the Bulwark's bombs (034), and the relics' signs on the player and at the bench (036), and the
// level-up and the keystones' signs (037), and landmines and bomblets (038).
export class RoomViews {
  private readonly scene: Scene;
  private readonly tiles: RoomView;
  private readonly overworld: OverworldView;
  private readonly minimap: MinimapView;
  private readonly supply: SupplyView;
  private readonly intake: IntakeView;
  private readonly ports: PortView;
  private readonly healing: HealingView;
  private readonly landmarks: LandmarkView;
  private readonly banner: Banner;
  private readonly research: ResearchView;
  private readonly schematics: SchematicView;
  private readonly hollows: HollowsView;
  private readonly relics: RelicView;
  private readonly talentFx: TalentFxView;
  private readonly mines: MineView;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = new RoomView(scene);
    this.overworld = new OverworldView(scene);
    this.minimap = new MinimapView(scene, roomById(OVERWORLD.id));
    this.supply = new SupplyView(scene);
    this.intake = new IntakeView(scene);
    this.ports = new PortView(scene);
    this.healing = new HealingView(scene);
    this.banner = new Banner(scene);
    this.landmarks = new LandmarkView(scene, this.banner);
    this.research = new ResearchView(scene);
    this.schematics = new SchematicView(scene, this.banner);
    this.hollows = new HollowsView(scene);
    this.relics = new RelicView(scene);
    this.talentFx = new TalentFxView(scene);
    this.mines = new MineView(scene);
  }

  /** Draws a room's ground and fits the camera to it. */
  show(room: Room): void {
    this.tiles.show(room);
    this.overworld.show(room.terrain ? room : null);
    const { width, height } = roomSize(room);
    // A tiled room shows a little more wall above its top row (019); the overworld's edge is its edge.
    const above = room.terrain ? 0 : ROOM_TOP_MARGIN;
    this.scene.cameras.main.setBounds(0, -above, width, height + above);
  }

  /** `events` are the ticks' since the last draw; the supply line starts a mote for each raw a port produced. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.overworld.update(sim);
    this.minimap.update(sim);
    this.supply.update(sim, events, shown, deltaMs);
    this.intake.update(sim, events, shown, sim.building, deltaMs);
    this.ports.update(sim, shown);
    this.healing.update(sim, shown, deltaMs);
    // On the tween clock, so the test hook's tween speed holds the banner for a screenshot.
    const tweenMs = deltaMs * this.scene.tweens.timeScale;
    this.landmarks.update(sim, events, shown, tweenMs);
    this.research.update(sim, events, shown, tweenMs);
    this.schematics.update(sim, events, shown, tweenMs);
    this.hollows.update(sim, events, shown, tweenMs);
    this.relics.update(sim, events, shown, tweenMs);
    this.talentFx.update(sim, events, shown, tweenMs);
    this.mines.update(sim, events, shown, tweenMs);
    // 047.9: a one-time hint the sim calls for (the carried items' as the attune ends), with the key bound to it.
    for (const h of events.hints) if (h.id === CARRIED_HINT.id) this.banner.push({ kind: 'hint', id: h.id, kicker: '', name: CARRIED_HINT.text(keyLabel(settings().bindings.use)) });
    this.banner.update(tweenMs);
  }

  /**
   * For the test hook: the minimap and its markers, the supply line's motes (018), and the intake's caps still drawn
   * and how far they are through lifting off (024: 0..1, or null when none are), the entrances' fire pulses on the
   * pipe (028), the ports as drawn (028), and the springs and healing signs (030).
   */
  get state(): RoomUiState {
    return {
      minimap: { shown: this.minimap.shown, markers: this.minimap.markers },
      supply: { started: this.supply.started, inFlight: this.supply.inFlight },
      intakeCaps: this.intake.capsShown,
      intakeLift: this.intake.liftShown,
      intakeFirePulses: this.intake.firePulsesShown,
      ports: this.ports.shown,
      healing: this.healing.shown,
      landmarks: this.landmarks.shown,
      research: this.research.shown,
      schematics: this.schematics.shown,
      hollows: this.hollows.shown,
      relics: this.relics.shown,
      talentFx: this.talentFx.shown,
      mines: this.mines.shown,
      hint: hintShown(this.banner),
    };
  }
}
