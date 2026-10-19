// Asset keys and look numbers for 033's art: the diagrams of the foundry's lost parts,
// the wall panels and the sealed wing's door, the splitter and merger, the research
// items' icons, the schematic's light pillar, and the restore panel and research list.
// Render draws by these keys; the shapes are in src/data/art/research.ts. Times ms,
// sizes world px (view px for the HUD), alphas 0..1.

export const RESEARCH_SPRITES = {
  /** A diagram over a capped entrance's brass cap: faint cyan linework of the open inlet and its collar. */
  diagramCap: 'research-diagram-cap',
  /** A diagram on the intake pipe: a bigger reservoir's tank and bands drawn round the pipe. */
  diagramPipe: 'research-diagram-pipe',
  /** A wall panel's diagram, by the effect it shows: machine speed (a cog train), the splitter, the merger. */
  diagramWall: { machineSpeed: 'research-diagram-speed', splitter: 'research-diagram-splitter', merger: 'research-diagram-merger' },
  /** A bare wall panel: the carved stone frame every wall diagram sits in. */
  panel: 'research-panel',
  /** A restored wall panel: brass and stone, its part solid, by the same effects. */
  restoredWall: { machineSpeed: 'research-restored-speed', splitter: 'research-restored-splitter', merger: 'research-restored-merger' },
  /** The reservoir's restored collars: brass bands round the pipe, by restored tier (1, 2). */
  restoredPipe: ['research-restored-pipe-1', 'research-restored-pipe-2'],
  /** The sealed wing's door, two tiles wide in the north wall's notch. */
  wingDoor: 'research-wing-door',
  /** The splitter and the merger as they lie on the floor, by view (side, up, down), like the sorter. */
  splitter: { side: 'splitter-side', up: 'splitter-up', down: 'splitter-down' },
  merger: { side: 'merger-side', up: 'merger-up', down: 'merger-down' },
  /** The schematic's ley-light pillar while it lies on the ground, drawn white for render to tint. */
  pillar: 'schematic-pillar',
  /** The minimap's ping over a schematic on the ground. */
  mapPing: 'map-schematic',
} as const;

/** The research items' icons. A schematic shows the unknown icon until its node is revealed (banked), then the known one. */
export const RESEARCH_ICONS = {
  ancientGear: 'item-ancient-gear',
  aqueductValve: 'item-aqueduct-valve',
  bulwarkCore: 'item-bulwark-core',
  schematicUnknown: 'item-schematic-unknown',
  schematic: 'item-schematic',
} as const;

export const RESEARCH_LOOK = {
  /** A diagram's linework breathes between these alphas over `pulseMs`; a diagram whose `requires` are unmet is drawn at `dimmed` of that. */
  diagram: { alpha: [0.35, 0.7] as const, pulseMs: 2200, dimmed: 0.35 },
  /** Restoring: the linework fills solid cyan over `fillMs`, then the part solidifies (the diagram fades as it shows) over `solidMs`. */
  restore: { fillMs: 450, solidMs: 550, fillColor: 'cyan-glow' },
  /** A schematic's reveal shimmer over its new diagram: a band of light sweeping across it over `ms`. */
  reveal: { ms: 900, color: 'cyan-glow', alpha: 0.8 },
  /** The light pillar: its height and width over the item, its tint and alpha breathing over `breatheMs`. */
  pillar: { color: 'cyan-glow', alpha: [0.45, 0.8] as const, breatheMs: 1400 },
  /** Sparks as a schematic lands: how many, in cyan and gold. */
  sparks: { count: 18, colors: ['cyan-glow', 'gold-trim'] as const },
  /** World px from a cap's diagram to the pipe's anchor, as the caps (INTAKE_INLETS). The pipe's diagram sits on the body at `pipeY`. */
  pipeY: -44,
  /** The wing door's offset from its anchor tile's bottom-left, so it spans the notch's two tiles. */
  wingDoorX: 32,
} as const;

/** The banner's kicker lines for a schematic (pickup: still unknown; reveal: named). */
export const SCHEMATIC_BANNER = { found: 'Schematic found', revealed: 'Schematic revealed' } as const;
