/** Saved-only, explicit diagnostic windows. No engine imports or simulations. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { encodeBody, decodeBody } from './native-body-codec.mjs';

const [rawPath, analysisPath, outputPath, receiptPath] = process.argv.slice(2);
if (process.argv.length !== 6) throw Error('Usage: select-native-command-witnesses.mjs RAW_JSON_GZ ANALYSIS_JSON OUTPUT_JSON_GZ RECEIPT_JSON');
const sha = b => createHash('sha256').update(b).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireCheck(condition, message) { if (!condition) throw Error(message); }
const rawBytes = readFileSync(rawPath), decodedRaw = gunzipSync(rawBytes);
const raw = JSON.parse(decodedRaw), analysisBytes = readFileSync(analysisPath);
const analysis = JSON.parse(analysisBytes);
const source = '601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b';
const codecBytes = readFileSync(new URL('./native-body-codec.mjs', import.meta.url));
const collectorBytes = readFileSync(new URL('./native-tail-commands.ts', import.meta.url));
requireCheck(raw.schema === 'retained-passing-tail-command-panel-v2' && raw.rows.length === 6, 'Expected six-row exact-body command packet');
requireCheck(raw.sourceBefore === source && raw.sourceAfter === source && analysis.source === source, 'Baseline source mismatch');
requireCheck(raw.bodyCodecSha256 === sha(codecBytes), 'Body decoder differs from collected decoder');
requireCheck(raw.toolSha256 === sha(collectorBytes), 'Collector differs from saved raw packet');
requireCheck(analysis.input.sha256 === sha(rawBytes) && analysis.input.bytes === rawBytes.length, 'Analysis references another raw packet');
requireCheck(analysis.input.toolSha256 === raw.toolSha256 && analysis.input.bodyCodecSha256 === raw.bodyCodecSha256, 'Analysis tool or decoder differs');
const retainedBytes = readFileSync(raw.reference.path);
requireCheck(sha(retainedBytes) === raw.reference.sha256 && raw.reference.source === source, 'Original native endpoint packet differs');
const retained = JSON.parse(gunzipSync(retainedBytes));
const selection = [
  { id: 'DA-R2-curl_flat-cover2-R', slot: 'SS', times: [2.75, 3.50, 4.20, 4.25], reason: 'First static late-air fallback, catch, then two spacing-refined zero commands.' },
  { id: 'DA-R2-pa_post_dig-cover3-L', slot: 'LB_M', times: [3.35], reason: 'Early observed catch-window candidate for blocking TE.' },
  { id: 'DA-R2-pa_post_dig-cover3-L', slot: 'CB_W', times: [3.40, 4.20, 4.60], reason: 'Early TE window, later no-window arrival branch, and successful catch-time contact control.' },
  { id: 'DA-R2-pa_post_dig-cover3-R', slot: 'CB_W', times: [3.40, 4.20, 4.45], reason: 'No-window arrival branch and moving catch-time adverse control.' }
];
const counts = { rows: 0, diagnosisWindows: 0, selectedActors: 0, commands: 0, pictures: 0, worldSteps: 0, bodyRoundTrips: 0, exactCopiedRecords: 0, resolvedCommandPictureReferences: 0, resolvedWorldCommandReferences: 0 };
const assertBody = body => {
  requireCheck(same(encodeBody(decodeBody(body)), body), 'Exact Body decoder round-trip mismatch');
  counts.bodyRoundTrips++;
};
const copied = record => {
  const value = JSON.parse(JSON.stringify(record));
  requireCheck(same(value, record), 'Saved record copy changed JSON'); counts.exactCopiedRecords++;
  return value;
};
const commonKeys = ['id', 'case', 'setup', 'offAlign', 'physicalInitial', 'exactInitialBodies', 'initialRng', 'profilesSha256',
  'executionSha256', 'plainExecutionSha256', 'resultSha256', 'plainResultSha256', 'nextRng', 'plainNextRng',
  'nextRngU32', 'plainNextRngU32', 'observerVerified', 'parentExecutionExact', 'parentResultExact', 'parentExecutionSha256', 'players'];
const rows = raw.rows.map(row => {
  counts.rows++;
  const old = retained.rows.find(r => r.id === row.id), audited = analysis.rows.find(r => r.id === row.id);
  requireCheck(old && audited, `Missing retained identity ${row.id}`);
  requireCheck(row.observerVerified && row.parentExecutionExact && row.parentResultExact, `${row.id}: Missing inherited observation receipts`);
  requireCheck(row.executionSha256 === row.plainExecutionSha256 && row.resultSha256 === row.plainResultSha256,
    `${row.id}: Observed/plain execution or result receipts differ`);
  requireCheck(same(row.nextRng, row.plainNextRng) && row.nextRngU32 === row.plainNextRngU32,
    `${row.id}: Observed/plain copied RNG receipts differ`);
  const oldResultSha256 = sha(JSON.stringify({ ...old.result, frames: undefined, telemetry: undefined }));
  requireCheck(row.executionSha256 === old.executionSha256 && row.resultSha256 === oldResultSha256,
    `${row.id}: Original six-tail endpoints or executions differ`);
  requireCheck(same(row.case, old.case) && same(row.setup, old.setup) && row.profilesSha256 === old.profilesSha256,
    `${row.id}: Actual native setup or profiles differ`);
  const common = Object.fromEntries(commonKeys.map(k => [k, copied(row[k])]));
  requireCheck(common.players.length === 22 && common.exactInitialBodies.length === 22, 'Expected all 22 initial bodies/profiles');
  for (const item of common.exactInitialBodies) assertBody(item.body);
  const { frames: _frames, telemetry: _telemetry, ...result } = row.result;
  const plans = selection.filter(s => s.id === row.id);
  const times = [...new Set(plans.flatMap(s => s.times))].sort((a, b) => a - b);
  const witnesses = times.map(t => {
    counts.diagnosisWindows++;
    const indexedCommands = row.commands.flatMap((record, originalIndex) => record.t === t ? [{ originalIndex, record: copied(record) }] : []);
    const indexedPictures = row.pictures.flatMap((record, originalIndex) => record.t === t ? [{ originalIndex, record: copied(record) }] : []);
    const indexedSteps = row.steps.flatMap((record, originalIndex) => record.t === t ? [{ originalIndex, record: copied(record) }] : []);
    const indexedTransitions = row.transitions.flatMap((record, originalIndex) => record.t === t ? [{ originalIndex, record: copied(record) }] : []);
    requireCheck(indexedSteps.length === 1 && indexedCommands.length === 22, `${row.id}/${t}: Missing native complete timestep`);
    const commandIds = new Set(indexedCommands.map(r => r.originalIndex));
    const pictureIds = new Set(indexedPictures.map(r => r.originalIndex));
    for (const { record } of indexedCommands) {
      assertBody(record.bodyBefore);
      for (let i = record.picturesFrom; i < record.picturesTo; i++) {
        requireCheck(pictureIds.has(i), 'Missing cross-player consumed picture'); counts.resolvedCommandPictureReferences++;
      }
      for (const i of record.windowPictureIndices) requireCheck(pictureIds.has(i), 'Missing consumed catch-window picture');
    }
    const step = indexedSteps[0].record;
    requireCheck(step.agents.length === 22 && step.achievedAgents.length === 22
      && step.containedCommands.length === 22 && step.appliedCommands.length === 22, 'Missing all-player command or body context');
    for (const i of step.commands) { requireCheck(commandIds.has(i), 'Missing World raw command'); counts.resolvedWorldCommandReferences++; }
    for (const agent of [...step.agents, ...step.achievedAgents]) assertBody(agent.body);
    const selectedActors = plans.filter(p => p.times.includes(t)).map(plan => {
      const matching = indexedCommands.filter(c => c.record.slot === plan.slot);
      requireCheck(matching.length === 1, `Missing selected actor ${plan.slot}`); counts.selectedActors++;
      const c = matching[0];
      const evidence = [...audited.firstFallbacks, ...audited.selectedFallbacks, ...audited.refinementWitnesses]
        .find(e => e.t === t && e.a === c.record.a);
      if (evidence) requireCheck(same(evidence.rawCommand, c.record.rawCommand), 'Saved-input diagnostic command differs from raw trace');
      return { actor: c.record.a, slot: plan.slot, commandOriginalIndex: c.originalIndex, reason: plan.reason,
        savedInputAnalysis: evidence ? copied(evidence) : null };
    });
    counts.commands += indexedCommands.length; counts.pictures += indexedPictures.length; counts.worldSteps += indexedSteps.length;
    return { t, selectedActors, commands: indexedCommands, pictures: indexedPictures, steps: indexedSteps, transitions: indexedTransitions };
  });
  return { ...common, result: copied(result), witnesses };
});
requireCheck(counts.rows === 6 && counts.diagnosisWindows === 11 && counts.selectedActors === 11 && counts.commands === 242, 'Selection count differs');
const packet = {
  schema: 'retained-passing-tail-command-witnesses-v1',
  sourceBefore: raw.sourceBefore, sourceAfter: raw.sourceAfter,
  origin: { rawPacket: { filename: basename(rawPath), sha256: sha(rawBytes), bytes: rawBytes.length,
    decodedUtf8Sha256: sha(decodedRaw), source: source, toolSha256: raw.toolSha256 },
    originalSixTailPacket: { filename: basename(raw.reference.path), sha256: raw.reference.sha256, source },
    analysis: { filename: basename(analysisPath), sha256: sha(analysisBytes), analyzerSha256: analysis.analyzerSha256 },
    bodyDecoder: { filename: 'native-body-codec.mjs', sha256: raw.bodyCodecSha256 },
    selectionToolSha256: sha(readFileSync(new URL(import.meta.url))) },
  definitions: { ...raw.definitions,
    indices: 'originalIndex and all nested command/picture indices remain offsets in the full parent raw row arrays. Wrappers preserve complete exact original records; no renumbering.',
    scope: 'Eleven explicitly selected diagnosis timesteps, not complete sampling or a representative play distribution. Every selected timestep retains all 22 controllers, all actual see pictures, all 22 before/after World bodies and complete refinement inputs/outputs.',
    commonInitial: 'All six actual setups, players/profiles, exact initial bodies and RNG receipts retained. Legacy physicalInitial/mind fields are the original incomplete JSON projection; not an exact restart checkpoint.',
    savedInputAnalysis: 'Unchanged retrospective query reconstruction from the separately published analysis. Its window choice is inferred from existing consumed pictures, not extra observation or a known intended target.' },
  selection, checks: counts,
  limits: [...raw.limits,
    'Full parent raw 36,118,975-byte gzip is not included in this compact packet; its hash and reproduction inputs are retained.',
    'Witnesses are diagnostic records, not a complete PlaySim/contact constraint checkpoint. Free body previews can use exact body/profile states; replaying active grips/recognition/controller state requires the original collector or additional native state.',
    'Observed/plain equality is inherited from the original native dual execution; stored signature and copied RNG fields are rechecked against each other and the original six-tail packet, with no new simulation.' ],
  rows
};
const utf8 = Buffer.from(JSON.stringify(packet)), compressed = gzipSync(utf8, { level: 9 });
requireCheck(same(JSON.parse(gunzipSync(compressed)), packet), 'Subset gzip round-trip changed records');
writeFileSync(outputPath, compressed, { flag: 'wx' });
requireCheck(sha(readFileSync(outputPath)) === sha(compressed), 'Written subset differs');
const receipt = {
  schema: 'retained-passing-tail-command-witness-receipt-v1',
  savedOnly: true, simulationsRun: 0, source,
  rawPacket: packet.origin.rawPacket,
  subset: { filename: basename(outputPath), sha256: sha(compressed), bytes: compressed.length,
    decodedUtf8Sha256: sha(utf8), decodedUtf8Bytes: utf8.length },
  originalSixTailPacket: packet.origin.originalSixTailPacket,
  analysis: packet.origin.analysis, bodyDecoder: packet.origin.bodyDecoder,
  selectionToolSha256: packet.origin.selectionToolSha256,
  selection, structuralChecks: { ...counts, completeRecordCopiesEqualParent: true, allCommandPictureRangesResolved: true,
    allWorldCommandReferencesResolved: true, allBodyDecodeEncodeEqual: true, allSixStoredPlainAndParentReceiptsEqual: true,
    exactCompressionRoundTrip: true },
  rows: rows.map(r => ({ id: r.id, case: r.case, outcome: r.result.outcome, offenseYards: r.result.offenseYards,
    endX: r.result.endX, endY: r.result.endY, duration: r.result.duration,
    executionSha256: r.executionSha256, plainExecutionSha256: r.plainExecutionSha256,
    resultSha256: r.resultSha256, plainResultSha256: r.plainResultSha256,
    nextRngU32: r.nextRngU32, plainNextRngU32: r.plainNextRngU32,
    observerVerified: r.observerVerified, parentExecutionExact: r.parentExecutionExact, parentResultExact: r.parentResultExact })),
  reproduction: {
    fullRawNotPublished: true,
    fullRaw: 'node --import tsx native-tail-commands.ts PINNED_601_SOURCE_ARCHIVE 601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b NEW_RAW_JSON_GZ ORIGINAL_NATIVE_COVERAGE_FINAL_JSON_GZ',
    subset: 'node select-native-command-witnesses.mjs FULL_RAW_JSON_GZ SIX_TAIL_ANALYSIS_JSON NEW_SUBSET_JSON_GZ NEW_RECEIPT_JSON'
  }
};
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: outputPath, bytes: compressed.length, sha256: sha(compressed), receipt: receiptPath, checks: counts }));
