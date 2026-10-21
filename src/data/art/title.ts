import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// The title screen's painted scene (042) in the 016/020 vector style, in view px (640×360): a dusk-to-daylight
// sky, far hills, the valley, the ruin with the intake pipe rising from it, and the ridge in the foreground the
// wanderer stands on (render poses the player rig there). Light from the top left. The pipe's breathing glow and the
// drifting motes are drawn live over it. Pending Shaun's approval by eye.

/** Dusk at the top warming to daylight at the horizon. */
const SKY: Shape[] = [
  rect(0, 0, 640, 360, 0, {
    fill: {
      linear: [0, 0, 0, 250],
      stops: [
        { at: 0, color: 'wisp-dark' },
        { at: 0.3, color: 'wisp' },
        { at: 0.6, color: 'rust-light' },
        { at: 0.82, color: 'gold-trim' },
        { at: 1, color: 'sun' },
      ],
    },
  }),
  // The low sun behind the far hills.
  ellipse(470, 214, 70, 70, { fill: { radial: [470, 214, 70], stops: [{ at: 0, color: { id: 'snow', alpha: 0.7 } }, { at: 0.4, color: { id: 'sun', alpha: 0.35 } }, { at: 1, color: { id: 'sun', alpha: 0 } }] } }),
  // Thin clouds catching the light.
  path('M 40 70 Q 90 58 150 66 Q 190 60 230 70 Q 170 76 40 70 Z', flat({ id: 'rust-light', alpha: 0.5 })),
  path('M 300 104 Q 360 94 430 100 Q 470 96 520 106 Q 420 112 300 104 Z', flat({ id: 'gold-trim', alpha: 0.45 })),
  path('M 520 40 Q 560 34 610 40 Q 640 38 640 44 Q 580 48 520 40 Z', flat({ id: 'wisp-light', alpha: 0.35 })),
];

const FAR_HILLS: Shape[] = [
  path('M 0 214 Q 60 176 130 196 Q 200 168 280 192 Q 360 160 440 190 Q 520 172 580 188 Q 620 180 640 186 L 640 260 L 0 260 Z', {
    fill: { linear: [0, 170, 0, 250], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock' }] },
  }),
  path('M 0 236 Q 80 206 170 224 Q 250 204 340 222 Q 430 200 520 220 Q 590 208 640 216 L 640 280 L 0 280 Z', {
    fill: { linear: [0, 205, 0, 270], stops: [{ at: 0, color: 'leaf' }, { at: 1, color: 'leaf-dark' }] },
  }),
];

/** The valley floor the ruin stands in, with a dirt road winding to it. */
const VALLEY: Shape[] = [
  path('M 0 250 Q 160 236 320 244 Q 480 236 640 246 L 640 360 L 0 360 Z', { fill: { linear: [0, 236, 0, 330], stops: [{ at: 0, color: 'grass-light' }, { at: 0.5, color: 'grass-bright' }, { at: 1, color: 'grass' }] } }),
  ...[
    [520, 262],
    [560, 270],
    [600, 258],
    [250, 258],
  ].map(([x, y]) => ellipse(x ?? 0, y ?? 0, 9, 4, solid('leaf-light'))),
];

const stone = { linear: [0, -60, 0, 0] as const, stops: [{ at: 0, color: 'rock-pale' }, { at: 1, color: 'rock' }] };
const brass = { linear: [-6, 0, 6, 0] as const, stops: [{ at: 0, color: 'brass-light' }, { at: 0.5, color: 'brass' }, { at: 1, color: 'brass-dark' }] };

/** The ruin: broken walls and a standing arch, and the intake pipe rising out of its heart, a dirt road winding to it. Drawn at y = 256 and moved down into the valley by its layer. */
const RUIN: Shape[] = [
  path('M 640 300 Q 520 284 430 270 Q 380 262 360 256 L 372 255 Q 400 262 450 266 Q 540 278 640 290 Z', flat('dirt')),
  ellipse(352, 258, 86, 9, flat({ id: 'ground-shade', alpha: 0.25 })),
  // The back wall, broken along its top.
  path('M 286 256 L 286 214 L 296 208 L 304 216 L 316 204 L 326 212 L 326 256 Z', { fill: stone, outline: true }),
  path('M 380 256 L 380 210 L 392 202 L 398 212 L 410 206 L 420 216 L 420 256 Z', { fill: stone, outline: true }),
  // A standing arch to the left.
  path('M 262 256 L 262 220 Q 274 206 286 220 L 286 256 L 280 256 L 280 226 Q 274 216 268 226 L 268 256 Z', solid('rock-light')),
  rect(258, 214, 32, 7, 1, solid('rock-pale')),
  // The pipe: a brass column with ringed bands and a cyan core, a cap at the top. 050: against the left wall, so its
  // cap stays clear of the bigger menu column (its left edge, TITLE_SCREEN.menu.x, is at view x 385; the cap ends at 382).
  rect(320, 176, 16, 80, 2, { fill: brass, outline: true }),
  ...[188, 204, 220, 236].map((y) => rect(318, y, 20, 4, 1, solid('brass-dark'))),
  rect(324, 180, 8, 72, 2, flat({ id: 'cyan', alpha: 0.55 })),
  { ...line([328, 182, 328, 250], 1.2, 'cyan-glow'), glow: { color: 'cyan', blur: 4 } },
  rect(314, 170, 28, 9, 3, solid('brass-light')),
  // Front blocks and rubble.
  rect(318, 236, 26, 20, 2, { fill: stone, outline: true }),
  rect(360, 240, 22, 16, 2, { fill: stone, outline: true }),
  ellipse(300, 254, 6, 3, solid('rock')),
  ellipse(430, 254, 8, 3, solid('rock')),
  line([292, 230, 300, 226, 306, 232], 0.8, 'rock-dark'),
  line([388, 228, 396, 224], 0.8, 'rock-dark'),
  // Ley veins glowing in the stone.
  { ...line([300, 246, 306, 238, 312, 242], 0.8, 'cyan'), glow: { color: 'cyan', blur: 2 } },
  { ...line([396, 248, 402, 240, 410, 244], 0.8, 'cyan'), glow: { color: 'cyan', blur: 2 } },
];

/** The ridge in the foreground, high on the left; the wanderer stands on its crest at about (148, 300), before its layer lifts it. */
const RIDGE: Shape[] = [
  path('M -10 270 Q 40 282 90 296 Q 150 304 210 298 Q 270 304 320 350 Q 360 390 400 430 L -10 430 Z', {
    fill: { linear: [0, 280, 0, 360], stops: [{ at: 0, color: 'grass-dark' }, { at: 1, color: 'ground-shade' }] },
    outline: true,
  }),
  // The lit lip of the crest.
  path('M 30 282 Q 90 296 150 302 Q 210 300 260 304', trim({ id: 'grass-light', alpha: 0.8 }, 1.4)),
  // Rocks and tufts along the crest.
  path('M 200 300 Q 210 288 226 292 Q 236 296 234 304 Z', { fill: { linear: [0, 288, 0, 304], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock-dark' }] }, outline: true }),
  path('M 52 288 Q 58 276 72 280 Q 80 286 76 294 Z', { fill: { linear: [0, 276, 0, 294], stops: [{ at: 0, color: 'rock-light' }, { at: 1, color: 'rock-dark' }] }, outline: true }),
  ...[
    [110, 301],
    [176, 302],
    [252, 306],
    [36, 284],
  ].map(([x, y]) => path(`M ${(x ?? 0) - 5} ${y ?? 0} Q ${(x ?? 0) - 3} ${(y ?? 0) - 8} ${x ?? 0} ${(y ?? 0) - 3} Q ${(x ?? 0) + 2} ${(y ?? 0) - 9} ${(x ?? 0) + 5} ${y ?? 0} Z`, solid('leaf-light'))),
  // The wanderer's shadow on the crest.
  ellipse(150, 302, 22, 4, flat({ id: 'ground-shade', alpha: 0.4 })),
];

/** A layer of the scene and how far it's moved, view px. */
export interface TitleLayer {
  readonly shapes: readonly Shape[];
  readonly dx: number;
  readonly dy: number;
}

/** The static scene, back to front, in view px: the ridge lifted so the wanderer looks down on the ruin in the valley. */
export const TITLE_SCENE: readonly TitleLayer[] = [
  { shapes: [...SKY, ...FAR_HILLS, ...VALLEY], dx: 0, dy: 0 },
  { shapes: RUIN, dx: 40, dy: 44 },
  { shapes: RIDGE, dx: 0, dy: -56 },
];
