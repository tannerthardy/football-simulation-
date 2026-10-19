/** FB_TRACK (experimental, off): an I-formation fullback leading from behind
 * the QB first flows flat to his lane, then turns up to his man, instead of
 * running up the QB's drop line. */
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

/** The fullback's offset from his stance at 0.6 s (lateral toward the run,
 * and upfield) and the closest QB-fullback distance to 1.2 s. */
async function fullback(on: boolean, run: string, flip: boolean) {
  vi.stubEnv('FB_TRACK', on ? '1' : '0');
  vi.stubEnv('UC_MESH', '1');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.i_pro_21;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Under' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const ps = RUN_BY_ID[run].direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  const fb = sim.slot('F')!, start = { ...fb.pos };
  let closest = Infinity, at06 = { lateral: 0, up: 0 };
  while (sim.phase === 'live' && sim.t < 1.2 - 1e-9) {
    sim.tick();
    closest = Math.min(closest, Math.hypot(fb.pos.x - sim.qb.pos.x, fb.pos.y - sim.qb.pos.y));
    if (Math.abs(sim.t - .6) < 1e-6) at06 = { lateral: (fb.pos.y - start.y) * ps, up: fb.pos.x - start.x };
  }
  return { ...at06, closest };
}

describe('FB_TRACK', () => {
  it.each([['duo', false], ['duo', true], ['iz_strong', false]] as const)(
    'flows flat to his lane and leaves the QB room, %s flip=%s', async (run, flip) => {
      const off = await fullback(false, run, flip), on = await fullback(true, run, flip);
      expect(on.lateral).toBeGreaterThan(.5);
      expect(on.lateral).toBeGreaterThan(off.lateral + .3);
      expect(on.up).toBeLessThan(off.up);
      expect(on.closest).toBeGreaterThan(off.closest);
    });
});
