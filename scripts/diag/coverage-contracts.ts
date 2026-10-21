/** Actual rule/key/ownership diagnostics; no extra perceptions or decisions.
 * node --import tsx scripts/diag/coverage-contracts.ts [out/coverage-contracts.json] [fixture-id]
 * Eight controlled lab fixtures, not a league/NFL sample or a coverage grade.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y, END_LINE_X } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { DefSlot } from '../../src/playbook/types.js';
import type { Agent } from '../../src/sim/agent.js';
import { ManCoverage, ZoneCoverage } from '../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const fixtures = [
  { id: 'zero-mesh', concept: 'mesh', coverage: 'cover0', formation: 'gun_doubles_11', seed: 15, los: 40 },
  { id: 'one-mesh', concept: 'mesh', coverage: 'cover1', formation: 'gun_doubles_11', seed: 15, los: 40 },
  { id: 'palms-stick', concept: 'stick', coverage: 'cover4_palms', formation: 'gun_doubles_11', seed: 11, los: 40 },
  { id: 'palms-verticals', concept: 'four_verts', coverage: 'cover4_palms', formation: 'gun_doubles_11', seed: 5, los: 40 },
  { id: 'poach-trips', concept: 'four_verts', coverage: 'cover4_poach', formation: 'gun_trips_11', seed: 9, los: 40 },
  { id: 'red-zone-smash', concept: 'smash', coverage: 'cover2_match', formation: 'gun_doubles_11', seed: 13, los: 104 },
  { id: 'spill-outside-zone', concept: 'oz_strong', coverage: 'cover3', formation: 'gun_trey_11', seed: 7, los: 40 },
  { id: 'quarters-split-zone', concept: 'split_zone', coverage: 'cover4', formation: 'gun_wing_12', seed: 11, los: 40 },
] as const;
const out = process.argv[2] ?? 'out/coverage-contracts.json';
const selected = process.argv[3] ? fixtures.filter(f => f.id === process.argv[3]) : fixtures;
if (process.argv.length > 4 || !selected.length) throw new Error('Usage: coverage-contracts.ts [output.json] [fixture-id]');
const source = sourceVersion();
const offense = generateTeam(new Rng(21), 'Lab Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Lab Defense', 'DEF', { strength: 0.6 });

function defenderState(a: Agent, sim: PlaySim, readTick: number) {
  const b = a.behavior;
  const target = b instanceof CoverageDefender || b instanceof ManCoverage || b instanceof ZoneCoverage ? b.target : null;
  const landmark = b instanceof CoverageDefender ? b.recordedLandmark() : b instanceof ZoneCoverage ? b.recordedLandmark() : undefined;
  return { slot: a.slot, index: a.idx, kind: b.kind,
    job: b instanceof CoverageDefender ? b.job : b instanceof ManCoverage ? `man:${b.target.slot}` : b instanceof ZoneCoverage ? `zone:${b.zone}` : b.kind,
    target: target?.idx ?? null, position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing,
    intent: sim.intents[a.idx] ? { velocity: { ...sim.intents[a.idx].vel }, facing: sim.intents[a.idx].facing } : null,
    landmark, recognition: a.recog?.read ?? null, runFit: a.runFit ? { ...a.runFit } : null,
    man: b instanceof CoverageDefender ? b.recordedMan() : b instanceof ManCoverage ? b.recordedTechnique() : undefined,
    rule: b instanceof CoverageDefender ? b.recordedRule(readTick) : null };
}
type State = ReturnType<typeof defenderState>;
interface Finding { t: number; code: string; defender?: string; receiver?: string; detail: string }

const reports = selected.map(f => {
  const form = FORMATION_BY_ID[f.formation];
  const run = RUN_BY_ID[f.concept];
  const sim = new PlaySim({ offense: pickOffense(offense, form.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: form, flip: false, kind: run ? 'run' : 'pass', run, pass: run ? undefined : PASS_BY_ID[f.concept], label: f.concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[f.coverage],
      shown: COVERAGE_BY_ID.cover2, pressure: null, zoneStyle: 'match',
      runPolicy: { edge: 'spill', linebacker: 'stack' }, label: f.coverage },
    los: f.los, ballY: CENTER_Y, firstDownX: Math.min(110, f.los + 10), seed: f.seed,
    record: false, substeps: 12 });
  const eligible = sim.offense.filter(a => sim.offAlign.refOf[a.slot as keyof typeof sim.offAlign.refOf]);
  const initial = sim.defense.map(a => defenderState(a, sim, 0));
  const violations: Finding[] = [];
  const observations: Finding[] = [];
  const seen = new Set<string>();
  const observe = (finding: Finding, exact: boolean) => {
    const key = `${exact}:${finding.code}:${finding.defender ?? ''}:${finding.receiver ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key); (exact ? violations : observations).push(finding);
  };
  const relations = (states: State[]) => eligible.map(r => ({ receiver: r.slot, index: r.idx,
    direct: states.filter(d => d.target === r.idx && /^(man|wall|trap|rob):/.test(d.job))
      .map(d => ({ defender: d.slot, job: d.job })),
    selectedZone: states.filter(d => d.target === r.idx && d.job.startsWith('zone:')).map(d => d.slot) }));
  const inspect = (states: State[], t: number, atSnap: boolean) => {
    if (sim.defCall.coverage.man && (atSnap || (sim.isPass && sim.throwAt < 0 && !sim.scrambled && sim.ball.kind === 'held'))) {
      for (const r of eligible) {
        if (!states.some(d => d.target === r.idx && d.job.startsWith('man:'))) observe({ t, code: 'man-marker-missing', receiver: r.slot,
          detail: 'The effective pure-man call has no current man relationship to this eligible. This checks assignment existence, not movement execution.' }, true);
      }
    }
    for (const d of states) {
      if (d.job.startsWith('man:') && !eligible.some(r => r.idx === d.target)) observe({ t, code: 'man-target-ineligible', defender: d.slot,
        detail: `Man target index ${d.target} is outside the eligible receiver inventory.` }, true);
      if (d.landmark && d.landmark.x > END_LINE_X) observe({ t, code: 'zone-landmark-beyond-end-line', defender: d.slot,
        detail: `The actual zone destination is x=${d.landmark.x}; the end line is x=${END_LINE_X}. This is a destination check, not a momentum penalty.` }, true);
      const fit = d.runFit;
      if (atSnap && fit?.kind === 'edge' && fit.edge === 'spill') {
        const partner = states.find(p => p.slot === fit.partner);
        if (!partner || partner.runFit?.kind !== 'force' || partner.runFit.side !== fit.side) observe({ t, code: 'spill-without-force-partner', defender: d.slot,
          detail: `Called spill references ${fit.partner ?? 'no partner'} without a same-side force contract.` }, true);
        else if ((partner.position.y - d.position.y) * fit.side < 0.2) observe({ t, code: 'spill-partner-not-outside-at-snap', defender: d.slot,
          detail: 'The designated force partner is less than the existing buildRunFits 0.2 yd outside-support allowance at snap.' }, true);
      }
      if (fit?.kind === 'force' && sim.carrier && sim.carrier !== sim.qb && sim.catchAt < 0 && /^(man|wall|trap|rob):/.test(d.job)) observe({ t,
        code: 'force-with-route-relationship', defender: d.slot,
        detail: `Nominal force still carries recorded ${d.job}, with recognition=${d.recognition}. A persistent job label does not prove the movement controller is still covering; inspect its intent.` }, false);
    }
    if (!atSnap && sim.isPass && sim.throwAt < 0) {
      const graph = relations(states);
      for (const r of graph) {
        const previous = previousRelations.find(p => p.index === r.index);
        if (previous?.direct.length && !r.direct.length) observe({ t, code: 'direct-relationship-ended', receiver: r.receiver,
          detail: `Previous ${previous.direct.map(p => `${p.defender}=${p.job}`).join(', ')}; no current man/wall/trap/rob edge. Zone/help may still account for the route: this is a handoff inspection point, not a bust verdict.` }, false);
        if (r.direct.length > 1 && graph.some(p => !p.direct.length)) observe({ t, code: 'overlap-with-directly-unowned-route', receiver: r.receiver,
          detail: `${r.direct.map(p => `${p.defender}=${p.job}`).join(', ')} overlap while another eligible has no direct edge. Brackets, walls, overlap and zone spacing can make this intentional.` }, false);
      }
    }
  };
  let previousRelations = relations(initial);
  inspect(initial, 0, true);
  let previous = new Map(initial.map(s => [s.index, s]));
  const transitions: Array<{ t: number; defender: string; stateChanged: boolean;
    declarationChanges: NonNullable<State['rule']>['reads'];
    before: { job: string; mode: string | null; cut: number | null }; after: State }> = [];
  let transitionCount = 0;
  const key = (s: State) => JSON.stringify([s.job, s.rule?.mode, s.rule?.cut, s.rule?.judgment, s.man?.hipsOpen, s.man?.routeRead]);
  const lastDeclarations = new Map<number, Map<number, string>>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const t = sim.t;
    tick();
    const states = sim.defense.map(a => defenderState(a, sim, t));
    // Initial ownership is captured separately. Catch/interception/loose-ball
    // controller replacements are ball transitions, not coverage contract failures.
    if (sim.catchAt < 0 && sim.ball.kind !== 'loose') inspect(states, t, false);
    for (const after of states) {
      const before = previous.get(after.index)!;
      const declarations = lastDeclarations.get(after.index) ?? new Map<number, string>();
      lastDeclarations.set(after.index, declarations);
      const declarationChanges = (after.rule?.reads ?? []).filter(r => {
        const signature = JSON.stringify([r.release, r.first, r.climbed]);
        const changed = declarations.get(r.target) !== signature;
        declarations.set(r.target, signature);
        return changed;
      });
      const stateChanged = key(after) !== key(before);
      if (!stateChanged && !declarationChanges.length) continue;
      transitionCount++;
      if (transitions.length < 100) transitions.push({ t, defender: after.slot, stateChanged, declarationChanges,
        before: { job: before.job, mode: before.rule?.mode ?? null, cut: before.rule?.cut ?? null }, after });
    }
    previousRelations = relations(states);
    previous = new Map(states.map(s => [s.index, s]));
  };
  const result = sim.run();
  return { fixture: f, effectiveCoverage: sim.defCall.coverage.id, shownCoverage: sim.defCall.shown?.id,
    inventory: { numbering: sim.offAlign.numbering, eligibles: eligible.map(r => ({ slot: r.slot, index: r.idx })),
      defenders: sim.defense.map(a => ({ slot: a.slot, index: a.idx, role: sim.defAlign.spots[a.slot as DefSlot]!.role })) },
    initial, initialRelations: relations(initial), firstInvalid: violations[0] ?? null, violations,
    firstInspectionPoint: observations[0] ?? null, observations, transitionCount,
    omittedTransitions: transitionCount - transitions.length, transitions,
    outcome: { kind: result.kind, outcome: result.outcome, yards: result.yards, duration: result.duration, stats: result.stats },
    events: result.events.filter(e => ['snap', 'read', 'handoff', 'throw', 'catch', 'interception', 'scramble', 'holding', 'dpi'].includes(e.type)) };
});
if (sourceVersion() !== source) throw new Error('Engine source changed during the lab; rerun before using this evidence');
const data = { sourceSha256: source, cohort: { type: 'controlled lab', offenseRosterSeed: 21, defenseRosterSeed: 22,
  strength: 0.6, substeps: 12, fixtureCount: reports.length, fixtureSeeds: selected.map(f => f.seed) },
  definitions: {
    invalid: 'Exact narrow implemented contracts only: eligible marker existence in pure man, eligible target, zone destination within end line, called spill with same-side outside force partner at snap.',
    inspectionPoint: 'Descriptive direct relationship/overlap/support transitions. Zone, help, bracket and intended release can explain them; no bust classification.',
    readTick: 'Controller boundary at 20 Hz, before PlaySim increments time. Declared receiver keys are copied only from that tick\u0027s actual ReleaseReader cache; no new observations.',
    directOwnership: 'Recorded man/wall/trap/rob target relationships, not complete coverage influence. Selected zone targets are separate. No communication/acknowledgment model exists here.',
    interpretation: 'Rule state and consumed keys are witnesses, not a claim about an unexposed causal trigger. Behavior labels can persist during run pursuit.',
    cap: 'First 100 state/key transitions per fixture retained; total and omitted counts are explicit.',
    limitations: ['No NFL tracking or authentic call-sheet verification in this fixture panel.',
      'No communication event or independent gaze/hip measurements; body facing does not establish eye target.',
      'No threshold fitting or coverage behavior changes; spacing alone is never called a bust.',
      'The standard replay does not yet retain this new getter\u0027s structured branch/read fields. This lab reads them live.'] }, reports };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ sourceSha256: source, output: out, fixtures: reports.length,
  contractViolations: reports.reduce((n, r) => n + r.violations.length, 0),
  inspectionPoints: reports.reduce((n, r) => n + r.observations.length, 0),
  byFixture: reports.map(r => ({ id: r.fixture.id, effectiveCoverage: r.effectiveCoverage, firstInvalid: r.firstInvalid,
    inspectionPoints: r.observations.length, transitions: r.transitionCount, omitted: r.omittedTransitions })) }, null, 2));
