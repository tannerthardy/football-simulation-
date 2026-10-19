/** QB_CARRYOUT (experimental, off): after the handoff the QB carries out his
 * fake away from the play side, whichever side of his own mesh spot he ended
 * on. Requests only. */
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

/** Run to the handoff, stage the QB `drift` yd play side of his mesh spot,
 * and return his carry-out request across the field, play side +. */
async function carryOut(on: boolean, run: string, drift: number, flip: boolean) {
  vi.stubEnv('QB_CARRYOUT', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.i_pro_21;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Under' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const ps = RUN_BY_ID[run].direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  while (sim.phase === 'live' && sim.carrier === sim.qb && sim.t < 4) sim.tick();
  expect(sim.carrier).not.toBe(sim.qb);
  const qb = sim.qb, mesh = (qb.behavior as unknown as { mesh: { x: number; y: number } }).mesh;
  qb.body.pos = { x: qb.pos.x, y: mesh.y + ps * drift };
  return qb.behavior.update(qb, sim).vel.y * ps;
}

describe('QB_CARRYOUT', () => {
  it.each([['duo', false], ['duo', true], ['power', false], ['power', true]] as const)(
    'carries out away from the play even after drifting play side of the mesh, %s flip=%s', async (run, flip) => {
      expect(await carryOut(false, run, .3, flip)).toBeGreaterThan(0);
      expect(await carryOut(true, run, .3, flip)).toBeLessThan(0);
      expect(await carryOut(true, run, -.3, flip)).toBeLessThan(0);
    });
});
