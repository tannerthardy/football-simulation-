/** Offline command reconstruction only. No controllers, observations or rollouts.
 * node --import tsx out/catch-contact-census/blend-sign-audit.mjs --out OUTPUT PACKET...
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeBody } from './native-body-codec.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), files = [];
let output = join(home, 'blend-sign-audit.json');
let frozen = join(home, 'frozen-source');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') output = resolve(args[++i]);
  else if (args[i] === '--source') frozen = resolve(args[++i]);
  else if (args[i].startsWith('--')) throw Error(`Unknown argument ${args[i]}`);
  else files.push(resolve(args[i]));
}
if (!files.length) throw Error('Supply native command packet files; this analyzer does not generate plays.');
if (files.includes(output)) throw Error('Output must differ from every input.');
const { gatheringApproach, leverage } = await import(pathToFileURL(join(frozen, 'src/sim/behaviors/common.ts')).href);
const { angleDiff, clamp } = await import(pathToFileURL(join(frozen, 'src/core/vec.ts')).href);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const radiansToDegrees = x => x * 180 / Math.PI;
const finiteVector = v => v && Number.isFinite(v.x) && Number.isFinite(v.y);
const count = (object, key, n = 1) => { object[key] = (object[key] ?? 0) + n; };
const pick = (object, keys) => Object.fromEntries(keys.filter(k => object?.[k] !== undefined).map(k => [k, object[k]]));
const reports = [], pooled = {};
const MIN_BLEND_REMAINDER = 1e-9, FACING_MATCH_TOLERANCE = 1e-7, MIN_SIGN_DIFFERENCE = 1e-6;
const countKeys = ['genericPursuitCommands', 'postCatchGenericPursuitCommands', 'notPostCatch',
  'alreadyHeldReturnExcluded', 'noOpponentCarrier', 'noRecordedChasePicture', 'reconstructedChasePictures',
  'zeroGather', 'fullGatherNoBlend', 'partialGather', 'partialGatherNearOneExcluded',
  'partialGatherWithoutFacing', 'wrongSignFacingVerified', 'facingReconstructionMismatch',
  'correctSignFacingVerified', 'negligibleSignDifference', 'verifiedRequestIncreasesNearHipAngularError',
  'verifiedCommandsWithActualStep', 'verifiedCommandsAppliedFacingMatchesRaw',
  'verifiedCommandsAppliedVelocityMatchesRaw', 'verifiedCommandsAppliedVelocityRefined'];

function sampleBody(container, actor) {
  const value = decodeBody(container);
  if (Array.isArray(value)) {
    if (value[actor]?.pos) return value[actor];
    const row = value.find(v => (v.idx ?? v.a ?? v.i) === actor);
    return row?.body ?? row?.bodyBefore ?? row?.state ?? null;
  }
  if (value && value[actor]?.pos) return value[actor];
  return null;
}

function actualMovement(packet, command, actor) {
  const stepIndex = (packet.steps ?? []).findIndex(s => Math.abs(s.t - command.t) < 1e-9);
  if (stepIndex < 0) return { available: false, reason: 'No matching native World step time' };
  const step = packet.steps[stepIndex];
  const before = sampleBody(step.agents ?? step.before ?? step.bodyBefore ?? step.bodiesBefore, actor);
  const after = sampleBody(step.achievedAgents ?? step.after ?? step.bodyAfter ?? step.bodiesAfter, actor);
  if (!before || !after) return { available: false, stepIndex, reason: 'Unsupported native before/after body shape' };
  const report = step.report ?? {};
  const vector = v => finiteVector(v) ? { x: v.x, y: v.y } : null;
  const actorContactRecords = report.contacts?.filter(c => c.i === actor || c.j === actor) ?? [];
  const carrierPairContactRecords = actorContactRecords.filter(c => c.i === command.carrierBefore || c.j === command.carrierBefore);
  const active = rows => (rows ?? []).filter(h => h.stillInWorld && !h.broken);
  const beforeHolds = active(step.holds), afterHolds = active(step.achievedHolds);
  const involves = (rows, idx) => rows.filter(h => h.defender === idx || h.carrier === idx);
  const beforeRecord = step.agents?.find(a => a.idx === actor);
  return { available: true, stepIndex,
    actualIntent: decodeBody((step.appliedIntents ?? step.intents)?.[actor] ?? null),
    before: { pos: vector(before.pos), vel: vector(before.vel), facing: before.facing,
      speed: Math.hypot(before.vel.x, before.vel.y), support: before.support?.state ?? null,
      balance: before.support?.xi ?? null },
    after: { pos: vector(after.pos), vel: vector(after.vel), facing: after.facing,
      speed: Math.hypot(after.vel.x, after.vel.y), support: after.support?.state ?? null,
      balance: after.support?.xi ?? null },
    displacement: { x: after.pos.x - before.pos.x, y: after.pos.y - before.pos.y },
    actualTurnDegrees: radiansToDegrees(angleDiff(before.facing, after.facing)),
    speedChange: Math.hypot(after.vel.x, after.vel.y) - Math.hypot(before.vel.x, before.vel.y),
    groundImpulse: report.groundImpulse?.[actor] ?? null,
    groundYawImpulse: report.groundYawImpulse?.[actor] ?? null,
    groundWork: report.groundWork?.[actor] ?? null,
    groundYawWork: report.groundYawWork?.[actor] ?? null,
    workResidual: report.work?.residual ?? null,
    falls: report.falls?.includes(actor) ?? null,
    contactCount: actorContactRecords.length,
    actorContactRecords, carrierPairContactRecords,
    positiveActorBodyContactCount: actorContactRecords.filter(c => c.impulse > 1e-9).length,
    positiveCarrierPairBodyContactCount: carrierPairContactRecords.filter(c => c.impulse > 1e-9).length,
    actorActiveGripsBefore: involves(beforeHolds, actor), actorActiveGripsAfter: involves(afterHolds, actor),
    carrierActiveGripsBefore: involves(beforeHolds, command.carrierBefore),
    carrierActiveGripsAfter: involves(afterHolds, command.carrierBefore),
    actorEngagementBefore: beforeRecord?.engagement ?? null };
}

for (const file of files) {
  const bytes = readFileSync(file);
  const packet = JSON.parse((file.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString());
  if (!Array.isArray(packet.players) || !Array.isArray(packet.commands) || !Array.isArray(packet.pictures))
    throw Error(`Unsupported packet: ${file}`);
  const players = new Map(packet.players.map(p => [p.idx, p]));
  const counts = Object.fromEntries(countKeys.map(key => [key, 0])), rows = [];
  for (let index = 0; index < packet.commands.length; index++) {
    const cmd = packet.commands[index];
    if (cmd.behaviorClass !== 'Pursuit') continue;
    count(counts, 'genericPursuitCommands');
    if (!(cmd.catchAt >= 0 && cmd.t >= cmd.catchAt - 1e-9)) { count(counts, 'notPostCatch'); continue; }
    count(counts, 'postCatchGenericPursuitCommands');
    if ((cmd.bondTacklersBefore ?? []).includes(cmd.a)) { count(counts, 'alreadyHeldReturnExcluded'); continue; }
    const own = players.get(cmd.a), carrier = players.get(cmd.carrierBefore);
    if (!own || !carrier || own.team === carrier.team) { count(counts, 'noOpponentCarrier'); continue; }
    if (!Number.isInteger(cmd.picturesFrom) || !Number.isInteger(cmd.picturesTo)
      || cmd.picturesFrom < 0 || cmd.picturesTo < cmd.picturesFrom || cmd.picturesTo > packet.pictures.length)
      throw Error(`Invalid picture interval: ${file} command ${index}`);
    const pictureIndex = packet.pictures.findIndex((p, i) => i >= cmd.picturesFrom && i < cmd.picturesTo
      && p.a === cmd.a && p.b === cmd.carrierBefore);
    if (pictureIndex < 0) { count(counts, 'noRecordedChasePicture'); continue; }
    const picture = packet.pictures[pictureIndex], seen = picture.cue;
    const body = decodeBody(cmd.bodyBefore), raw = decodeBody(cmd.rawCommand);
    if (!finiteVector(seen?.pos) || !finiteVector(seen?.vel) || !finiteVector(body?.pos)
      || !finiteVector(body?.vel) || !finiteVector(raw?.vel)) throw Error(`Missing finite geometry: ${file} command ${index}`);
    const ratings = cmd.ratings;
    for (const key of ['tackling', 'pursuit']) if (!(ratings?.[key] >= 0 && ratings[key] <= 1))
      throw Error(`Expected normalized ${key}: ${file} command ${index}`);
    const profile = body.profile ?? own.profile;
    const agent = { body, runFit: cmd.runFit, speedScale: cmd.speedScale,
      get pos() { return this.body.pos; }, get vel() { return this.body.vel; },
      get profile() { return profile; }, get speed() { return Math.hypot(this.vel.x, this.vel.y); },
      r(key) { if (!Number.isFinite(ratings[key])) throw Error(`Missing rating ${key}`); return ratings[key]; } };
    const distance = Math.hypot(seen.pos.x - agent.pos.x, seen.pos.y - agent.pos.y);
    const contact = profile.radius + carrier.profile.radius + profile.reach * .65;
    const force = cmd.runFit?.kind === 'force' || (cmd.runFit?.kind === 'edge' && cmd.runFit.edge === 'box');
    const offset = (force ? Math.abs(leverage(agent, seen.pos.y)) * cmd.runFit.side : leverage(agent, seen.pos.y))
      * clamp((distance - contact) / 6, 0, 1);
    const before = JSON.stringify(cmd.bodyBefore);
    const bodyPin = JSON.stringify(body);
    const { near, gather: g } = gatheringApproach(agent, seen, contact, offset);
    if (JSON.stringify(cmd.bodyBefore) !== before || JSON.stringify(body) !== bodyPin)
      throw Error('Offline gathering helper mutated recorded body');
    count(counts, 'reconstructedChasePictures');
    if (!near || g <= 0) { count(counts, 'zeroGather'); continue; }
    if (g >= 1) { count(counts, 'fullGatherNoBlend'); continue; }
    count(counts, 'partialGather');
    if (1 - g < MIN_BLEND_REMAINDER) { count(counts, 'partialGatherNearOneExcluded'); continue; }
    if (!Number.isFinite(raw.facing)) { count(counts, 'partialGatherWithoutFacing'); continue; }
    const farVel = { x: (raw.vel.x - g * near.vel.x) / (1 - g),
      y: (raw.vel.y - g * near.vel.y) / (1 - g) };
    if (!finiteVector(farVel)) throw Error(`Nonfinite reconstructed far velocity: ${file} command ${index}`);
    const travel = Math.atan2(farVel.y, farVel.x);
    const wrong = travel + angleDiff(near.facing, travel) * g;
    const correct = travel + angleDiff(travel, near.facing) * g;
    const wrongResidual = Math.abs(angleDiff(wrong, raw.facing));
    const correctResidual = Math.abs(angleDiff(correct, raw.facing));
    const correction = Math.abs(angleDiff(wrong, correct));
    const proven = wrongResidual < FACING_MATCH_TOLERANCE && correction > MIN_SIGN_DIFFERENCE;
    const correctProven = correctResidual < FACING_MATCH_TOLERANCE && correction > MIN_SIGN_DIFFERENCE;
    const rawNearError = Math.abs(angleDiff(raw.facing, near.facing));
    const farNearError = Math.abs(angleDiff(travel, near.facing));
    count(counts, proven ? 'wrongSignFacingVerified' : correctProven ? 'correctSignFacingVerified'
      : wrongResidual >= FACING_MATCH_TOLERANCE ? 'facingReconstructionMismatch' : 'negligibleSignDifference');
    if (proven && rawNearError > farNearError + MIN_SIGN_DIFFERENCE) count(counts, 'verifiedRequestIncreasesNearHipAngularError');
    const movement = actualMovement(packet, cmd, cmd.a);
    if (proven && movement.available) count(counts, 'verifiedCommandsWithActualStep');
    if (movement.available) {
      movement.appliedFacingMatchesRaw = Number.isFinite(movement.actualIntent?.facing)
        && Math.abs(angleDiff(raw.facing, movement.actualIntent.facing)) < FACING_MATCH_TOLERANCE;
      movement.appliedVelocityMatchesRaw = finiteVector(movement.actualIntent?.vel)
        && Math.hypot(raw.vel.x - movement.actualIntent.vel.x, raw.vel.y - movement.actualIntent.vel.y) < 1e-9;
      movement.beforeAngularErrorToRecordedHipDegrees = radiansToDegrees(Math.abs(angleDiff(movement.before.facing, near.facing)));
      movement.afterAngularErrorToRecordedHipDegrees = radiansToDegrees(Math.abs(angleDiff(movement.after.facing, near.facing)));
      if (proven && movement.appliedFacingMatchesRaw) count(counts, 'verifiedCommandsAppliedFacingMatchesRaw');
      if (proven && movement.appliedVelocityMatchesRaw) count(counts, 'verifiedCommandsAppliedVelocityMatchesRaw');
      if (proven && !movement.appliedVelocityMatchesRaw) count(counts, 'verifiedCommandsAppliedVelocityRefined');
    }
    rows.push({ commandIndex: index, t: cmd.t, a: cmd.a, slot: own.slot, carrier: cmd.carrierBefore,
      pictureIndex, pictureInterval: [cmd.picturesFrom, cmd.picturesTo],
      controller: picture.controller ?? null, supportBefore: body.support?.state ?? null,
      bodyBefore: { pos: body.pos, vel: body.vel, facing: body.facing },
      seen: pick(seen, ['pos', 'vel', 'age', 'facing']), distance, contact, offset, gather: g,
      reconstructionCondition: 1 / (1 - g), farVelocity: farVel, nearCommand: near, rawCommand: raw,
      anglesDegrees: { farTravel: radiansToDegrees(travel), nearHip: radiansToDegrees(near.facing),
        rawRequest: radiansToDegrees(raw.facing), archivedWrongRequest: radiansToDegrees(wrong),
        correctedSignRequest: radiansToDegrees(correct), wrongResidual: radiansToDegrees(wrongResidual),
        correctResidual: radiansToDegrees(correctResidual), signDifference: radiansToDegrees(correction),
        farToNear: radiansToDegrees(angleDiff(travel, near.facing)),
        requestedTurnFromFar: radiansToDegrees(angleDiff(travel, raw.facing)),
        correctedTurnFromFar: radiansToDegrees(angleDiff(travel, correct)),
        rawNearHipError: radiansToDegrees(rawNearError), farNearHipError: radiansToDegrees(farNearError) },
      wrongSignVerified: proven, correctSignVerified: correctProven,
      increasesNearHipAngularError: proven && rawNearError > farNearError + MIN_SIGN_DIFFERENCE,
      actualMovement: movement });
  }
  if (counts.reconstructedChasePictures !== counts.zeroGather + counts.fullGatherNoBlend + counts.partialGather)
    throw Error('Gather accounting failed');
  if (counts.partialGather !== counts.partialGatherNearOneExcluded + counts.partialGatherWithoutFacing
    + counts.wrongSignFacingVerified + counts.correctSignFacingVerified
    + counts.facingReconstructionMismatch + counts.negligibleSignDifference)
    throw Error('Partial reconstruction accounting failed');
  for (const [key, n] of Object.entries(counts)) count(pooled, key, n);
  reports.push({ input: { path: file, bytes: bytes.length, sha256: sha(bytes) },
    packetMetadata: pick(packet, ['schema', 'id', 'input', 'source', 'sourceBefore', 'sourceAfter', 'observerVerified',
      'collectorSha256', 'toolSha256', 'sourceSha256', 'nativeMatched', 'outcomeMatched', 'referenceExact']), counts, rows });
}
const selectionPath = join(home, 'random-sample.json');
const selection = JSON.parse(readFileSync(selectionPath));
const selected = new Set(selection.selectedIds);
function group(label, include) {
  const members = reports.filter(include);
  if (label === 'fixedRandomSample24') members.sort((a, b) =>
    selection.selectedIds.indexOf(a.packetMetadata.id) - selection.selectedIds.indexOf(b.packetMetadata.id));
  const counts = Object.fromEntries(countKeys.map(key => [key, members.reduce((n, r) => n + r.counts[key], 0)]));
  const firstRequests = members.map(report => {
    const first = report.rows.find(row => row.wrongSignVerified);
    const details = first ? pick(first, ['commandIndex', 't', 'a', 'slot', 'carrier', 'distance', 'contact',
      'gather', 'bodyBefore', 'anglesDegrees', 'actualMovement']) : null;
    return { id: report.packetMetadata.id, partialGather: report.counts.partialGather,
      verifiedWrongFacing: report.counts.wrongSignFacingVerified,
      appliedVelocityRefinements: report.counts.verifiedCommandsAppliedVelocityRefined, firstWrongRequest: details };
  });
  const wrongRows = members.flatMap(report => report.rows.filter(row => row.wrongSignVerified));
  const firstMovements = firstRequests.map(row => row.firstWrongRequest?.actualMovement).filter(Boolean);
  const zeroActorGrips = m => !m.actorActiveGripsBefore.length && !m.actorActiveGripsAfter.length;
  const zeroCarrierGrips = m => !m.carrierActiveGripsBefore.length && !m.carrierActiveGripsAfter.length;
  const signDifferenceThresholdsDegrees = [1, 5, 10, 30].map(degrees => ({ degrees,
    commands: wrongRows.filter(row => row.anglesDegrees.signDifference >= degrees).length,
    plays: members.filter(report => report.rows.some(row => row.wrongSignVerified
      && row.anglesDegrees.signDifference >= degrees)).length }));
  return { label, plays: members.length, playsWithVerifiedWrongFacing: members.filter(r => r.counts.wrongSignFacingVerified > 0).length,
    counts, signDifferenceThresholdsDegrees,
    firstWrongRequestPhysicalContext: { firstRequests: firstMovements.length,
      zeroActorBodyContactRecords: firstMovements.filter(m => m.contactCount === 0).length,
      zeroPositiveActorBodyContacts: firstMovements.filter(m => m.positiveActorBodyContactCount === 0).length,
      zeroActorActiveGripsBeforeAndAfter: firstMovements.filter(zeroActorGrips).length,
      zeroActorAndCarrierActiveGripsBeforeAndAfter: firstMovements.filter(m => zeroActorGrips(m) && zeroCarrierGrips(m)).length,
      noActorBlockEngagement: firstMovements.filter(m => m.actorEngagementBefore === null).length,
      appliedVelocityAlreadyRefined: firstMovements.filter(m => !m.appliedVelocityMatchesRaw).length,
      limitation: 'Counts describe the first verified command and its recorded native step. Grip force before is a sampled boundary value; zero body-contact records are not proof of every possible contact-force channel being absent.' },
    firstRequests,
    verifiedWrongFacingPerPostCatchGenericCommand: counts.postCatchGenericPursuitCommands
      ? counts.wrongSignFacingVerified / counts.postCatchGenericPursuitCommands : null };
}
const groups = [group('fixedRandomSample24', r => selected.has(r.packetMetadata.id)),
  group('separatelyNominatedWitness', r => r.packetMetadata.id === 'S105-P159'),
  group('unclassifiedPackets', r => !selected.has(r.packetMetadata.id) && r.packetMetadata.id !== 'S105-P159')];
const result = { schema: 'offline-pursuit-blend-sign-audit-v1',
  analyzerSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  archivedHelpers: ['src/sim/behaviors/common.ts', 'src/core/vec.ts'].map(p =>
    ({ path: join(frozen, p), sha256: sha(readFileSync(join(frozen, p))) })),
  method: 'Reconstruct gatheringApproach from each recorded Pursuit command body, normalized ratings and its first recorded same actor/carrier picture. Exclude already-held returns. For 0<g<1, recover far velocity algebraically and compare raw facing to archived wrong and corrected angleDiff signs. No chase, chooseApproach, pursuitPoint, see, RNG, controllers or movement rollouts invoked.',
  numericCriteria: { partialGather: 'Strict 0 < g < 1; exact zero/full branches counted separately.',
    minimumBlendRemainder: MIN_BLEND_REMAINDER, archivedFacingMatchToleranceRadians: FACING_MATCH_TOLERANCE,
    minimumNontrivialSignDifferenceRadians: MIN_SIGN_DIFFERENCE,
    nearOnePolicy: 'Exclude 1-g below the remainder cutoff rather than certifying a cancellation-sensitive reconstructed travel angle.' },
  limitations: 'Command incidence is not independent play prevalence. Partial-blend facing alone can be verified algebraically; comparisons use the same saved observation, not true unseen carrier state. Actual movement is the recorded native step, not a counterfactual effect of correcting the sign. Other contacts, held intents, finite yaw and traction may intervene. No claim about yardage, successful tackling, calibrated capacities or overall physics readiness.',
  selection: { path: selectionPath, sha256: sha(readFileSync(selectionPath)),
    randomSeed: selection.randomSeed, fixedSampleSize: selection.sampleSize,
    sampledPacketsPresent: groups[0].plays, randomSampleComplete: groups[0].plays === selection.sampleSize },
  packetCount: reports.length, pooledCounts: pooled, groups, reports };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ output, packetCount: result.packetCount, counts: pooled,
  groups: groups.map(g => ({ label: g.label, plays: g.plays, playsWithVerifiedWrongFacing: g.playsWithVerifiedWrongFacing, counts: g.counts })) }) + '\n');
