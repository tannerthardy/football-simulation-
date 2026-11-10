import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Step 1 of docs/reviews/effective-mass.md: CONTACT_LAYER (compliant torso layer) and the contact flags that followed.
// They are read at load, so each case stubs the environment and
// imports fresh modules. The cases run on the real engine defaults (the reference stack's promoted flags on), not
// the legacy pin of vitest.config.ts.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { Rng } = await import('../src/core/rng.js');
  const { generatePlayer } = await import('../src/players/generator.js');
  const { derivePhysical } = await import('../src/players/physical.js');
  const { newSupport } = await import('../src/physics/support.js');
  const { World } = await import('../src/physics/world.js');
  const rng = new Rng(3);
  const runner = derivePhysical(generatePlayer(rng, 'RB')), hitter = derivePhysical(generatePlayer(rng, 'LB'));
  const body = (profile: any, x: number, y: number, facing: number, v: number) =>
    ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);
  return { World, runner, hitter, body };
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A runner at 4 yd/s into a hitter offset `off`; 5 ms steps. Peak contact force on the runner (N), pair momentum
 * error with free intents, and the trajectory. */
async function collide(env: Record<string, string>, off: number, free: boolean, gap = 1.5) {
  const { World, runner, hitter, body } = await load(env);
  const r = body(runner, 0, 0, 0, 4), h = body(hitter, gap, off, Math.PI, 0);
  const w = new World([r, h]);
  const ri = free ? { vel: { x: 0, y: 0 }, free: true } : { vel: { x: 4, y: 0 }, push: 1 };
  const hi = free ? { vel: { x: 0, y: 0 }, free: true } : { vel: { x: -0.5, y: 0 }, push: 1 };
  let peak = 0, err = 0; const path: number[] = [];
  for (let k = 0; k < 160; k++) {
    const px = r.vel.x * r.profile.massKg, py = r.vel.y * r.profile.massKg, p0 = px + h.vel.x * h.profile.massKg;
    const rep = w.step([ri as any, hi as any], 0.005), g = rep.groundImpulse;
    err = Math.max(err, Math.abs(r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg - p0 - g[0].x - g[1].x));
    peak = Math.max(peak, Math.hypot(r.vel.x * r.profile.massKg - px - g[0].x, r.vel.y * r.profile.massKg - py - g[0].y) / 0.005 * 0.9144);
    path.push(r.pos.x, r.pos.y, h.pos.x, h.pos.y, r.vel.x, h.vel.x);
  }
  return { peak, err, path };
}

describe('CONTACT_LAYER (compliant torso layer)', () => {
  it('lowers the first-touch peak force several-fold', async () => {
    const off = await collide({}, 0, false), on = await collide({ CONTACT_LAYER: '1' }, 0, false);
    expect(off.peak).toBeGreaterThan(20000);
    expect(on.peak).toBeLessThan(off.peak / 3);
  });
  it('keeps pair momentum exactly with no ground force', async () => {
    for (const off of [0, 0.3]) expect((await collide({ CONTACT_LAYER: '1' }, off, true)).err).toBeLessThan(1e-9);
  });
  it('leaves a world without torso contact bit-identical', async () => {
    const a = await collide({}, 3, false), b = await collide({ CONTACT_LAYER: '1' }, 3, false);
    expect(b.path).toEqual(a.path);
  });
});

describe('HANDS_CHEST (block hands push chest to chest)', () => {
  async function spin(env: Record<string, string>, off: number) {
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    Object.assign(d.profile, structuredClone(b.profile));
    b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
    const R = b.profile.radius + d.profile.radius + 0.1;
    d.body.pos = { x: 40 + Math.sqrt(R * R - off * off), y: 26.65 + off }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
    e.control = 0;
    const ang = () => Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), a0 = ang();
    // 30 ticks: with LEAN_PITCH (run-ref-13) the lean pitches in over planted feet, so the twist needs more ticks to show.
    for (let k = 0; k < 30; k++) {
      const intents: any[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      intents[b.idx] = { vel: { x: 1, y: 0 }, facing: 0, push: 1, posture: 0.85 };
      intents[d.idx] = { vel: { x: -1, y: 0 }, facing: Math.PI, push: 1, posture: 0.85 };
      sim.world.step(intents, sim.dt);
    }
    return Math.abs(Math.atan2(Math.sin(ang() - a0), Math.cos(ang() - a0))) * 180 / Math.PI;
  }
  it('an off-centre pushing pair twists far less; a head-up pair is unchanged', async () => {
    const offOff = await spin({ HANDS_CHEST: '0' }, 0.2), offOn = await spin({ HANDS_CHEST: '1' }, 0.2);
    expect(offOff).toBeGreaterThan(12);
    expect(offOn).toBeLessThan(offOff / 2);
    expect(await spin({ HANDS_CHEST: '1' }, 0)).toBeLessThan(1);
  });
});

describe('GRASP_PATCH (a grasp acts at the grip point)', () => {
  async function held(env: Record<string, string>, off: number, grasp = true) {
    const { World, runner, hitter, body } = await load(env);
    const { supportParams } = await import('../src/physics/support.js');
    const r = body(runner, 0, 0, 0, 4), h = body(hitter, 1.2, off, Math.PI, 0);
    const w = new World([r, h]);
    let t0 = -1, slip = 0, err = 0; const path: number[] = [];
    for (let k = 0; k < 40; k++) {
      const p0 = r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg;
      const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], 0.05);
      err = Math.max(err, Math.abs(r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg - p0 - rep.groundImpulse[0].x - rep.groundImpulse[1].x));
      const d = Math.hypot(r.pos.x - h.pos.x, r.pos.y - h.pos.y);
      if (grasp && t0 < 0 && d <= runner.radius + hitter.radius + 0.1) {
        t0 = k; w.joints.push({ kind: 'grasp', a: h, b: r, reach: runner.radius + hitter.radius + hitter.reach * 0.9,
          capacity: supportParams(hitter).armForce * 2, legs: 0.3, pull: 2, hold: d } as any);
      }
      if (t0 >= 0 && k - t0 === 6) { const nx = (r.pos.x - h.pos.x) / d, ny = (r.pos.y - h.pos.y) / d; slip = Math.abs(-(r.vel.x - h.vel.x) * ny + (r.vel.y - h.vel.y) * nx); }
      path.push(r.pos.x, r.pos.y, h.pos.x, h.pos.y);
    }
    return { slip, err, path };
  }
  it('keeps pair momentum exactly and leaves a world without a grasp bit-identical', async () => {
    expect((await held({ GRASP_PATCH: '1' }, 0.3)).err).toBeLessThan(1e-9);
    expect((await held({ GRASP_PATCH: '1' }, 0.3, false)).path).toEqual((await held({ GRASP_PATCH: '0' }, 0.3, false)).path);
  });
  it('lets an offset held pair slip where today it locks', async () => {
    const off = await held({ GRASP_PATCH: '0' }, 0.3), on = await held({ GRASP_PATCH: '1' }, 0.3);
    expect(on.slip).toBeGreaterThan(off.slip);
  });
});
