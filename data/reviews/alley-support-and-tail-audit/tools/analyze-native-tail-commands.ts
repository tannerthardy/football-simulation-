/** Pure saved-input baseline query reconstruction; never runs a PlaySim/controller. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { encodeBody, decodeBody } from './native-body-codec.mjs';
const [archiveArg, inputArg, outputArg] = process.argv.slice(2);
if (!archiveArg || !inputArg || !outputArg || process.argv.length !== 5)
  throw Error('Usage: analyze-native-tail-commands.ts ARCHIVE BASELINE_PACKET OUTPUT_JSON');
const archive = resolve(archiveArg), input = resolve(inputArg), output = resolve(outputArg);
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
function sourceSha() {
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const h = createHash('sha256');
  for (const f of walk(join(archive, 'src')).map(f => relative(archive, f)).sort())
    h.update(f).update('\0').update(readFileSync(join(archive, f))).update('\0');
  return h.digest('hex');
}
const bytes = readFileSync(input), packet = JSON.parse(gunzipSync(bytes).toString('utf8'));
const baseline = '601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b';
if (packet.schema !== 'retained-passing-tail-command-panel-v2'
  || packet.sourceBefore !== baseline || packet.sourceAfter !== baseline || sourceSha() !== baseline)
  throw Error('This analyst reconstructs only the exact promoted parent baseline query');
if (sha(readFileSync(new URL('./native-body-codec.mjs', import.meta.url))) !== packet.bodyCodecSha256)
  throw Error('Body codec differs from collected packet');
const { timeToReach } = await import(pathToFileURL(join(archive, 'src/physics/reach.ts')).href);
function spot(c: any, body: any) {
  let last: any = null;
  for (const s of c.airPath) {
    if (s.t < c.t || s.z > body.profile.maxCatchHeight * .92) continue;
    const p = { x: s.x, y: s.y };
    if (s.z < .25) { last ??= { p, t: s.t, z: s.z }; break; }
    last = { p, t: s.t, z: s.z };
    const tt = timeToReach({ pos: body.pos, vel: body.vel, profile: body.profile, speedScale: c.speedScale }, p, body.profile.reach * .8);
    if (tt <= s.t - c.t) return { ...last, estimate: tt };
  }
  return last;
}
function window(c: any, row: any, players: Map<number, any>) {
  const pictures = c.windowPictureIndices.map((i: number) => ({ i, picture: row.pictures[i] }));
  if (pictures.map((p: any) => p.picture.b).join(',') !== '6,7,8,9,10')
    throw Error(`${row.id} ${c.t}/${c.a}: unexpected actual window picture order`);
  for (const s of c.airPath) {
    const remaining = s.t - c.t;
    if (remaining < 0 || s.z < .25) continue;
    for (const { i, picture } of pictures) {
      const receiver = players.get(picture.b), profile = receiver.profile, seen = picture.cue;
      if (s.z > profile.maxCatchHeight * .92) continue;
      const p = { x: s.x, y: s.y };
      if (Math.hypot(p.x - seen.pos.x, p.y - seen.pos.y) > profile.vmax * remaining + profile.reach) continue;
      const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile }, p, profile.reach * .8);
      if (tt <= remaining) return { p, t: s.t, receiver: picture.b, slot: receiver.slot,
        pictureIndex: i, consumed: seen, remaining, reachEstimate: tt };
    }
  }
  return null;
}
function arrival(c: any) {
  let last: any = null;
  for (const s of c.airPath) {
    if (s.t < c.t) continue;
    last = { x: s.x, y: s.y };
    if (s.z < 1.4 && s.t > c.t + .1) break;
  }
  return last;
}
const rows: any[] = []; let exactBodies = 0, fallbackCommands = 0, queryCommands = 0;
for (const row of packet.rows) {
  if (!row.observerVerified || !row.parentExecutionExact || !row.parentResultExact
    || row.executionSha256 !== row.plainExecutionSha256 || row.nextRngU32 !== row.plainNextRngU32)
    throw Error(`${row.id}: native receipts incomplete`);
  const players = new Map<number, any>(row.players.map((p: any) => [p.idx, p]));
  const steps = new Map<number, any>(row.steps.map((s: any) => [s.t, s]));
  const first = new Map<number, any>(), selected: any[] = [], counts = new Map<number, number>();
  for (const c of row.commands) {
    const body = decodeBody(c.bodyBefore);
    if (JSON.stringify(encodeBody(body)) !== JSON.stringify(c.bodyBefore)) throw Error('Body round-trip mismatch');
    exactBodies++;
    if (!c.windowPictureIndices.length) continue;
    queryCommands++;
    const w = window(c, row, players), sp = spot(c, body);
    const tt = sp ? timeToReach({ pos: body.pos, vel: body.vel, profile: body.profile, speedScale: c.speedScale }, sp.p, body.profile.reach) : null;
    const reachable = sp && tt! <= sp.t - c.t + .05 && (!w || sp.t <= w.t + .05);
    if (reachable) continue;
    const land = w?.p ?? arrival(c);
    if (!land) continue;
    const dx = land.x - body.pos.x, dy = land.y - body.pos.y, d = Math.hypot(dx, dy) || 1;
    const rating = players.get(c.a).player.ratings.tackling;
    const tackling = Math.max(0, Math.min(1, (rating - 1) / 98));
    const control = 2.2 + 2.5 * (1 - tackling);
    const allowed = Math.sqrt(control * control + 2 * body.profile.brake * .7 * Math.max(0, d - .3));
    const speed = Math.min(body.profile.vmax, allowed);
    const reconstructed = { vel: { x: dx / d * speed, y: dy / d * speed } };
    const error = Math.max(Math.abs(reconstructed.vel.x - c.rawCommand.vel.x), Math.abs(reconstructed.vel.y - c.rawCommand.vel.y));
    if (error > 1e-10 || 'facing' in c.rawCommand) throw Error(`${row.id}/${c.t}/${c.a}: baseline fallback reconstruction disagrees ${error}`);
    fallbackCommands++; counts.set(c.a, (counts.get(c.a) ?? 0) + 1);
    const step = steps.get(c.t);
    const evidence = { t: c.t, a: c.a, slot: c.slot, bodyBefore: c.bodyBefore, window: w,
      catchSpot: sp, defenderSpotReachEstimate: tt, selectedLand: land, rawCommand: c.rawCommand,
      containedCommand: step.containedCommands[c.a], appliedCommand: step.appliedCommands[c.a],
      reconstructedRawCommand: reconstructed, reconstructionMaxAbsError: error,
      achievedBody: step.achievedAgents.find((a: any) => a.idx === c.a).body };
    if (!first.has(c.a)) first.set(c.a, evidence);
    if ((row.id === 'DA-R2-curl_flat-cover2-R' && c.a === 21 && [2.75, 2.90, 3.50].includes(c.t))
      || (row.case.concept === 'pa_post_dig' && c.a === 18 && [3.4, 4.2, 4.45, 4.6].includes(c.t)))
      selected.push(evidence);
  }
  const refinementWitnesses: any[] = [];
  if (row.id === 'DA-R2-curl_flat-cover2-R') for (const t of [4.20, 4.25]) {
    const c = row.commands.find((c: any) => c.t === t && c.a === 21), s = steps.get(t);
    refinementWitnesses.push({ t, a: 21, slot: 'SS', bodyBefore: c.bodyBefore,
      rawCommand: c.rawCommand, containedCommand: s.containedCommands[21], appliedCommand: s.appliedCommands[21],
      consumedPictures: row.pictures.slice(c.picturesFrom, c.picturesTo),
      achievedBody: s.achievedAgents.find((a: any) => a.idx === 21).body,
      interpretation: 'Raw and contained pursuit ask for nonzero forward/lateral movement; applied World velocity is zero. Teammate spacing is the intervening unconstrained refinement in this no-grip/no-engagement state.' });
  }
  rows.push({ id: row.id, outcome: { gain: row.result.offenseYards, outcome: row.result.outcome, duration: row.result.duration, stats: row.result.stats },
    observerPlainExact: true, retainedParentExecutionExact: true, retainedParentResultExact: true,
    executionSha256: row.executionSha256, plainExecutionSha256: row.plainExecutionSha256,
    nextRngU32: row.nextRngU32, plainNextRngU32: row.plainNextRngU32,
    fallbackCounts: [...counts].map(([a, count]) => ({ a, slot: players.get(a).slot, count })),
    firstFallbacks: [...first.values()], selectedFallbacks: selected, refinementWitnesses });
}
if (sourceSha() !== baseline) throw Error('Baseline source changed during saved analysis');
const receipt = { schema: 'retained-passing-tail-command-analysis-v1', source: baseline,
  input: { path: input, sha256: sha(bytes), bytes: bytes.length, toolSha256: packet.toolSha256, bodyCodecSha256: packet.bodyCodecSha256 },
  analyzerSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  definitions: { window: 'Pure arithmetic replay of the existing baseline query on recorded actual see pictures and saved flight/profile; no controller/see/RNG invocation.',
    fallback: 'Baseline reachable-ball condition false; exact static fallback reconstructed from its selected window/arrival landmark.',
    bodies: 'All raw-controller body snapshots round-trip through explicit non-finite/undefined encoding; decodeBody before free preview.' },
  queryCommands, fallbackCommands, exactBodyRoundTrips: exactBodies, rows };
writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, rows: rows.length, queryCommands, fallbackCommands, exactBodyRoundTrips: exactBodies }));
