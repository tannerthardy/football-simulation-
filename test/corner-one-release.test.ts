/**
 * The match corner's "In"/"Under" release of #1 (MOD Quarters, Cover 3
 * match). He owns every route by #1 whose stem clears the ~5-yd no-cover
 * zone; he zones off only when #1 declares shallow (HNFL-079; Michigan DB
 * "man any vertical stem by #1 past 5 yards"; Saban's Under call inside the
 * first five yards). A short stop zones him off only until #1 turns upfield.
 * Film: data/reviews/current/corner-one-release.json.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ROUTES } from '../src/playbook/routes.js';
import type { PassConcept } from '../src/playbook/types.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

// Lab routes for #1, not installed. The stop is a one-yard settle at the same
// depth: the route controller skips a waypoint behind the receiver.
ROUTES.lab_curl7 = { id: 'lab_curl7', family: 'intermediate', depth: 7, end: 'settle', points: [{ d: 7, l: 0, s: 0.2 }, { d: 6.5, l: -1, s: 0 }] };
ROUTES.lab_stop_go = { id: 'lab_stop_go', family: 'deep', depth: 20, end: 'continue', points: [{ d: 6.5, l: 0, s: 0.1 }, { d: 6.5, l: 1, s: 0 }, { d: 50, l: 1.5 }] };

const offense = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });

/** #1 on `side` runs `route`; both #2s run hitches so no #2 vertical pulls the corner. */
function run(coverage: string, route: string, side: 'S' | 'W', until = 3.8) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const strong: Record<number, string> = { 1: 'go', 2: 'hitch' };
  const weak: Record<number, string> = { 1: 'go', 2: 'hitch' };
  (side === 'W' ? weak : strong)[1] = route;
  const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong, weak, back: 'block', progression: ['S1'], beats: [] };
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle: 'match', label: 'lab', checkPick: 0 },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5,
  });
  sim.throwBall = () => undefined;
  const step = sim as unknown as { tick(): void };
  const cb = sim.slot(`CB_${side}`)!;
  const b = cb.behavior as CoverageDefender;
  const one = sim.slot(sim.offAlign.numbering[`${side}1`]!)!;
  let zoned = false;
  while (sim.phase === 'live' && sim.t < until && sim.throwAt < 0) {
    step.tick();
    zoned ||= b.recordedRule(sim.t).mode === 'zoned';
  }
  return { jobs: b.history.map(h => h.job), zoned, one: one.slot };
}

describe('match corner releases #1 only on a declared shallow route', () => {
  for (const coverage of ['cover4', 'cover3_match'])
    for (const side of ['W', 'S'] as const) {
      it(`${coverage} ${side}: carries #1 on a 7-yd curl`, () => {
        const { jobs, zoned, one } = run(coverage, 'lab_curl7', side);
        expect(zoned).toBe(false);
        // After the snap every job is on #1: man, then squeezing his curl.
        expect(jobs.slice(1).every(j => j.endsWith(`:${one}`))).toBe(true);
      });

      it(`${coverage} ${side}: carries #1 through a 6.5-yd stop and up the field`, () => {
        const { jobs, zoned, one } = run(coverage, 'lab_stop_go', side);
        expect(zoned).toBe(false);
        expect(jobs.slice(1).some(j => j.startsWith('zone:'))).toBe(false);
        expect(jobs[jobs.length - 1]).toBe(`man:${one}`);
      });

      it(`${coverage} ${side}: zones off #1's flat release`, () => {
        const { jobs, zoned } = run(coverage, 'flat', side, 2);
        expect(zoned).toBe(true);
        expect(jobs.slice(1)).toContain(jobs[0]);
      });
    }

  it('a stop inside the no-cover zone zones him off only until #1 turns upfield', () => {
    const { sim } = (() => {
      const formation = FORMATION_BY_ID.gun_doubles_11;
      const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong: { 1: 'go' }, weak: { 1: 'go' }, back: 'block', progression: ['S1'], beats: [] };
      return { sim: new PlaySim({
        offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
        offCall: { formation, flip: false, kind: 'pass', pass: concept, label: 'lab' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, zoneStyle: 'match', label: 'lab', checkPick: 0 },
        los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5,
      }) };
    })();
    const a = sim.slot('CB_W')!, b = a.behavior as CoverageDefender;
    const one = sim.slot(sim.offAlign.numbering.W1!)!;
    const pictures = new Map<number, Perceived>(sim.agents.map(r => [r.idx, { pos: { x: sim.los - 3, y: r.pos.y },
      vel: { x: 0, y: 0 }, facing: 0, stance: null, pose: 'up', carrying: false, age: .2 }]));
    sim.see = (_observer, target) => pictures.get(target.idx)!;
    a.recog!.read = 'pass';
    const show = (depth: number, vx: number, from: number, to: number) => {
      pictures.set(one.idx, { ...pictures.get(one.idx)!, pos: { x: sim.los + depth, y: one.pos.y }, vel: { x: vx, y: 0 } });
      for (let t = from; t <= to + 1e-9; t += .05) { sim.t = t; b.update(a, sim); }
    };
    // Stem to 4 yd and sit: he has not cleared the no-cover zone.
    show(4, 0, 1.2, 1.6);
    expect(b.recordedRule(sim.t).reads.find(r => r.target === one.idx)?.release).toBe('stop');
    expect(b.job.startsWith('man:')).toBe(false);
    expect(b.recordedRule(sim.t).mode).not.toBe('zoned');
    // Then he goes: the corner is back on him.
    show(5, 6, 1.65, 2.0);
    expect(b.job).toBe(`man:${one.slot}`);
  });
});
