import type { Box, Mechanism } from './mechanisms';
import { ellipse, flat, line, path, rect, solid, trim, type Shape } from './types';

// 062's Forge machines, in the 020 style, drawn in their housing's window:
// - the Smelter: a small crucible furnace with a pour spout. The crucible glows over its fire, tips, and pours a
//   stream of molten ley-steel into an ingot mould, which cools to a dark steel bar with a cyan vein;
// - the kiln: a domed brick kiln with a glowing mouth. Its fire roars up (the mouth flares and embers rise), and a
//   bead of clear cyan ley glass swells on the hearth before it;
// - 066's Tempering coil: a brass coil round a crucible, lightning crackling between its turns while it works.
// Each takes the window box and its loop's phase `t` (0..1); idle draws t = 0.

const TAU = Math.PI * 2;
const centre = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h / 2];
/** 0 at t = 0 and 1, 1 at t = 0.5: up and back. */
const swell = (t: number): number => (1 - Math.cos(t * TAU)) / 2;

/** The fire under the crucible: flame tongues `h` tall, flickering with the loop. */
function fire(cx: number, y: number, h: number, t: number): Shape[] {
  return [-3, 0, 3].map((dx, i) => {
    const hh = h * (0.7 + 0.3 * Math.sin(t * TAU * 2 + i * 2));
    return path(`M ${cx + dx - 1.6} ${y} Q ${cx + dx - 1.2} ${y - hh * 0.6} ${cx + dx} ${y - hh} Q ${cx + dx + 1.2} ${y - hh * 0.6} ${cx + dx + 1.6} ${y} Z`, {
      fill: { linear: [0, y, 0, y - hh], stops: [{ at: 0, color: 'flame-dark' }, { at: 0.6, color: 'cinder' }, { at: 1, color: 'cinder-light' }] },
      glow: { color: 'cinder', blur: 2 },
    });
  });
}

/** Smelter: the crucible over its fire tips its spout and pours molten ley-steel into a mould; the bar cools dark. */
const smelter: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const floor = b.y + b.h - 2;
  // Tips over the middle of the loop and back.
  const tip = swell(t);
  const angle = -0.55 * tip;
  const potX = cx - 3;
  const potY = b.y + 7;
  const rot = (x: number, y: number): string => {
    const dx = x - potX;
    const dy = y - potY;
    return `${(potX + dx * Math.cos(angle) - dy * Math.sin(angle)).toFixed(2)} ${(potY + dx * Math.sin(angle) + dy * Math.cos(angle)).toFixed(2)}`;
  };
  const lip = rot(potX + 5.4, potY - 3.4);
  const [lipX, lipY] = lip.split(' ').map(Number) as [number, number];
  const pour = tip > 0.35;
  // The mould fills as it pours, and its bar cools from glowing to steel.
  const fill = Math.min(1, tip * 1.6);
  const hot = pour ? 1 : 0.2;
  const mouldX = cx + 3;
  return [
    line([b.x + 2, floor + 0.5, b.x + b.w - 2, floor + 0.5], 1, 'brass-dark'),
    ...fire(potX, floor - 1, 6, t),
    // The crucible: a clay pot with an iron band and its spout, tipping.
    path(`M ${rot(potX - 4, potY - 3.4)} L ${rot(potX - 3.2, potY + 3.6)} Q ${rot(potX, potY + 5)} ${rot(potX + 3.2, potY + 3.6)} L ${rot(potX + 4, potY - 3.4)} L ${lip} Z`, {
      fill: { linear: [potX, potY - 4, potX, potY + 4], stops: [{ at: 0, color: 'rust-light' }, { at: 1, color: 'rust-dark' }] },
      outline: true,
    }),
    ellipse(potX, potY - 3.4, 3.8, 1.2, { fill: 'cinder-light', glow: { color: 'cinder', blur: 2 + 2 * tip } }),
    path(`M ${rot(potX - 3.6, potY)} L ${rot(potX + 3.6, potY)}`, trim('iron-dark', 0.9)),
    // The pour: a bright stream from the lip down into the mould.
    ...(pour ? [{ ...line([lipX, lipY, mouldX, floor - 3], 1.2, 'cinder-light'), glow: { color: 'cinder', blur: 3 } }] : []),
    // The mould and its bar of ley-steel, glowing while hot.
    rect(mouldX - 4, floor - 3.4, 8, 3.4, 0.6, { fill: 'iron-dark', outline: true }),
    rect(mouldX - 3.2, floor - 2.8, 6.4 * fill, 2, 0.4, { fill: hot > 0.5 ? 'cinder' : 'iron-light', ...(hot > 0.5 ? { glow: { color: 'cinder', blur: 2 } } : {}) }),
    line([mouldX - 2.4, floor - 1.8, mouldX - 2.4 + 4.8 * fill, floor - 1.8], 0.5, { id: 'vein', alpha: 0.8 }),
  ];
};

/** Kiln: a domed brick kiln on the hearth; its mouth flares with the fire's roar and a bead of ley glass swells before it. */
const kiln: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const floor = b.y + b.h - 2;
  const roar = swell(t);
  const domeW = 7;
  const domeH = b.h - 5;
  const brick = (y: number): Shape => line([cx - domeW + 1.5, y, cx + domeW - 1.5, y], 0.5, { id: 'carve-dark', alpha: 0.7 });
  const embers = [0, 1, 2].map((k) => {
    const p = (t + k / 3) % 1;
    return ellipse(cx - 2 + k * 2, floor - domeH + 2 - p * 3, 0.6, 0.6, { fill: 'cinder-light', alpha: 1 - p, glow: { color: 'cinder', blur: 2 } });
  });
  const bead = 1 + 1.6 * roar;
  return [
    line([b.x + 2, floor + 0.5, b.x + b.w - 2, floor + 0.5], 1, 'brass-dark'),
    // The dome of brick.
    path(`M ${cx - domeW} ${floor} L ${cx - domeW} ${floor - domeH * 0.45} Q ${cx - domeW} ${floor - domeH} ${cx} ${floor - domeH} Q ${cx + domeW} ${floor - domeH} ${cx + domeW} ${floor - domeH * 0.45} L ${cx + domeW} ${floor} Z`, {
      fill: { linear: [cx - domeW, floor - domeH, cx + domeW, floor], stops: [{ at: 0, color: 'carve-light' }, { at: 1, color: 'carve-dark' }] },
      outline: true,
    }),
    brick(floor - domeH * 0.3),
    brick(floor - domeH * 0.6),
    // Its glowing mouth, flaring with the roar.
    path(`M ${cx - 3.4} ${floor} L ${cx - 3.4} ${floor - 3.4} Q ${cx} ${floor - 6.4} ${cx + 3.4} ${floor - 3.4} L ${cx + 3.4} ${floor} Z`, {
      fill: { radial: [cx, floor - 1.5, 4.5], stops: [{ at: 0, color: 'cinder-light' }, { at: 1, color: roar > 0.5 ? 'cinder' : 'flame-dark' }] },
      glow: { color: 'cinder', blur: 2 + 4 * roar },
    }),
    ...embers,
    // The bead of ley glass on the hearth before it, clear cyan.
    ellipse(b.x + b.w - 3.5, floor - bead, bead, bead, { fill: { id: 'cyan-glow', alpha: 0.7 }, stroke: { color: 'cyan', width: 0.6 }, glow: { color: 'cyan', blur: 1 + 2 * roar } }),
    ellipse(b.x + b.w - 3.5 - bead * 0.35, floor - bead * 1.35, bead * 0.3, bead * 0.25, flat('snow')),
    rect(b.x + b.w - 6.5, floor - 0.4, 6, 0.8, 0.3, solid('iron')),
  ];
};

/**
 * 066's Tempering coil: a clay crucible on the hearth wound with a brass coil. Working, its charge glows violet-white in
 * the crucible and lightning crackles between the coil's turns, a different jump each frame; idle, it stands cold.
 */
const temperingCoil: Mechanism = (b, t) => {
  const [cx] = centre(b);
  const floor = b.y + b.h - 2;
  const potTop = b.y + 4;
  const potW = 4.6;
  const live = t > 0;
  const charge = live ? 0.5 + 0.5 * Math.sin(t * TAU * 2) : 0;
  // The coil's turns, back halves behind the crucible and front halves over it.
  const turns = [0.25, 0.5, 0.75].map((k) => potTop + 1 + (floor - potTop - 2) * k);
  const back = turns.map((y) => path(`M ${cx - potW - 1.4} ${y} Q ${cx} ${y - 2.2} ${cx + potW + 1.4} ${y}`, trim('brass-dark', 0.9)));
  const front = turns.map((y) => path(`M ${cx - potW - 1.4} ${y} Q ${cx} ${y + 2.2} ${cx + potW + 1.4} ${y}`, trim('brass-light', 1)));
  // Lightning between two turns at a side, jumping round with the loop's phase.
  const arcs: Shape[] = live
    ? [0, 1].map((k) => {
        const side = (Math.floor(t * 4) + k) % 2 === 0 ? -1 : 1;
        const x = cx + side * (potW + 1.4);
        const y0 = turns[k] ?? floor;
        const y1 = turns[k + 1] ?? floor;
        const kink = side * (1.4 + 0.8 * Math.sin(t * TAU * 3 + k));
        return { ...path(`M ${x} ${y0} L ${x + kink} ${(y0 * 2 + y1) / 3} L ${x - kink * 0.5} ${(y0 + y1 * 2) / 3} L ${x} ${y1}`, trim('storm-pale', 0.6)), glow: { color: 'storm-glow', blur: 3 } };
      })
    : [];
  return [
    line([b.x + 2, floor + 0.5, b.x + b.w - 2, floor + 0.5], 1, 'brass-dark'),
    ...back,
    // The crucible: clay, its mouth holding the charge.
    path(`M ${cx - potW} ${potTop} L ${cx - potW + 0.8} ${floor - 0.6} Q ${cx} ${floor + 0.6} ${cx + potW - 0.8} ${floor - 0.6} L ${cx + potW} ${potTop} Z`, {
      fill: { linear: [cx, potTop, cx, floor], stops: [{ at: 0, color: 'rust-light' }, { at: 1, color: 'rust-dark' }] },
      outline: true,
    }),
    ellipse(cx, potTop, potW - 0.4, 1.2, live ? { fill: 'storm-pale', glow: { color: 'storm-glow', blur: 2 + 3 * charge } } : flat('storm-dark')),
    ...front,
    ...arcs,
  ];
};

/** 062's Forge machines' mechanisms, by machine id (066: and the Tempering coil). */
export const FORGE_MECHANISMS: Readonly<Record<string, Mechanism>> = { smelter, kiln, 'tempering-coil': temperingCoil };
