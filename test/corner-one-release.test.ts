/**
 * The match corner's "In"/"Under" release of #1 (MOD Quarters, Cover 3
 * match). He owns every route by #1 whose stem clears the ~5-yd no-cover
 * zone; he zones off only when #1 declares shallow (HNFL-079; Michigan DB
 * "man any vertical stem by #1 past 5 yards"; Saban's Under call inside the
 * first five yards). A short stop zones him off only until #1 turns upfield.
 * Film: node --import tsx scripts/corner-one-film.ts > out/corner-one-film.json
 */
import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.SET_SPOT = '0'; }); // engine-72: fixture recorded on the old pass set; the lane that owns it re-records with SET_SPOT on (docs/reviews/2026-11-16-pin-delta-engine72.md). engine-83's QB flags no longer pinned (Coverage, 2026-11-18): the QB holds the ball (below), so his throw timing cannot bring the arm through on a rep that asks about the route
import { CENTER_Y } from '../src/core/field.js';
// Registers the lab routes for #1 (lab_curl7, lab_stop_go, lab_out_up4).
import '../src/lab/coverage-scene.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { PassConcept } from '../src/playbook/types.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PassRusher } from '../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

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
  // The QB holds the ball: with engine-83's throw timing a stubbed throwBall still brings the arm through (a pump the
  // corner sees and plays); this rep asks about the route, so the QB stands with it.
  sim.qb.behavior = { kind: 'qb-hold', update: () => stand() } as never;
  // The out-and-up and stop-and-go turn upfield at 2.6-3.1 s; a four-man
  // rush can end the rep first, so the question is never asked. The
  // rushers hold their ground; `held` still asserts the ball was in the
  // quarterback's hands at the end, so a staging break fails as staging.
  for (const d of sim.defense) if (d.behavior instanceof PassRusher) d.behavior = { kind: 'stand', update: () => stand() };
  const step = sim as unknown as { tick(): void };
  const cb = sim.slot(`CB_${side}`)!;
  const b = cb.behavior as CoverageDefender;
  const one = sim.slot(sim.offAlign.numbering[`${side}1`]!)!;
  let zoned = false;
  while (sim.phase === 'live' && sim.t < until && sim.throwAt < 0) {
    step.tick();
    zoned ||= b.recordedRule(sim.t).mode === 'zoned';
  }
  const held = sim.phase === 'live' && sim.ball.kind === 'held' && sim.t >= until - 0.05;
  return { jobs: b.history.map(h => h.job), zoned, one: one.slot, held };
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
        const { jobs, zoned, one, held } = run(coverage, 'lab_stop_go', side);
        expect(held).toBe(true);
        expect(zoned).toBe(false);
        expect(jobs.slice(1).some(j => j.startsWith('zone:'))).toBe(false);
        expect(jobs[jobs.length - 1]).toBe(`man:${one}`);
      });

      it(`${coverage} ${side}: zones off #1's flat release`, () => {
        // An outside break leaves #1 in the corner's own area: zone off
        // while he is shallow, without committing (see the out-and-up).
        const { jobs } = run(coverage, 'flat', side, 2);
        expect(jobs.slice(1)).toContain(jobs[0]);
      });
    }

  for (const coverage of ['cover4', 'cover3_match'])
    it(`${coverage}: a short out that turns up the sideline gets the corner back on #1; a slant commits the zone-off`, () => {
      const outUp = run(coverage, 'lab_out_up4', 'W', 3.4);
      expect(outUp.held).toBe(true);
      // While #1 is shallow the corner is off him: back in his deep area, or
      // squeezing the out when no vertical threatens (the judgment's
      // squeeze-break, which the out-and-up exists to punish).
      expect(outUp.jobs.slice(1).some(j => j === outUp.jobs[0] || j === `rob:${outUp.one}`)).toBe(true);
      expect(outUp.zoned).toBe(false);
      expect(outUp.jobs.at(-1)).toBe(`man:${outUp.one}`);
      const slant = run(coverage, 'slant', 'W', 3.0);
      expect(slant.zoned).toBe(true);
      expect(slant.jobs.at(-1)).not.toBe(`man:${slant.one}`);
    });

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
