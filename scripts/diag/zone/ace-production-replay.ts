/** One complete execution of each frozen Ace input on accepted production.
 * Observation only: no extra see/World/RNG calls, action or contact overrides.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { sourceVersion } from '../../source-version.js';

const manifestPath = 'config/ace-production-replay.json';
const contextPath = 'config/ace-production-historical-context.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const context = JSON.parse(readFileSync(contextPath, 'utf8'));
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x]
    : x instanceof Float64Array ? [...x] : x);
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const snap = (v: unknown): any => v === undefined ? null : JSON.parse(serialize(v));
const fileHash = (p: string) => sha(readFileSync(p));
const directory = process.argv[2] ?? 'out/ace-production';
mkdirSync(directory, { recursive: true });
assert.equal(process.version, 'v22.23.3');
assert.equal(manifest.ballY, CENTER_Y);
assert.equal(manifest.inputs.length, 3);
assert.equal(process.env.RUN_CONTACT_COMPONENTS, '1');
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
assert.deepEqual(flags, profile.flags);
assert.equal(Object.keys(flags).length, 44);
const startedAt = new Date().toISOString(), started = performance.now();
const source = sourceVersion(), collectorCommit = git('rev-parse', 'HEAD');
assert.equal(source, 'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54');
assert.equal(git('diff', '--name-only', manifest.developCommit, 'HEAD', '--', 'src', 'test',
  'config/baseline.json', 'package.json', 'package-lock.json', 'scripts/baseline.mjs', 'vitest.config.ts', '.nvmrc'), '');

function execute(input: any) {
  const caseStart = performance.now(), formation = FORMATION_BY_ID[input.formation];
  // These are the original declared seeds and unchanged generation/selection,
  // not a new roster sample. Preserve original names, personnel and call labels.
  const setup = { offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: manifest.strength }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: manifest.strength }), 'base43'),
    offCall: { formation, flip: input.flip, kind: 'run' as const, run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43' as const, front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: manifest.los, ballY: CENTER_Y, firstDownX: manifest.firstDownX, seed: input.seed };
  const sim = new PlaySim(setup);
  assert.equal(sim.world.handContact, 'center');
  assert.equal(sim.world.handIntegration, 'centered');
  assert.equal(sim.world.supportModel, 'legacy');
  assert.equal(sim.world.supportIntegration, 'mean');
  const actors = sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team, player: snap(a.player),
    profile: snap(a.profile), initialBody: snap(a.body), initialBehavior: snap(a.behavior),
    initialEyes: snap(a.eyes), initialRunFit: snap(a.runFit) }));
  const hashes: string[] = [], frames: any[] = [], consumed: any[] = [], phases: any[] = [];
  const selected = new Set(sim.agents.filter(a => a.team === 'O' || ['DE_S', 'DT_S', 'DT_W', 'LB_M', 'CB_S'].includes(a.slot)).map(a => a.idx));
  const body = (a: Agent) => ({ idx: a.idx, pos: snap(a.pos), vel: snap(a.vel), facing: a.facing,
    spin: a.body.spin, energy: a.body.energy, support: snap(a.body.support), downUntil: a.downUntil });
  const rep = (e: any) => ({ blocker: e.blocker.idx, defender: e.defender.idx, helpers: e.helpers.map((a: Agent) => a.idx),
    start: e.start, control: e.control, phi: e.phi, drive: snap(e.drive), surfaceAxis: snap(e.surfaceAxis),
    contactReported: e.contactReported ?? false });
  const joint = (j: any) => ({ kind: j.kind, a: sim.world.indexOf(j.a), b: sim.world.indexOf(j.b),
    gap: j.gap ?? null, hold: j.hold ?? null, capacity: j.capacity ?? null, broken: j.broken ?? false,
    normalForce: j.normalForce ?? null, tangentForce: j.tangentForce ?? null, force: j.force ?? null,
    forceOnB: snap(j.forceOnB), momentOnA: j.momentOnA ?? null, momentOnB: j.momentOnB ?? null });
  const see = sim.see.bind(sim);
  sim.see = (a, b, scale) => {
    const seen = see(a, b, scale);
    if (selected.has(a.idx)) consumed.push({ t: sim.t, actor: a.idx, target: b.idx, scale: scale ?? 1, seen: snap(seen) });
    return seen;
  };
  runContactObservers.set(sim, (e, phase, data) => phases.push({ t: sim.t, phase, rep: rep(e), data: snap(data) }));
  let before: any, report: any, jointsAtWorldEnd: any[] = [], requested: any, delivered: any, beforeReps: any;
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    before = sim.agents.filter(a => selected.has(a.idx)).map(body);
    requested = snap(Reflect.get(sim, 'cmds'));
    delivered = snap(intents);
    beforeReps = sim.engagements.map(rep);
    const original = step(intents, dt);
    // Capture before later controller/tackle cleanup can remove a blocking joint.
    report = snap(original); jointsAtWorldEnd = sim.world.joints.map(joint);
    return original;
  };
  let crossing: number | null = null, censoredByBudget = false;
  while (sim.phase === 'live' && sim.t < manifest.stopSeconds) {
    if ((performance.now() - started) / 1000 > manifest.maximumBatchWallSeconds) { censoredByBudget = true; break; }
    const t = sim.t, cuesAt = consumed.length, phasesAt = phases.length, eventsAt = sim.events.length;
    sim.tick();
    const state = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
    hashes.push(sha(serialize(state)));
    const rb = sim.slot('RB')!;
    if (crossing === null && sim.carrier === rb && rb.pos.x >= sim.los) crossing = sim.t;
    frames.push({ t, after: sim.t, carrier: sim.carrier?.idx ?? null, before, afterBodies: sim.agents.filter(a => selected.has(a.idx)).map(body),
      requested, delivered, beforeReps, afterReps: sim.engagements.map(rep), jointsAtWorldEnd,
      jointsAfterControllerCleanup: sim.world.joints.map(joint), report,
      consumed: consumed.slice(cuesAt), contactPhases: phases.slice(phasesAt), events: snap(sim.events.slice(eventsAt)) });
  }
  runContactObservers.delete(sim);
  const result = sim.buildResult(), first = sim.events.find(e => e.type === 'carrier_contact');
  const old = context.rows.find((r: any) => r.id === input.id);
  const historySha256 = sha(JSON.stringify(hashes));
  const summary = { id: input.id, outcome: result.outcome, complete: sim.phase !== 'live' && result.outcome !== 'timeout',
    censoredByBudget, duration: sim.t, crossing, gain: result.yards, result: snap(result),
    firstContact: first ? { t: first.t, actor: first.a === undefined ? null : sim.agents[first.a].slot,
      opponent: first.b === undefined ? null : sim.agents[first.b].slot, note: first.note,
      depth: sim.firstContactX === null ? null : sim.firstContactX - sim.los } : null,
    setupSha256: sha(serialize(setup)), selectedActorsSha256: sha(serialize(actors)), ticks: hashes.length,
    fullStateRngHistorySha256: historySha256,
    historicalContext: { baseline: old.baseline, isolated: old.isolated,
      exactHistoricalCenterStateRngHistory: historySha256 === old.baselineFullHistorySha256,
      exactHistoricalIsolatedStateRngHistory: historySha256 === old.isolatedFullHistorySha256 },
    elapsedSeconds: (performance.now() - caseStart) / 1000 };
  console.log(JSON.stringify({ id: summary.id, outcome: summary.outcome, complete: summary.complete,
    gain: summary.gain, crossing: summary.crossing, firstContact: summary.firstContact }));
  return { input, setup: snap(setup), actors, hashes, frames, summary };
}

const panel: ReturnType<typeof execute>[] = [];
for (const input of manifest.inputs) {
  if ((performance.now() - started) / 1000 > manifest.maximumBatchWallSeconds) break;
  const row = execute(input); panel.push(row);
  if (!row.summary.complete) break;
}
const provenance = { developCommit: manifest.developCommit, collectorCommit, sourceSha256: source,
  collectorSha256: fileHash('scripts/diag/zone/ace-production-replay.ts'), manifestSha256: fileHash(manifestPath),
  historicalContextSha256: fileHash(contextPath), flags, flagsSha256: sha(JSON.stringify(flags)),
  worldDefaults: profile.worldDefaults, worldSha256: fileHash('src/physics/world.ts'), lockSha256: fileHash('package-lock.json'),
  node: process.version, platform: process.platform, arch: process.arch, startedAt, finishedAt: new Date().toISOString(),
  elapsedSeconds: (performance.now() - started) / 1000 };
const packet = { protocol: 'ace-production-replay-traces-v1', provenance, manifest, panel };
const packetPath = join(directory, 'traces.json.gz');
writeFileSync(packetPath, gzipSync(serialize(packet)));
const receipt = { protocol: 'ace-production-replay-v1', provenance, cases: panel.map(p => p.summary),
  unrun: manifest.inputs.slice(panel.length).map((i: any) => i.id), executions: panel.length,
  tracePacket: { sha256: fileHash(packetPath), bytes: readFileSync(packetPath).length },
  sourceUnchanged: sourceVersion() === source, collectorUnchanged: git('rev-parse', 'HEAD') === collectorCommit,
  observation: 'Original perception/World methods invoked once per original call. Snapshots and existing passive observer only; no interventions or new RNG/see/previews. One execution per case; no new observed/plain duplicate run. Full-state histories use the original reference serializer/tick loop.',
  forceMeasurement: 'Hand normal/tangent fields are signed tick-average impulse/dt, not final-substep samples or proof of continuous retention. Center mode does not expose patch-only force vectors/moments; null means unavailable, not zero.',
  limitations: ['One accepted-production replay, not a runtime candidate or league benchmark.',
    'Historical center and patch/legacy observations are reused on their own source/flag pins, never relabeled as current production.',
    'Request/delivery/achieved paths, nominal engagement and nonzero average load do not alone establish protection through runner arrival.',
    'Existing center-contact conservation and football limitations remain; no experimental law or collection/base/controller patch applied.'] };
writeFileSync(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
assert(receipt.sourceUnchanged && receipt.collectorUnchanged, 'Source/collector drift');
assert.equal(panel.length, 3, 'Incomplete declared batch');
assert(panel.every(p => p.summary.complete), 'Censored cases are not completed outcomes');
console.log(JSON.stringify({ completed: panel.length, collectorSeconds: provenance.elapsedSeconds, packetBytes: receipt.tracePacket.bytes }));
