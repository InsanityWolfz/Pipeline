import type { Part } from '../../data/art/types';
import type { Rarity } from '../../data/gear';
import { TUBE_PARTS, WANDERER, wandererViews, type WandererChannel, type WandererSchemeId, type WandererView, type WandererViewDef } from '../../data/art/wanderer';
import { WANDERER_MOTION } from '../../data/art/wandererMotion';
import { OUTLINE_WIDTH } from '../../data/art/style';
import { TITLE_SCREEN } from '../../data/titleScreen';
import { drawShape, drawShapes, type DrawOpts } from './draw';
import { angleOf, apply, chain, invert, mul, rotate, rotateAbout, scaleAbout, translate, useMat, type Mat, type Pt } from './affine';
import { drawArm, drawHose, drawLeg, hoseAt, hosePath } from './wandererBody';
import { drawFlash, drawPulse, drawShimmer, drawTube, drawWindowFlare } from './wandererFx';
import { bakedPart } from './partCache';
import type { WandererPose } from './wandererPose';

// Poses and draws the wanderer (016; the arcane ranger since 075) onto a canvas whose origin is at the feet, in world
// px. Pure canvas: PlayerView feeds it the motion's pose each frame, the title its idle, and the contact sheet fixed
// poses. Frames: the feet; the figure (squash about the feet, a roll's or the KO's turn); the torso (hips, lean);
// the tank riding its harness; the tube (held, or dropped on the ground by the KO). Its parts are baked once into
// bitmaps (partCache.ts) and stamped; the limbs, hose and effects bend every frame and stay live vector.

export { REST_POSE, type WandererPose } from './wandererPose';

const S = WANDERER.scale;

/** The views by scheme and trim, built once each. */
const viewCache = new Map<string, Record<WandererView, WandererViewDef>>();
export function viewsFor(scheme: WandererSchemeId, trim: Rarity | null): Record<WandererView, WandererViewDef> {
  const key = `${scheme}/${trim ?? 'none'}`;
  let v = viewCache.get(key);
  if (!v) {
    v = wandererViews(scheme, trim);
    viewCache.set(key, v);
  }
  return v;
}

/** Where things landed this frame, world px from the feet (for the test hook). */
export interface WandererMarks {
  hood: [number, number];
}

/** The transform a part hangs from: its chain of joints, each turning (or flaring) by its pose channel. */
function chainMat(def: WandererViewDef, pose: WandererPose, id: string): Mat {
  const links = def.chains[id];
  if (!links) return [1, 0, 0, 1, 0, 0];
  const value = (ch: WandererChannel): number =>
    ch === 'cape' ? pose.cape.trail + pose.cape.sway : ch === 'capeTail' ? pose.cape.tail : ch === 'hoodTail' ? pose.hoodTail : ch === 'skirtFront' ? pose.skirt.front : pose.skirt.back;
  return chain(
    ...links.map((ch): Mat => {
      const j = def.joints[ch];
      if (!j) return [1, 0, 0, 1, 0, 0];
      if (j.kind === 'turn') return rotateAbout(value(ch), j.at);
      const st = j.stretch ?? [0, 0];
      const trail = pose.cape.trail;
      return mul(rotateAbout(pose.cape.sway, j.at), scaleAbout(1 + st[0] * trail, 1 + st[1] * trail, j.at));
    }),
  );
}

/** Draws the wanderer with its feet at the canvas origin; `pxPerUnit` is canvas px per world px. */
export function drawWanderer(c: CanvasRenderingContext2D, pose: WandererPose, pxPerUnit: number): WandererMarks {
  const def = viewsFor(pose.scheme, pose.trim)[pose.view];
  const parts = new Map(def.parts.map((p) => [p.id, p]));
  const bakeKey = `${pose.scheme}/${pose.trim ?? 'none'}/${pose.view}`;
  const o: DrawOpts = { outline: OUTLINE_WIDTH / S, blurScale: pxPerUnit * S };
  const lit = pose.attuned && pose.attuning === null;
  const hipY = -WANDERER.hipHeight + pose.crouch;

  // The figure: squashed about the feet, turned about its centre, lowered; the torso: at the hips, leaning.
  const fig: Mat = chain(scaleAbout(1 + pose.squash, 1 - pose.squash, [0, 0]), translate(0, pose.drop), rotateAbout(pose.turn, [0, -pose.turnAt]));
  const torso: Mat = chain(fig, translate(pose.push, hipY), rotate(pose.lean), translate(pose.shove, 0));
  const tank: Mat = chain(torso, translate(0, pose.tank.bob), scaleAbout(1 + pose.tank.squash, 1 - pose.tank.squash, def.tankBase));
  const tankParts = new Set(def.tankParts);

  // The tube, rigid in the feet's frame: held at the hip (tucked in to the chest for a roll), or lying where it dropped.
  const tuckAim = pose.view === 'side' ? -1 : pose.aim;
  const aim = pose.aim + (tuckAim - pose.aim) * pose.tuck;
  const slide = pose.kick - pose.jab * WANDERER.rig.jab.thrust + 5 * pose.tuck;
  const heldAt = apply(torso, [def.gunPivot[0] + Math.cos(aim) * -slide, def.gunPivot[1] + Math.sin(aim) * -slide]);
  const heldAngle = angleOf(torso) + aim;
  const K = WANDERER_MOTION.ko;
  const d = pose.tubeDrop;
  const gunAt: Pt = [heldAt[0] + (K.tubeAt[0] - heldAt[0]) * d, heldAt[1] + (K.tubeAt[1] - heldAt[1]) * d];
  const gun: Mat = mul(translate(gunAt[0], gunAt[1]), rotate(heldAngle + (K.tubeAngle - heldAngle) * d));
  const toTorso = invert(torso);
  const onGun = (p: Pt): Pt => apply(toTorso, apply(gun, p));

  const inFrame = (m: Mat, draw: () => void): void => {
    c.save();
    useMat(c, m);
    draw();
    c.restore();
  };
  const drawPart = (p: Part | undefined): void => {
    if (!p) return;
    const base = tankParts.has(p.id) ? tank : torso;
    const baked = bakedPart(bakeKey, p, pxPerUnit * S, o);
    inFrame(mul(base, chainMat(def, pose, p.id)), () => {
      if (def.trimParts.includes(p.id) && pose.trimPulse < 1) c.globalAlpha *= pose.trimPulse;
      if (baked) c.drawImage(baked.image, baked.x, baked.y, baked.w, baked.h);
      else drawShapes(c, p.shapes, o);
    });
  };

  const marks: WandererMarks = { hood: [0, 0] };
  c.save();
  c.scale(pose.flip ? -S : S, S);
  for (const step of def.order) {
    switch (step) {
      case '@far-leg':
      case '@near-leg': {
        const near = step === '@near-leg';
        const hip = near ? def.hips.near : def.hips.far;
        inFrame(fig, () => drawLeg(c, pose.view, [hip[0] + pose.push, hipY + hip[1]], near ? pose.feet.near : pose.feet.far, near || def.matchedArms === true, near ? 1 : -1, o));
        break;
      }
      case '@far-arm':
      case '@near-arm': {
        const near = step === '@near-arm';
        const shoulder = near ? def.shoulders.near : def.shoulders.far;
        const held = pose.hasTube && pose.tubeDrop < 0.5;
        const rest = near ? WANDERER.rig.restHand.near : WANDERER.rig.restHand.far;
        const side = def.matchedArms && !near ? -1 : 1;
        let hand: Pt = [shoulder[0] + rest[0] * side, shoulder[1] + rest[1]];
        if (held) hand = onGun(near ? TUBE_PARTS.rearGrip : TUBE_PARTS.frontGrip);
        else if (near && pose.jab > 0) {
          // Empty-handed, a punch drives the fist out from the shoulder along the aim.
          const reach = WANDERER.rig.jab.fist;
          hand = [hand[0] + (shoulder[0] + Math.cos(pose.aim) * reach - hand[0]) * pose.jab, hand[1] + (shoulder[1] + Math.sin(pose.aim) * reach - hand[1]) * pose.jab];
        }
        inFrame(torso, () => drawArm(c, pose.view, shoulder, hand, near || def.matchedArms === true, o));
        break;
      }
      case '@window':
        if (pose.hasTube && def.window) {
          const win = parts.get(lit ? def.window.lit : def.window.dormant);
          drawPart(win);
          const shape = win?.shapes[0];
          if (lit && shape) inFrame(tank, () => drawWindowFlare(c, shape, pose.windowFlare, o));
        }
        break;
      case '@bubble':
        if (pose.hasTube && def.window && lit) {
          const w = def.window;
          inFrame(mul(tank, translate(0, -(pose.flow * 0.3) % w.rise)), () => drawShape(c, w.bubble, o));
        }
        break;
      case '@glow':
        if (def.glow && pose.glow > 0) {
          const g = def.glow;
          inFrame(torso, () => {
            c.globalAlpha *= pose.glow;
            drawShape(c, g, o);
          });
        }
        break;
      case '@hose': {
        if (!pose.hasTube) break;
        const B = WANDERER.rig.hoseBend;
        const rear = onGun(TUBE_PARTS.rear);
        const rearBend = onGun([TUBE_PARTS.rear[0] - B.back, TUBE_PARTS.rear[1] + B.drop]);
        const from = apply(toTorso, apply(tank, def.hose.from));
        const sway = pose.hoseSway ?? 0;
        const h = hosePath(from, [def.hose.sag[0] + sway, def.hose.sag[1] + sway * TITLE_SCREEN.motion.hoseLift], def.hose.clip, rearBend, rear);
        inFrame(torso, () => {
          drawHose(c, h, lit ? WANDERER.limbs.hose : WANDERER.limbs.hoseDormant, pose.flow, o);
          if (lit) for (const u of pose.pulses) drawPulse(c, ...hoseAt(h, u), o);
        });
        break;
      }
      case '@tube':
        if (pose.hasTube) {
          // The sling, from the housing up to the near shoulder.
          const sl = TUBE_PARTS.sling;
          const from = onGun(sl.at);
          const to = def.shoulders.near;
          if (pose.tubeDrop < 0.5)
            inFrame(torso, () =>
              drawShape(c, { kind: 'line', pts: [from[0], from[1], (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + sl.sag, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + sl.sag, to[0], to[1]], width: sl.width, color: sl.color, outline: true, curve: true }, o),
            );
          inFrame(gun, () => drawTube(c, pose, lit, o));
        }
        break;
      case '@flash': {
        const f = pose.flash;
        if (f && pose.hasTube && lit && pose.tubeDrop === 0) inFrame(gun, () => drawFlash(c, f, o));
        break;
      }
      case '@shimmer':
        if (pose.shimmer !== null && def.hem) {
          const hem = def.hem;
          inFrame(mul(torso, chainMat(def, pose, hem.part)), () => drawShimmer(c, hem.d, pose.shimmer ?? 0, o));
        }
        break;
      default:
        drawPart(parts.get(step));
    }
  }
  c.restore();
  const hood = parts.get('hood');
  if (hood) {
    const [hx, hy] = apply(torso, hood.pivot);
    marks.hood = [hx * S * (pose.flip ? -1 : 1), hy * S];
  }
  return marks;
}
