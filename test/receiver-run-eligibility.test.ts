import { readFileSync } from 'node:fs';
import { vi, describe, expect, it } from 'vitest';
// Recorded on the installed flat line (1.3 yd splits, 0.55 yd depth): its
// saved geometry, landmarks and plans are that line's. The tracked line
// (OL_ALIGN, docs/reviews/presnap.md) moves every body; pin it off here.
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { planRunBlocking } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const saved = JSON.parse(readFileSync(new URL('./fixtures/receiver-run-assignment-g1-p018.json', import.meta.url), 'utf8'));
function fixture(mirror = false) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_bunch_11, flip: mirror ? !saved.installationFlip : saved.installationFlip,
      kind: 'run', run: RUN_BY_ID.oz_strong, label: 'outside zone' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover0,
      pressure: PRESSURE_BY_ID.zero_6, label: 'press' }, los: saved.los, ballY: saved.ballY, firstDownX: 55, seed: 3, audibles: false });
  for (const a of sim.agents) {
    const [x, y] = saved.positions[a.slot]; a.body.pos = { x, y: mirror ? 2 * saved.ballY - y : y };
  }
  return sim;
}

describe('receiver run candidates follow actual installed ownership', () => {
  it.each([false, true])('keeps the nearby unowned press threats eligible in saved G1-P018 geometry (mirror=%s)', mirror => {
    const sim = fixture(mirror), plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
    const stalks = [...plans.values()].filter(p => p.kind === 'stalk');
    expect(stalks.map(p => p.target)).toContain(sim.slot('CB_S'));
    expect(stalks.map(p => p.target)).toContain(sim.slot('NB'));
    expect(new Set(stalks.map(p => p.target)).size).toBe(stalks.length);
    // Preserve the actual end threat responsible for the saved runner contact.
    expect(plans.get(sim.slot('RT')!)?.target).toBe(sim.slot('DE_S'));
    expect(plans.get(sim.slot('LG')!)?.climbTo).toBe(sim.slot('LB_M'));
  });

  it('does not let receivers steal a real inline down threat or an installed combo backer', () => {
    const sim = fixture(), plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
    const targets = [...plans.values()].filter(p => p.kind === 'stalk').map(p => p.target);
    for (const slot of ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'LB_M']) expect(targets).not.toContain(sim.slot(slot));
  });

  it.each(['counter', 'trap', 'power'])('keeps the %s reserved pull/kick targets out of receiver work', run => {
    const sim = fixture(), plans = planRunBlocking(sim, RUN_BY_ID[run]);
    const core = [...plans.values()].filter(p => p.kind !== 'stalk');
    const reserved = new Set(core.flatMap(p => [p.target, p.climbTo, p.combination?.backer]).filter(Boolean));
    const stalks = [...plans.values()].filter(p => p.kind === 'stalk');
    expect(core.some(p => p.kind === 'pull')).toBe(true);
    for (const p of stalks) expect(reserved.has(p.target)).toBe(false);
  });
});
