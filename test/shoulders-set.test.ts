/** SHOULDERS_SET (behaviors/qb.ts; experimental, off): his body is not his
 * eyes. His feet go to a read only once his eyes have held it for the reset
 * time, and the throw requests the turn: the motion lasts at least the
 * throwing turn to the target, and the shoulders close on it through it. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setPlay(seed: number, flag: string, concept = 'four_verts') {
  vi.stubEnv('SHOULDERS_SET', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  return new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false })) as any;
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const deg = (a: number) => Math.abs(wrap(a)) * 180 / Math.PI;

/** Every throw start on these plays: the turn it asked for, the motion's length and his facing error at the release. */
async function throws(flag: string) {
  const out: { turn: number; motion: number; windup: number; err: number }[] = [];
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const sim = await setPlay(seed, flag);
    const b = sim.qb.behavior;
    let start: any = null;
    while (sim.phase === 'live' && sim.t < 7 && sim.throwAt < 0) {
      const was = b.phase;
      sim.tick();
      if (was !== 'windup' && b.phase === 'windup' && b.pending) {
        const to = Math.atan2(b.pending.point.y - sim.qb.pos.y, b.pending.point.x - sim.qb.pos.x);
        start = { turn: deg(to - b.turnFrom), motion: b.releaseAt - b.motionAt, windup: b.windup(sim.qb), point: b.pending.point };
      }
    }
    if (start && sim.throwAt >= 0) {
      const to = Math.atan2(start.point.y - sim.qb.pos.y, start.point.x - sim.qb.pos.x);
      out.push({ turn: start.turn, motion: start.motion, windup: start.windup, err: deg(sim.qb.body.facing - to) });
    }
  }
  return out;
}

describe('SHOULDERS_SET', () => {
  it('his feet go to a read only after his eyes have held it for the reset', async () => {
    let apart = 0, checked = 0;
    for (const seed of [1, 2, 3, 4]) {
      const sim = await setPlay(seed, '1', 'smash');
      const b = sim.qb.behavior;
      while (sim.phase === 'live' && sim.t < 6 && sim.throwAt < 0) {
        sim.tick();
        if (b.phase !== 'set' || !b.eyesRead) continue;
        checked++;
        if (b.shoulderRead !== b.eyesRead) { apart++; expect(sim.t - b.eyesAt).toBeLessThan(0.3 + 1e-9); }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(apart).toBeGreaterThan(0);
  });

  it('a throw lasts at least its turn, and he is square to the target at the release', async () => {
    const on = await throws('1');
    expect(on.length).toBeGreaterThan(3);
    for (const r of on) {
      expect(r.motion).toBeGreaterThanOrEqual(Math.max(r.windup, 0.12 + r.turn / 190) - 1e-6);
      expect(r.err).toBeLessThan(12);
    }
  });

  it('off, no throw waits for a turn', async () => {
    const off = await throws('0');
    expect(off.length).toBeGreaterThan(3);
    for (const r of off) expect(r.motion).toBeCloseTo(r.windup, 9);
  });
});
