/** BALL_DRAG (on by default since engine-97, =0 restores): the spiral's drag constant is the measured in-flight deceleration (0.0050 /yd) on and the engine's old 0.003027 off; the QB's launch is re-derived
 * for the same flight time, so hang time and apex by distance do not move. The module reads the flag at import, so each arm loads it fresh. */
import { describe, it, expect, vi, afterEach } from 'vitest';

async function load(flag: string | undefined) {
  vi.resetModules();
  if (flag === undefined) delete process.env.BALL_DRAG; else process.env.BALL_DRAG = flag;
  return import('../src/physics/ball.js');
}
const T = (d: number) => 0.0731 + 0.03945 * d + 0.00022 * d * d;

afterEach(() => { delete process.env.BALL_DRAG; });

describe('BALL_DRAG', () => {
  it('=0 restores the old spiral constant, 0.003027 /yd', async () => {
    const m = await load('0');
    expect(m.BALL_DRAG).toBe(false);
    expect(m.DRAG_SPIRAL).toBe(0.003027);
  });

  it('is on by default: the spiral is 0.0050 /yd (C_d about 0.16 on the rulebook ball) and kicks and tumbles keep theirs', async () => {
    const m = await load(undefined);
    expect(m.BALL_DRAG).toBe(true);
    expect(m.DRAG_SPIRAL).toBe(0.005);
    // k = rho C_d A / (2 m) per yd, with the rulebook ball's A 0.0226-0.0232 m2, m 0.397-0.425 kg, rho 1.2: 0.0306 C_d
    const cd = (k: number, A: number, mass: number) => (k * 2 * mass) / (1.2 * A * 0.9144);
    expect(cd(m.DRAG_SPIRAL, 0.0229, 0.411)).toBeGreaterThan(0.15);
    expect(cd(m.DRAG_SPIRAL, 0.0229, 0.411)).toBeLessThan(0.19);
    expect(m.DRAG_KICK).toBe(0.0042);
    expect(m.DRAG_TUMBLE).toBe(0.006);
  });

  it('the same flight time and arc at every distance: apex and hang time unchanged; the release is faster and the arrival slower', async () => {
    const off = await load('0'), on = await load(undefined);
    for (const d of [10, 20, 30, 40]) {
      const from = { x: 0, y: 0, z: 1.8 }, to = { x: d, y: 0, z: 1.0 }, t = T(d);
      const run = (m: typeof off) => {
        const v = m.solveLaunch(from, to, t, m.DRAG_SPIRAL);
        const b = { pos: { ...from }, vel: { ...v }, drag: m.DRAG_SPIRAL };
        let apex = from.z, el = 0;
        while (el < t - 1e-9) { const h = Math.min(0.01, t - el); m.stepFlight(b, h); el += h; apex = Math.max(apex, b.pos.z); }
        return { v: Math.hypot(v.x, v.y, v.z), arrive: Math.hypot(b.vel.x, b.vel.y, b.vel.z), apex, miss: Math.hypot(b.pos.x - to.x, b.pos.y - to.y, b.pos.z - to.z) };
      };
      const a = run(off), b = run(on);
      expect(a.miss).toBeLessThan(0.05); expect(b.miss).toBeLessThan(0.05); // both reach the same point at the same time
      expect(Math.abs(a.apex - b.apex)).toBeLessThan(0.03);
      expect(b.v).toBeGreaterThan(a.v); expect(b.arrive).toBeLessThan(a.arrive);
    }
  });
});
