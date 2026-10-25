/** Read-only explanation of the first differing applied command in two
 * traffic-turning-witness packets. Forecasts use existing consumed pictures.
 * node --import tsx scripts/diag/traffic-turning-first-instruction.ts \
 *   --before=<baseline.json.gz> --after=<candidate.json.gz> \
 *   --expected-source=<current-whole-source-sha> --output=<review.json>
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { previewFreeMovement, type MovementSample } from '../../src/physics/movement-preview.js';
import type { Body } from '../../src/physics/kinematics.js';
import type { Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--([a-z-]+)=(.+)$/.exec(arg);
  if (!match) throw new Error(`Expected --name=value, received ${arg}`);
  return [match[1], match[2]];
}));
if (!args.before || !args.after || !args.output || !args['expected-source']
  || Object.keys(args).some(key => !['before', 'after', 'expected-source', 'output'].includes(key))) {
  throw new Error('Specify --before, --after, --expected-source and --output');
}
const expected = args['expected-source'], currentSource = sourceVersion();
if (currentSource !== expected) throw new Error(`Expected source ${expected}, found ${currentSource}`);
const read = (path: string) => {
  const bytes = readFileSync(resolve(path));
  return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString());
};
const before = read(args.before), after = read(args.after), equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
if (before.sourceBefore !== before.sourceAfter || after.sourceBefore !== expected || after.sourceAfter !== expected
  || before.initialSha256 !== after.initialSha256 || !before.observerVerified || !after.observerVerified) {
  throw new Error('Packets lack matched initial/source/observer controls');
}
let old: any, fresh: any;
for (let i = 0; i < Math.min(before.steps.length, after.steps.length); i++) {
  const a = before.steps[i], b = after.steps[i];
  if (a.before.t !== b.before.t) throw new Error('Inspection tick mismatch');
  if (!equal(a.before.intents, b.before.intents)) { old = a; fresh = b; break; }
}
if (!old || !fresh) throw new Error('No common-tick applied-command difference');

function minimum(source: Body, samples: readonly MovementSample[], peer: any, touch: number) {
  let x = source.pos.x - peer.pos.x, y = source.pos.y - peer.pos.y, min = Math.hypot(x, y);
  for (const sample of samples) {
    const rx = sample.pos.x - peer.pos.x - peer.vel.x * sample.t;
    const ry = sample.pos.y - peer.pos.y - peer.vel.y * sample.t, ex = rx - x, ey = ry - y;
    const along = Math.max(0, Math.min(1, -(x * ex + y * ey) / Math.max(1e-12, ex * ex + ey * ey)));
    min = Math.min(min, Math.hypot(x + along * ex, y + along * ey)); x = rx; y = ry;
  }
  return { minimum: min, touch, clearance: min - touch };
}
const actors = old.before.bodies.filter((a: any) => !equal(old.before.intents[a.idx], fresh.before.intents[a.idx])).map((actor: any) => {
  const source: Body = structuredClone(actor.body);
  // Native upright support begins at -Infinity; JSON serializes it as null.
  if (source.support?.state === 'up' && source.support.since === null) source.support.since = -Infinity;
  const original: Intent = old.before.intents[actor.idx], candidate: Intent = fresh.before.intents[actor.idx], s = source.support;
  const loaded = actor.engaged || actor.down || !s || s.state !== 'up' || s.foot || s.strike
    || Math.hypot(s.lean.x, s.lean.y) > 1e-6 || Math.hypot(s.load.x, s.load.y) > 1e-6
    || (source.squeeze ?? 0) > 1e-6 || (original.squeeze ?? 0) > 1e-6
    || original.free || original.dive || original.lunge || (original.push ?? 0) > 1e-6
    || old.before.joints.some((j: any) => !(j.kind === 'grasp' && j.broken) && (j.a === actor.slot || j.b === actor.slot))
    || old.before.previousContacts.some((c: any) => c.i === actor.idx || c.j === actor.idx);
  const team = before.initial.find((a: any) => a.slot === actor.slot).team;
  const last = new Map<string, any>();
  for (const read of fresh.before.reads) if (read.observer === actor.slot && read.team === team && read.target !== actor.slot) last.set(read.target, read.image);
  const forecasts = loaded ? null : [original, candidate].map(cmd => previewFreeMovement(source, cmd, old.before.t, 12));
  const peers = [...last].map(([slot, seen]) => {
    const actual = old.before.bodies.find((a: any) => a.slot === slot).body;
    const touch = .9 * (source.profile.radius + actual.profile.radius);
    return { slot, seen, actualBodyAtCue: actual,
      original: forecasts ? minimum(source, forecasts[0], seen, touch) : null,
      candidate: forecasts ? minimum(source, forecasts[1], seen, touch) : null };
  });
  const contacts = (packet: any) => packet.steps.flatMap((step: any) => step.report.contacts
    .filter((c: any) => c.i === actor.idx || c.j === actor.idx)
    .map((c: any) => ({ t: step.before.t, ...c, other: packet.initial[c.i === actor.idx ? c.j : c.i].slot })));
  return { slot: actor.slot, original, candidate, freeForecastAvailable: !loaded, peers,
    originalForecast: forecasts?.[0] ?? null, candidateForecast: forecasts?.[1] ?? null,
    actualBaselineContacts: contacts(before), actualCandidateContacts: contacts(after) };
});
const output = resolve(args.output), result = {
  schema: 'traffic-first-instruction-v1', source: currentSource, baselineSource: before.sourceBefore,
  firstDifferenceT: old.before.t, bodiesEqual: equal(old.before.bodies, fresh.before.bodies),
  commandsEqual: equal(old.before.commands, fresh.before.commands), jointsEqual: equal(old.before.joints, fresh.before.joints),
  consumedReadsEqual: equal(old.before.reads, fresh.before.reads), actors,
  inputSha256: Object.fromEntries([['before', args.before], ['after', args.after]].map(([key, path]) => [key, createHash('sha256').update(readFileSync(resolve(path))).digest('hex')])),
  toolSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  method: 'Readonly reconstruction of first differing applied command. Held 12-step production free motion against last consumed same-team pictures; no live teammate velocity, extra reads or future commands. Restore only JSON-null upright Support.since to native -Infinity. Loaded/squeezed actors are reported without a free forecast; actual native contacts remain separate.',
};
if (sourceVersion() !== currentSource) throw new Error('Source changed during inspection');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, source: currentSource, baselineSource: result.baselineSource,
  firstDifferenceT: result.firstDifferenceT, bodiesEqual: result.bodiesEqual, commandsEqual: result.commandsEqual,
  jointsEqual: result.jointsEqual, consumedReadsEqual: result.consumedReadsEqual,
  actors: actors.map((a: any) => ({ slot: a.slot, original: a.original, candidate: a.candidate,
    freeForecastAvailable: a.freeForecastAvailable,
    conflictingPeers: a.peers.filter((p: any) => p.original?.clearance < 0).map((p: any) => ({ slot: p.slot, original: p.original, candidate: p.candidate })) })) }));
