/** ARRIVE_LEAD (defense.ts; experimental, off): on a short completion the nearest underneath zone defender, who
 * cannot beat the ball to the catch, drives to the catcher's upfield shoulder. Measured in live plays (curl/flat,
 * slant/flat and stick against spot Cover 3): at the catch his line of travel crosses the catcher's lateral line
 * further upfield of the catcher. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plays(flag: string) {
  vi.resetModules();
  vi.stubEnv('ARRIVE_LEAD', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(51), 'Lead offense', 'LDO', { strength: .55 });
  const defense = generateTeam(new Rng(52), 'Lead defense', 'LDD', { strength: .55 });
  const angles: number[] = [];
  for (const concept of ['curl_flat', 'slant_flat', 'stick'] as const) for (let seed = 1; seed <= 12; seed++) {
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: 'lead' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, zoneStyle: 'spot', label: 'lead' }, los: 40, ballY: 26, firstDownX: 50, seed });
    let thrown = false, caught: { c: { pos: { x: number; y: number } }; d: { idx: number; vel: { x: number; y: number }; pos: { x: number; y: number } }; t: number } | null = null;
    while (sim.t < 5) {
      sim.tick();
      const air = sim.ball.kind === 'air';
      if (air) thrown = true;
      else if (thrown && !caught && sim.ball.kind === 'held' && sim.ball.carrier !== sim.qb && sim.ball.carrier.team !== sim.defense[0].team) {
        const c = sim.ball.carrier;
        if (c.pos.x - sim.los > 10) break;
        const d = sim.defense.filter(x => x.behavior instanceof ZoneCoverage && !(x.behavior as { plastersScramble?: boolean }).plastersScramble)
          .sort((p, q) => Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) - Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y))[0];
        if (!d || Math.hypot(d.vel.x, d.vel.y) < 1) break;
        caught = { c, d: { idx: d.idx, vel: { ...d.vel }, pos: { ...d.pos } }, t: sim.t };

        const { vel, pos } = caught.d;
        // Where his line of travel crosses the catcher's lateral line, yd upfield of the catcher.
        if (Math.abs(vel.y) > 0.3 && (c.pos.y - pos.y) * vel.y > 0) angles.push(pos.x + vel.x * (c.pos.y - pos.y) / vel.y - c.pos.x);
        break;
      } else if (thrown && !air && !caught) break;
    }
  }
  return angles;
}

describe('ARRIVE_LEAD: an underneath zone defender leads the catcher on a short throw', () => {
  it('at the catch his line of travel crosses the catcher further upfield', async () => {
    const off = await plays('0'), on = await plays('1');
    const median = (v: number[]) => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)];
    expect(off.length).toBeGreaterThan(5);
    expect(on.length).toBeGreaterThan(5);
    expect(median(on)).toBeGreaterThan(median(off) + 0.3);
  }, 120_000);
});
