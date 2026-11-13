/** Fixed ordinary 11v11 passing panel for visible deep-help decisions.
 * node --import tsx scripts/diag/coverage-help-review.ts [output-directory]
 * Wrappers copy real queries only; they never request vision or judgment.
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
import * as capJudgment from '../../src/sim/coverage/judgment.js';
import type { ReceiverRead } from '../../src/sim/coverage/reads.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const { CoverageJudgment } = capJudgment;
// The same observer runs against the archived baseline, which has no projected
// estimator. Its retained legacy predicate is exact for that source. Neither
// branch requests an extra observation, judgment or route read.
const projectedCap = (capJudgment as { hasProjectedCap?: (
  rd: Pick<ReceiverRead, 'pos' | 'vel'>, seen: Perceived, interval: number, error: number
) => boolean }).hasProjectedCap;
const capModel = projectedCap ? 'projected-motion' : 'legacy-spacing';
function snapshot(v: unknown): any {
  return JSON.parse(JSON.stringify(v, (_key, value) => {
    if (value instanceof Agent) return { idx: value.idx, slot: value.slot };
    if (value instanceof PlaySim) return { playSimReference: true };
    if (value instanceof Map) return { entries: [...value] };
    if (value instanceof Set) return { values: [...value] };
    if (typeof value === 'number' && !Number.isFinite(value)) return { sentinel: String(value) };
    return value;
  }));
}
const state = (a: Agent) => snapshot({ idx: a.idx, slot: a.slot, team: a.team,
  body: a.body, mind: a.mind, behavior: a.behavior, recognition: a.recog,
  tags: a.tags, stance: a.stance, passSet: a.passSet, runFit: a.runFit,
  engagement: a.engagement, shedBy: a.shedBy, downUntil: a.downUntil,
  snapReadyAt: a.snapReadyAt, nextTackleAt: a.nextTackleAt,
  noCatchUntil: a.noCatchUntil, readAt: a.readAt, missedTackles: a.missedTackles });
const context = (s: PlaySim) => snapshot({ t: s.t, phase: s.phase, outcome: s.outcome,
  endSpot: s.endSpot, possession: s.possession, ball: s.ball, stats: s.stats,
  penalty: s.penalty, rng: s.rng, qbMind: s.qbMind, intents: s.intents,
  events: s.events, engagements: s.engagements, agents: s.agents.map(state),
  perception: s.perception, world: { time: s.world.time, joints: s.world.joints } });
const pose = (a: Agent) => a.body.support?.state === 'up' ? 'up'
  : a.body.support?.state === 'rising' ? 'rising'
  : a.body.support ? 'down' : null;
const actual = (a: Agent, t: number) => ({ idx: a.idx, slot: a.slot, pos: { ...a.pos },
  vel: { ...a.vel }, facing: a.facing, supportState: a.body.support?.state ?? null,
  visiblePose: pose(a), isDown: a.isDown(t), timeUntilUp: a.timeUntilUp(t),
  hiddenJob: (a.behavior as { job?: string }).job ?? a.behavior.kind,
  hiddenTarget: (a.behavior as { target?: Agent }).target?.idx ?? null });
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

function trial(input: Input, observe: boolean, recording: boolean) {
  const formation = FORMATION_BY_ID[input.formation], concept = PASS_BY_ID[input.concept];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.offenseSeed), `Help offense ${input.roster}`,
      `O${input.roster}`, { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.defenseSeed), `Help defense ${input.roster}`,
      `D${input.roster}`, { strength: .55 }), 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: `${formation.name} · ${concept.name}` },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[input.coverage],
      pressure: null, label: `4-3 Over · ${COVERAGE_BY_ID[input.coverage].name}` },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.playSeed,
    record: recording, recordLevel: 'full', recordEvery: 1,
  });
  const id = `HELP-R${input.roster}-${input.formation}-${input.concept}-${input.coverage}-S${input.playSeed}`;
  const players = sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team,
    player: snapshot(a.player), profile: snapshot(a.profile) }));
  const initialContext = context(sim), initialSignature = hash(initialContext);
  const initialFootballSignature = hash({ agents: initialContext.agents, rng: initialContext.rng,
    ball: initialContext.ball, intents: initialContext.intents });
  const decisions: any[] = [], histories: Array<Array<ReturnType<typeof actual>>> = [];
  let current: any = null;
  const restores: Array<() => void> = [];
  function wrap(object: any, key: string, value: any) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, { configurable: true, enumerable: descriptor?.enumerable ?? false,
      writable: true, value });
    restores.push(() => { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; });
  }
  if (observe) {
    const originalRecord = sim.perception.record;
    wrap(sim.perception, 'record', function(this: typeof sim.perception, states: Parameters<typeof originalRecord>[0]) {
      histories.push(sim.agents.map(a => actual(a, sim.t)));
      if (histories.length > 24) histories.shift();
      return originalRecord.call(this, states);
    });
    const originalSee = sim.see;
    wrap(sim, 'see', function(this: PlaySim, a: Agent, d: Agent, scale?: number) {
      const seen: Perceived = originalSee.call(this, a, d, scale);
      if (current && current.observer === a.idx && d.team === a.team && current.query) {
        const query = current.query, rd = query.route;
        if (!rd) throw new Error(`Real cap query lacks cached receiver read: ${query.key}`);
        const depth = seen.pos.x - rd.pos.x;
        const lateral = Math.abs(seen.pos.y + seen.vel.y * .2 - rd.pos.y - rd.vel.y * .2);
        const geometryMatches = depth > .4 - query.error && depth < 6 && lateral < 2.3 + query.error && seen.vel.x > -1;
        const seenPose = (seen as Perceived & { pose?: string | null }).pose ?? null;
        const historyBack = Math.round((seen.age ?? 0) / sim.dt);
        const sampled = histories.at(-1 - historyBack)?.[d.idx] ?? null;
        const interval = a.mind.decisionInterval, horizon = interval + Math.max(0, seen.age ?? 0);
        const closing = rd.vel.x - seen.vel.x;
        const accepted = projectedCap ? projectedCap(rd, seen, interval, query.error)
          : geometryMatches && seenPose !== 'down' && seenPose !== 'rising';
        query.candidates.push({ target: d.idx, slot: d.slot, seen: snapshot(seen),
          depth, lateral, geometryMatches, accepted,
          decisionInterval: interval, persistenceHorizon: horizon,
          projectedDepth: depth - closing * horizon,
          projectedLateral: Math.abs(seen.pos.y - rd.pos.y + (seen.vel.y - rd.vel.y) * horizon),
          encounterLateral: closing > 0 ? Math.abs(seen.pos.y - rd.pos.y + (seen.vel.y - rd.vel.y) * depth / closing) : null,
          sampledVisiblePose: sampled?.visiblePose ?? null,
          sampledSupportState: sampled?.supportState ?? null,
          actualHidden: actual(d, sim.t),
          relativeLongitudinalClosingSpeed: rd.vel.x - seen.vel.x,
          straightLineTimeUntilLevel: rd.vel.x > seen.vel.x ? depth / (rd.vel.x - seen.vel.x) : null,
        });
      }
      return seen;
    });
    const originalDecide = CoverageJudgment.prototype.decide;
    wrap(CoverageJudgment.prototype, 'decide', function(this: InstanceType<typeof CoverageJudgment>,
      ...args: Parameters<typeof originalDecide>) {
      const [a, s, reader, primary, deep] = args;
      if (s !== sim) return originalDecide.apply(this, args);
      const previous = current;
      const row: any = { t: sim.t, observer: a.idx, slot: a.slot, deep, primary: snapshot(primary),
        reasonBefore: this.reason, queries: [] };
      current = row;
      const judgmentDescriptor = Object.getOwnPropertyDescriptor(a.mind, 'judgment');
      const originalJudgment = a.mind.judgment;
      Object.defineProperty(a.mind, 'judgment', { configurable: true, enumerable: false, writable: true,
        value: function(this: typeof a.mind, key: string) {
          const value = originalJudgment.call(this, key);
          if (key.startsWith('cap:')) {
            const rd = reader.recordedReads(sim.t).find(r => `cap:${r.r.slot}` === key);
            const query = { key, value, error: .45 * (1 - a.r('discipline')) + .35 * value,
              route: rd ? snapshot({ ...rd, r: { idx: rd.r.idx, slot: rd.r.slot } }) : null,
              candidates: [] };
            row.queries.push(query); row.query = query;
          } else row.query = null;
          return value;
        } });
      try {
        const chosen = originalDecide.apply(this, args);
        row.chosen = snapshot(chosen); row.reason = this.reason;
        row.cachedReceiverReads = snapshot(reader.recordedReads(sim.t));
        for (const q of row.queries) {
          if (q.candidates.slice(0, -1).some((d: any) => d.accepted))
            throw new Error('Reconstructed cap acceptance contradicts the real short-circuit query');
          q.accepted = q.candidates.some((d: any) => d.accepted);
          q.acceptedCandidate = q.candidates.find((d: any) => d.accepted)?.target ?? null;
        }
        delete row.query;
        // Only real fresh cap queries; cached directives are not new judgments.
        if (row.queries.length) decisions.push(row);
        return chosen;
      } finally {
        if (judgmentDescriptor) Object.defineProperty(a.mind, 'judgment', judgmentDescriptor);
        else delete (a.mind as any).judgment;
        current = previous;
      }
    });
  }
  try {
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < inspectionSeconds - 1e-9) sim.tick();
  } finally { for (const restore of restores.reverse()) restore(); }
  const endpointContext = context(sim), signature = hash(endpointContext);
  const end = { t: sim.t, phase: sim.phase, censored: sim.phase === 'live', outcome: sim.outcome,
    possession: sim.possession, carrier: sim.carrier?.idx ?? null,
    endSpot: sim.endSpot && { ...sim.endSpot }, stats: snapshot(sim.stats), penalty: sim.penalty ?? null };
  const queries = decisions.flatMap(d => d.queries);
  const accepted = queries.filter(q => q.accepted).map(q => q.candidates.find((c: any) => c.accepted));
  const summary = { freshDecisions: decisions.length, capQueries: queries.length, acceptedCaps: accepted.length,
    acceptedSampledDownOrRising: accepted.filter(c => c.sampledVisiblePose === 'down' || c.sampledVisiblePose === 'rising').length,
    acceptedActualHiddenUnavailable: accepted.filter(c => c.actualHidden.isDown).length,
    acceptedSampledUnknown: accepted.filter(c => c.sampledVisiblePose === null).length,
    acceptedStationaryOrRetreating: accepted.filter(c => c.seen.vel.x <= 1).length,
    acceptedStraightLineCushionUnderHalfSecond: accepted.filter(c => c.straightLineTimeUntilLevel !== null && c.straightLineTimeUntilLevel < .5).length,
    geometricDownOrRisingCandidates: queries.flatMap(q => q.candidates).filter(c => c.geometryMatches &&
      (c.sampledVisiblePose === 'down' || c.sampledVisiblePose === 'rising')).length,
    protectVerticalDecisions: decisions.filter(d => d.reason.startsWith('protect-vertical:')).length,
    squeezeBreakDecisions: decisions.filter(d => d.reason.startsWith('squeeze-break:')).length,
  };
  const selection = input.roster === 2 && input.coverage === 'cover4' && input.concept === 'smash'
    ? 'retained-retrospective-witness' : 'fixed-before-outcomes';
  return { id, input, selection, players, profileSha256: hash(players),
    initialSignature, initialFootballSignature, initialContext, signature, endpointContext,
    end, summary, decisions, recording: recording ? { frames: sim.frames, telemetry: sim.trace.data,
      events: sim.events } : null };
}

const output = process.argv[2] ?? 'out/coverage-help-review';
if (process.argv.length > 3) throw new Error('Usage: coverage-help-review.ts [output-directory]');
const sourceSha256 = sourceVersion(), toolSha256 = fileHash('scripts/diag/coverage-help-review.ts');
const rows: any[] = [], observerNeutrality: any[] = [];
for (const input of inputs) {
  const recording = input.coverage === 'cover4' && (input.roster === 1
    || (input.roster === 2 && input.concept === 'smash'));
  const row = trial(input, true, recording), plain = trial(input, false, false);
  const checks = { id: row.id, initial: row.initialSignature === plain.initialSignature,
    final: row.signature === plain.signature, recording,
    observedInitialSignature: row.initialSignature, plainInitialSignature: plain.initialSignature,
    observedSignature: row.signature, plainSignature: plain.signature };
  if (!checks.initial || !checks.final) throw new Error(`Observer/recording changed full state: ${row.id}`);
  observerNeutrality.push(checks); rows.push(row);
  console.log(JSON.stringify({ id: row.id, end: row.end, summary: row.summary, observerNeutral: true }));
}
if (sourceVersion() !== sourceSha256 || fileHash('scripts/diag/coverage-help-review.ts') !== toolSha256)
  throw new Error('Engine source/tool changed during panel');
const summary = Object.fromEntries(Object.keys(rows[0].summary).map(k => [k,
  rows.reduce((sum, row) => sum + row.summary[k], 0)]));
const report = { schema: 'coverage-help-review-v1', sourceSha256, toolSha256, capModel,
  sourceVersionToolSha256: fileHash('scripts/source-version.ts'), node: process.version,
  inputSha256: hash(inputs), profilesSha256: hash(rows.map(r => ({ id: r.id, players: r.players }))),
  inputs, inspectionSeconds, observerNeutrality, summary,
  scope: '24 fixed ordinary 11v11 pass calls: two generated rosters, three coverage families, four concepts/formations. Actual controllers and collisions; no prescribed movement or off-play fall.',
  limits: [
    'Sampled visible pose is reconstructed from copied actual support states at the existing perception-record calls. It is diagnostic evidence only, never injected into a decision. Missing initial/pre-snap history is null.',
    'Current actual support, downUntil, job and target are hidden diagnostics, distinct from sampled visible pose and consumed Perceived data.',
    'Cap accepted/rejected uses the source-provided pure projected predicate when present, otherwise the archived legacy geometry/pose predicate. It consumes the exact existing judgment error and visual query; no extra see, read or judgment call. Short-circuit consistency is checked.',
    'Persistence adds teammate image age as a conservative reserve to the next ordinary decision interval; seen positions are already dead-reckoned. Far longitudinal encounter is a bounded kinematic guess, not assignment knowledge or a physical reachability proof.',
    'Repeated cap queries and candidates within a real decision are retained. They are not independent plays or bust-frequency estimates.',
    'Straight-line time until level uses consumed longitudinal motion only; it ignores turning, pursuit, lateral spacing and physical capabilities, and does not establish that an upright cap is incapable.',
    'No NFL target fitting. Any still-live eight-second endpoint is inspection-censored with no forced whistle, timeout or fabricated yards/result.',
    'Four predetermined first-roster Cover4 films plus the separately labelled second-roster Smash retrospective decision witness. Recorded endpoint context matches an unobserved, unrecorded execution for every panel input.',
  ], rows };
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'raw.json.gz'), gzipSync(JSON.stringify(report)));
writeFileSync(join(output, 'summary.json'), JSON.stringify({ ...report, rows: rows.map(r => ({
  id: r.id, input: r.input, initialFootballSignature: r.initialFootballSignature,
  signature: r.signature, profileSha256: r.profileSha256, end: r.end, summary: r.summary,
})), rawSha256: fileHash(join(output, 'raw.json.gz')) }, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256, toolSha256, summary }));
