/** LEAD_READ (experimental, off): a lead puller reads the second-level
 * defender threatening the hole from his own picture instead of keeping the
 * backer named at the snap. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefSlot } from '../src/playbook/types.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Every man the I-formation power lead puller holds as his target in 4 s. */
async function targets(on: boolean, seed: number) {
  vi.stubEnv('LEAD_READ', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.i_pro_21;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'power' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
  sim.tick();
  const puller = sim.offense.find((o) => {
    const plan = (o.behavior as { plan?: { kind: string; pullRole?: string } }).plan;
    return plan?.kind === 'pull' && plan.pullRole === 'lead';
  })!;
  const plan = (puller.behavior as unknown as { plan: { target: { slot: string } | null } }).plan;
  const held = [plan.target!.slot];
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    if (plan.target && plan.target.slot !== held.at(-1)) held.push(plan.target.slot);
  }
  const depth = (slot: string) => sim.defAlign.spots[slot as DefSlot]!.pos.x - sim.los;
  return { held, depth };
}

describe('LEAD_READ', () => {
  it('off: the lead puller keeps the backer named at the snap', async () => {
    for (const seed of [5, 6]) expect((await targets(false, seed)).held).toHaveLength(1);
  });
  it('on: he changes to second-level defenders threatening the hole, never a lineman', async () => {
    for (const seed of [5, 6]) {
      const { held, depth } = await targets(true, seed);
      expect(held.length).toBeGreaterThan(1);
      for (const slot of held) expect(depth(slot)).toBeGreaterThanOrEqual(2);
    }
  });
});
