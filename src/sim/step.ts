import { equip, identifyAll } from './gear';
import { playerStats } from './stats';
import { stepRelics } from './relics';
import { stepArrows, type ArrowState } from './arrows';
import { steerArrows } from './homing';
import { stepBombs } from './bombs';
import { stepMines } from './mines';
import { maskCommand, stepBuild } from './build';
import { bankGains } from './banking';
import { stepClaims, stepPorts } from './claims';
import { stepCache, stepCacheRearm } from './cache';
import { stepDiscovery } from './landmarks';
import { stepFog } from './fog';
import { arrowHits, removeDead } from './combat';
import { stepDoorways } from './doorways';
import { stepPickups } from './drops';
import type { RoomBodies } from './separation';
import { clearEvents } from './events';
import { offerFromOutside, stepFoundry } from './flow';
import { stepFoundryUse } from './foundryUse';
import { stepStash } from './stash';
import { stepHarvest } from './harvest';
import { stepLink } from './link';
import { checkKo } from './health';
import { stepHealing } from './healing';
import { stepEnemies } from './enemyAi';
import { NO_COMMAND, type Command } from './input';
import { stepPlayer } from './movement';
import { stepNodes } from './nodes';
import { stepOrbs } from './orbs';
import { stepFloodPools } from './floodPools';
import { stepBurns } from './fire';
import { roomById, type SimState } from './state';
import { firingWalkScale, stepTube } from './tube';
import { stepObjectives } from './objectives';
import { noteFound, shotSealed, stepGates, stepTubeStone } from './tutorial';
import { roomBodies } from './bodies';
import { stepPopulation } from './population';
import { entranceCap, machineSpeed, restore } from './research';
import { stepEnemyBombs } from './enemyBombs';
import { stepAltars } from './altar';
import { stepArenaLock } from './arenaLock';
import { stepLeveling } from './leveling';
import { respec, takeTalent } from './talents';
import { rampOverpressure, stepPools } from './keystones';
import { noteCarried } from './knownRounds';
import { noteBag, sortBag } from './bag';
import { stepSandbox } from './sandbox';

/** Each room's bodies, built once per tick on first use. */
function bodiesOf(state: SimState): (roomId: string) => RoomBodies {
  const cache = new Map<string, RoomBodies>();
  return (roomId) => {
    let bodies = cache.get(roomId);
    if (!bodies) {
      bodies = roomBodies(state, roomId);
      cache.set(roomId, bodies);
    }
    return bodies;
  };
}

/** Advances the sim by exactly one fixed tick. Game systems run from here; every room ticks. */
export function stepSim(state: SimState, input: Command = NO_COMMAND): void {
  clearEvents(state.events);
  state.tick += 1;
  // 047: rounds that arrived between ticks (crafted from the menu) take their carried bar slot before anything fires,
  // and new kinds their place in the grid.
  noteCarried(state);
  noteBag(state);
  // A dying player, or one held still while the tube attunes (019), takes no input but keeps their aim.
  const held = state.player.dying > 0 || state.link.attunePulse > 0;
  const cmd = held ? { ...NO_COMMAND, aimX: state.player.aimX, aimY: state.player.aimY } : maskCommand(state, input);
  // 047: the grid's Sort button.
  if (cmd.sortInventory) sortBag(state);
  const bodies = bodiesOf(state);
  const here = bodies(state.roomId);
  const stats = playerStats(state);
  stepPlayer(state.player, here.room, cmd, here.obstacles, { ...stats, walkScale: stats.walkScale * firingWalkScale(state) });
  // After the player moves and before enemies act (036): the ward builds, a roll stuns what it passes through.
  stepRelics(state);
  stepDoorways(state);
  stepLink(state);
  // Enemies act after the player moves, so a swipe lands on where the player stands now.
  stepDiscovery(state);
  stepFog(state);
  stepPopulation(state);
  stepCacheRearm(state);
  // Before enemies act, so a Bulwark bomb thrown this tick starts its fuse at 0 (034; its fuseTicks keep the word).
  stepEnemyBombs(state);
  stepEnemies(state, bodies);
  stepNodes(state.nodes, state.events.rodStrikes);
  // Before the tube, so fire this tick cancels a harvest in progress.
  // Build mode keeps E for hoppers and crates, not harvesting.
  // 045: a new E handler here adds its kind to INTERACT_KINDS (src/data/interact.ts) and to interactTarget
  // (src/sim/interactables.ts), whose test then holds it to a prompt.
  const used = stepCache(state, stepClaims(state, stepAltars(state, stepArenaLock(state, stepTubeStone(state, cmd)))));
  if (cmd.identify) identifyAll(state);
  if (cmd.equip) equip(state, cmd.equip);
  if (cmd.restore) restore(state, cmd.restore);
  if (cmd.takeTalent) takeTalent(state, cmd.takeTalent);
  if (cmd.respec) respec(state);
  // 044: the sandbox's panel, pens and bottomless entrances, before anything fires.
  stepSandbox(state, cmd);
  stepHarvest(state, state.building ? { ...used, interact: false } : used);
  // Shots fired this tick stay at the muzzle until next tick's step.
  // Shards (029) set off this tick join the flight after it, so they first move next tick.
  const shards: ArrowState[] = [];
  // Blastfletch's Pool (037) ages before arrows fly through it.
  stepPools(state);
  stepArrows(state.arrows, roomById, arrowHits(state, shards), steerArrows(state), (roomId, tx, ty) => shotSealed(state, roomId, tx, ty));
  state.arrows.push(...shards);
  // Armed mines and bomblets (038) before bombs fly, so a mine that lands this tick starts its arm time at 0.
  stepMines(state);
  stepBombs(state);
  stepOrbs(state);
  // 060: the Forge Flood's pools beat on the player standing in them.
  stepFloodPools(state);
  // 060: burns beat after everything that hits this tick, so a burn's beat can kill before the dead are removed.
  stepBurns(state);
  removeDead(state);
  // After the tick's claims, discoveries and kills (037).
  stepLeveling(state);
  stepTube(state, cmd);
  rampOverpressure(state, cmd);
  stepBuild(state, cmd);
  stepFoundryUse(state, cmd);
  stepStash(state, cmd);
  stepFoundry(state.foundry, state.link.entrances, state.events, state.link.attuned, { cap: entranceCap(state), speed: machineSpeed(state) });
  stepPorts(state, (to, from, item) => offerFromOutside(state.foundry, to, from, item));
  stepPickups(state);
  // 050: in the foundry, the tick's gains (and crafts from the menu since the last tick) are safe at once.
  bankGains(state);
  noteCarried(state);
  noteBag(state);
  noteFound(state);
  stepGates(state);
  stepObjectives(state);
  checkKo(state);
  // After the KO check, so a hit to 0 starts dying before anything could heal it (030).
  stepHealing(state);
}
