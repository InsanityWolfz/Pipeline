import { describe, expect, it } from 'vitest';
import { isForge, RunningForges } from '../../src/render/foundry/runningForges';

// 079: the running set: forge machines join when they start working and leave when they stop or go; other machines
// never join; a frame with no status change changes nothing (no per-frame scan builds it).

const at = { x: 100, bottom: 200 };

describe('the running forge set (079)', () => {
  it('knows the forge machines: the Smelter, the kiln and the Tempering coil', () => {
    expect(['smelter', 'kiln', 'tempering-coil'].every(isForge)).toBe(true);
    expect(isForge('assembler')).toBe(false);
  });

  it('gains a forge machine when it starts working and loses it when it stops', () => {
    const f = new RunningForges();
    f.observe({ id: 1, pieceId: 'smelter', status: 'idle' }, at);
    expect(f.running.size).toBe(0);
    expect(f.known.get(1)).toEqual({ id: 1, pieceId: 'smelter', ...at });
    f.observe({ id: 1, pieceId: 'smelter', status: 'working' }, at);
    expect([...f.running.keys()]).toEqual([1]);
    for (const status of ['starved', 'blocked', 'idle'] as const) {
      f.observe({ id: 1, pieceId: 'smelter', status: 'working' }, at);
      f.observe({ id: 1, pieceId: 'smelter', status }, at);
      expect(f.running.size, status).toBe(0);
    }
  });

  it('loses a machine that is removed or picked up', () => {
    const f = new RunningForges();
    f.observe({ id: 4, pieceId: 'kiln', status: 'working' }, at);
    f.remove(4);
    expect(f.running.size).toBe(0);
    expect(f.known.size).toBe(0);
  });

  it('never takes a machine outside the Forge group', () => {
    const f = new RunningForges();
    f.observe({ id: 2, pieceId: 'assembler', status: 'working' }, at);
    f.observe({ id: 3, pieceId: 'knapper', status: 'working' }, at);
    expect(f.running.size).toBe(0);
    expect(f.known.size).toBe(0);
  });

  it('changes nothing on a frame with no status change', () => {
    const f = new RunningForges();
    f.observe({ id: 1, pieceId: 'smelter', status: 'working' }, at);
    f.observe({ id: 2, pieceId: 'tempering-coil', status: 'starved' }, at);
    const changes = f.changes;
    for (let frame = 0; frame < 10; frame++) {
      f.observe({ id: 1, pieceId: 'smelter', status: 'working' }, at);
      f.observe({ id: 2, pieceId: 'tempering-coil', status: 'starved' }, at);
    }
    expect(f.changes).toBe(changes);
    expect([...f.running.keys()]).toEqual([1]);
  });

  it('forgets everything when the foundry stops showing', () => {
    const f = new RunningForges();
    f.observe({ id: 1, pieceId: 'smelter', status: 'working' }, at);
    f.clear();
    expect(f.running.size + f.known.size).toBe(0);
  });
});
