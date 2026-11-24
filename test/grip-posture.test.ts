import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** GRIP_MU and POSTURE_HOLD (experimental, off; docs/reviews/2026-11-24-blocking-phase1-design.md). Both are read at import, so each test sets the
 * environment, resets the modules and imports again. */
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const CENTER_Y = 26.65;
async function rep(env: Record<string, string>, rusherPosture: number, blockerPosture = 0.8) {
  vi.stubEnv('GRIP_MU', env.GRIP_MU ?? '');
  vi.stubEnv('POSTURE_HOLD', env.POSTURE_HOLD ?? '0');
  vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side: 1 }) as any;
  const { sim, blocker: b, defender: d, engagement: e } = f;
  e.control = 0;
  b.body.pos = { x: 40, y: CENTER_Y }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  d.body.pos = { x: 40 + b.profile.radius + d.profile.radius + 0.1, y: CENTER_Y }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  for (let k = 0; k < Math.round(1.5 / sim.dt); k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: blockerPosture };
    intents[d.idx] = { vel: { x: -4.5, y: 0 }, facing: Math.PI, push: 1, posture: rusherPosture };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
  }
  return { pair: -(b.body.vel.x + d.body.vel.x) / 2, sim, b, d };
}

describe('GRIP_MU: the shared traction coefficient', () => {
  it('is 1.1 off, 1.3 on, and the stated number otherwise', async () => {
    vi.stubEnv('GRIP_MU', ''); vi.resetModules();
    expect((await import('../src/physics/support.js')).TURF_MU).toBe(1.1);
    vi.stubEnv('GRIP_MU', '1'); vi.resetModules();
    expect((await import('../src/physics/support.js')).TURF_MU).toBe(1.3);
    vi.stubEnv('GRIP_MU', '1.5'); vi.resetModules();
    const s = await import('../src/physics/support.js');
    expect(s.TURF_MU).toBe(1.5);
    const p = { massKg: 140, power: 140 * 1.2, heightYd: 2, radius: 0.35 } as any;
    expect(s.supportParams(p).traction).toBeCloseTo(1.5 * 140 * (await import('../src/core/units.js')).G, 6);
  });
  it('rejects a coefficient outside 0.5-3', async () => {
    vi.stubEnv('GRIP_MU', '5'); vi.resetModules();
    await expect(import('../src/physics/support.js')).rejects.toThrow(/traction coefficient/);
  });
});

describe('POSTURE_HOLD: a hold under load (dormant at pad-geometry lifts) and a mobility cost', () => {
  it('off is exactly the reference', async () => {
    const a = await rep({}, 1.0), b = await rep({ POSTURE_HOLD: '0' }, 1.0);
    expect(a.pair).toBe(b.pair);
  });
  it('on: a man pushing straight on pays no mobility cost, a low man pushing across his face pays it', async () => {
    vi.stubEnv('POSTURE_HOLD', '1'); vi.resetModules();
    const { World } = await import('../src/physics/world.js');
    const w: any = Object.create(World.prototype);
    w.facingDelta = (from: number, to: number) => { let d = to - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    expect(w.lowAcross(true, 0.9, 0, 0)).toBeCloseTo(1, 12);
    expect(w.lowAcross(true, 0.9, 0, Math.PI / 2)).toBeCloseTo(1 - 0.3 * 0.9, 12);
    expect(w.lowAcross(false, 0.9, 0, Math.PI / 2)).toBe(1);
    expect(w.lowAcross(true, 0.2, 0, Math.PI / 2)).toBeGreaterThan(w.lowAcross(true, 0.9, 0, Math.PI / 2));
  });
  it('on: a lift his legs do not hold stands him up (his pads rise: posture falls), a lift they hold leaves it', async () => {
    const r = await rep({ POSTURE_HOLD: '1' }, 0.74, 0.9);
    const { sim, b } = r as any;
    const held = b.body.support.posture;
    // Set a lift of several body weights on the blocker (lifted: positive), then step: the unheld part must lower his posture.
    const i = b.idx; const m = b.profile.massKg;
    (sim.world as any).liftFelt[i] = 3 * m * 10.73;
    const before = b.body.support.posture;
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.9 };
    sim.world.step(intents, sim.dt);
    expect(b.body.support.posture).toBeLessThan(before);
    expect(held).toBeGreaterThan(0.5);
  });
});
