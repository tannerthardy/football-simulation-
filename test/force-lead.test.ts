/** FORCE_LEAD (experimental, off): a force defender keeps leverage on the
 * runner's acquired lateral track rather than his current spot, so on a
 * stretch toward him he is wider outside the runner when the runner reaches
 * the line. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The playside force defender's lateral margin outside the carrier (yd) on
 * the first tick the carrier is past the line, for three outside-zone seeds. */
async function margins(on: boolean) {
  vi.stubEnv('FORCE_LEAD', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_12;
  const out: number[] = [];
  for (const seed of [5, 6, 7]) {
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz_strong' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    while (sim.phase === 'live' && sim.t < 5) {
      sim.tick();
      const c = sim.carrier;
      if (!c || c === sim.qb || c.pos.x < sim.los) continue;
      const side = Math.sign(c.pos.y - sim.ballY);
      const force = sim.defense.find((d) => d.runFit?.kind === 'force' && d.runFit.side === side)!;
      out.push((force.pos.y - c.pos.y) * side);
      break;
    }
  }
  return out;
}

describe('FORCE_LEAD', () => {
  it('on: the force defender is wider outside the stretch runner at the line', async () => {
    const off = await margins(false), on = await margins(true);
    expect(off).toHaveLength(3);
    expect(on).toHaveLength(3);
    const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    expect(mean(on)).toBeGreaterThan(mean(off) + .75);
    on.forEach((m, i) => expect(m).toBeGreaterThan(off[i]));
  });
});
