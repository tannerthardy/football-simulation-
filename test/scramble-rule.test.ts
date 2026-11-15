/** SCRAMBLE_RULE (src/sim/behaviors/receiver.ts; experimental, off): the receivers' coached scramble rules. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function rolled(on: boolean) {
  vi.stubEnv('SCRAMBLE_RULE', on ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'O', 'O'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'D', 'D'), 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl_flat' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'Over Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  // The quarterback holds the ball and rolls out to +y from 2.0 s; nobody throws.
  sim.throwBall = () => null as any;
  const rec = sim.offense.filter((o: any) => o.behavior.kind === 'route');
  // From 2.0 s he is carried out to +y at 6 yd/s (the body itself, so every picture of him sees it).
  while (sim.t < 3.4 && sim.phase === 'live') {
    sim.tick();
    if (sim.t >= 2.0) { const b: any = sim.qb.body; b.pos = { x: b.pos.x, y: b.pos.y + 0.3 }; b.vel = { x: 0, y: 6 }; }
  }
  return { sim, rec };
}

describe('SCRAMBLE_RULE', () => {
  it('the out-of-pocket test is the tackle box, by side', async () => {
    const { scrambleSeen } = await import('../src/sim/behaviors/receiver.js');
    expect(scrambleSeen({ x: 33, y: 26 }, 26)).toBe(0);
    expect(scrambleSeen({ x: 33, y: 31 }, 26)).toBe(1);
    expect(scrambleSeen({ x: 33, y: 20.5 }, 26)).toBe(-1);
  });
  it('on his own picture of the QB leaving, each receiver takes his rule; off, none does', async () => {
    const off = await rolled(false), on = await rolled(true);
    expect(off.rec.every((r: any) => r.behavior.scramble === null)).toBe(true);
    const rules = on.rec.map((r: any) => r.behavior.scramble).filter(Boolean);
    expect(rules.length).toBeGreaterThan(0);
    // Only while he is looking: a receiver who has not taken his rule has the QB outside what his shoulders and neck
    // bring into view.
    const { shouldersOf } = await import('../src/physics/kinematics.js');
    const { HEAD_CONE, neckRange } = await import('../src/sim/head.js');
    const { angleDiff } = await import('../src/core/vec.js');
    for (const r of on.rec.filter((x: any) => !x.behavior.scramble)) {
      const qb = on.sim.see(r, on.sim.qb).pos;
      expect(Math.abs(angleDiff(shouldersOf(r.body), Math.atan2(qb.y - r.pos.y, qb.x - r.pos.x)))).toBeGreaterThan(neckRange(r) + HEAD_CONE / 2);
    }
    for (const r of rules) {
      expect(r.side).toBe(1);
      // Short goes deep: an under-10 man on the scramble side climbs to 12 yd.
      if (r.role === 'up') expect(r.spot.x - on.sim.los).toBeGreaterThanOrEqual(10);
      // The backside comes across toward the quarterback, not past his line of travel.
      if (r.role === 'across') expect(r.spot.y).toBeLessThan(on.sim.qb.pos.y);
    }
  }, 120000);
});
