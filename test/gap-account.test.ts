/** GAP_ACCOUNT: gap-scheme accounting by the written rules (the playbook
 * session's run-blocking assignment audit, same construction as
 * scripts/diag/run-plans.ts). Each case failed on the old planner: the power
 * puller idle vs Odd, the counter cutoff leaving the 5 technique in the
 * vacated gap, the fullback idle with a box man free. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(concept: string, front: string) {
  vi.stubEnv('GAP_ACCOUNT', '1');
  vi.stubEnv('OL_ALIGN', '1');
  vi.resetModules();
  const { HASH_LEFT_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { planRunBlocking } = await import('../src/sim/behaviors/blocking.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const rng = new Rng(3);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.55 });
  const formation = FORMATION_BY_ID.i_pro_21, f = FRONT_BY_ID[front], personnel = f.personnel[0];
  const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel, front: f, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: rng.nextU32() });
  const out = planRunBlocking(sim, RUN_BY_ID[concept]);
  const ps = Math.sign([...out.values()].find((p) => p.pullRole === 'kick' || p.pullRole === 'trap')!.target!.pos.y - sim.ballY);
  const by = (slot: string) => [...out].find(([a]) => a.slot === slot)?.[1];
  const rel = (y: number) => (y - sim.ballY) * ps;
  return { by, rel };
}

describe('gap-scheme accounting (GAP_ACCOUNT)', () => {
  it('power vs Odd: the lead puller wraps for a playside backer instead of idling', async () => {
    const { by, rel } = await plans('power', 'odd');
    const lead = by('LG')!;
    expect(lead.pullRole).toBe('lead');
    expect(lead.target).toBeTruthy();
    expect(rel(lead.target!.pos.y)).toBeGreaterThan(0);
  }, 60000);

  it('power vs Under: the puller takes the playside backer, the double the backside one', async () => {
    const { by, rel } = await plans('power', 'under');
    expect(rel(by('LG')!.target!.pos.y)).toBeGreaterThan(0);
    const double = [by('Y'), by('RT'), by('RG')].find((p) => p?.combination?.backer)!;
    expect(rel(double.combination!.backer!.pos.y)).toBeLessThan(0);
  }, 60000);

  it('counter vs Under: the backside cutoff takes the man in the vacated gap; the fullback the edge', async () => {
    const { by } = await plans('counter', 'under');
    expect(by('Y')!.target!.slot).toBe('DE_S');
    expect(by('F')!.target?.slot).toBe('LB_S');
  }, 60000);

  it('trap vs Odd: the fullback takes the unblocked backside end', async () => {
    const { by } = await plans('trap', 'odd');
    expect(by('F')!.target?.slot).toBe('DE_W');
  }, 60000);
});
