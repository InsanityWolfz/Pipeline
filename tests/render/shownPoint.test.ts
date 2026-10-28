import { describe, expect, it } from 'vitest';
import { KILN_TENDER_RIG } from '../../src/data/art/kilnTender';
import { SNIPER_RIG } from '../../src/data/art/sniper';
import { EMBER_ENEMY_LOOK } from '../../src/data/emberworksEnemyAssets';
import { HOLLOWS_ENEMY_LOOK } from '../../src/data/hollowsEnemyAssets';
import { shownPoint } from '../../src/render/shownPoint';
import { posedPoint } from '../../src/render/vector/enemyPose';

// 076 (review 5): the kiln-tender's beam and the Sniper's laser leave the part as the sprite shows it: the frame it
// holds (by name), squashed about the feet as render squashes the sprite, and moved by the peak's tremble.

const still = { squash: 0, dx: 0, dy: 0 };

describe('a beam or laser starts where the sprite shows its part', () => {
  it("reads the frame the sprite holds: the kiln-tender's channel holds swipe[1], not swipe[0]", () => {
    const at = EMBER_ENEMY_LOOK.beam.nozzle.side;
    const held = KILN_TENDER_RIG.poses.swipe?.[1];
    const first = KILN_TENDER_RIG.poses.swipe?.[0];
    if (!held || !first) throw new Error('kiln-tender swipe');
    const want = posedPoint(KILN_TENDER_RIG, 'side', held, 'nozzle', at);
    expect(shownPoint(KILN_TENDER_RIG, 'side', 'kiln-tender-swipe-side/1', 'nozzle', at, still)).toEqual(want);
    expect(shownPoint(KILN_TENDER_RIG, 'side', 'kiln-tender-swipe-side/1', 'nozzle', at, still)).not.toEqual(posedPoint(KILN_TENDER_RIG, 'side', first, 'nozzle', at));
  });

  it("squashes the point about the feet as the sprite is squashed, and adds the tremble", () => {
    const at = HOLLOWS_ENEMY_LOOK.lens.side;
    const peak = SNIPER_RIG.poses.windup?.at(-1);
    const n = SNIPER_RIG.poses.windup?.length ?? 0;
    if (!peak) throw new Error('sniper windup');
    const p = posedPoint(SNIPER_RIG, 'side', peak, 'lens', at);
    if (!p) throw new Error('lens');
    const got = shownPoint(SNIPER_RIG, 'side', `sniper-windup-side/${n - 1}`, 'lens', at, { squash: 0.1, dx: 0.8, dy: -0.4 });
    expect(got[0]).toBeCloseTo(p[0] * 1.1 + 0.8, 6);
    expect(got[1]).toBeCloseTo(p[1] * 0.9 - 0.4, 6);
    // Facing left and a champion: flipped and scaled, the tremble (world px) added after.
    const champ = shownPoint(SNIPER_RIG, 'side', `sniper-windup-side/${n - 1}`, 'lens', at, { squash: 0.1, dx: 0.8, dy: -0.4 }, -1, 1.5);
    expect(champ[0]).toBeCloseTo(-p[0] * 1.1 * 1.5 + 0.8, 6);
    expect(champ[1]).toBeCloseTo(p[1] * 0.9 * 1.5 - 0.4, 6);
  });

  it('falls back to the resting point for a frame the rig has no pose for', () => {
    const at = EMBER_ENEMY_LOOK.beam.nozzle.side;
    expect(shownPoint(KILN_TENDER_RIG, 'side', 'something-else', 'nozzle', at, still)).toEqual([at[0], at[1]]);
  });
});
