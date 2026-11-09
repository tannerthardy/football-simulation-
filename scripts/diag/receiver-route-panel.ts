/** Bounded receiver panel. Capture once on the base, replay the same constructor
 * bytes on each candidate. This is a native call panel, not ordinary-game film.
 * No additional player reads, decisions, random draws or physics steps.
 *
 * node --import tsx scripts/diag/receiver-route-panel.ts --capture \
 *   --inputs out/receiver-study/inputs --out out/receiver-study/base
 * node --import tsx scripts/diag/receiver-route-panel.ts \
 *   --inputs out/receiver-study/inputs --out out/receiver-study/head
 */
import { deepStrictEqual } from 'node:assert';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { serialize, deserialize } from 'node:v8';
import { gzipSync } from 'node:zlib';
import { parseArgs, isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Rng } from '../../src/core/rng.js';
import { ROUTES } from '../../src/playbook/routes.js';
import type { RouteDef } from '../../src/playbook/types.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { RouteRunner } from '../../src/sim/behaviors/receiver.js';
import { identity } from '../../src/sim/command-trace.js';
import { nativeTraceSetup } from './command-trace.js';
import { captureSetup, restoreSetup, copySaved, bytesHash, initialState, executionIdentity } from './saved-play.js';

/** Selected before outcomes; shift zero is seed 7, shifts 1–4 are named RNGs. */
const CASES = [
  { id: 'stick-man', concept: 'stick', coverage: 'cover1_off', roster: 7, flip: false, actor: 'Y' },
  { id: 'stick-zone', concept: 'stick', coverage: 'cover3', roster: 7, flip: false, actor: 'Y' },
  { id: 'hitch-control', concept: 'hitches', coverage: 'cover4', roster: 7, flip: false, actor: 'Y' },
  { id: 'mesh-corner', concept: 'mesh', coverage: 'cover3', roster: 7, flip: false, actor: 'Z' },
  { id: 'outs-control', concept: 'quick_outs', coverage: 'cover3', roster: 7, flip: false, actor: 'Z' },
  { id: 'fresh-stick-man-mirror', concept: 'stick', coverage: 'cover1_off', roster: 11, flip: true, actor: 'Y' },
  { id: 'fresh-stick-quarters', concept: 'stick', coverage: 'cover4', roster: 11, flip: false, actor: 'Y' },
  { id: 'verts-control', concept: 'four_verts', coverage: 'cover3', roster: 7, flip: false, actor: 'Y' },
] as const;
const MIDDLE_CASES = [
  { id: 'middle-read-cover2', concept: 'four_verts', coverage: 'cover2', roster: 7, flip: false, actor: 'Y' },
  { id: 'middle-read-cover3', concept: 'four_verts', coverage: 'cover3', roster: 7, flip: false, actor: 'Y' },
] as const;
// Separate, preselected release panel: same installed flat in two formations,
// a fresh mirrored Curl-Flat, and an off-man opposing control. These do not
// alter the original constructor panel or the custom middle-read install.
const FLAT_CASES = [
  { id: 'flat-slant-gun', concept: 'slant_flat', coverage: 'cover3', roster: 7, flip: false, actor: 'Y', formation: 'gun_doubles_11' },
  { id: 'flat-slant-ace', concept: 'slant_flat', coverage: 'cover3', roster: 7, flip: false, actor: 'Y', formation: 'ace_11' },
  { id: 'flat-curl-fresh-mirror', concept: 'curl_flat', coverage: 'cover3', roster: 11, flip: true, actor: 'Y', formation: 'gun_doubles_11' },
  { id: 'flat-slant-offman', concept: 'slant_flat', coverage: 'cover1_off', roster: 7, flip: false, actor: 'Y', formation: 'gun_doubles_11' },
] as const;
// Frozen install in both arms. Trunk executes its base seam but does not yet
// implement the extra read metadata. This is a custom installed native call,
// not an ordinary-game play or a player fed simulated future information.
const MIDDLE_ROUTE = { id: 'seam_read', family: 'deep', depth: 22, end: 'continue',
  points: [{ d: 10, l: -.4, s: .85 }, { d: 40, l: -1.2 }],
  read: { key: 'middle', depth: 8, answers: [
    { id: 'post', end: 'continue', points: [{ d: 10, l: -.4, s: .75 }, { d: 35, l: -14 }] },
    { id: 'under', end: 'continue', points: [{ d: 10, l: -.4, s: .4 }, { d: 10.5, l: -16 }] },
  ] } } as const;
interface Case { id: string; concept: string; coverage: string; roster: number; flip: boolean; actor: string; formation?: string }
interface Fixture { id: string; case: Case; shift: number; file: string; sha256: string; seed: unknown }
interface Manifest { format: 'receiver-route-panel-v1'; source: ReturnType<typeof executionIdentity>; fixtures: Fixture[];
  middleRead?: { label: 'custom installed native call'; route: typeof MIDDLE_ROUTE; routeSha256: string };
  flatRelease?: { label: 'installed native flat release panel' } }

/** Private legacy conversion state is recorded as state, not interpreted as
 * an acquired read. New routeDecision holds the actual consumed evidence. */
function routeState(route: RouteRunner) {
  const stored = route as unknown as { converted?: boolean; routeDecision?: unknown; routeEnd?: string };
  return copySaved({ route: route.route.id, idx: route.idx, settled: route.settled,
    converted: stored.converted ?? null, decision: stored.routeDecision ?? null,
    end: stored.routeEnd ?? route.route.end, path: route.path,
    installedPointCount: route.route.points.length });
}

function execute(bytes: Buffer, selected: string, observed: boolean) {
  const sim = new PlaySim(restoreSetup(bytes)), initial = initialState(sim), actor = sim.slot(selected);
  if (!actor || actor.team !== 'O' || !(actor.behavior instanceof RouteRunner)) throw new Error(`Missing route actor ${selected}`);
  const route = actor.behavior, installed = routeState(route);
  const counts = { see: 0, world: 0 };
  const see = sim.see.bind(sim), step = sim.world.step.bind(sim.world);
  sim.see = (...args) => { counts.see++; return see(...args); };
  sim.world.step = (...args) => { counts.world++; return step(...args); };
  const trace = observed ? sim.recordCommands({ actor: { playerId: actor.player.id }, from: 0, to: 25.1 }) : null;
  const routeSteps: Array<{ at: number; owner: string; before: ReturnType<typeof routeState>; after: ReturnType<typeof routeState> }> = [];
  const qbForecasts: unknown[] = [];
  if (observed) {
    const update = route.update;
    route.update = function (a, play) {
      const before = routeState(this), owner = a.behavior.constructor.name;
      const request = update.call(this, a, play);
      routeSteps.push({ at: play.t, owner, before, after: routeState(this) });
      return request;
    };
    // Read the already computed cache directly. Accessing forecast.estimate
    // would call build(), and is deliberately not part of this observer.
    const qb = sim.qb.behavior as unknown as { receiverForecasts?: Map<object, {
      choice?: unknown; picture?: unknown; inferredCommitment?: boolean; cache?: { estimate: unknown } | null }> };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const stepStart = sim.t;
      tick();
      const stored = qb.receiverForecasts?.get(actor);
      qbForecasts.push(copySaved({ stepStart, endpointTime: sim.t, choice: stored?.choice ?? null,
        picture: stored?.picture ?? null, inferredCommitment: stored?.inferredCommitment ?? null,
        computedEstimate: stored?.cache?.estimate ?? null }));
    };
  }
  const result = sim.run();
  const privateStreams = (sim as unknown as { streams: Map<string, Rng> }).streams;
  const execution = copySaved({ initial, result,
    replay: { frames: result.frames, events: result.events, telemetry: result.telemetry, actors: sim.agents.map(identity) },
    terminal: { rng: sim.rng, streams: privateStreams, bodies: sim.agents.map(a => a.body),
      minds: sim.agents.map(a => a.mind), intents: sim.intents, perception: sim.perception }, counts });
  return { execution, installed, actor: identity(actor), routeSteps, qbForecasts, steps: trace?.steps ?? [] };
}

function hashes(execution: ReturnType<typeof execute>['execution']) {
  return { execution: bytesHash(serialize(execution)), result: bytesHash(serialize(execution.result)),
    events: bytesHash(serialize(execution.result.events)), replay: bytesHash(serialize(execution.replay)) };
}

function main() {
  const { values: args } = parseArgs({ options: { capture: { type: 'boolean' }, 'middle-read': { type: 'boolean' }, 'flat-release': { type: 'boolean' },
    inputs: { type: 'string' }, out: { type: 'string' }, cases: { type: 'string' }, actor: { type: 'string' } } });
  const middle = args['middle-read'] ?? false;
  const flat = args['flat-release'] ?? false;
  if (middle && flat) throw new Error('Select only one separate panel mode');
  const prefix = middle ? 'middle-' : flat ? 'flat-' : '';
  const inputs = resolve(args.inputs ?? `out/receiver-study/${prefix}inputs`);
  const out = resolve(args.out ?? `out/receiver-study/${prefix}head`), manifestPath = join(inputs, 'manifest.json');
  mkdirSync(inputs, { recursive: true }); mkdirSync(out, { recursive: true });
  const source = executionIdentity();
  let manifest: Manifest;
  if (args.capture) {
    if (existsSync(manifestPath)) throw new Error(`Refusing to replace captured constructors: ${manifestPath}`);
    manifest = { format: 'receiver-route-panel-v1', source, fixtures: [], ...(middle ? {
      middleRead: { label: 'custom installed native call' as const, route: copySaved(MIDDLE_ROUTE),
        routeSha256: bytesHash(Buffer.from(JSON.stringify(MIDDLE_ROUTE))) } } : {}),
      ...(flat ? { flatRelease: { label: 'installed native flat release panel' as const } } : {}) };
    const cases: readonly Case[] = middle ? MIDDLE_CASES : flat ? FLAT_CASES : CASES;
    for (const c of cases) for (let shift = 0; shift <= 4; shift++) {
      const id = `${c.id}-s${shift}`, setup = nativeTraceSetup({ ...c, seed: 7, formation: c.formation ?? 'gun_doubles_11' });
      if (middle) setup.offCall = { ...setup.offCall, label: 'Receiver middle-read lab', pass: { ...setup.offCall.pass!,
        id: 'receiver_middle_read', name: 'Receiver middle-read lab',
        strong: { 1: 'go', 2: 'seam_read', 3: 'flat' }, weak: { 1: 'go', 2: 'flat' }, back: 'block',
        progression: ['S2', 'S1', 'W1', 'W2', 'S3'] } };
      setup.seed = shift === 0 ? 7 : new Rng(7).fork(`receiver-route:${shift}`);
      setup.audibles = false; setup.record = true; setup.recordLevel = 'light';
      const bytes = captureSetup(setup), file = `${id}.setup.bin`;
      writeFileSync(join(inputs, file), bytes);
      manifest.fixtures.push({ id, case: c, shift, file, sha256: bytesHash(bytes), seed: copySaved(setup.seed) });
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  } else manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  if (manifest.format !== 'receiver-route-panel-v1') throw new Error('Unknown input format');
  if (!!manifest.middleRead !== middle) throw new Error('--middle-read must match the separate captured panel');
  if (!!manifest.flatRelease !== flat) throw new Error('--flat-release must match the separate captured panel');
  if (manifest.middleRead) {
    if (bytesHash(Buffer.from(JSON.stringify(manifest.middleRead.route))) !== manifest.middleRead.routeSha256)
      throw new Error('Installed middle-read definition checksum differs');
    if (ROUTES.seam_read) deepStrictEqual(ROUTES.seam_read, manifest.middleRead.route, 'Production seam_read differs from frozen install');
    ROUTES.seam_read = copySaved(manifest.middleRead.route) as unknown as RouteDef;
  }
  deepStrictEqual(source.settings, manifest.source.settings, 'Engine settings differ from captured panel');
  deepStrictEqual(source.node, manifest.source.node, 'Node differs from captured panel');
  const selected = args.cases?.split(','), rows: unknown[] = [], start = performance.now();
  for (const fixture of manifest.fixtures) {
    if (selected && !selected.includes(fixture.case.id) && !selected.includes(fixture.id)) continue;
    const bytes = readFileSync(join(inputs, fixture.file));
    if (bytesHash(bytes) !== fixture.sha256) throw new Error(`Constructor checksum differs: ${fixture.id}`);
    const selectedSlot = args.actor ?? fixture.case.actor;
    const plain = execute(bytes, selectedSlot, false), observed = execute(bytes, selectedSlot, true);
    deepStrictEqual(observed.execution, plain.execution, `${fixture.id}: observer changed complete execution`);
    const result = observed.execution.result, changes = observed.routeSteps.filter(r => !isDeepStrictEqual(r.before.decision, r.after.decision));
    const conversions = observed.routeSteps.filter(r => !r.before.converted && r.after.converted);
    // An extension index is necessary, not proof of which steering branch
    // authored the request: inspect the recorded raw command for that update.
    // A settled hitch's idx==path.length is not an extension activation.
    const continuation = observed.routeSteps.filter(r => !r.after.settled
      && r.after.path.length > r.after.installedPointCount
      && r.after.idx >= r.after.installedPointCount && r.after.idx < r.after.path.length);
    const row = { id: fixture.id, actor: observed.actor,
      selection: { slot: selectedSlot, overridesManifest: selectedSlot !== fixture.case.actor },
      setupSha256: fixture.sha256, exactObserver: true,
      hashes: hashes(observed.execution), outcome: result.outcome, yards: result.yards, duration: result.duration,
      stats: result.stats, decisions: changes.map(r => r.after.decision), legacyConversionAt: conversions.map(r => r.at),
      extensionIndexUpdates: continuation.length, firstExtensionIndexAt: continuation[0]?.at ?? null,
      installed: observed.installed, counts: observed.execution.counts };
    rows.push(row);
    writeFileSync(join(out, `${fixture.id}.execution.bin`), serialize(observed.execution));
    writeFileSync(join(out, `${fixture.id}.trace.json.gz`), gzipSync(JSON.stringify({ source, fixture, ...row,
      steps: observed.steps, routeSteps: observed.routeSteps, qbForecasts: observed.qbForecasts, events: result.events })));
    console.log(`${fixture.id}: ${result.outcome} ${result.yards.toFixed(2)} yd; options=${changes.length}, extension-index=${continuation.length}, observer EXACT`);
  }
  if (!rows.length) throw new Error('No panel cases selected');
  const endSource = executionIdentity();
  deepStrictEqual(endSource, source, 'Source/settings changed during panel execution');
  writeFileSync(join(out, 'summary.json'), JSON.stringify({ format: 'receiver-route-panel-v1', source,
    capturedSource: manifest.source, manifestSha256: bytesHash(readFileSync(manifestPath)),
    elapsedSeconds: (performance.now() - start) / 1000, rows }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
