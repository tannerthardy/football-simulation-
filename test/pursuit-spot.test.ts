/** PURSUIT_SPOT (src/sim/behaviors/common.ts commitSpot; experimental, off; for TRACK_PURSUIT). A pursuer 5 yd from a
 * carrier running straight ahead at 7 yd/s holds the meeting spot he chose; when the carrier brakes to 3 yd/s (seen
 * through the tracked picture), the meeting comes sooner than the held spot and he must come off it and attack the
 * nearer meeting (Rules+Coaching's review case), not keep running at the old spot. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(spot: '0' | '1', brakeAt: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('PURSUIT_SPOT', spot);
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { pursuitPoint } = await import('../src/sim/behaviors/common.js');
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 30, ballY: CENTER_Y, firstDownX: 40, seed: 83 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  for (const a of sim.agents) if (a !== c && a !== d) { a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 }; }
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  // Carrier straight downfield at 7 yd/s; the pursuer 5 yd off his line, level with him, running 6 yd/s on a 45 deg angle.
  c.body.pos = { x: 40, y: CENTER_Y }; c.body.vel = { x: 7, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 40, y: CENTER_Y + 5 }; d.body.vel = { x: 4.2, y: -4.2 }; d.body.facing = -Math.PI / 4;
  const record = () => sim.perception.record(sim.agents.map((a: any) => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing, pose: a.pose })), c.idx);
  for (let k = 0; k < 24; k++) record();
  const aims: { t: number; x: number }[] = [];
  for (let k = 0; k < 30; k++) {
    sim.t = 2 + k * sim.dt; sim.world.time = sim.t;
    const sp = sim.t >= brakeAt ? Math.max(3, 7 - (sim.t - brakeAt) * 12) : 7;
    c.body.vel = { x: sp, y: 0 };
    c.body.pos = { x: c.body.pos.x + sp * sim.dt, y: c.body.pos.y };
    const p = pursuitPoint(sim, d, c);
    const v = { x: p.x - d.pos.x, y: p.y - d.pos.y }, n = Math.hypot(v.x, v.y) || 1;
    d.body.vel = { x: 6 * v.x / n, y: 6 * v.y / n };
    d.body.pos = { x: d.body.pos.x + d.body.vel.x * sim.dt, y: d.body.pos.y + d.body.vel.y * sim.dt };
    record();
    aims.push({ t: +sim.t.toFixed(2), x: p.x });
  }
  return aims;
}

describe('PURSUIT_SPOT: a braking carrier releases the held meeting spot', () => {
  it('after the carrier brakes, the held-spot aim converges to the re-solved meeting within 0.35 s (his tracked picture sees the brake about 0.1 s late)', async () => {
    const brakeAt = 2.4;
    const fresh = await scene('0', brakeAt), spot = await scene('1', brakeAt);
    const after = (aims: { t: number; x: number }[], dt: number) => aims.find(r => r.t >= brakeAt + dt)!;
    // Before braking both aim well downfield of the carrier's start.
    expect(fresh[0].x).toBeGreaterThan(41);
    // A held spot that never released would keep his aim at the pre-brake spot (as far downfield as before).
    const late = after(spot, 0.35), lateFresh = after(fresh, 0.35);
    if (process.env.SPOT_PRINT) console.log('SPOT', JSON.stringify({ spot, fresh }));
    expect(Math.abs(late.x - lateFresh.x)).toBeLessThan(0.75);
  }, 120_000);
});
