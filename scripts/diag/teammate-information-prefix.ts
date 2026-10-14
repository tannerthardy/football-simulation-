/** Native H/Y prefixes for the bounded teammate-information repair.
 * Run through scripts/baseline.mjs so all 44 accepted flags are explicit.
 * Observation wrappers retain actual consumption; they never re-run a controller.
 * The new observer-owned query is additionally sampled only after proving it pure.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { Agent, type Engagement } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { runContactObservers } from '../../src/sim/run-contact-observer.js';
import { sourceVersion } from '../source-version.js';

const ACCEPTED = 'a1b16e666a9ee7d1bc1d2aecba141fc535863b24';
const ACCEPTED_SOURCE = 'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54';
const REFERENCE_COMMIT = '1fbc013008faaa8ab0f677328d81c183c0b8c032';
const REFERENCE_PATH = 'out/teammate-information/accepted-observations.json.gz';
const REFERENCE_SHA = 'ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b';
let endTime = 2.70, destination = 'out/teammate-information/native-prefix.json.gz';
const args = process.argv.slice(2);
while (args.length) {
  const arg = args.shift();
  if (arg === '--end-time' && args.length) endTime = Number(args.shift());
  else if (arg === '--out' && args.length) destination = args.shift()!;
  else throw new Error(`Unknown or incomplete argument: ${arg}`);
}
assert(Number.isFinite(endTime) && endTime > 0 && endTime <= 10, 'Use a bounded positive end time, at most 10 seconds');
assert(Math.abs(endTime / .05 - Math.round(endTime / .05)) < 1e-8, 'End time must be a .05-second World boundary');
const baseline = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(baseline.flags).map(k => [k, process.env[k] ?? null]));
assert.equal(Object.keys(flags).length, 44);
assert.deepEqual(flags, baseline.flags, 'Use the baseline launcher without flag overrides');
assert.equal(process.version, 'v22.23.3');
const referenceBytes = readFileSync(REFERENCE_PATH);
const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
assert.equal(sha(referenceBytes), REFERENCE_SHA);
const reference = JSON.parse(gunzipSync(referenceBytes).toString());
assert.equal(reference.manifest.developCommit, ACCEPTED);
assert.equal(reference.manifest.ballY, CENTER_Y);
assert.equal(reference.manifest.coverage, 'cover3');
const runtime = sourceVersion();
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x]
  : x instanceof Float64Array ? [...x] : x);
const snap = (v: unknown): any => v === undefined ? null : JSON.parse(serialize(v));
type Query = (observer: Agent, target: Agent) => unknown;
const captureFrom = Math.min(2.20, Math.max(0, endTime - .50));
const pairs = [[2, 6], [2, 7], [2, 10], [6, 2]] as const;
const started = performance.now();
const panel: any[] = [];

for (const id of ['uc12-wz-s3-mirror', 'uc12-wz-s3']) {
  const row = reference.panel.find((r: any) => r.input.id === id);
  assert(row, `Missing accepted input ${id}`);
  const input = row.input, recipe = reference.manifest, formation = FORMATION_BY_ID[input.formation];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: recipe.strength }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: recipe.strength }), 'base43'),
    offCall: { formation, flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: recipe.los, ballY: CENTER_Y, firstDownX: recipe.firstDownX, seed: input.seed,
  });
  assert.equal(sim.agents[2].slot, 'RT');
  assert.equal(sim.agents[6].slot, 'RB');
  const installedQuery = Reflect.get(sim, 'teammateInformation') as Query | undefined;
  const candidate = typeof installedQuery === 'function';
  if (!candidate) assert.equal(runtime, ACCEPTED_SOURCE, 'The baseline arm must retain the exact accepted runtime');
  const query = candidate ? installedQuery!.bind(sim) : null;
  const hashes: string[] = [], completeStateHashes: string[] = [], frames: any[] = [];
  const pictures: any[] = [], phases: any[] = [], entryInformation: any[] = [];
  const rawSpacing = new Map<number, unknown>();
  const rep = (e: Engagement) => snap(e);
  const flatten = (joint: any) => {
    const { a, b, actor, holder, ...rest } = joint;
    return snap({ ...rest, a: sim.world.indexOf(a), b: sim.world.indexOf(b),
      ...(actor === undefined ? {} : { actor: sim.world.indexOf(actor) }),
      ...(holder === undefined ? {} : { holder: sim.world.indexOf(holder) }) });
  };
  const inCapture = () => sim.t >= captureFrom - 1e-9;
  const saveRawSpacing = (caller: string | undefined) => {
    if (inCapture() && caller?.includes('spaceTeammates') && !rawSpacing.has(sim.t)) {
      rawSpacing.set(sim.t, snap(sim.intents));
    }
  };
  if (query) {
    Reflect.set(sim, 'teammateInformation', (a: Agent, b: Agent) => {
      const caller = new Error().stack;
      saveRawSpacing(caller);
      const information = query(a, b);
      if (inCapture()) pictures.push({ t: sim.t, observer: a.idx, target: b.idx,
        information: snap(information), consumer: caller?.includes('spaceTeammates') ? 'spacing' : 'other' });
      return information;
    });
  } else {
    const see = sim.see.bind(sim);
    sim.see = (a, b, scale) => {
      const caller = new Error().stack;
      saveRawSpacing(caller);
      const seen = see(a, b, scale);
      if (inCapture() && caller?.includes('spaceTeammates')) pictures.push({ t: sim.t,
        observer: a.idx, target: b.idx, information: snap(seen), consumer: 'spacing', legacyUnrestricted: true });
      return seen;
    };
  }
  const sampleQuery = () => {
    if (!query) return null;
    const before = serialize({ rng: sim.rng, awareness: Reflect.get(sim, 'teammateAwareness') });
    const sample = pairs.map(([a, b]) => ({ observer: a, target: b, information: snap(query(sim.agents[a], sim.agents[b])) }));
    assert.equal(serialize({ rng: sim.rng, awareness: Reflect.get(sim, 'teammateAwareness') }), before,
      'Diagnostic query changed observation state or RNG');
    return sample;
  };
  runContactObservers.set(sim, (engagement, phase, data) => {
    if (inCapture() && engagement.defender.idx === 12) phases.push({ t: sim.t, phase, engagement: rep(engagement), data: snap(data) });
  });
  const worldStep = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    const capture = inCapture();
    const frame = capture ? { t: sim.t, after: sim.t + dt, dt,
      beforeBodies: snap(sim.agents.map(a => a.body)), requestedBehavior: snap(Reflect.get(sim, 'cmds')),
      rawTechniqueIntents: rawSpacing.get(sim.t), finalWorldIntents: snap(intents),
      informationAtWorldEntry: sampleQuery(), engagements: sim.engagements.map(rep),
      jointInputs: sim.world.joints.map(flatten),
    } : null;
    if (frame) assert(frame.rawTechniqueIntents !== undefined, 'Missing actual pre-spacing technique intents');
    const report = worldStep(intents, dt);
    if (frame) frames.push({ ...frame, afterBodies: snap(sim.agents.map(a => a.body)),
      jointOutputs: sim.world.joints.map(flatten), report: snap(report) });
    return report;
  };
  const caseStarted = performance.now();
  while (sim.phase === 'live' && sim.t < endTime - 1e-9) {
    if (inCapture()) entryInformation.push({ t: sim.t, information: sampleQuery() });
    sim.tick();
    // This projection intentionally matches PR30's old state/RNG serialization.
    // Candidate awareness is recorded separately, and included in the second hash.
    const legacyState = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
    hashes.push(sha(serialize(legacyState)));
    completeStateHashes.push(sha(serialize({ ...legacyState, teammateAwareness: Reflect.get(sim, 'teammateAwareness') })));
  }
  if (!candidate) assert.deepEqual(hashes, row.hashes.slice(0, hashes.length), 'Baseline prefix changed accepted state/RNG history');
  const common = Math.min(hashes.length, row.hashes.length);
  const firstMismatch = hashes.slice(0, common).findIndex((hash, i) => hash !== row.hashes[i]);
  panel.push({ input, installedSetup: row.setup,
    mode: candidate ? 'bounded-teammate-information' : 'accepted-unrestricted-feed',
    restoredFromSnap: true, completeBodyCount: sim.agents.length, worldTicks: hashes.length,
    endTime: sim.t, censored: sim.phase === 'live',
    stoppingReason: sim.phase === 'live' ? `Declared ${endTime}-second diagnostic boundary` : 'Natural completed outcome',
    nativeOutcome: sim.phase === 'live' ? null : snap(sim.buildResult()),
    reusedAcceptedOutcome: row.summary,
    legacyStateRngHashes: hashes, completeStateHashes,
    matchedAcceptedPrefixTicks: firstMismatch < 0 ? common : firstMismatch,
    firstLegacyDifferenceBoundary: firstMismatch < 0 ? null : (firstMismatch + 1) * sim.dt,
    entryInformation, frames, pictures, phases, events: snap(sim.events),
    finalAwareness: candidate ? snap(Reflect.get(sim, 'teammateAwareness')) : null,
    internalSeconds: (performance.now() - caseStarted) / 1000,
  });
  runContactObservers.delete(sim);
}
assert.equal(sourceVersion(), runtime, 'Runtime source changed during capture');
const result = { protocol: 'teammate-information-native-prefix-v1', commit, sourceSha256: runtime,
  acceptedCommit: ACCEPTED, acceptedSourceSha256: ACCEPTED_SOURCE, node: process.version,
  flags, worldDefaults: baseline.worldDefaults,
  reference: { commit: REFERENCE_COMMIT, path: REFERENCE_PATH, sha256: REFERENCE_SHA, bytes: referenceBytes.length },
  captureFrom, declaredEndTime: endTime, panel,
  informationScope: 'Only spacing is migrated. Other teammate consumers, controllers and all physical laws retain their accepted behavior.',
  queryNeutralityChecked: panel.every(r => r.mode === 'bounded-teammate-information'),
  diagnosticExtraControllerUpdates: 0,
  newNativePrefixes: panel.length, newFullGames: 0,
  internalSeconds: (performance.now() - started) / 1000,
};
mkdirSync(dirname(destination), { recursive: true });
const bytes = gzipSync(serialize(result));
writeFileSync(destination, bytes);
console.log(JSON.stringify({ output: destination, sha256: sha(bytes), bytes: bytes.length, sourceSha256: runtime,
  cases: panel.map(r => ({ id: r.input.id, mode: r.mode, ticks: r.worldTicks, endTime: r.endTime,
    censored: r.censored, matchedAcceptedPrefixTicks: r.matchedAcceptedPrefixTicks })), internalSeconds: result.internalSeconds }));
