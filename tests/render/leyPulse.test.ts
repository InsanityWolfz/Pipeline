import { describe, expect, it } from 'vitest';
import { LEY_PULSE } from '../../src/data/foundryFx';
import { STATIC_ROOMS } from '../../src/data/rooms';
import { intakeAnchor } from '../../src/render/foundryLayout';
import { foundryInlays, LeyPulses, type PulseInput } from '../../src/render/foundry/leyPulse';

// 079: the ley flow pulses: the foundry's ten ley-inlaid flags (020's floorFrame), a front closing on the intake's mouth
// at LEY_PULSE.speed, the inlays lighting farthest first with a bead each, one new pulse every 250 ms at most, three
// live on Medium and five on High, none on Low and none while the foundry isn't shown.

const room = STATIC_ROOMS.foundry;
if (!room) throw new Error('no foundry');
const inlays = foundryInlays(room, intakeAnchor());
const go = (over: Partial<PulseInput> = {}): PulseInput => ({ triggers: 0, quality: 'high', shown: true, ...over });

describe('ley flow pulses (079)', () => {
  it('finds the foundry’s ten inlays, farthest from the intake first', () => {
    expect(inlays.length).toBe(10);
    for (let i = 1; i < inlays.length; i++) expect(inlays[i - 1]?.dist ?? 0).toBeGreaterThanOrEqual(inlays[i]?.dist ?? 0);
    for (const t of inlays) expect(room.rows[t.ty]?.[t.tx]).toBe('.');
    expect(foundryInlays(room, intakeAnchor())).toBe(inlays);
  });

  it('runs a front from the farthest inlay to the mouth at 360 px/s', () => {
    const p = new LeyPulses(inlays, intakeAnchor());
    p.step(0, go({ triggers: 1 }));
    const far = inlays[0]?.dist ?? 0;
    expect(p.live[0]?.front).toBeCloseTo(far);
    p.step(500, go());
    expect(p.live[0]?.front).toBeCloseTo(far - LEY_PULSE.speed * 0.5);
  });

  it('lights the inlays in order of distance, farthest first, each with a bead sliding toward the intake', () => {
    const p = new LeyPulses(inlays, intakeAnchor());
    p.step(0, go({ triggers: 1 }));
    const order: number[] = [];
    for (let t = 0; t < 120; t++) {
      p.step(16, go());
      for (const l of p.lit()) if (!order.includes(l.index)) order.push(l.index);
    }
    expect(order).toEqual(inlays.map((_, i) => i));
    const q = new LeyPulses(inlays, intakeAnchor());
    q.step(0, go({ triggers: 1 }));
    q.step(30, go());
    const first = q.lit()[0];
    expect(first?.index).toBe(0);
    q.step(100, go());
    const later = q.lit()[0];
    const a = inlays[0];
    expect(a).toBeDefined();
    if (!first || !later || !a) return;
    const toMouth = (b: { x: number; y: number }) => Math.hypot(b.x - intakeAnchor().x, b.y - intakeAnchor().y);
    expect(toMouth(later.bead)).toBeLessThan(toMouth(first.bead));
    expect(later.alpha).toBeLessThan(first.alpha);
  });

  it('starts at most one pulse every 250 ms, with 3 live on Medium and 5 on High', () => {
    for (const [quality, cap] of [['medium', 3], ['high', 5]] as const) {
      const p = new LeyPulses(inlays, intakeAnchor());
      let most = 0;
      for (let t = 0; t < 200; t++) {
        p.step(50, go({ quality, triggers: 2 }));
        most = Math.max(most, p.live.length);
        expect(p.live.length).toBeLessThanOrEqual(cap);
      }
      expect(most, quality).toBe(cap);
      const r = new LeyPulses(inlays, intakeAnchor());
      r.step(0, go({ quality, triggers: 1 }));
      r.step(100, go({ quality, triggers: 5 }));
      expect(r.live.length, 'within 250 ms').toBe(1);
      r.step(200, go({ quality, triggers: 1 }));
      expect(r.live.length).toBe(2);
    }
  });

  it('runs none on Low, and none while the foundry isn’t shown (none queue up)', () => {
    const low = new LeyPulses(inlays, intakeAnchor());
    low.step(16, go({ quality: 'low', triggers: 4 }));
    expect(low.live.length).toBe(0);
    const away = new LeyPulses(inlays, intakeAnchor());
    away.step(16, go({ shown: false, triggers: 4 }));
    away.step(16, go());
    expect(away.live.length).toBe(0);
    const left = new LeyPulses(inlays, intakeAnchor());
    left.step(16, go({ triggers: 1 }));
    left.step(16, go({ shown: false }));
    expect(left.live.length).toBe(0);
  });

  it('finishes a pulse once its last inlay has faded', () => {
    const p = new LeyPulses(inlays, intakeAnchor());
    p.step(0, go({ triggers: 1 }));
    const ms = ((inlays[0]?.dist ?? 0) / LEY_PULSE.speed) * 1000 + LEY_PULSE.litMs + 50;
    p.step(ms, go());
    expect(p.live.length).toBe(0);
    expect(p.lit().length).toBe(0);
  });
});
