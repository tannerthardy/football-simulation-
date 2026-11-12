/** MATCH_SQUEEZE (defense.ts ManCoverage cushion; experimental, off): an underneath match defender inside a zone call
 * whose own picture shows deep help over his receiver keeps only a bodies-plus-reach cushion over a released receiver,
 * so a settled route finds him on it. His picture can be wrong: help that rotates away after he squeezes leaves him
 * beaten over the top by a stop-and-go. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Run = { overAtSettle: number; pastAfterGo: number };

/** A receiver on a slow stem (2.5 yd/s, as the settled routes in play) who climbs to ~5 yd, settles for `settle` s, then (optionally) goes vertical. The defender is an
 * underneath match job on him in a Cover 4 match call. `help`: where his picture puts a deep teammate. */
async function play(flag: string, help: 'over' | 'none' | 'leaves', go: boolean): Promise<Run> {
  vi.resetModules();
  vi.stubEnv('MATCH_SQUEEZE', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { ManCoverage } = await import('../src/sim/behaviors/defense.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'Sq O', 'SQO', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(92), 'Sq D', 'SQD', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'sq' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, zoneStyle: 'match', label: 'sq' },
    los: 40, ballY: 26, firstDownX: 50, seed: 4 });
  sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  const R = sim.offense.find(o => o.slot !== 'QB' && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot))!;
  const a = sim.defense.find(d => /^(LB|NB)/.test(d.slot))!;
  const helper = sim.defense.find(d => d !== a && /^(S|FS|SS)/.test(d.slot))!;
  // Start the pair: receiver at the line, the defender 4 yd off him, inside.
  R.pos.x = 40.5; R.pos.y = 20; a.pos.x = 45; a.pos.y = 21;
  a.behavior = new ManCoverage(a, sim, R, false, 'B' as never, 1, {});
  // The receiver: climb at 2.5 yd/s to ~5 yd, settle, then (go) burst vertical.
  let settledAt = -1, goAt = -1;
  R.behavior = { kind: 'route', update: () => {
    const depth = R.pos.x - 40;
    if (settledAt < 0 && depth >= 5) settledAt = sim.t;
    if (settledAt < 0) return { vel: { x: 2.5, y: 0 } };
    if (!go || sim.t - settledAt < 0.8) return { vel: { x: 0, y: 0 } };
    if (goAt < 0) goAt = sim.t;
    return { vel: { x: R.profile.vmax, y: 0 } };
  } } as never;
  // His picture of the deep teammate.
  const see = sim.see.bind(sim);
  sim.see = (who, t, d) => {
    const s = see(who, t, d);
    if (who !== a || t === a || t.team !== a.team) return s;
    const there = help === 'over' || (help === 'leaves' && (settledAt < 0 || sim.t - settledAt < 0.5));
    // One deep teammate over the receiver, or (none / gone) no teammate anywhere deep of him.
    if (t === helper && there) return { ...s, pos: { x: 58, y: R.pos.y } };
    return { ...s, pos: { x: 38, y: 50 } };
  };
  let overAtSettle = NaN, pastAfterGo = NaN;
  while (sim.t < 6) {
    sim.tick();
    if (settledAt >= 0 && Number.isNaN(overAtSettle) && sim.t - settledAt >= 0.7) { overAtSettle = a.pos.x - R.pos.x;}
    if (goAt >= 0 && sim.t - goAt >= 1.0) { pastAfterGo = R.pos.x - a.pos.x; break; }
    if (!go && !Number.isNaN(overAtSettle)) break;
  }
  return { overAtSettle, pastAfterGo };
}

describe('MATCH_SQUEEZE: an underneath match defender with deep help sits on a settled route', () => {
  it('off he holds the burst cushion over a settled receiver; on, with help in his picture, he is on the route', async () => {
    const off = await play('0', 'over', false), on = await play('1', 'over', false);
    expect(off.overAtSettle).toBeGreaterThan(on.overAtSettle + 0.7);
    expect(on.overAtSettle).toBeLessThan(1.6);
  }, 60_000);
  it('with no help in his picture he keeps the burst cushion', async () => {
    const none = await play('1', 'none', false), off = await play('0', 'none', false);
    expect(Math.abs(none.overAtSettle - off.overAtSettle)).toBeLessThan(0.3);
  }, 60_000);
  it('help that leaves his picture after he squeezes: the stop-and-go beats him over the top, by more than off', async () => {
    const on = await play('1', 'leaves', true), off = await play('0', 'leaves', true);
    expect(on.pastAfterGo).toBeGreaterThan(off.pastAfterGo);
  }, 60_000);
});
