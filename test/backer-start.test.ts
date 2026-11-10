/** Box backers at the snap (experimental, off).
 * BACKER_CREEP (backer-creep.ts, playsim stageDefense): some box backers walk
 * downhill into the snap, by their anticipation, and are moving when the ball
 * is snapped (their start is the snap). Called blitzers keep BLITZ_CREEP.
 * OFFBALL_TIMING (snap-count.ts): an off-ball defender may time the count and
 * start with the snap rather than after the visual response; never before it.
 * NFL box LBs: 37-46% moving > 0.5 yd/s at the snap, mostly downhill. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function snaps(flags: Record<string, string>, n = 24) {
  vi.stubEnv('SNAP_REACT', '1');
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { creepPace } = await import('../src/sim/backer-creep.js');
  const { snapResponse } = await import('../src/sim/snap-count.js');
  return Array.from({ length: n }, (_, i) => {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: i % 2 ? 'oz_strong' : 'smash', seed: i + 1, roster: 7, formation: 'ace_11', flip: i % 4 > 1 }));
    const dir = sim.attackDir(sim.offense[0].team);
    const box = sim.defense.filter((d: any) => /^LB/.test(d.slot) && d.pos.x - sim.los > 2 && d.pos.x - sim.los < 7.5);
    return box.map((d: any) => ({ creep: creepPace.get(d), downhill: -d.vel.x * dir, ready: d.snapReadyAt,
      plan: sim.snapCount?.plans.get(d), react: d.mind.snapDelay + snapResponse(d) }));
  }).flat();
}

describe('BACKER_CREEP', () => {
  it('off: no box backer creeps and none is moving at the snap', async () => {
    const r = await snaps({ BACKER_CREEP: '0' });
    expect(r.length).toBeGreaterThan(20);
    expect(r.filter((b) => b.creep)).toHaveLength(0);
    expect(r.every((b) => Math.abs(b.downhill) < 0.05)).toBe(true);
  });
  it('on: some box backers creep; each is walking downhill at the snap and starts with it', async () => {
    const r = await snaps({ BACKER_CREEP: '1' });
    const creepers = r.filter((b) => b.creep);
    expect(creepers.length).toBeGreaterThan(r.length * 0.15);
    expect(creepers.length).toBeLessThan(r.length * 0.75);
    for (const b of creepers) { expect(b.downhill).toBeGreaterThan(0.25); expect(b.ready).toBe(0); }
    expect(r.filter((b) => !b.creep).every((b) => Math.abs(b.downhill) < 0.05)).toBe(true);
  });
});

describe('OFFBALL_TIMING', () => {
  it('off: every off-ball box backer starts after his visual response', async () => {
    const r = await snaps({ OFFBALL_TIMING: '0' });
    expect(r.every((b) => b.plan && !b.plan.timed && Math.abs(b.plan.go - b.react) < 1e-9)).toBe(true);
  });
  it('on: some time the count and start with the snap, never before it', async () => {
    const r = await snaps({ OFFBALL_TIMING: '1' });
    const timed = r.filter((b) => b.plan?.timed);
    expect(timed.length).toBeGreaterThan(r.length * 0.2);
    for (const b of r) { expect(b.plan.go).toBeGreaterThanOrEqual(0); expect(b.plan.go).toBeLessThanOrEqual(b.react + 1e-9); }
    expect(timed.some((b) => b.plan.go < b.react - 0.05)).toBe(true);
  });
});
