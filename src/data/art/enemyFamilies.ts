// 076: the family looks. Every enemy belongs to one family by its home region, wherever it stands (the sandbox, the
// Bulwark's adds): the family's shared materials (palette ramps, dark to light), its rim light's colour and the
// colours of the ley motes its dead dissolve into. Every id is an existing palette id (the palette doesn't change).

export type FamilyId = 'ruin' | 'quarry' | 'forge' | 'storm';

/** A material's palette ids, darkest first. */
export type Ramp = readonly string[];

export interface EnemyFamily {
  readonly id: FamilyId;
  readonly name: string;
  /** Its home region, for review: Region 1, the Hollows, the Emberworks, the Stormcrown. */
  readonly region: string;
  /** Enemy ids (src/data/enemies.ts). */
  readonly members: readonly string[];
  /** Its shared materials by name. */
  readonly ramps: Readonly<Record<string, Ramp>>;
  /** The static rim light on its lit edges (075's `rim`). */
  readonly rim: string;
  /** The motes it dissolves into, picked per mote; the first also tints the dissolve. */
  readonly motes: readonly [string, string, string];
}

export const ENEMY_FAMILIES: readonly EnemyFamily[] = [
  {
    id: 'ruin',
    name: 'Mossbound ruins',
    region: 'Region 1',
    members: ['husk', 'wisp', 'pylon-warden'],
    ramps: {
      stone: ['rock-dark', 'rock', 'rock-light'],
      guardian: ['warden-dark', 'warden', 'warden-light'],
      moss: ['leaf-dark', 'moss-tuft', 'leaf-light'],
      rune: ['cyan', 'cyan-glow'],
    },
    rim: 'rim-light',
    motes: ['cyan-glow', 'cyan', 'leaf-pale'],
  },
  {
    id: 'quarry',
    name: 'Quarry constructs',
    region: 'Stonefall Hollows',
    members: ['charger', 'burrower', 'shardback', 'sniper', 'bulwark'],
    ramps: {
      slate: ['hollow-dark', 'hollow', 'hollow-light', 'hollow-pale'],
      iron: ['iron-dark', 'iron', 'iron-light'],
      rust: ['iron-rust'],
      vein: ['vein'],
      brass: ['brass-dark', 'brass', 'brass-light'],
    },
    rim: 'hollow-pale',
    motes: ['vein', 'hollow-pale', 'cyan-glow'],
  },
  {
    id: 'forge',
    name: 'Forge constructs',
    region: 'The Emberworks',
    members: ['cinder-mote', 'bellows-hound', 'slag-golem', 'slag-whelp', 'kiln-tender', 'forgewright'],
    ramps: {
      ash: ['ash-dark', 'ash', 'ash-light', 'ash-pale'],
      iron: ['iron-dark', 'iron', 'iron-light'],
      cinder: ['flame-dark', 'cinder', 'cinder-light'],
      brass: ['brass-dark', 'brass', 'brass-light'],
    },
    rim: 'cinder-light',
    motes: ['cinder-light', 'brass-light', 'gold-trim'],
  },
  {
    id: 'storm',
    name: 'Storm-works',
    region: 'The Stormcrown',
    members: ['thunderhawk', 'static-mite', 'storm-sentinel', 'gale-ram', 'conductor'],
    ramps: {
      slate: ['storm-dark', 'storm', 'storm-light'],
      glass: ['storm-glow', 'storm-pale', 'snow'],
      lightning: ['storm-glow', 'snow'],
      brass: ['brass-dark', 'brass', 'brass-light'],
    },
    rim: 'storm-pale',
    motes: ['storm-glow', 'storm-pale', 'snow'],
  },
];

/** The family an enemy belongs to. */
export function familyOf(enemyId: string): EnemyFamily {
  const f = ENEMY_FAMILIES.find((x) => x.members.includes(enemyId));
  if (!f) throw new Error(`Enemy '${enemyId}' is in no family`);
  return f;
}

/** A family by id. */
export function family(id: FamilyId): EnemyFamily {
  const f = ENEMY_FAMILIES.find((x) => x.id === id);
  if (!f) throw new Error(`No family '${id}'`);
  return f;
}

/** How many motes a death throws, by size (DEATH_MOTES in src/data/juice.ts). */
export type DeathSize = 'small' | 'medium' | 'large' | 'boss';

/** Every enemy's size class: the small and large ones by name, the bosses, and everyone else medium. */
export const DEATH_SIZE: Readonly<Record<string, DeathSize>> = {
  husk: 'medium',
  wisp: 'small',
  'pylon-warden': 'boss',
  charger: 'medium',
  burrower: 'medium',
  shardback: 'medium',
  sniper: 'medium',
  bulwark: 'boss',
  'cinder-mote': 'small',
  'bellows-hound': 'medium',
  'slag-golem': 'large',
  'slag-whelp': 'small',
  'kiln-tender': 'medium',
  forgewright: 'boss',
  thunderhawk: 'medium',
  'static-mite': 'small',
  'storm-sentinel': 'medium',
  'gale-ram': 'large',
  conductor: 'boss',
};
