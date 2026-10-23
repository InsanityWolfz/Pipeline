import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { GLOW_TEXTURE } from '../data/juice';
import { LANDMARK_LIST, landmarkDef, type LandmarkDef } from '../data/landmarks';
import { DISCOVERY_BANNER, LANDMARK_LOOK, LANDMARK_SPRITES } from '../data/landmarkAssets';
import { OVERWORLD } from '../data/overworld';
import { isOpened } from '../sim/cache';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { tileHash } from './roomTiles';
import { WORLD_SHIFT } from '../data/worldShape';
import type { Banner } from './Banner';
import { addVector, showFrame } from './vector/textures';

// The landmarks' own dressing (032): the grotto hollows' lip slabs and their light (ley
// cyan, or cold blue-white over the Frozen Grotto), reeds and lilies round the marsh's
// ponds, the Ruined Cache's reliquary (sealed, opening, empty), and the discovery banner.
// The Quarry's cut blocks and the Old Grove's old trees stand with the overworld's
// terrain (OverworldView); their ground is painted with it (landmarkGround.ts).

/** What the landmark view shows, for the test hook. */
export interface LandmarksShown {
  /** The landmark named by the discovery banner while it shows, else null, and how strongly it shows (0..1). */
  banner: string | null;
  bannerAlpha: number;
  /** 050: the banner's tablet while it shows, view px, else null. */
  bannerBox: { x: number; y: number; w: number; h: number } | null;
  /** Each reliquary's frame, by landmark id: `sealed`, `open` or `empty`. */
  caches: Record<string, 'sealed' | 'open' | 'empty'>;
  /** Hollow lip slabs and marsh tufts drawn, and the hollows' lights. */
  lips: number;
  tufts: number;
  lights: number;
}

export const NO_LANDMARKS_SHOWN: LandmarksShown = { banner: null, bannerAlpha: 0, bannerBox: null, caches: {}, lips: 0, tufts: 0, lights: 0 };

const T = TILE_SIZE;

/** A hollow's breathing light (landmarkAssets). */
type HollowLight = { readonly color: string; readonly radius: number; readonly alpha: readonly [number, number]; readonly breatheMs: number };
const centreOf = (l: LandmarkDef) => ({ x: ((l.area.x0 + l.area.x1 + 1) / 2) * T, y: ((l.area.y0 + l.area.y1 + 1) / 2) * T });
const nearAny = (x: number, y: number, tiles: readonly { tx: number; ty: number }[], r: number) => tiles.some((t) => Math.hypot(x - (t.tx + 0.5) * T, y - (t.ty + 0.5) * T) < r * T);

export class LandmarkView {
  private readonly scene: Scene;
  private readonly decals: GameObjects.Image[] = [];
  private readonly lights: { image: GameObjects.Image; look: HollowLight }[] = [];
  private readonly caches = new Map<string, { sprite: GameObjects.Image; frame: 'sealed' | 'open' | 'empty' }>();
  private readonly openedAt = new Map<string, number>();
  /** The banner it shares with 033's schematics (RoomViews'). */
  private readonly banner: Banner;
  private time = 0;
  private lipCount = 0;
  private tuftCount = 0;
  private built = false;

  constructor(scene: Scene, banner: Banner) {
    this.scene = scene;
    this.banner = banner;
  }

  get shown(): LandmarksShown {
    const on = this.banner.current;
    const discovery = on?.kind === 'discovery' ? on : null;
    return {
      banner: discovery?.id ?? null,
      bannerAlpha: discovery?.alpha ?? 0,
      bannerBox: discovery?.box ?? null,
      caches: Object.fromEntries([...this.caches].map(([id, c]) => [id, c.frame])),
      lips: this.lipCount,
      tufts: this.tuftCount,
      lights: this.lights.length,
    };
  }

  /** `events` are every tick's since the last draw; `deltaMs` is the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    if (!this.built) this.build();
    this.time += deltaMs;
    const outside = shown === OVERWORLD.id;
    for (const d of this.decals) d.setVisible(outside);
    for (const { image, look } of this.lights) {
      const breathe = (Math.sin((this.time / look.breatheMs) * Math.PI * 2) + 1) / 2;
      image.setVisible(outside).setAlpha(look.alpha[0] + (look.alpha[1] - look.alpha[0]) * breathe);
    }
    for (const o of events.cacheOpens) this.openedAt.set(o.id, this.time);
    for (const [id, c] of this.caches) {
      const opening = this.time - (this.openedAt.get(id) ?? -Infinity) < LANDMARK_LOOK.cacheOpenMs;
      const frame = !isOpened(sim, id) ? 'sealed' : opening ? 'open' : 'empty';
      if (frame !== c.frame) {
        c.frame = frame;
        showFrame(c.sprite, frame === 'sealed' ? LANDMARK_SPRITES.cacheSealed : frame === 'open' ? LANDMARK_SPRITES.cacheOpen : LANDMARK_SPRITES.cacheEmpty);
      }
      c.sprite.setVisible(outside);
    }
    for (const d of events.discoveries) this.banner.push({ kind: 'discovery', id: d.landmark, kicker: DISCOVERY_BANNER.kicker, name: landmarkDef(d.landmark).name });
  }

  private build(): void {
    // The hollows' light uses the shared glow texture, made by the ambient view.
    if (!this.scene.textures.exists(FX_TEXTURES.glow)) return;
    this.built = true;
    for (const l of LANDMARK_LIST) {
      if (l.look?.hollow) this.buildHollow(l, l.look.hollow);
      for (const f of l.features) if (f.kind === 'pond') this.buildPond(l, f);
      if (l.cache) {
        const sprite = addVector(this.scene, (l.cache.tx + 0.5) * T, (l.cache.ty + 1) * T, LANDMARK_SPRITES.cacheSealed).setDepth((l.cache.ty + 1) * T);
        this.caches.set(l.id, { sprite, frame: 'sealed' });
      }
    }
  }

  /** Slabs round the hollow's lip (none on a node, guard or the path in), and its light breathing over it. */
  private buildHollow(l: LandmarkDef, kind: 'ley' | 'frost'): void {
    const H = LANDMARK_LOOK.hollow;
    const c = centreOf(l);
    const rx = ((l.area.x1 - l.area.x0 + 1) / 2 - H.inset) * T;
    const ry = ((l.area.y1 - l.area.y0 + 1) / 2 - H.inset) * T;
    const busy = [...l.nodes, ...l.guards];
    for (let i = 0; i < H.lips; i++) {
      const a = (i / H.lips) * Math.PI * 2;
      const x = c.x + Math.cos(a) * rx;
      const y = c.y + Math.sin(a) * ry;
      const onPath = OVERWORLD.paths.some((p) => nearAny(x, y, p, H.clear.path));
      if (nearAny(x, y, busy, H.clear.things) || onPath) continue;
      const frame = kind === 'frost' ? LANDMARK_SPRITES.lipFrost : LANDMARK_SPRITES.lip;
      this.decals.push(addVector(this.scene, x, y, frame).setDepth(DEPTHS.floor + H.depth).setFlipX(tileHash(i, l.area.x0 - WORLD_SHIFT.dx) % 2 === 0));
      this.lipCount += 1;
    }
    const look = kind === 'frost' ? H.coldLight : H.leyLight;
    const image = this.scene.add.image(c.x, c.y, FX_TEXTURES.glow).setTint(colorOf(look.color)).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.glow).setScale(look.radius / GLOW_TEXTURE.radius);
    this.lights.push({ image, look });
  }

  /** Reeds and cattails round a pond's rim (not where its reed nodes stand) and lilies on its water. */
  private buildPond(l: LandmarkDef, f: { cx: number; cy: number; rx: number; ry: number }): void {
    const M = LANDMARK_LOOK.marsh;
    const cx = (f.cx + 0.5) * T;
    const cy = (f.cy + 0.5) * T;
    for (let a = M.tuftStart; a < Math.PI * 2; a += M.tuftStep) {
      const x = cx + Math.cos(a) * f.rx * M.tuftRim * T;
      const y = cy + Math.sin(a) * f.ry * M.tuftRim * T;
      if (nearAny(x, y, [...l.nodes, ...l.guards, ...(l.pylon ? [l.pylon] : [])], M.tuftClear)) continue;
      this.decals.push(addVector(this.scene, x, y, LANDMARK_SPRITES.marshTuft).setDepth(y));
      this.tuftCount += 1;
    }
    for (let i = 0; i < M.lilies; i++) {
      const a = M.lilyFrom + i * M.lilyStep;
      const [kx, ky] = M.lilyAt;
      this.decals.push(addVector(this.scene, cx + Math.cos(a) * f.rx * kx * T, cy + Math.sin(a) * f.ry * ky * T, LANDMARK_SPRITES.lily).setDepth(DEPTHS.floor + M.lilyDepth));
    }
  }
}
