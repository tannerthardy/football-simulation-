/** Native six-tail command audit. Observer only: no extra controller/see/RNG calls.
 * Usage: node --import tsx native-tail-commands.ts ARCHIVE SOURCE OUTPUT REFERENCE
 * REFERENCE is the saved parent six-tail enriched packet, not a new call sample.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { encodeBody, decodeBody } from './native-body-codec.mjs';

const [archiveArg, expected, outputArg, referenceArg] = process.argv.slice(2);
if (!archiveArg || !expected || !outputArg || !referenceArg || process.argv.length !== 6)
  throw Error('Usage: native-tail-commands.ts ARCHIVE SOURCE OUTPUT REFERENCE');
const archive = resolve(archiveArg), output = resolve(outputArg), referencePath = resolve(referenceArg);
if (output === referencePath) throw Error('Output must differ from immutable reference');
const shaBytes = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const hash = (v: any) => shaBytes(JSON.stringify(v));
const clone = (v: any) => JSON.parse(JSON.stringify(v));
function sourceSha(root: string): string {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
  const h = createHash('sha256');
  for (const name of files(join(root, 'src')).map(f => relative(root, f)).sort())
    h.update(name).update('\0').update(readFileSync(join(root, name))).update('\0');
  return h.digest('hex');
}
if (sourceSha(archive) !== expected) throw Error('Announced source pin mismatch');
const referenceBytes = readFileSync(referencePath);
const reference = JSON.parse(gunzipSync(referenceBytes).toString('utf8'));
const parent = '601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b';
if (reference.sourceBefore !== parent || reference.sourceAfter !== parent || reference.rows.length !== 6)
  throw Error('Reference must be the promoted parent six-tail packet');
const imp = (p: string) => import(pathToFileURL(join(archive, p)).href);
const { CENTER_Y } = await imp('src/core/field.ts');
const { Rng } = await imp('src/core/rng.ts');
const { generateTeam, pickDefense, pickOffense } = await imp('src/league/team.ts');
const { PASS_BY_ID } = await imp('src/playbook/concepts.ts');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await imp('src/playbook/defense.ts');
const { FORMATION_BY_ID } = await imp('src/playbook/formations.ts');
const { PlaySim } = await imp('src/sim/playsim.ts');
const teams = { offense: generateTeam(new Rng(41), 'Awareness offense', 'AOF', { strength: .55 }),
  defense: generateTeam(new Rng(42), 'Awareness defense', 'ADF', { strength: .55 }) };
const cases = [
  { concept: 'curl_flat', formation: 'gun_doubles_11', coverage: 'cover2', flip: false },
  { concept: 'curl_flat', formation: 'gun_doubles_11', coverage: 'cover3', flip: false },
  { concept: 'pa_post_dig', formation: 'ace_12', coverage: 'cover3', flip: false },
  { concept: 'curl_flat', formation: 'gun_doubles_11', coverage: 'cover2', flip: true },
  { concept: 'curl_flat', formation: 'gun_doubles_11', coverage: 'cover3', flip: true },
  { concept: 'pa_post_dig', formation: 'ace_12', coverage: 'cover3', flip: true },
];
function make(c: typeof cases[number], record: boolean): any {
  const formation = FORMATION_BY_ID[c.formation];
  return new PlaySim({ offense: pickOffense(teams.offense, formation.personnel), defense: pickDefense(teams.defense, 'nickel'),
    offCall: { formation, flip: c.flip, kind: 'pass', pass: PASS_BY_ID[c.concept], label: `${c.formation}/${c.concept}` },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[c.coverage], pressure: null,
      zoneStyle: 'match', label: `Over ${c.coverage}` }, los: 40, ballY: CENTER_Y, firstDownX: 50,
    seed: 3, record, recordLevel: 'full', recordEvery: 1, audibles: false });
}
const cleanResult = (r: any) => ({ ...r, frames: undefined, telemetry: undefined });
function signature(sim: any, result: any): string {
  return hash({ result: cleanResult(result), bodies: sim.agents.map((a: any) => a.body), intents: sim.intents,
    minds: sim.agents.map((a: any) => a.mind), rng: { ...sim.rng } });
}
const nextCopiedRng = (sim: any): number => Object.assign(new Rng(0), sim.rng).nextU32();
function actorState(a: any) {
  return { idx: a.idx, slot: a.slot, team: a.team, body: encodeBody(a.body), speedScale: a.speedScale,
    read: a.recog?.read ?? null, behavior: a.behavior.kind, behaviorClass: a.behavior.constructor.name,
    zone: a.behavior.zone ?? null, job: a.behavior.job ?? null, target: a.behavior.target?.idx ?? null,
    engagement: a.engagement ? { owner: a.engagement.blocker.idx, defender: a.engagement.defender.idx } : null };
}
const rows: any[] = [];
for (const c of cases) {
  const id = `DA-R2-${c.concept}-${c.coverage}-${c.flip ? 'L' : 'R'}`;
  const saved = reference.rows.find((r: any) => r.id === id);
  if (!saved) throw Error(`Reference lacks ${id}`);
  const sim = make(c, true);
  const setup = clone({ offCall: sim.offCall, defCall: sim.defCall, los: sim.los, ballY: sim.ballY,
    firstDownX: sim.firstDownX, seed: 3, down: 1, audibles: false, hurry: sim.hurry, wind: sim.wind,
    record: true, recordLevel: 'full', recordEvery: 1 });
  const offAlign = clone(sim.offAlign);
  const physicalInitial = clone(sim.agents.map((a: any) => ({ idx: a.idx, slot: a.slot,
    body: a.body, mind: a.mind, recognition: a.recog })));
  const exactInitialBodies = sim.agents.map((a: any) => ({ idx: a.idx, slot: a.slot, body: encodeBody(a.body) }));
  // The support clock is actually -Infinity, not the null in older JSON-only
  // packets. Verify the narrow codec before retaining any free-rollout input.
  for (const a of sim.agents) {
    const decoded = decodeBody(encodeBody(a.body));
    if (!Object.is(decoded.support.since, a.body.support.since)) throw Error('Body support clock codec mismatch');
  }
  const initialRng = clone({ ...sim.rng });
  const profilesSha256 = hash(sim.agents.map((a: any) => ({ slot: a.slot, player: a.player, profile: a.profile })));
  for (const [key, value] of Object.entries({ setup, offAlign, physicalInitial, initialRng, profilesSha256 }))
    if (hash(value) !== hash(saved[key])) throw Error(`${id}: native initial ${key} changed`);

  const pictures: any[] = [], commands: any[] = [], steps: any[] = [], transitions: any[] = [];
  const behaviorUpdates = new Map<any, { update: any; own: PropertyDescriptor | undefined }>();
  const behaviorProperties: Array<{ a: any; descriptor: PropertyDescriptor }> = [];
  let active: any = null;
  const oldSee = sim.see, oldStep = sim.world.step;
  function wrap(b: any) {
    if (behaviorUpdates.has(b)) return;
    const update = b.update;
    behaviorUpdates.set(b, { update, own: Object.getOwnPropertyDescriptor(b, 'update') });
    b.update = function (a: any, s: any) {
      const parentActive = active, begin = pictures.length;
      const record: any = { t: s.t, a: a.idx, slot: a.slot, kind: this.kind, behaviorClass: this.constructor.name,
        targetBefore: this.target?.idx ?? null, ballBefore: s.ball.kind, carrierBefore: s.carrier?.idx ?? null,
        throwAt: s.throwAt, catchAt: s.catchAt, bodyBefore: encodeBody(a.body), speedScale: a.speedScale,
        mindBefore: clone(a.mind), readBefore: a.recog?.read ?? null, picturesFrom: begin,
        airPath: s.ball.kind === 'air' ? clone(s.ballPath) : null };
      active = record;
      let command: any;
      try { command = update.call(this, a, s); }
      finally { active = parentActive; }
      record.rawCommand = clone(command);
      record.targetAfter = this.target?.idx ?? null;
      record.picturesTo = pictures.length;
      record.windowPictureIndices = pictures.slice(begin).flatMap((p, i) =>
        p.site?.some((f: string) => f.includes('observedCatchWindow')) ? [begin + i] : []);
      commands.push(record);
      return command;
    };
  }
  // Preserve every actual replacement, including transitions during an earlier
  // actor's update in the same tick. Reading/assigning a behavior runs no brain.
  for (const a of sim.agents) {
    const descriptor = Object.getOwnPropertyDescriptor(a, 'behavior');
    if (!descriptor || !('value' in descriptor) || !descriptor.configurable)
      throw Error(`${id}: unexpected behavior property`);
    behaviorProperties.push({ a, descriptor });
    let current = a.behavior; wrap(current);
    Object.defineProperty(a, 'behavior', { enumerable: descriptor.enumerable, configurable: true,
      get() { return current; }, set(b) { const previous = current; current = b; wrap(b);
        transitions.push({ t: sim.t, a: a.idx, previous: previous.constructor.name,
          next: b.constructor.name, previousKind: previous.kind, nextKind: b.kind }); } });
  }
  sim.see = function (a: any, b: any, scale: any) {
    const cue = oldSee.call(this, a, b, scale);
    // Capture call-site provenance only while an actual defender handles air.
    // The Error stack is an observer record: no engine function is reinvoked.
    const site = active && active.a === a.idx && a.team === 'D' && sim.ball.kind === 'air'
      ? (new Error().stack ?? '').split('\n').slice(1)
        .filter(f => f.includes('/src/sim/behaviors/defense.') || f.includes('/src/sim/behaviors/receiver.'))
        .map(f => f.trim().replaceAll(archive + '/', '')).slice(0, 4) : null;
    pictures.push({ t: sim.t, a: a.idx, b: b.idx, actor: active?.a ?? null,
      controller: active?.behaviorClass ?? null, scale: scale ?? 1, cue: clone(cue), site });
    return cue;
  };
  sim.world.step = function (intents: any, dt: number) {
    const commandIndices = commands.flatMap((v, i) => v.t === sim.t ? [i] : []);
    const before = { t: sim.t, dt, ball: sim.ball.kind, carrier: sim.carrier?.idx ?? null,
      catchAt: sim.catchAt, throwAt: sim.throwAt, commands: commandIndices,
      containedCommands: clone(sim.cmds), appliedCommands: clone(intents), agents: sim.agents.map(actorState) };
    const result = oldStep.call(this, intents, dt);
    steps.push({ ...before, report: clone(result), achievedAgents: sim.agents.map(actorState) });
    return result;
  };
  let result: any;
  try { result = sim.run(); }
  finally {
    sim.see = oldSee; sim.world.step = oldStep;
    for (const { a, descriptor } of behaviorProperties)
      Object.defineProperty(a, 'behavior', { ...descriptor, value: a.behavior });
    for (const [b, { own }] of behaviorUpdates)
      if (own) Object.defineProperty(b, 'update', own); else delete b.update;
  }
  const executionSha256 = signature(sim, result), resultSha256 = hash(cleanResult(result));
  const nextRng = clone({ ...sim.rng }), nextRngU32 = nextCopiedRng(sim);
  const plain = make(c, false), plainInitialRng = clone({ ...plain.rng });
  const plainExactInitialBodies = plain.agents.map((a: any) => ({ idx: a.idx, slot: a.slot, body: encodeBody(a.body) }));
  if (hash(exactInitialBodies) !== hash(plainExactInitialBodies)) throw Error(`${id}: exact initial bodies differ`);
  const plainResult = plain.run();
  const plainExecutionSha256 = signature(plain, plainResult), plainNextRng = clone({ ...plain.rng });
  const plainNextRngU32 = nextCopiedRng(plain);
  if (executionSha256 !== plainExecutionSha256 || hash(nextRng) !== hash(plainNextRng)
    || nextRngU32 !== plainNextRngU32 || hash(initialRng) !== hash(plainInitialRng))
    throw Error(`${id}: observer/plain execution or copied RNG mismatch`);
  const parentExecutionExact = executionSha256 === saved.executionSha256;
  const parentResultExact = resultSha256 === hash(cleanResult(saved.result));
  if (expected === parent && (!parentExecutionExact || !parentResultExact))
    throw Error(`${id}: parent result or endpoint not retained exactly`);
  rows.push({ id, case: c, setup, offAlign, physicalInitial, exactInitialBodies, initialRng, profilesSha256,
    executionSha256, plainExecutionSha256, resultSha256, plainResultSha256: hash(cleanResult(plainResult)),
    nextRng, plainNextRng, nextRngU32, plainNextRngU32, observerVerified: true,
    parentExecutionExact, parentResultExact, parentExecutionSha256: saved.executionSha256,
    players: sim.agents.map((a: any) => ({ idx: a.idx, slot: a.slot, team: a.team, player: a.player, profile: a.profile })),
    result, pictures, commands, steps, transitions });
  console.log(JSON.stringify({ id, gain: result.offenseYards, outcome: result.outcome,
    steps: steps.length, commands: commands.length, windowCommands: commands.filter(c => c.windowPictureIndices.length).length,
    observerVerified: true, parentExecutionExact, parentResultExact }));
}
if (sourceSha(archive) !== expected) throw Error('Announced source changed during collection');
const packet = { schema: 'retained-passing-tail-command-panel-v2', sourceBefore: expected, sourceAfter: sourceSha(archive),
  archiveRoot: archive, toolSha256: shaBytes(readFileSync(fileURLToPath(import.meta.url))),
  bodyCodecSha256: shaBytes(readFileSync(new URL('./native-body-codec.mjs', import.meta.url))),
  reference: { path: referencePath, source: parent, sha256: shaBytes(referenceBytes) },
  definitions: { rawCommand: 'One actual behavior.update return, captured before containment/contact/spacing refinement.',
    containedCommands: 'Actual sim.cmds at World entry; containment precedes contact/spacing.',
    appliedCommands: 'Actual World input after contact, teammate spacing and snap cue enforcement.',
    bodies: 'Exact body/profile/energy/support before controller, before World and after World; no preview was invoked by collector.',
    bodyEncoding: 'Diagnostic native-body-codec: {$number:"-Infinity"|"Infinity"|"NaN"} and {$undefined:true}, decoded recursively without dropping own undefined fields. Legacy physicalInitial/minds retain the older JSON projection for saved reference compatibility, not a complete mind/Map checkpoint.',
    windowPictures: 'Indices of already-requested see pictures from observedCatchWindow, detected with observer-only call stacks; all candidate pictures retained, no recomputed candidate or intended target.',
    rng: 'Complete RNG states and nextU32 from separate copied RNG instances; live RNG never advanced by observer.' },
  limits: ['Retrospective six original native inputs, not a representative call mix.',
    'Behavior return includes the current top-level controller; an internal CoverageDefender sub-technique is not separately invoked or instrumented.',
    'Window pictures are consumed inputs, not a claimed selected receiver; saved-input interpretation must preserve the original algorithm and uncertainty.',
    'Exact future ballPath is inherited engine prediction, retained diagnostically; observer does not supply new information to controllers.'], rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(packet), { level: 9 }), { flag: 'wx' });
console.log(JSON.stringify({ output, source: expected, rows: rows.length, observerPlainVerified: rows.length,
  retainedParentExecutions: rows.filter(r => r.parentExecutionExact).length }));
