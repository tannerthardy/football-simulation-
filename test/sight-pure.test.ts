/** SIGHT_PURE: what a player saw at a past tick, and what he last saw, do not depend on who asked or when. Extra sight questions asked after every
 * tick's record, at delays the consumers do not use, must not change a play (docs/reviews/2026-11-16-sight-pure.md). With the flag off they do:
 * the memo kept a past tick's line of sight with the heights of the moment it was first asked, and the fall-back picture was whichever consumer's
 * last. The test runs a run and a pass play twice each. */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function play(extra: boolean, kind: 'run' | 'pass'): Promise<string> {
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'Pure O', 'PRO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Pure D', 'PRD', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: kind === 'run' ? { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' } : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'cf' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: 3 } as never);
  if (extra) {
    const record = sim.perception.record.bind(sim.perception); let asking = false;
    sim.perception.record = (...args: unknown[]) => {
      record(...args);
      if (asking || !(sim.t > 0.2)) return;
      asking = true;
      for (const o of sim.agents) for (const t of sim.agents) {
        if (o === t) continue;
        for (const d of [0.05, 0.2, 0.45]) {
          const seen = sim.perception.perceive(t.idx, d);
          sim.sighted(o, t, seen, false); sim.sighted(o, t, seen, true); sim.sighted(o, t, seen, true, true);
        }
      }
      asking = false;
    };
  }
  const r = sim.run();
  return JSON.stringify([r.outcome, +r.yards.toFixed(4), sim.agents.map((a: any) => [+a.pos.x.toFixed(4), +a.pos.y.toFixed(4)])]);
}

describe('SIGHT_PURE: query-order invariance', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  for (const kind of ['run', 'pass'] as const) {
    it(`a ${kind} play is the same with extra sight questions after every tick's record`, async () => {
      vi.stubEnv('SIGHT_PURE', '1'); vi.stubEnv('SIGHT_CARRIER', '1'); vi.stubEnv('SIGHT_COVER', '1'); vi.stubEnv('SIGHT_RECOG', '1'); vi.resetModules();
      expect(await play(true, kind)).toBe(await play(false, kind));
    }, 120000);
  }
  it('with the flag off the memo is still order-dependent (the finding this flag repairs)', async () => {
    vi.stubEnv('SIGHT_PURE', '0'); vi.stubEnv('SIGHT_CARRIER', '1'); vi.stubEnv('SIGHT_COVER', '1'); vi.stubEnv('SIGHT_RECOG', '1'); vi.resetModules();
    const same = (await play(true, 'run')) === (await play(false, 'run')) && (await play(true, 'pass')) === (await play(false, 'pass'));
    expect(same).toBe(false);
  }, 240000);
});
