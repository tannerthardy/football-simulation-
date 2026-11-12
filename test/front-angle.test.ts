/** FRONT_ANGLE (common.ts pursuitPoint; experimental, off): a pursuer with the runner in front of him cuts off the
 * runner's best upfield line, inside-out, from his own picture of the runner, instead of meeting him along the
 * runner's current crossing heading. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Pic = { pos: { x: number; y: number }; vel: { x: number; y: number } };

async function aim(flag: string, runner: Pic, defender: { x: number; y: number }) {
  vi.resetModules();
  vi.stubEnv('FRONT_ANGLE', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { pursuitPoint } = await import('../src/sim/behaviors/common.js');
  const offense = generateTeam(new Rng(61), 'Angle offense', 'AGO', { strength: .55 });
  const defense = generateTeam(new Rng(62), 'Angle defense', 'AGD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'angle' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'spot', label: 'angle' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const carrier = sim.offense.find(o => o.slot !== 'QB' && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot))!;
  const a = sim.defense.find(d => /^(CB|S|FS|SS|LB|NB)/.test(d.slot))!;
  a.pos.x = defender.x; a.pos.y = defender.y; a.vel.x = 0; a.vel.y = 0;
  // What he sees of the runner (his own picture, whatever its delay).
  const see = sim.see.bind(sim);
  sim.see = (who, t, delay) => t === carrier ? { ...see(who, t, delay), pos: { ...runner.pos }, vel: { ...runner.vel } } : see(who, t, delay);
  return pursuitPoint(sim, a, carrier);
}

// Offense attacks +x. A catcher 5 yd past the line crossing toward the sideline at 6 yd/s, slowly upfield.
const crossing: Pic = { pos: { x: 45, y: 26 }, vel: { x: 0.8, y: -6 } };
const inFront = { x: 52, y: 20 };

describe('FRONT_ANGLE: a pursuer with the runner in front of him cuts off his upfield line', () => {
  it('off: he meets the crossing runner along his heading; on: he aims nearer the runner\'s upfield line, further up his field', async () => {
    const off = await aim('0', crossing, inFront), on = await aim('1', crossing, inFront);
    // Lateral distance from the runner's seen position to the aim point: off follows the crossing far to the side.
    expect(Math.abs(on.y - crossing.pos.y)).toBeLessThan(Math.abs(off.y - crossing.pos.y));
    // Off meets him along his crossing line (barely upfield of the runner); on aims up his field, ahead of him.
    expect(on.x).toBeGreaterThan(off.x);
  });
  it('the aim follows what he sees: a runner crossing the other way pulls it to that side', async () => {
    const left = await aim('1', crossing, inFront);
    const right = await aim('1', { pos: crossing.pos, vel: { x: 0.8, y: 6 } }, inFront);
    expect(Math.sign(left.y - crossing.pos.y)).toBe(-1);
    expect(Math.sign(right.y - crossing.pos.y)).toBe(1);
  });
  it('a pursuer who does not have the runner in front of him is unchanged', async () => {
    const behind = { x: 42, y: 20 };
    const off = await aim('0', crossing, behind), on = await aim('1', crossing, behind);
    expect(on.x).toBeCloseTo(off.x, 6);
    expect(on.y).toBeCloseTo(off.y, 6);
  });
});
