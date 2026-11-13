/** Small native QB-cue audit. Copies consumed pictures and commands only.
 * node --import tsx scripts/diag/qb-cue-review.ts [output-directory]
 * Same 24 inputs as coverage-help-review; no staged movement or forced whistle.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { Agent } from '../../src/sim/agent.js';
import { ZoneCoverage } from '../../src/sim/behaviors/defense.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
function copy(v: unknown): any {
  return JSON.parse(JSON.stringify(v, (_key, value) => {
    if (value instanceof Agent) return { idx: value.idx, slot: value.slot };
    if (value instanceof PlaySim) return { playSimReference: true };
    if (value instanceof Map) return { entries: [...value] };
    if (value instanceof Set) return { values: [...value] };
    if (typeof value === 'number' && !Number.isFinite(value)) return { sentinel: String(value) };
    return value;
  }));
}
const state = (a: Agent) => copy({ idx: a.idx, slot: a.slot, team: a.team,
  body: a.body, mind: a.mind, behavior: a.behavior, recognition: a.recog,
  tags: a.tags, stance: a.stance, passSet: a.passSet, runFit: a.runFit,
  engagement: a.engagement, shedBy: a.shedBy, downUntil: a.downUntil,
  snapReadyAt: a.snapReadyAt, nextTackleAt: a.nextTackleAt,
  noCatchUntil: a.noCatchUntil, readAt: a.readAt, missedTackles: a.missedTackles });
const context = (s: PlaySim) => copy({ t: s.t, phase: s.phase, outcome: s.outcome,
  endSpot: s.endSpot, possession: s.possession, ball: s.ball, stats: s.stats,
  penalty: s.penalty, rng: s.rng, qbMind: s.qbMind, qbEyes: s.qbEyes,
  intents: s.intents, events: s.events, engagements: s.engagements,
  agents: s.agents.map(state), perception: s.perception,
  world: { time: s.world.time, joints: s.world.joints } });
const bodyPicture = (a: Agent) => ({ position: { ...a.pos }, velocity: { ...a.vel },
  facing: a.facing, supportState: a.body.support?.state ?? null });
const cases = [
  { formation: 'gun_doubles_11', concept: 'four_verts' },
  { formation: 'gun_doubles_11', concept: 'dagger' },
  { formation: 'gun_bunch_11', concept: 'mesh' },
  { formation: 'gun_trips_11', concept: 'smash' },
] as const;
const coverages = ['cover4', 'cover3_match', 'cover1'] as const;
interface Input { roster: number; offenseSeed: number; defenseSeed: number;
  formation: string; concept: string; coverage: string; playSeed: number }
const inputs: Input[] = [];
for (const [roster, offenseSeed, defenseSeed] of [[1, 7, 19], [2, 31, 32]])
  for (const coverage of coverages) for (const c of cases)
    inputs.push({ roster, offenseSeed, defenseSeed, ...c, coverage, playSeed: 3 });
const inspectionSeconds = 8;

function trial(input: Input, observe: boolean) {
  const formation = FORMATION_BY_ID[input.formation], concept = PASS_BY_ID[input.concept];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.offenseSeed), `Help offense ${input.roster}`,
      `O${input.roster}`, { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.defenseSeed), `Help defense ${input.roster}`,
      `D${input.roster}`, { strength: .55 }), 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: `${formation.name} · ${concept.name}` },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[input.coverage],
      pressure: null, label: `4-3 Over · ${COVERAGE_BY_ID[input.coverage].name}` },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.playSeed, record: false,
  });
  const id = `QBCUE-R${input.roster}-${input.formation}-${input.concept}-${input.coverage}-S${input.playSeed}`;
  const players = sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team,
    player: copy(a.player), profile: copy(a.profile) }));
  const initialContext = context(sim), initialSignature = hash(initialContext);
  const initialPhysicalProjection = copy(sim.agents.map(a => ({ idx: a.idx, slot: a.slot,
    team: a.team, player: a.player, body: a.body, snapReadyAt: a.snapReadyAt })));
  const initialCalls = copy({ offCall: sim.offCall, defCall: sim.defCall,
    los: sim.los, ballY: sim.ballY, firstDownX: sim.firstDownX });
  const decisions: any[] = [], qbReadEvents: any[] = [], ticks: any[] = [];
  let current: any = null, solved = false;
  const restores: Array<() => void> = [];
  function wrap(object: any, key: string, value: any) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, { configurable: true, enumerable: descriptor?.enumerable ?? false,
      writable: true, value });
    restores.push(() => { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; });
  }
  if (observe) {
    const originalSee = sim.see;
    wrap(sim, 'see', function(this: PlaySim, observer: Agent, target: Agent, scale?: number) {
      const seen: Perceived = originalSee.call(this, observer, target, scale);
      if (observer.team === 'D' && target === sim.qb) {
        const picture = { t: sim.t, observer: observer.idx, slot: observer.slot,
          phase: current?.observer === observer.idx ? 'zone-update' : 'other-controller',
          zoneDecision: current?.observer === observer.idx ? current.ordinal : null,
          observerInputs: { pos: { ...observer.pos }, facing: observer.facing },
          consumedQB: copy(seen), delayScale: scale ?? 1 };
        qbReadEvents.push(picture);
        if (current?.observer === observer.idx) current.qbReadOrdinals.push(qbReadEvents.length - 1);
      }
      if (current?.observer === observer.idx && target.team === 'O' && target !== sim.qb)
        current.consumedReceivers.push({ target: target.idx, slot: target.slot, seen: copy(seen) });
      return seen;
    });
    const originalUpdate = ZoneCoverage.prototype.update;
    wrap(ZoneCoverage.prototype, 'update', function(this: ZoneCoverage,
      ...args: Parameters<typeof originalUpdate>) {
      const [a, s] = args;
      if (s !== sim || a.team !== 'D') return originalUpdate.apply(this, args);
      const previous = current;
      const row: any = { ordinal: decisions.length, t: sim.t, observer: a.idx, slot: a.slot,
        zone: this.zone, style: this.style, beforeTarget: this.target?.idx ?? null,
        beforeBody: bodyPicture(a), recognition: copy(a.recog),
        ballKind: sim.ball.kind, heldByQB: sim.carrier === sim.qb,
        hiddenDiagnostic: { qbEyes: sim.qbEyes?.idx ?? null, actualQB: bodyPicture(sim.qb) },
        qbReadOrdinals: [], consumedReceivers: [] };
      decisions.push(row); current = row;
      try {
        const command = originalUpdate.apply(this, args);
        row.afterTarget = this.target?.idx ?? null;
        row.returnedCommand = copy(command);
        return command;
      } finally { current = previous; }
    });
    const originalStep = sim.world.step;
    wrap(sim.world, 'step', function(this: typeof sim.world, ...args: Parameters<typeof originalStep>) {
      const result = originalStep.apply(this, args); solved = true; return result;
    });
  }
  try {
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < inspectionSeconds - 1e-9) {
      const tickStart = sim.t, firstDecision = decisions.length;
      solved = false;
      sim.tick();
      if (observe) {
        for (const row of decisions.slice(firstDecision)) {
          row.deliveredIntent = copy(sim.intents[row.observer]);
          row.afterTickBody = bodyPicture(sim.agents[row.observer]);
          row.followingSolveCaptured = solved;
        }
        ticks.push({ tickStart, tickEnd: sim.t, followingSolveCaptured: solved,
          decisionOrdinalRange: [firstDecision, decisions.length],
          // Actual native post-tick bodies; no replay rounding/interpolation.
          bodies: sim.agents.map(a => [a.pos.x, a.pos.y, a.vel.x, a.vel.y, a.facing,
            a.body.support?.state ?? null]),
          hiddenDiagnosticQbEyes: sim.qbEyes?.idx ?? null });
      }
    }
  } finally { for (const restore of restores.reverse()) restore(); }
  // A live inspection endpoint is censored, never a fabricated play result.
  const result = sim.phase === 'dead' ? copy(sim.buildResult()) : null;
  const endpointSignature = hash(context(sim));
  const nextRng = sim.rng.nextU32(); // After inspection only, identically in both controls.
  const beforeRelease = decisions.filter(d => d.ballKind === 'held' && d.heldByQB);
  const summary = { zoneUpdates: decisions.length, beforeReleaseZoneUpdates: beforeRelease.length,
    beforeReleaseZoneUpdatesWithConsumedQB: beforeRelease.filter(d => d.qbReadOrdinals.length > 0).length,
    consumedQBReads: qbReadEvents.length,
    consumedQBReadsWithinZoneUpdates: qbReadEvents.filter(r => r.phase === 'zone-update').length,
    consumedReceiverReadsWithinZoneUpdates: decisions.reduce((sum, d) => sum + d.consumedReceivers.length, 0),
    targetTransitions: decisions.filter(d => d.beforeTarget !== d.afterTarget).length,
    // Diagnostic association, not causal inference that the private ID was used.
    beforeReleaseHiddenEyesPresentWithoutQBPicture: beforeRelease.filter(d =>
      d.hiddenDiagnostic.qbEyes !== null && d.qbReadOrdinals.length === 0).length };
  return { id, input, players, profileSha256: hash(players), initialSignature,
    initialPhysicalProjection, initialPhysicalSha256: hash(initialPhysicalProjection),
    initialCalls, initialCallsSha256: hash(initialCalls), endpointSignature, nextRng,
    end: { t: sim.t, phase: sim.phase, censored: sim.phase === 'live', outcome: sim.outcome,
      endSpot: copy(sim.endSpot ?? null), stats: copy(sim.stats), penalty: copy(sim.penalty ?? null) },
    result, events: copy(sim.events), summary, decisions, qbReadEvents, ticks };
}

const output = process.argv[2] ?? 'out/qb-cue-review';
if (process.argv.length > 3) throw new Error('Usage: qb-cue-review.ts [output-directory]');
const sourceSha256 = sourceVersion(), toolSha256 = fileHash('scripts/diag/qb-cue-review.ts');
const start = process.hrtime.bigint(), cpuStart = process.cpuUsage();
const rows: any[] = [], controls: any[] = [];
for (const input of inputs) {
  const row = trial(input, true), plain = trial(input, false);
  const control = { id: row.id, initial: row.initialSignature === plain.initialSignature,
    endpoint: row.endpointSignature === plain.endpointSignature,
    result: hash(row.result) === hash(plain.result), nextRng: row.nextRng === plain.nextRng,
    observedInitialSignature: row.initialSignature, plainInitialSignature: plain.initialSignature,
    observedEndpointSignature: row.endpointSignature, plainEndpointSignature: plain.endpointSignature,
    observedNextRng: row.nextRng, plainNextRng: plain.nextRng };
  if (!control.initial || !control.endpoint || !control.result || !control.nextRng)
    throw new Error(`Observation changed native state/result/RNG: ${row.id}`);
  controls.push(control); rows.push(row);
  console.log(JSON.stringify({ id: row.id, end: row.end, summary: row.summary, control }));
}
if (sourceVersion() !== sourceSha256 || fileHash('scripts/diag/qb-cue-review.ts') !== toolSha256)
  throw new Error('Engine source/tool changed during panel');
const cpu = process.cpuUsage(cpuStart), elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
const summary = Object.fromEntries(Object.keys(rows[0].summary).map(k => [k,
  rows.reduce((sum, row) => sum + row.summary[k], 0)]));
const report = { schema: 'qb-cue-review-v1', sourceSha256, toolSha256,
  sourceVersionToolSha256: fileHash('scripts/source-version.ts'), node: process.version,
  inputSha256: hash(inputs), inputs, inspectionSeconds, controls, summary,
  runtime: { elapsedSeconds, cpuSeconds: (cpu.user + cpu.system) / 1e6,
    note: 'Whole48-execution collector runtime, not an idle engine-performance comparison.' },
  scope: '24 fixed native 11v11 passes plus24 observer/plain controls; same cases/calls/rosters as coverage-help-review.',
  limits: [
    'Only existing ZoneCoverage.update and actual sim.see calls are observed. No new cue helper, vision, judgment, rule, or RNG call is made during live execution.',
    'Consumed QB pictures include the actual observer position/facing inputs. The local cue helper return is not exposed; no reconstructed cue is claimed as recorded.',
    'Private qbEyes and actual QB/body positions are explicitly hidden diagnostics. Their presence beside a command is not proof of causal use; source and controlled tests establish leakage or its removal.',
    'Returned controller commands and post-contact/spacing delivered intents are distinct. Target changes are recorded technique state, not inferred assignments or causal decisions.',
    'All natural results, adverse outcomes and eight-second live censored endpoints are retained; no forced whistle or guaranteed yards.',
    'Native post-tick positions use tickEnd; command/event timestamps may use tickStart. No replay interpolation or quantization is used.',
    'This small fixed panel is not a league bust, completion, interception or explosive-rate estimate, nor NFL calibration.',
  ], rows };
mkdirSync(output, { recursive: true });
const rawPath = join(output, 'raw.json.gz');
writeFileSync(rawPath, gzipSync(JSON.stringify(report)));
writeFileSync(join(output, 'summary.json'), JSON.stringify({ ...report,
  rows: rows.map(r => ({ id: r.id, input: r.input, profileSha256: r.profileSha256,
    initialSignature: r.initialSignature, initialPhysicalSha256: r.initialPhysicalSha256,
    initialCallsSha256: r.initialCallsSha256, endpointSignature: r.endpointSignature,
    nextRng: r.nextRng, end: r.end, result: r.result, summary: r.summary })),
  rawSha256: fileHash(rawPath) }, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256, toolSha256, elapsedSeconds, summary }));
