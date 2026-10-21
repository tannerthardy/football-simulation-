/**
 * Contact-model laws behind tackles that slow and hold up a runner
 * (src/physics/world.ts, default-off flags; docs/reviews/contact-model.md):
 *
 *  - LEG_FV: the forward share of a lean into a load spends what the gait's
 *    planned drive leaves of one force-velocity budget at the actual speed;
 *  - LEAN_AXIS: facing a load that pulls him, a holder sits back against it
 *    at full leg strength, not at his backpedal share;
 *  - TETHER: a passive leg hold is an inelastic tether at the point it
 *    holds; witnessed by the 1v1 panel's rear wrap, which a lone tackler
 *    now finishes instead of being dragged while the hold stretches.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import type { GraspJoint, Intent } from '../src/physics/world.js';
import type { PhysicalProfile } from '../src/players/physical.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

function profile(mass: number): PhysicalProfile {
  return { massKg: mass, radius: .3, reach: 1, heightYd: 2.05, vmax: 9.4, tau: 1.25,
    brake: 8, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .58, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: .25, power: mass, balance: .5, bend: .5, stepSpeed: 3.6, getUp: .9 };
}
function body(mass: number, x: number, vx = 0): Body {
  return { pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1, profile: profile(mass) };
}
async function world(flags: Record<string, string>) {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  return (await import('../src/physics/world.js')).World;
}
const grip = (a: Body, b: Body, extra: Partial<GraspJoint> = {}): GraspJoint =>
  ({ kind: 'grasp', a, b, reach: 1.6, capacity: 4000, legs: 0, pull: 0, hold: 1, ...extra });

/** Runner moving away from a planted holder that grips his torso: his
 * ground force along his travel each tick (achieved momentum change less
 * the hold's measured force on him). */
async function heldRunner(fv: boolean) {
  const World = await world({ LEG_FV: fv ? '1' : '0' });
  const holder = body(300, 0), runner = body(105, 1, 6);
  const w = new World([holder, runner], { substeps: 12 });
  const j = grip(holder, runner);
  w.joints.push(j);
  const intents: Intent[] = [{ vel: { x: 0, y: 0 }, push: 1, posture: .6 }, { vel: { x: 9.4, y: 0 }, push: 1, posture: .5 }];
  const rows: Array<{ speed: number; ground: number }> = [];
  for (let k = 0; k < 8; k++) {
    const v0 = runner.vel.x;
    w.step(intents, .05);
    const hold = (j.normalForceOnB?.x ?? 0) + (j.tangentForceOnB?.x ?? 0);
    rows.push({ speed: .5 * (v0 + runner.vel.x), ground: 105 * (runner.vel.x - v0) / .05 - hold });
  }
  return rows;
}

describe('LEG_FV: one force-velocity budget for propulsion', () => {
  it('a held runner at speed drives no harder than his force-velocity line', async () => {
    const push = supportParams(profile(105)).pushForce;
    const on = await heldRunner(true), off = await heldRunner(false);
    // After the lean has developed, the forward ground force stays on or
    // under pushForce·(1 − v/vmax); the old double budget exceeds it.
    for (const r of on.slice(2)) expect(r.ground).toBeLessThanOrEqual(push * (1 - r.speed / 9.4) * 1.05 + 5);
    expect(off.slice(2).some(r => r.ground > push * (1 - r.speed / 9.4) * 1.3)).toBe(true);
    expect(on.at(-1)!.speed).toBeLessThan(off.at(-1)!.speed);
  });
});

/** A holder facing a runner who pulls away by a torso grip: the holder's
 * braking ground force (his lean sits back against the pull). */
async function anchor(axis: boolean) {
  const World = await world({ LEAN_AXIS: axis ? '1' : '0' });
  const holder = body(100, 0), runner = body(300, 1, 2);
  const w = new World([holder, runner], { substeps: 12 });
  const j = grip(holder, runner);
  w.joints.push(j);
  const intents: Intent[] = [{ vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: .6 }, { vel: { x: 2, y: 0 }, push: 1, posture: .5 }];
  let brake = 0;
  for (let k = 0; k < 6; k++) {
    const v0 = holder.vel.x;
    w.step(intents, .05);
    const pull = -((j.normalForceOnB?.x ?? 0) + (j.tangentForceOnB?.x ?? 0));
    if (k >= 2) brake = Math.max(brake, pull - 100 * (holder.vel.x - v0) / .05);
  }
  return brake;
}

describe('LEAN_AXIS: anchoring against a pull', () => {
  it('a holder facing the pull sits back harder than his backpedal share', async () => {
    const on = await anchor(true), off = await anchor(false);
    const s = supportParams(profile(100));
    expect(on).toBeGreaterThan(off * 1.2);
    expect(on).toBeLessThanOrEqual(Math.min(s.pushForce * 1.2, s.traction) + 1);
  });
});

const PACKAGE = { LEG_FV: '1', LEG_BRACE: '1', TACKLE_ROLL: '1', WRAP_BIND: '1', LEAN_AXIS: '1', HOLD_POINT: '1' };
/** The 1v1 panel's rear tackle of a slow runner (180 deg, 3 yd/s): a form
 * wrap on his thighs by a lone tackler (scripts/diag/tackle/panel.ts). */
async function rearWrap(tether: boolean) {
  for (const [k, v] of Object.entries({ ...PACKAGE, TETHER: tether ? '1' : '0' })) vi.stubEnv(k, v);
  vi.resetModules();
  const { rep } = await import('../scripts/diag/tackle/panel.js');
  return rep({ angle: 180, speed: 3, cut: false, difficulty: 'difficult' }, 1, 3001);
}

describe('TETHER: a leg hold holds the point it grips', () => {
  it('a lone tackler with a secure rear wrap finishes instead of being dragged', async () => {
    const on = await rearWrap(true), off = await rearWrap(false);
    expect(on.ending).toBe('tackled');
    expect(on.afterContact!).toBeLessThan(4);
    expect(on.attempts.filter(a => a.kind === 'grip').every(a => !a.broke)).toBe(true);
    // Without the tether the held leg is stepped forward under the holder
    // and the runner drags him to the time limit.
    expect(off.ending).toBe('censored');
    expect(off.afterContact!).toBeGreaterThan(8);
  }, 30000);
});
