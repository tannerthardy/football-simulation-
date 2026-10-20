/** DL_FEEL (experimental, off): an engaged first-level defender's lateral
 * flow cue is the blocker's motion felt through the hands each tick while
 * touching; otherwise the visual sample is held for a decision beat. */
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

/** Movement records of stacked (first-level fit) run reps through 2 s of an outside zone. */
async function reps(on: boolean) {
  vi.stubEnv('DL_FEEL', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { runContactObservers } = await import('../src/sim/run-contact-observer.js');
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const out: { rep: object; t: number; touch: boolean; held: number; blocker: number }[] = [];
  runContactObservers.set(sim, (e, phase, data) => {
    if (phase !== 'movement' || data.heldFlow === undefined) return;
    out.push({ rep: e, t: sim.t, touch: !!(e.hands?.normalForce || e.hands?.tangentForce),
      held: data.heldFlow as number, blocker: (data.blockerVel as { y: number }).y });
  });
  while (sim.phase === 'live' && sim.t < 2) sim.tick();
  return out;
}

describe('DL_FEEL', () => {
  it('off: the flow cue is a held visual sample, not the live blocker motion', async () => {
    const r = await reps(false);
    expect(r.filter(x => x.touch).length).toBeGreaterThan(10);
    // Held for a decision beat: consecutive ticks share values far more often than the blocker's speed does.
    const last = new Map<object, number>();
    let same = 0, pairs = 0;
    for (const x of r) {
      if (last.has(x.rep)) { pairs++; if (last.get(x.rep) === x.held) same++; }
      last.set(x.rep, x.held);
    }
    expect(same).toBeGreaterThan(pairs / 2);
    expect(r.filter(x => x.touch && x.held !== x.blocker).length).toBeGreaterThan(0);
  });

  it('on: while touching, the cue is the blocker motion felt that tick', async () => {
    const r = await reps(true);
    const touching = r.filter(x => x.touch);
    expect(touching.length).toBeGreaterThan(10);
    for (const x of touching) expect(x.held).toBe(x.blocker);
  });
});
