/** TRAP_READ (experimental, off): an interior defender meets an arriving
 * trapper at the trapper's depth instead of waiting for him at his gap
 * landmark on the line. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// These witnesses predate the under-center exchange package (UC_MESH
// MESH_TEMPO QB_CARRYOUT PACE_LEAD) and are timed on the installed exchange;
// pin it off here. test/run-game-flags.test.ts covers the package itself.
vi.hoisted(() => { for (const k of ['UC_MESH', 'MESH_TEMPO', 'QB_CARRYOUT', 'PACE_LEAD']) process.env[k] = '0'; });
// Recorded before SNAP_REACT (on in the pinned profile) changed every
// player's start; the trace stays on the fixed get-off.
vi.hoisted(() => { process.env.SNAP_REACT = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The trapped tackle's reads of the trapper and his shallowest depth past
 * the line (negative: in the backfield) before the trapper engages. */
async function trapped(on: boolean, seed: number) {
  vi.stubEnv('TRAP_READ', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.i_pro_21;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.trap, label: 'trap' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
  sim.tick();
  const trapper = sim.offense.find((o) => (o.behavior as { plan?: { pullRole?: string } }).plan?.pullRole === 'trap')!;
  const tackle = (trapper.behavior as unknown as { plan: { target: Agent } }).plan.target;
  let reads = 0, least = Infinity;
  while (sim.phase === 'live' && sim.t < 3 && !trapper.engagement) {
    tackle.tags.delete('fit-trap');
    sim.tick();
    if (tackle.tags.has('fit-trap')) reads++;
    least = Math.min(least, tackle.pos.x - sim.los);
  }
  return { reads, least, met: !!trapper.engagement };
}

describe('TRAP_READ', () => {
  it.each([5, 6, 7])('on: the tackle meets the trapper in the backfield, not on his landmark (seed %s)', async (seed) => {
    const off = await trapped(false, seed), on = await trapped(true, seed);
    expect(off.met && on.met).toBe(true);
    expect(off.reads).toBe(0);
    expect(off.least).toBeGreaterThan(.2);
    expect(on.reads).toBeGreaterThan(0);
    expect(on.least).toBeLessThan(off.least - .2);
  });
});
