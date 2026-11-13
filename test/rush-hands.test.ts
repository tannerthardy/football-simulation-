/** RUSH_HANDS stage 1 (physics/world.ts handForce / handHold / stepHands; engagement.ts refit; experimental, off):
 * the blocker's hand as a one-degree-of-freedom body on the hands joint. Fixtures (Integration, 2026-11-13): the same
 * force on an extended arm takes the hand off, on a bent, pressed one it does not; a grip resists more than open
 * hands; the result does not depend on the substep count; re-fit takes reaction + the hand's travel at arm speed;
 * with no force on the hand every joint force is today's; momentum is conserved (the ground is the only external). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { PhysicalProfile } from '../src/players/physical.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flags: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  const { newSupport } = await import('../src/physics/support.js');
  const W = await import('../src/physics/world.js');
  const body = (mass: number, pos: Vec2, facing = 0) => {
    const profile: PhysicalProfile = { massKg: mass, radius: 0.3, reach: 0.25 + 0.95 * 0.85, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
      reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
    return { pos, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(0.4) } as any;
  };
  return { W, body };
}

/** A blocker (a) facing a rusher (b) along +x, hands joint at `ext` past the bodies; the rusher leans in with
 * `press` (push 0..1). A lateral force F (+y) on the hand for `dur` s from t = 0.1. Returns the hand's offset, whether
 * it came off, the joint forces each step, and the momentum check. */
async function scene(opts: { ext: number; press: number; F: number; dur: number; substeps?: number; grip?: boolean; flags?: Record<string, string>; steps?: number }) {
  const { W, body } = await load({ RUSH_HANDS: '1', ...(opts.flags ?? {}) });
  const a = body(140, { x: 0, y: 0 }, 0), b = body(120, { x: 0.6 + opts.ext, y: 0 }, Math.PI);
  const w = new W.World([a, b], { substeps: opts.substeps ?? 12 });
  const j: any = { kind: 'hands', a, b, extension: 0.6 + opts.ext, push: 1500, hold: opts.grip ? 600 : 0, steer: 700 };
  if (opts.grip) j.grip = true;
  w.joints.push(j);
  const rows: { N: number; T: number }[] = [];
  let p0 = { x: 0, y: 0 }, ground = { x: 0, y: 0 };
  const mom = () => ({ x: a.profile.massKg * a.vel.x + b.profile.massKg * b.vel.x, y: a.profile.massKg * a.vel.y + b.profile.massKg * b.vel.y });
  for (let k = 0; k < (opts.steps ?? 12); k++) {
    if (k === 2 && opts.F) { p0 = mom(); w.handForce(j, b, { x: 0, y: opts.F }, w.time, w.time + opts.dur); }
    const rep = w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: -1.5 * opts.press, y: 0 }, push: opts.press }], 0.05);
    if (k >= 2) { ground.x += (rep.groundImpulse[0]?.x ?? 0) + (rep.groundImpulse[1]?.x ?? 0); ground.y += (rep.groundImpulse[0]?.y ?? 0) + (rep.groundImpulse[1]?.y ?? 0); }
    rows.push({ N: j.normalForce ?? 0, T: j.tangentForce ?? 0 });
  }
  const p1 = mom(), arm = W.ARM_MASS * a.profile.massKg * (j.handVel ?? 0);
  return { offset: j.handOffset ?? 0, off: !!j.off, rows, residualY: p1.y + arm - p0.y - ground.y, scaleY: Math.abs(opts.F * opts.dur), W };
}

describe('RUSH_HANDS stage 1', () => {
  it('the same force takes the hand off an extended arm, not off a bent, pressed one', async () => {
    const extended = await scene({ ext: 0.9 * 0.95, press: 0, F: 1200, dur: 0.08 });
    const bent = await scene({ ext: 0.25 * 0.95, press: 1, F: 1200, dur: 0.08 });
    console.log(`extended: offset ${extended.offset.toFixed(3)} off ${extended.off} | bent+pressed: offset ${bent.offset.toFixed(3)} off ${bent.off}`);
    expect(extended.off).toBe(true);
    expect(bent.off).toBe(false);
    expect(Math.abs(bent.offset)).toBeLessThan(Math.abs(extended.offset));
  });

  it('a grip resists more than open hands (OPEN_HANDS)', async () => {
    const open = await scene({ ext: 0.6 * 0.95, press: 0, F: 900, dur: 0.08, flags: { OPEN_HANDS: '1' } });
    const grip = await scene({ ext: 0.6 * 0.95, press: 0, F: 900, dur: 0.08, grip: true, flags: { OPEN_HANDS: '1' } });
    console.log(`open offset ${open.offset.toFixed(3)} off ${open.off} | grip offset ${grip.offset.toFixed(3)} off ${grip.off}`);
    expect(Math.abs(grip.offset)).toBeLessThan(Math.abs(open.offset));
  });

  it('the hand displacement does not depend on the substep count', async () => {
    const coarse = await scene({ ext: 0.6 * 0.95, press: 0, F: 420, dur: 0.08, substeps: 6, steps: 6 });
    const fine = await scene({ ext: 0.6 * 0.95, press: 0, F: 420, dur: 0.08, substeps: 24, steps: 6 });
    console.log(`substeps 6: ${coarse.offset.toFixed(4)} | 24: ${fine.offset.toFixed(4)}`);
    expect(Math.abs(coarse.offset)).toBeGreaterThan(0.01); expect(coarse.off || fine.off).toBe(false);
    expect(Math.abs(coarse.offset - fine.offset)).toBeLessThan(0.1 * Math.abs(fine.offset) + 0.005);
  });

  it('momentum is conserved: the bodies and the arm change only by the ground impulse', async () => {
    const r = await scene({ ext: 0.6 * 0.95, press: 0.5, F: 800, dur: 0.08 });
    console.log(`momentum residual y ${r.residualY.toFixed(3)} against the strike's impulse ${r.scaleY.toFixed(1)}`);
    expect(Math.abs(r.residualY)).toBeLessThan(0.02 * r.scaleY + 0.5);
  });

  it('with RUSH_HANDS on and no force on the hand, every joint force is today\'s', async () => {
    const on = await scene({ ext: 0.4, press: 1, F: 0, dur: 0.08 });
    const off = await scene({ ext: 0.4, press: 1, F: 0, dur: 0.08, flags: { RUSH_HANDS: '0' } });
    on.rows.forEach((r, i) => { expect(r.N).toBe(off.rows[i].N); expect(r.T).toBe(off.rows[i].T); });
    expect(on.offset).toBe(0);
  });

  it('re-fit takes his reaction plus the hand\'s travel from his chest at arm speed', async () => {
    vi.resetModules(); vi.stubEnv('RUSH_HANDS', '1');
    const { refitTime } = await import('../src/sim/engagement.js');
    const { ARM_SPEED } = await import('../src/physics/actuation.js');
    const b: any = { pos: { x: 0, y: 0 }, profile: { radius: 0.3, reactionTime: 0.25 } }, d: any = { pos: { x: 1.2, y: 0 }, profile: { radius: 0.3 } };
    expect(refitTime(b, d)).toBeCloseTo(0.25 + 0.6 / ARM_SPEED, 9);
    d.pos = { x: 0.6, y: 0 };
    expect(refitTime(b, d)).toBeCloseTo(0.25, 9);
  });
});
