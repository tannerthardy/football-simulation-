import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** HAND_ARMS step 1 (experimental, off; docs/reviews/2026-11-24-blocking-phase2-design.md sections 2-2b): the lift on a man is derived from the force balance of the two arms. The flag is
 * read at import, so each test sets the environment, resets the modules and imports again. */
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const CENTER_Y = 26.65;
async function fixture(arms: boolean) {
  vi.stubEnv('HAND_ARMS', arms ? '1' : '0'); vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side: 1 }) as any;
  const { sim, blocker: b, defender: d, engagement: e } = f;
  e.control = 0;
  b.body.pos = { x: 40, y: CENTER_Y }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  d.body.pos = { x: 40 + b.profile.radius + d.profile.radius + 0.1, y: CENTER_Y }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  return { sim, b, d };
}
function run(fx: any, ticks: number, extra: (who: 'b' | 'd') => object = () => ({})) {
  const { sim, b, d } = fx;
  for (let k = 0; k < ticks; k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.8, ...extra('b') };
    intents[d.idx] = { vel: { x: -4.5, y: 0 }, facing: Math.PI, push: 1, posture: 0.74, ...extra('d') };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
  }
  return -(b.body.vel.x + d.body.vel.x) / 2;
}
/** One hands load put on the world directly: the lift it adds on each body, by the force balance. */
async function lift(env: { dzB?: number; dzD?: number; effB?: number; effD?: number }, arms = true) {
  const fx = await fixture(arms); const { sim, b, d } = fx; const w: any = sim.world;
  w.padHeight[b.idx] = 1.2; w.padHeight[d.idx] = 1.0;     // the blocker is the higher man by 0.2 yd
  w.handDz[b.idx] = env.dzB ?? 0; w.handDz[d.idx] = env.dzD ?? 0; w.armEffort[b.idx] = env.effB ?? 1; w.armEffort[d.idx] = env.effD ?? 1;
  for (const i of [b.idx, d.idx]) { w.liftImp[i] = 0; w.impX[i] = 0; w.impY[i] = 0; }
  const dx = d.body.pos.x - b.body.pos.x, dy = d.body.pos.y - b.body.pos.y, dist = Math.hypot(dx, dy);
  const H = 1000;
  // A load of H from i = blocker onto j = defender along the line (compression: positive).
  w.addLoad(b.idx, d.idx, dx / dist, dy / dist, H, 0, undefined, false, true);
  return { onD: w.liftImp[d.idx] as number, onB: w.liftImp[b.idx] as number, H, dist };
}

describe('HAND_ARMS: the lift from the force balance of the two arms', () => {
  it('with the hands at the other man\'s pads and equal effort it is exactly the single pad-to-pad line', async () => {
    const on = await lift({}), off = await lift({}, false);
    expect(on.onD).toBeCloseTo(off.onD, 9);
    expect(on.onB).toBeCloseTo(off.onB, 9);
    // H x (pad_j - pad_i) / d, here the defender is the lower man: pressed (negative).
    expect(on.onD).toBeCloseTo(on.H * Math.max(-0.6, Math.min(0.6, (1.0 - 1.2) / Math.max(on.dist, 0.3))), 9);
  });
  it('the vertical loads are equal and opposite (the pair\'s total normal load is conserved)', async () => {
    for (const e of [{}, { dzB: -0.2, dzD: 0.1 }, { effB: 0.2, effD: 1 }, { dzB: 0.3, effD: 0 }]) {
      const r = await lift(e);
      expect(r.onB + r.onD).toBeCloseTo(0, 9);
    }
  });
  it('hand placement enters as H (w_i dz_i - w_j dz_j) / d on top of the pad gap', async () => {
    const base = await lift({}), moved = await lift({ dzB: -0.2, dzD: 0.1 });   // the higher man (blocker) hands under, the lower man (defender) hands on shoulders
    // on the defender j: lift = H (w_i tan a_i - w_j tan a_j), tan a_i = (pad_j + dz_i - pad_i)/d, tan a_j = (pad_i + dz_j - pad_j)/d, w = 1/2
    const d = base.dist, tI = (1.0 - 0.2 - 1.2) / d, tJ = (1.2 + 0.1 - 1.0) / d;
    expect(moved.onD).toBeCloseTo(moved.H * (0.5 * tI - 0.5 * tJ), 9);
    expect(moved.onD).not.toBeCloseTo(base.onD, 3);
  });
  it('a man who does not work his arms carries none of the force: the vertical comes from the other arm alone', async () => {
    const r = await lift({ effD: 0 });
    const d = r.dist, tI = (1.0 - 1.2) / d;
    expect(r.onD).toBeCloseTo(r.H * Math.max(-0.6, Math.min(0.6, tI)), 9);
  });
  it('flag off: the same staged rep gives the same pair velocity with or without hand heights in the intent', async () => {
    const a = run(await fixture(false), 40), b = run(await fixture(false), 40, () => ({ handDz: 0.3, armEffort: 0.1 }));
    expect(a).toBe(b);
  });
  it('flag on, hands at the pads and equal effort: the staged rep equals the reference', async () => {
    const ref = run(await fixture(false), 60), on = run(await fixture(true), 60);
    expect(on).toBeCloseTo(ref, 9);
  });
  it('flag on: hands above the other man\'s centre tip him back (the rep walks back faster than with hands at his pads)', async () => {
    const pads = run(await fixture(true), 90), high = run(await fixture(true), 90, () => ({ handDz: 0.1 }));
    expect(high).toBeGreaterThan(pads);
  });
});
