/** Fixed native run-fit installation and achieved-support diagnostic.
 * node --import tsx scripts/diag/run-support-install.ts [output.json]
 * Ordinary controllers/physics for at most4 s; inspection reads existing
 * state, trace logs and consumed-read caches, never another see/update call.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { isDeepZone } from '../../src/playbook/alignment.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { CoverageRole, DefSlot, DefensivePlayCall } from '../../src/playbook/types.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/run-support-install/baseline.json';
if (process.argv.length > 3) throw new Error('Usage: run-support-install.ts [output.json]');
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const scriptHash = () => createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const sourceBefore = sourceVersion(), scriptBefore = scriptHash(), startedAt = new Date().toISOString();
const horizon = 4;
interface Fixture { name: string; coverage: string; seed: number; flip: boolean; roster: [number, number]; shown?: string; pressure?: string; exchange?: boolean }
const fixtures: Fixture[] = [];
function pair(name: string, coverage: string, seed = 3, extra: Partial<Fixture> = {}) {
  for (const flip of [false, true]) fixtures.push({ name, coverage, seed, flip, roster: [7, 8], ...extra });
}
pair('buzz', 'cover3_buzz');
pair('buzz-supplemental', 'cover3_buzz', 11, { roster: [31, 32] });
pair('sky', 'cover3');
pair('two-shows-quarters', 'cover2', 3, { shown: 'cover4' });
pair('two-shows-six', 'cover2', 11, { shown: 'cover6' });
pair('inverted-two', 'cover2_invert');
pair('six', 'cover6');
pair('eight', 'cover6_rev');
pair('fire-zone', 'cover3', 3, { pressure: 'fire_zone' });
pair('buzz-weak-exchange', 'cover3_buzz', 3, { exchange: true });
pair('man-free-control', 'cover1');
pair('zero-control', 'cover0');
if (fixtures.length !== 24) throw new Error('Expected24 predeclared fixtures');

function setup(f: Fixture, observed: boolean): PlaySetup {
  const off = generateTeam(new Rng(f.roster[0]), 'Support offense', 'OFF'), def = generateTeam(new Rng(f.roster[1]), 'Support defense', 'DEF');
  const defCall: DefensivePlayCall = { personnel: 'base43', front: FRONT_BY_ID.over,
    coverage: COVERAGE_BY_ID[f.coverage], pressure: f.pressure ? PRESSURE_BY_ID[f.pressure] : null,
    ...(f.shown ? { shown: COVERAGE_BY_ID[f.shown] } : {}),
    ...(f.exchange ? { gapExchange: { edge: 'DE_W' as const, backer: 'LB_W' as const } } : {}), label: f.name };
  return { offense: pickOffense(off, '11'), defense: pickDefense(def, 'base43'),
    offCall: { kind: 'run', formation: FORMATION_BY_ID.ace_11, flip: f.flip, run: RUN_BY_ID.iz_strong, label: 'Inside Zone' },
    defCall, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: f.seed,
    record: observed, recordEvery: 1, recordLevel: 'full' };
}
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const deep = (role: CoverageRole) => role.kind === 'zone' && isDeepZone(role.zone);
function state(a: Agent) {
  const sup = a.body.support!;
  const b = a.behavior as unknown as { job?: string; zone?: string; target?: Agent | null;
    history?: Array<{ t: number; job: string }>; reader?: { cacheT: number; cache: Map<Agent, any> } };
  const reader = b.reader;
  return { idx: a.idx, slot: a.slot, position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing, pose: a.pose,
    support: { state: sup.state, cause: sup.cause ?? null, xi: { ...sup.xi }, out: sup.out, posture: sup.posture, lean: { ...sup.lean } },
    behavior: a.behavior.kind, coverageJob: b.job ?? (b.zone ? `zone:${b.zone}` : b.target ? `man:${b.target.slot}` : null),
    coverageHistory: b.history?.map(r => ({ ...r })) ?? [], runFit: a.runFit ? { ...a.runFit } : null,
    recognition: a.recog ? { read: a.recog.read, readAt: a.recog.readAt, logOdds: a.recog.logOdds } : null,
    cachedRuleKeys: reader ? { tick: reader.cacheT, reads: [...reader.cache.values()].map(r => ({ target: r.r.idx, slot: r.r.slot,
      position: { ...r.pos }, velocity: { ...r.vel }, depth: r.depth, release: r.release, first: r.first, since: r.since })) } : null };
}
function signature(sim: PlaySim) {
  return hash({ bodies: sim.agents.map(a => a.body), intents: sim.intents, events: sim.events,
    jobs: sim.defense.map(a => a.runFit), rngNext: sim.rng.nextU32() });
}
function trial(f: Fixture, observed: boolean) {
  const sim = new PlaySim(setup(f, observed));
  const installation = sim.defense.map(a => {
    const spot = sim.defAlign.spots[a.slot as DefSlot]!;
    return { idx: a.idx, slot: a.slot, calledRole: copy(spot.role), calledPosition: { ...spot.pos }, actualPosition: { ...a.pos },
      gap: spot.gap, gapSide: spot.gapSign, runFit: a.runFit ? { ...a.runFit } : null,
      behavior: a.behavior.kind, profileHash: hash(a.profile), calledDeep: deep(spot.role),
      explicitDropper: !!sim.defCall.pressure?.droppers?.[a.slot as DefSlot] };
  });
  const initialBodyHash = hash(sim.agents.map(a => ({ slot: a.slot, team: a.team, body: a.body }))),
    profileHash = hash(sim.agents.map(a => ({ slot: a.slot, team: a.team, profile: a.profile })));
  const samples: unknown[] = [];
  sim.event('snap', sim.slot('C') ?? sim.qb);
  while (sim.phase === 'live' && sim.t < horizon - 1e-9) {
    const t = sim.t, eventStart = sim.events.length, decisionStart = sim.trace.data?.decisions.length ?? 0;
    sim.tick();
    if (observed) {
      // ReplayTrace already received these pictures from ordinary controller
      // calls. Read its latest cache directly, without asking for another look.
      const trace = sim.trace as unknown as { observationT: number; observations: Map<string, { a: number; b: number }> };
      const runnerSlots = new Set([sim.qb.idx, sim.slot('RB')!.idx]);
      const consumedRunnerPictures = trace.observationT === t ? [...trace.observations.values()]
        .filter(p => sim.agents[p.a]?.team === 'D' && runnerSlots.has(p.b)).map(p => copy(p)) : [];
      samples.push({ t, end: sim.t, carrier: sim.carrier?.slot ?? null, rb: state(sim.slot('RB')!),
        defenders: sim.defense.map(a => ({ ...state(a), intent: copy(sim.intents[a.idx]) })),
        consumedRunnerPictures, decisions: copy(sim.trace.data?.decisions.slice(decisionStart) ?? []),
        events: copy(sim.events.slice(eventStart)) });
    }
  }
  const end = sim.defense.map(a => ({ ...state(a), depthFromLos: a.pos.x - sim.los }));
  return { fixture: f, id: `RSI-${f.name}-${f.flip ? 'L' : 'R'}-S${f.seed}`, resolvedCoverage: sim.defCall.coverage.id,
    strongSign: sim.offAlign.strongSign, profileHash, initialBodyHash, installation,
    edgePartners: installation.filter(r => r.runFit?.kind === 'edge').map(r => ({ slot: r.slot, ...r.runFit })),
    calledRoof: installation.filter(r => r.calledDeep).map(r => ({ slot: r.slot, runFit: r.runFit, initialDepth: r.actualPosition.x - sim.los,
      achieved: end.find(a => a.slot === r.slot)! })),
    end: { t: sim.t, phase: sim.phase, endSpot: sim.endSpot, defenders: end },
    events: copy(sim.events), signature: signature(sim), samples };
}
const trials: ReturnType<typeof trial>[] = [], cpu0 = process.cpuUsage(), wall0 = performance.now();
for (const f of fixtures) {
  const row = trial(f, true), plain = trial(f, false);
  if (row.signature !== plain.signature) throw new Error(`Observer/recording changed bodies/jobs/intents/events/RNG: ${row.id}`);
  trials.push(row);
}
const sourceAfter = sourceVersion(), scriptAfter = scriptHash();
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Source/script changed during diagnostic');
const anomalies = trials.map(r => ({ id: r.id,
  calledDeepAssignedForce: r.installation.filter(a => a.calledDeep && a.runFit?.kind === 'force').map(a => a.slot),
  underneathSafetyLeftAlley: r.installation.filter(a => ['SS', 'FS'].includes(a.slot) && a.calledRole.kind === 'zone' && !a.calledDeep && a.runFit?.kind === 'alley').map(a => a.slot),
  explicitDropperAssignedLineJob: r.installation.filter(a => a.explicitDropper && ['edge', 'interior'].includes(a.runFit?.kind ?? '')).map(a => a.slot),
  exchange: r.fixture.exchange ? { end: r.installation.find(a => a.slot === 'DE_W')?.runFit, backer: r.installation.find(a => a.slot === 'LB_W')?.runFit } : null }));
const cpu = process.cpuUsage(cpu0), report = { schema: 'run-support-install-v1', sourceBefore, sourceAfter, scriptBefore, scriptAfter,
  cohortHash: hash(fixtures), fixtures, horizonSeconds: horizon, decisionDt: .05, startedAt, finishedAt: new Date().toISOString(),
  definitions: { scope: 'Native ace_11 Inside Zone against called defenses; role installation and achieved movement over at most4s, not full-play efficiency or league estimates.',
    roster: 'Default generated team strength; seeds7/8 primary, seeds31/32 supplemental Buzz seed11; profile hashes make fixed bodies explicit.',
    information: 'Only QB/RB pictures already requested by controllers and cached rule keys/decision logs. No new see calls, behavior updates, reads, or RNG draws. Cached keys include their own last-read tick.',
    roof: 'The actual called deep-zone slots, their installed run jobs and achieved depth/pose; no inferred coverage outcome or demanded minimum depth.',
    anomalies: 'Named installation categories for comparison, not statistical or coaching verdicts. Man controls remain in the cohort.',
    observer: 'All24 full-recording+inspection runs match plain native bodies, jobs, intents, events, and nextRNG exactly.' },
  observerVerifiedCount: trials.length, cost: { cpuMs: (cpu.user + cpu.system) / 1000, wallMs: performance.now() - wall0 }, anomalies, trials };
function finite(x: unknown, path = 'report'): void {
  if (typeof x === 'number' && !Number.isFinite(x)) throw new Error(`Nonfinite ${path}`);
  if (Array.isArray(x)) x.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) finite(v, `${path}.${k}`);
}
finite(report); mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report) + '\n'); writeFileSync(`${output}.gz`, gzipSync(JSON.stringify(report) + '\n', { level: 9 }));
console.log(JSON.stringify({ output, sourceBefore, scriptBefore, cohortHash: report.cohortHash, cases: trials.length, observerVerifiedCount: trials.length,
  calledDeepAssignedForce: anomalies.filter(a => a.calledDeepAssignedForce.length).length,
  underneathSafetyLeftAlley: anomalies.filter(a => a.underneathSafetyLeftAlley.length).length,
  explicitDropperAssignedLineJob: anomalies.filter(a => a.explicitDropperAssignedLineJob.length).length,
  exchange: anomalies.filter(a => a.exchange).map(a => ({ id: a.id, ...a.exchange })) }));
