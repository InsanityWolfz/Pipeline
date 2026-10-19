import { SITE_LOOK, SUPPLY_LOOK } from '../../src/data/art/ground';
import { RESIN } from '../../src/data/art/husk';
import { NODE_DAPPLE } from '../../src/data/art/nodes';
import { CORE } from '../../src/data/art/warden';
import { PORT_CYCLE } from '../../src/data/claims';
import { ITEMS } from '../../src/data/items';
import { NODES } from '../../src/data/nodes';
import { describe, expect, it } from 'vitest';
import { FLOOR_VARIANTS, WALL_SPRITES } from '../../src/data/roomArt';
import { animFrames, ENEMY_FX, HUD_HEALTH_LAYOUT, MELEE_SWOOSH, PLAYER_HIT_FX } from '../../src/data/assets';
import { ARMOR_TINTS, GHOST, HARVEST_BAR, MINIMAP, TABLET } from '../../src/data/hudLayout';
import { ENEMIES } from '../../src/data/enemies';
import { LOGISTICS_ICONS, SORTER_ANIMS } from '../../src/data/foundryAssets';
import { ENTRANCE_GAUGE_COLORS, INTAKE_LOOK } from '../../src/data/art/intake';
import { AMBIENT, DAMAGE_NUMBERS, GLOWS, HARVEST_BURSTS, HARVEST_WORK, PARTICLES, ROOM_MOOD } from '../../src/data/juice';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { FIRE_SOUNDS, ROOM_AMBIENCE, SOUNDS, WINDUP_SOUNDS } from '../../src/data/sounds';
import { SLOT_AMMOS } from '../../src/data/tube';
import { PROPS, type PropDef } from '../../src/data/props';
import { TILE } from '../../src/data/rooms';
import { WORLD } from '../../src/sim/world';
import { vectorFrames } from '../../src/render/vector/catalog';

/** Rooms drawn from pixel tiles (the foundry); the overworld (017) is drawn in vector from its terrain. */
const ROOMS = Object.fromEntries(Object.entries(WORLD).filter(([, r]) => !r.terrain));

// Look and feel (014): every new frame exists, and room dressing stays out of the way.

/** Every frame drawn (vector data, since 020 the only source). */
const frames = vectorFrames().map((f) => f.name);

describe('room art', () => {
  it('has every floor variant and wall piece in the atlas', () => {
    for (const key of [...FLOOR_VARIANTS.tiles, ...Object.values(WALL_SPRITES)]) expect(frames).toContain(key);
  });

  it('has variants for every room floor theme', () => {
    expect(new Set(FLOOR_VARIANTS.tiles).size).toBeGreaterThanOrEqual(4);
  });
});

describe('props', () => {
  it('have every frame in the atlas', () => {
    for (const def of Object.values(PROPS)) for (const frame of animFrames(def.anim)) expect(frames).toContain(frame);
  });

  it('sit where their layer allows, clear of everything the player uses', () => {
    for (const room of Object.values(ROOMS)) {
      const at = (tx: number, ty: number) => room.rows[ty]?.[tx];
      const busy = [
        room.spawn,
        ...(room.nodes ?? []),
        ...(room.enemies ?? []),
        ...(room.tubeStone ? [room.tubeStone] : []),
        ...(room.pylon ? [room.pylon] : []),
      ];
      for (const p of room.props ?? []) {
        const where = `${room.id} ${p.propId} at ${p.tx},${p.ty}`;
        const layer = PROPS[p.propId].layer;
        if (layer === 'block') expect(at(p.tx, p.ty), where).toBe(TILE.ruinBlock);
        else if (layer === 'wall') {
          expect(at(p.tx, p.ty), where).toBe(TILE.wall);
          expect(at(p.tx, p.ty + 1), where).toBe(TILE.floor);
        } else {
          expect(at(p.tx, p.ty), where).toBe(TILE.floor);
          for (const b of busy) expect(b.tx === p.tx && b.ty === p.ty, where).toBe(false);
          for (const d of room.doorways ?? []) expect(Math.abs(d.tx - p.tx) + Math.abs(d.ty - p.ty), where).toBeGreaterThan(1);
        }
      }
    }
  });

  it('never share a tile', () => {
    for (const room of Object.values(ROOMS)) {
      const tiles = (room.props ?? []).map((p) => `${p.tx},${p.ty}`);
      expect(new Set(tiles).size, room.id).toBe(tiles.length);
    }
  });
});

describe('feel and sound references', () => {
  const known = new Set(DAYLIGHT_PALETTE.map((c) => c.id));

  it('use only palette colours', () => {
    const ids = [
      ...Object.values(PARTICLES).flatMap((p) => p.colors),
      ...Object.values(GLOWS).map((g) => g.color),
      ...Object.values(ROOM_MOOD).map((m) => m.tint),
      DAMAGE_NUMBERS.enemy,
      DAMAGE_NUMBERS.player,
      DAMAGE_NUMBERS.outline,
      ...AMBIENT.moteColors,
      SITE_LOOK.dome.color,
      SITE_LOOK.safe.color,
      SITE_LOOK.safe.ringColor,
      SUPPLY_LOOK.tendrilColor,
      SUPPLY_LOOK.halo,
      ...Object.values(SUPPLY_LOOK.moteColors),
      NODE_DAPPLE.color,
      RESIN.glint.color,
      RESIN.drop.color,
      CORE.haloColor,
      ...Object.values(PROPS).flatMap((p) => {
        const def: PropDef = p;
        return def.glow ? [def.glow.color] : [];
      }),
      // HUD and render layout colours (020: the pixel palette is gone, so each must be a daylight id).
      TABLET.fill,
      TABLET.edge,
      TABLET.bevel,
      TABLET.base,
      TABLET.brass,
      GHOST.okTint,
      GHOST.badTint,
      HARVEST_BAR.color,
      HARVEST_BAR.back,
      ...Object.values(MINIMAP.terrain),
      ...Object.values(MINIMAP.markers).map((m) => m.color),
      ...Object.values(ARMOR_TINTS),
      MELEE_SWOOSH.color,
      HUD_HEALTH_LAYOUT.fillColor,
      ENEMY_FX.flashColor,
      ENEMY_FX.telegraphColor,
      ENEMY_FX.castColor,
      ENEMY_FX.healthBarColor,
      ENEMY_FX.healthBarBack,
      PLAYER_HIT_FX.flashColor,
      ...Object.values(ENTRANCE_GAUGE_COLORS),
      INTAKE_LOOK.capLift.ring,
      INTAKE_LOOK.gauge.dark,
    ];
    for (const id of ids) expect(known.has(id), id).toBe(true);
  });

  it('key node reactions by real node types and enemies, and give every raw the shrine sends a mote colour (018)', () => {
    expect(Object.keys(HARVEST_BURSTS).sort()).toEqual(Object.keys(NODES).sort());
    for (const burst of Object.values(HARVEST_BURSTS)) expect(PARTICLES[burst]).toBeDefined();
    for (const id of [NODE_DAPPLE.nodeId, HARVEST_WORK.shakeNodeId]) expect(NODES[id], id).toBeDefined();
    for (const id of [RESIN.enemyId, CORE.enemyId]) expect(ENEMIES[id], id).toBeDefined();
    for (const id of Object.keys(SUPPLY_LOOK.moteColors)) expect(ITEMS[id], id).toBeDefined();
    for (const id of PORT_CYCLE) expect(SUPPLY_LOOK.moteColors[id], id).toBeDefined();
  });

  it('key moods and ambience by real rooms, fire sounds by real ammo, and wind-ups by real enemy kinds', () => {
    for (const roomId of [...Object.keys(ROOM_MOOD), ...Object.keys(ROOM_AMBIENCE)]) expect(WORLD[roomId], roomId).toBeDefined();
    for (const room of Object.keys(WORLD)) expect(ROOM_AMBIENCE[room], room).toBeDefined();
    for (const ammoId of SLOT_AMMOS) expect(FIRE_SOUNDS[ammoId], ammoId).toBeDefined();
    const kinds = new Set(Object.values(ENEMIES).map((e) => e.kind));
    for (const kind of kinds) expect(WINDUP_SOUNDS[kind], kind).toBeDefined();
    for (const kind of Object.keys(WINDUP_SOUNDS)) expect(kinds.has(kind as never), kind).toBe(true);
  });

  it('only play sounds that have recipes', () => {
    const keys = new Set<string>(Object.values(SOUNDS));
    for (const key of [...Object.values(FIRE_SOUNDS), ...Object.values(WINDUP_SOUNDS), ...Object.values(ROOM_AMBIENCE)]) expect(keys.has(key), key).toBe(true);
  });
});

describe('the sorter (015)', () => {
  it('has every frame in the atlas', () => {
    for (const anim of Object.values(SORTER_ANIMS)) for (const frame of animFrames(anim)) expect(frames).toContain(frame);
    expect(frames).toContain(LOGISTICS_ICONS.sorter);
  });
});
