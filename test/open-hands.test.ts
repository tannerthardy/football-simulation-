/** OPEN_HANDS (physics/world.ts, engagement.ts gripFor; experimental, off):
 * two hand states. Fingers on cloth (`grip`) keep the joint's limits -- a grip
 * inside the frame is ordinary blocking; open hands push and slide: no
 * tension, tangential force bounded by friction on their own compression
 * (HAND_MU 0.42, Gerhardt et al. 2008). Fixtures (Integration, 2026-11-12): a
 * blocker beside and behind a runner's hip, nothing pressing, no grip (the
 * edge rusher past the tackle after the grip has lapsed); the same with the
 * grip kept (a hold, for the officials); a drive block with open hands (steer
 * survives up to friction) and gripped inside the frame (identical to off). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { PhysicalProfile } from '../src/players/physical.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function world(flag: string) {
  vi.stubEnv('OPEN_HANDS', flag); vi.resetModules();
  const { newSupport } = await import('../src/physics/support.js');
  const W = await import('../src/physics/world.js');
  const body = (mass: number, pos: Vec2, facing = 0) => {
    const profile: PhysicalProfile = { massKg: mass, radius: 0.3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
      reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
    return { pos, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(0.4) } as any;
  };
  return { W, body };
}

/** A rusher running past along +x at 6 yd/s (asking 8), a blocker beside his hip at arm's length (no compression),
 * anchored. grip: fingers on cloth (kept). Returns the rusher's speed after 0.5 s and the peak |tangent|. */
async function pastTheHip(flag: string, grip = false) {
  const { W, body } = await world(flag);
  const blocker = body(140, { x: 0, y: 0 }, Math.PI / 2), rusher = body(115, { x: 0.2, y: 0.9 }, 0);
  rusher.vel = { x: 6, y: 0 };
  const w = new W.World([blocker, rusher], { substeps: 12 });
  const j: any = { kind: 'hands', a: blocker, b: rusher, extension: 0.92, push: 1500, hold: grip ? 900 : 0, steer: 700 };
  if (grip) j.grip = true;
  w.joints.push(j);
  let peakT = 0;
  for (let k = 0; k < 10; k++) {
    w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: 8, y: 0 }, push: 0.2 }], 0.05);
    peakT = Math.max(peakT, Math.abs(j.tangentForce ?? 0));
  }
  return { speed: rusher.vel.x, peakT };
}

/** A drive block: the blocker loaded into the man along +x, steering him across (+y) while the man slides the other way. */
async function drive(flag: string, grip = false) {
  const { W, body } = await world(flag);
  const blocker = body(140, { x: 0, y: 0 }, 0), d = body(130, { x: 0.82, y: 0 }, Math.PI);
  const w = new W.World([blocker, d], { substeps: 12 });
  const j: any = { kind: 'hands', a: blocker, b: d, extension: 0.85, push: 1500, hold: grip ? 300 : 0, steer: 700 };
  if (grip) j.grip = true;
  w.joints.push(j);
  const rows: { N: number; T: number }[] = [];
  for (let k = 0; k < 20; k++) {
    w.step([{ vel: { x: 2.5, y: 1.5 }, push: 1 }, { vel: { x: -2, y: -1.5 }, push: 1 }], 0.05);
    rows.push({ N: j.normalForce ?? 0, T: j.tangentForce ?? 0 });
  }
  return { rows, mu: W.HAND_MU, lateral: d.pos.y };
}

describe('OPEN_HANDS', () => {
  it('behind the hip with nothing pressing, open hands cannot drag the rusher', async () => {
    const on = await pastTheHip('1'), off = await pastTheHip('0');
    console.log(`past the hip: rusher speed at 0.5 s on ${on.speed.toFixed(2)} (peak |T| ${on.peakT.toFixed(0)}) | off ${off.speed.toFixed(2)} (peak |T| ${off.peakT.toFixed(0)})`);
    expect(off.peakT).toBeGreaterThan(100);                 // today: the arms drag him
    expect(on.peakT).toBeLessThan(off.peakT * 0.25);
    expect(on.speed).toBeGreaterThan(off.speed + 0.2);
  });

  it('a grip kept on him still drags (the blocker\'s choice, judged by officials, not by the World)', async () => {
    const kept = await pastTheHip('1', true), off = await pastTheHip('0', true);
    expect(kept.peakT).toBeGreaterThan(100);
    expect(kept.speed).toBeCloseTo(off.speed, 6);
  });

  it('control: a drive block loaded into the man keeps its steer, up to friction on the push', async () => {
    const on = await drive('1'), off = await drive('0');
    const loaded = on.rows.filter((r) => r.N > 50);
    expect(loaded.length).toBeGreaterThan(10);
    for (const r of loaded) expect(Math.abs(r.T)).toBeLessThanOrEqual(on.mu * r.N + 1e-6);
    expect(Math.max(...loaded.map((r) => Math.abs(r.T)))).toBeGreaterThan(50);   // steer survives under load
    console.log(`drive block: steer p50 on ${loaded.map((r) => Math.abs(r.T)).sort((a, b) => a - b)[loaded.length >> 1].toFixed(0)} N vs off ${off.rows.map((r) => Math.abs(r.T)).sort((a, b) => a - b)[off.rows.length >> 1].toFixed(0)} N | man moved across ${on.lateral.toFixed(2)} vs ${off.lateral.toFixed(2)} yd`);
  });
  it('a drive block gripped inside the frame is identical to off', async () => {
    const on = await drive('1', true), off = await drive('0', true);
    expect(on.lateral).toBe(off.lateral);
    on.rows.forEach((r, i) => { expect(r.N).toBe(off.rows[i].N); expect(r.T).toBe(off.rows[i].T); });
  });

  it('gripFor: a grip inside his frame; past the hip it lapses after the release delay unless kept', async () => {
    vi.stubEnv('OPEN_HANDS', '1'); vi.resetModules();
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { gripFor, FRAME_PHI } = await import('../src/sim/engagement.js');
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const b = sim.slot('LT'), d = sim.defense.find((x: any) => /^DE/.test(x.slot)), j: any = {};
    d.body.pos = { x: 40, y: 20 }; d.body.facing = Math.PI; b.body.pos = { x: 39.2, y: 20 };   // in front of him
    expect(gripFor(sim, j, b, d, 0.2, false)).toBe(true);
    sim.t = 1;
    expect(gripFor(sim, j, b, d, FRAME_PHI + 0.1, false)).toBe(true);                         // just left: still letting go
    const delay = b.profile.reactionTime * (2 - b.r('discipline'));
    sim.t = 1 + delay + 0.01;
    expect(gripFor(sim, j, b, d, FRAME_PHI + 0.1, false)).toBe(false);                        // let go
    expect(gripFor(sim, j, b, d, FRAME_PHI + 0.1, true)).toBe(true);                          // or hung on: a hold to judge
    b.body.pos = { x: 40.8, y: 20 };                                                          // on his back
    expect(gripFor(sim, {} as any, b, d, 0.2, false)).toBe(true);                                   // the moment it happens
  });
});
