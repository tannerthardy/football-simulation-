import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';

// ROUTE_FILLET (docs/reviews/2026-11-14-route-speed.md): a rolled corner is led and passes inside its vertex; off, the follower
// point-turns at the vertex and carries outside the next leg. The flag is read at import, so each arm loads the module afresh.
const profile: PhysicalProfile = { massKg: 90, radius: .3, reach: 1, heightYd: 2.05, vmax: 10, tau: 1.1, brake: 6, lateral: 7, turnRate: 9,
  backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
const DT = 0.02;

async function run(flag: '0' | '1', pts: Array<{ x: number; y: number; s: number; cut?: boolean }>) {
  vi.resetModules(); vi.stubEnv('ROUTE_FILLET', flag);
  const { steerRoute } = await import('../src/sim/route-motion.js');
  const body: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, sprintLoad: 0, profile: { ...profile }, support: newSupport(.2) };
  const path = pts.map((p) => ({ p: { x: p.x, y: p.y }, s: p.s, ...(p.cut ? { cut: true } : {}) }));
  const st: { idx: number; from?: { x: number; y: number }; turn?: unknown } = { idx: 0 };
  const track: Array<{ x: number; y: number; v: number }> = [];
  for (let t = 0; t < 6; t += DT) {
    const cmd = steerRoute(body, st as never, path, 'continue', 0.9, 0.6, 0.9);
    if (!cmd) break;
    stepBody(body, { ...cmd, facing: Math.atan2(cmd.vel.y, cmd.vel.x) }, DT);
    track.push({ x: body.pos.x, y: body.pos.y, v: Math.hypot(body.vel.x, body.vel.y) });
  }
  return track;
}
afterEach(() => { vi.unstubAllEnvs(); });

// stem 12 yd upfield, then a rolled 50 degree bend onto a long diagonal
const bend = [{ x: 12, y: 0, s: .9 }, { x: 24, y: 14, s: 1 }, { x: 40, y: 30, s: 1 }];
// distance outside the exit leg (the leg through (12, 0) and (24, 14)) after the body passes the vertex
const outside = (track: Array<{ x: number; y: number }>) => {
  const lx = 12, ly = 14, n = Math.hypot(12, 14);
  return Math.max(0, ...track.filter((q) => q.x > 11).map((q) => -((q.x - 12) * ly - q.y * lx) / n * -1));
};
describe('ROUTE_FILLET', () => {
  it('carries less outside the next leg than the point-turn it replaces, and passes inside the vertex', async () => {
    const off = await run('0', bend), on = await run('1', bend);
    const d = (tr: Array<{ x: number; y: number }>) => Math.min(...tr.map((q) => Math.hypot(q.x - 12, q.y)));
    expect(d(on)).toBeGreaterThan(0.3);            // it passes inside the vertex, not through it
    expect(d(on)).toBeGreaterThan(d(off));
    expect(outside(on)).toBeLessThan(outside(off) - 0.5);   // lone body at 10 yd/s: 2.1 yd outside off, 1.1 on
  });
  it('is the same path when the route has no corner', async () => {
    const straight = [{ x: 20, y: 0, s: 1 }, { x: 40, y: 0.5, s: 1 }];
    const off = await run('0', straight), on = await run('1', straight);
    expect(on.length).toBe(off.length);
    for (let k = 0; k < on.length; k += 10) expect(Math.abs(on[k].x - off[k].x) + Math.abs(on[k].y - off[k].y)).toBeLessThan(1e-9);
  });
  it('a speed cut stays a plant: a 90 degree corner declared s .4 is taken well below the speed of a rolled one', async () => {
    const plant = [{ x: 12, y: 0, s: .4 }, { x: 12, y: 20, s: 1 }];
    const tr = await run('1', plant);
    const through = Math.min(...tr.filter((q) => q.x > 9 && q.y < 3).map((q) => q.v));
    const rolled = Math.min(...(await run('1', bend)).filter((q) => q.x > 9 && q.x < 16).map((q) => q.v));
    expect(through).toBeLessThan(rolled - 1.5);
  });
  it('a point declared a cut keeps the vertex law, taken at the declared speed', async () => {
    const cutBend = [{ x: 2.7, y: 0, s: .4, cut: true }, { x: 2.7, y: 20, s: 1 }];   // a cut 2.7 yd off the line, like the slant's
    const speedAtVertex = (tr: Array<{ x: number; y: number; v: number }>) => tr.reduce((b, q) => Math.hypot(q.x - 2.7, q.y) < Math.hypot(b.x - 2.7, b.y) ? q : b).v;
    const off = speedAtVertex(await run('0', cutBend)), on = speedAtVertex(await run('1', cutBend));
    const through = .4 * 10 * .9 * (.82 + .3 * .6);     // s x vtop (vmax 10, effort .9) x the route-running factor
    expect(on).toBeLessThanOrEqual(off + 1e-9);        // never faster through the cut than the old law (the sim's get-off crosses it at about +1 yd/s over; see the note)
    expect(on).toBeLessThan(through + 0.5);
    // and no lead: it still goes through the vertex (within the switch radius), not inside it
    const near = (tr: Array<{ x: number; y: number }>) => Math.min(...tr.map((q) => Math.hypot(q.x - 2.7, q.y)));
    expect(near(await run('1', cutBend))).toBeLessThan(0.7);
  });
});
