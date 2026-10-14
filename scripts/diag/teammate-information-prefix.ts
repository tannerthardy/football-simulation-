/** Native H/Y prefixes for the bounded teammate-information repair.
 * Run through scripts/baseline.mjs so all 44 accepted flags are explicit.
 * Observation wrappers retain actual consumption; they never re-run a controller.
 * The new observer-owned query is additionally sampled only after proving it pure.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
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
let sidecarPath: string | null = null;
let awarenessMode = 'off';
let candidateReferencePath: string | null = null;
const args = process.argv.slice(2);
while (args.length) {
  const arg = args.shift();
  if (arg === '--end-time' && args.length) endTime = Number(args.shift());
  else if (arg === '--out' && args.length) destination = args.shift()!;
  else if (arg === '--information-sidecar' && args.length) sidecarPath = args.shift()!;
  else if (arg === '--awareness' && args.length) awarenessMode = args.shift()!;
  else if (arg === '--candidate-reference' && args.length) candidateReferencePath = args.shift()!;
  else throw new Error(`Unknown or incomplete argument: ${arg}`);
}
assert(Number.isFinite(endTime) && endTime > 0 && endTime <= 10, 'Use a bounded positive end time, at most 10 seconds');
assert(Math.abs(endTime / .05 - Math.round(endTime / .05)) < 1e-8, 'End time must be a .05-second World boundary');
assert(['off', 'primary', 'glance'].includes(awarenessMode));
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
const candidateReferenceBytes = candidateReferencePath ? readFileSync(candidateReferencePath) : null;
const candidateReference = candidateReferenceBytes ? JSON.parse(gunzipSync(candidateReferenceBytes).toString()) : null;
type Query = (observer: Agent, target: Agent) => unknown;
interface InformationSidecar {
  sense(agents: readonly Agent[], now: number, dt: number): void;
  touched(observer: number, target: number, pos: { x: number; y: number }, ownVelocity: { x: number; y: number }, now: number): void;
  query(observer: number, target: number, now: number, dt: number): unknown;
}
type SidecarConstructor = new (agents: readonly Agent[], calls: ReadonlyMap<number, never>) => InformationSidecar;
const captureFrom = Math.min(2.20, Math.max(0, endTime - .50));
let Sidecar: SidecarConstructor | null = null;
let sidecarSourceSha256: string | null = null;
let sidecarSourceBytes: number | null = null;
let sidecarPriorExpiry: number | null = null;
if (sidecarPath) {
  assert(isAbsolute(sidecarPath), 'The information-sidecar path must be absolute');
  assert.equal(runtime, ACCEPTED_SOURCE, 'A diagnostic sidecar is allowed only with the unchanged accepted runtime');
  const moduleBytes = readFileSync(sidecarPath);
  sidecarSourceSha256 = sha(moduleBytes);
  sidecarSourceBytes = moduleBytes.length;
  // The imported module has type-only Agent imports; it accepts the native
  // baseline agents without loading another Agent class or simulation.
  const module = await import(pathToFileURL(sidecarPath).href);
  assert.equal(typeof module.TeammateInformation, 'function');
  Sidecar = module.TeammateInformation as SidecarConstructor;
  const limits = module.TEAMMATE_INFORMATION_LIMITS;
  sidecarPriorExpiry = Math.max(limits.alignmentExpectation, limits.zoneExpectation);
  assert(captureFrom >= sidecarPriorExpiry!, 'This sidecar comparison is limited to the window after installed priors expire');
}
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
    ...({ runAwareness: awarenessMode } as object),
  });
  const runAwareness = Reflect.get(sim, 'runAwareness');
  assert(awarenessMode === 'off' || runAwareness, 'This checkout does not implement the requested awareness mode');
  assert.equal(sim.agents[2].slot, 'RT');
  assert.equal(sim.agents[6].slot, 'RB');
  const installedQuery = Reflect.get(sim, 'teammateInformation') as Query | undefined;
  const candidate = typeof installedQuery === 'function';
  if (Sidecar) assert(!candidate, 'An information sidecar must not be layered on a native candidate');
  if (Sidecar) {
    sidecarPriorExpiry = Math.max(sidecarPriorExpiry!, sim.offCall.run?.meshTime ?? 0);
    assert(captureFrom >= sidecarPriorExpiry, 'The mesh expectation must also expire before sidecar capture');
  }
  if (!candidate) assert.equal(runtime, ACCEPTED_SOURCE, 'The baseline arm must retain the exact accepted runtime');
  const sidecar = Sidecar ? new Sidecar(sim.agents, new Map<number, never>()) : null;
  const query: Query | null = candidate ? installedQuery!.bind(sim)
    : sidecar ? (a, b) => sidecar.query(a.idx, b.idx, sim.t, sim.dt) : null;
  if (sidecar) {
    const prepare = sim.prepareJoinedRunBlocks.bind(sim);
    sim.prepareJoinedRunBlocks = () => {
      // Native mind updates have completed; no controller query acquires a
      // sample. This hook precedes joined-block and movement decisions.
      sidecar.sense(sim.agents, sim.t, sim.dt);
      prepare();
    };
  }
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
  if (candidate && query) {
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
    const before = serialize({ rng: sim.rng, awareness: Reflect.get(sim, 'teammateAwareness'), informationSidecar: sidecar, runAwareness });
    const sample = pairs.map(([a, b]) => ({ observer: a, target: b, information: snap(query(sim.agents[a], sim.agents[b])) }));
    assert.equal(serialize({ rng: sim.rng, awareness: Reflect.get(sim, 'teammateAwareness'), informationSidecar: sidecar, runAwareness }), before,
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
      runAttention: runAwareness ? sim.offense.map(a => {
        const recorded = runAwareness.recorded(a);
        return { observer: a.idx, attention: recorded, expectation: runAwareness.expectedLane(a, sim.t),
          primary: recorded ? runAwareness.primaryPicture(a, sim.agents[recorded.key], sim.t) : null };
      }) : null,
      jointInputs: sim.world.joints.map(flatten),
    } : null;
    if (frame) assert(frame.rawTechniqueIntents !== undefined, 'Missing actual pre-spacing technique intents');
    const report = worldStep(intents, dt);
    if (sidecar) for (const contact of report.contacts) {
      const a = sim.agents[contact.i], b = sim.agents[contact.j];
      if (a.team !== b.team || contact.impulse <= 0) continue;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, length = Math.hypot(dx, dy);
      const nx = length > 1e-9 ? dx / length : Math.cos(a.facing);
      const ny = length > 1e-9 ? dy / length : Math.sin(a.facing);
      const touch = .9 * (a.profile.radius + b.profile.radius);
      sidecar.touched(a.idx, b.idx, { x: a.pos.x + nx * touch, y: a.pos.y + ny * touch }, a.vel, sim.t + dt);
      sidecar.touched(b.idx, a.idx, { x: b.pos.x - nx * touch, y: b.pos.y - ny * touch }, b.vel, sim.t + dt);
    }
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
    completeStateHashes.push(sha(serialize({ ...legacyState, teammateAwareness: Reflect.get(sim, 'teammateAwareness'),
      ...(runAwareness ? { runAwareness } : {}),
      ...(sidecar ? { informationSidecar: sidecar } : {}) })));
  }
  if (!candidate) assert.deepEqual(hashes, row.hashes.slice(0, hashes.length), 'Baseline prefix changed accepted state/RNG history');
  const ownReference = candidateReference?.panel.find((r: any) => r.input.id === id);
  if (candidateReference) {
    assert(ownReference, 'Missing same-input candidate reference');
    assert.deepEqual(input, ownReference.input);
    if (awarenessMode === 'off') assert.deepEqual(hashes, ownReference.legacyStateRngHashes.slice(0, hashes.length),
      'Default-off awareness changed the PR #36 physical/controller/RNG history');
  }
  const ownHashes = ownReference?.legacyStateRngHashes ?? [];
  const ownFirstMismatch = hashes.slice(0, Math.min(hashes.length, ownHashes.length))
    .findIndex((hash, i) => hash !== ownHashes[i]);
  const common = Math.min(hashes.length, row.hashes.length);
  const firstMismatch = hashes.slice(0, common).findIndex((hash, i) => hash !== row.hashes[i]);
  panel.push({ input, installedSetup: row.setup,
    mode: candidate ? 'bounded-teammate-information' : sidecar ? 'accepted-native-with-observational-information-sidecar' : 'accepted-unrestricted-feed',
    restoredFromSnap: true, completeBodyCount: sim.agents.length, worldTicks: hashes.length,
    endTime: sim.t, censored: sim.phase === 'live',
    stoppingReason: sim.phase === 'live' ? `Declared ${endTime}-second diagnostic boundary` : 'Natural completed outcome',
    nativeOutcome: sim.phase === 'live' ? null : snap(sim.buildResult()),
    reusedAcceptedOutcome: row.summary,
    legacyStateRngHashes: hashes, completeStateHashes,
    matchedAcceptedPrefixTicks: firstMismatch < 0 ? common : firstMismatch,
    firstLegacyDifferenceBoundary: firstMismatch < 0 ? null : (firstMismatch + 1) * sim.dt,
    awarenessMode, firstReferenceDifferenceBoundary: !ownReference || ownFirstMismatch < 0 ? null : (ownFirstMismatch + 1) * sim.dt,
    entryInformation, frames, pictures, phases, events: snap(sim.events),
    finalAwareness: candidate ? snap(Reflect.get(sim, 'teammateAwareness')) : null,
    finalRunAwareness: runAwareness ? snap(runAwareness) : null,
    informationSidecarState: sidecar ? snap(sidecar) : null,
    queryNeutralityChecked: query !== null,
    internalSeconds: (performance.now() - caseStarted) / 1000,
  });
  runContactObservers.delete(sim);
}
assert.equal(sourceVersion(), runtime, 'Runtime source changed during capture');
if (sidecarPath) assert.equal(sha(readFileSync(sidecarPath)), sidecarSourceSha256, 'The sidecar source changed during capture');
const result = { protocol: 'teammate-information-native-prefix-v1', commit, sourceSha256: runtime,
  acceptedCommit: ACCEPTED, acceptedSourceSha256: ACCEPTED_SOURCE, node: process.version,
  flags, worldDefaults: baseline.worldDefaults,
  reference: { commit: REFERENCE_COMMIT, path: REFERENCE_PATH, sha256: REFERENCE_SHA, bytes: referenceBytes.length },
  captureFrom, declaredEndTime: endTime, panel,
  awarenessMode, candidateReference: candidateReferenceBytes ? { path: candidateReferencePath,
    sha256: sha(candidateReferenceBytes), commit: candidateReference.commit,
    sourceSha256: candidateReference.sourceSha256 } : null,
  informationScope: Sidecar ? 'Accepted native controllers and physics are unchanged. The sidecar records acquired/tactile information only; native spacing continues to consume its original feed.'
    : awarenessMode === 'off' ? 'Only spacing is migrated. Other teammate consumers, controllers and all physical laws retain their accepted behavior.'
      : 'Opt-in zone-OL near-line key acquisition and installed-lane attention. Other teammate/opponent consumers remain outside the pilot; physics and controller algorithms are unchanged.',
  informationSidecar: Sidecar ? { path: sidecarPath, sourceSha256: sidecarSourceSha256, bytes: sidecarSourceBytes,
    installedPriorsOmitted: true, installedPriorExpiry: sidecarPriorExpiry, sensedFromSnap: true,
    limitation: 'Acquired/tactile diagnostic channel only. Installed call priors are omitted and have expired before the captured late window. This is not the native candidate trajectory or a new football ending.' } : null,
  queryNeutralityChecked: panel.every(r => r.queryNeutralityChecked),
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
