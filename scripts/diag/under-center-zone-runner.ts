/** Offline carrier/keeper diagnosis on exactly the three saved ace_12 controls.
 * Reads existing observations. Scratch free movement is a capability control,
 * not a contact oracle or a counterfactual football ending. No new sim/see/RNG.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
import { timeToReach } from '../../src/physics/reach.js';
import { World } from '../../src/physics/world.js';

const root = process.argv[2] ?? 'out/under-center-zone';
const destination = process.argv[3] ?? 'docs/reviews/under-center-zone-runner-trace.json';
const load = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const packet = (name: string) => JSON.parse(gunzipSync(readFileSync(`${root}/${name}.json.gz`)).toString());
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const distance = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
const unique = (values: any[]) => [...new Map(values.map(v => [JSON.stringify(v), v])).values()];
const compactBody = (b: any) => ({ pos: b.pos, vel: b.vel, facing: b.facing, energy: b.energy,
  support: Object.fromEntries(['state', 'xi', 'peak', 'posture', 'lean', 'load', 'felt', 'causes']
    .map(k => [k, b.support?.[k]])) });
function frozenEntryMovement(source: any, entry: any, now: number, beat: number, cutSkill: number) {
  const body = structuredClone(source), world = new World([body]);
  const original = digest(source);
  world.time = now;
  let next = 0, vel = { x: 0, y: 0 };
  const samples: any[] = [];
  for (let k = 0; k < 30; k++) {
    if (k * .05 >= next) {
      const h = Math.atan2(entry.y - body.pos.y, entry.x - body.pos.x);
      vel = { x: Math.cos(h) * body.profile.vmax, y: Math.sin(h) * body.profile.vmax };
      next = k * .05 + beat;
    }
    world.step([{ vel, cutSkill, squeeze: 0 }], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...body.pos }, vel: { ...body.vel }, support: body.support.state });
  }
  assert.equal(digest(source), original);
  return samples;
}
const findings: any[] = [], receipts: any[] = [];

for (const [name, priorName, pinName] of [['carrier', 'native', 'pin'], ['carrier-weak', 'weak', 'pin-weak']]) {
  const collected = packet(name), prior = packet(priorName), pin = packet(pinName);
  const receipt = load(`${root}/${name}-checks.json`);
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.inputsUnchanged, true);
  assert.equal(collected.provenance.sourceSha256, '09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c');
  assert.equal(pin.provenance.commit, '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1');
  assert.deepEqual(collected.inputs, prior.inputs);
  assert.deepEqual(collected.inputs, pin.inputs);
  assert.deepEqual(collected.provenance.flags, prior.provenance.flags);
  for (const flag of ['RUN_READ', 'RUN_READ_TURN', 'RUN_CONTACT_COMPONENTS', 'RUN_CONTACT_TRACK',
    'PULL_HANDOVER', 'RUN_HANDS', 'DL_HANDS', 'HAND_FIGHT', 'HAND_MOTOR']) assert.equal(receipt.flags[flag], '0');
  receipts.push(receipt);
  for (let i = 0; i < collected.panel.length; i++) {
    const play = collected.panel[i], old = prior.panel[i], baseline = pin.panel[i];
    assert.equal(play.input.formation, 'ace_12');
    assert.equal(play.observerNeutral, true);
    assert.equal(play.live, false);
    assert.equal(play.censoring, null);
    assert.deepEqual(play.hashes, old.hashes);
    assert.deepEqual(play.hashes, baseline.hashes);
    assert.deepEqual(play.players, old.players);
    assert.deepEqual(play.initial, old.initial);
    const bySlot = Object.fromEntries(play.players.map((a: any) => [a.slot, a.id]));
    const rb = bySlot.RB, end = play.side < 0 ? bySlot.DE_S : bySlot.DE_W;
    const keeper = play.side < 0 ? bySlot.RT : bySlot.LT;
    const slot = (id: number) => play.players[id].slot;
    const first = play.events.find((e: any) => e.type === 'carrier_contact' && (e.a === rb || e.b === rb));
    assert(first);
    const carrierEvents = play.frames.flatMap((f: any) => f.carrierEvents.filter((e: any) => e.actor === rb));
    const starts = carrierEvents.filter((e: any) => e.phase === 'carrier-start');
    const switches = starts.filter((e: any, k: number) => k === 0 || e.designed !== starts[k - 1].designed);
    const reads: any[] = [], movement: any[] = [];
    for (const frame of play.frames) {
      if (frame.t < 1.6 || frame.t > first.t) continue;
      const pi = frame.physicsInput;
      const peer = (id: number) => ({ slot: slot(id), before: compactBody(pi.beforeBodies[id]),
        requested: frame.agents[id].requested, delivered: pi.intents[id], after: compactBody(pi.afterBodies[id]) });
      const foot = frame.contactEvents.find((e: any) => e.phase === 'movement' && e.blocker === keeper && e.defender === end);
      movement.push({ t: frame.t, after: frame.after,
        runner: peer(rb), keeper: peer(keeper), defender: peer(end),
        keeperRead: frame.agents[keeper].zone, keeperFootRequest: foot?.command,
        joints: pi.jointOutputs.filter((j: any) => j.kind === 'hands' && [keeper, end].includes(j.a) && [keeper, end].includes(j.b))
          .map((j: any) => Object.fromEntries(['kind', 'a', 'b', 'normalForce', 'tangentForce', 'forceOnB',
            'momentOnA', 'momentOnB', 'extension', 'drive'].map(k => [k, j[k]]))),
        opposingRunnerContacts: frame.contacts.filter((c: any) => (c.i === rb && play.players[c.j].team === 'D')
          || (c.j === rb && play.players[c.i].team === 'D')) });
      for (const event of frame.carrierEvents.filter((e: any) => e.actor === rb && e.phase === 'aim' && e.t < first.t)) {
        const body = pi.beforeBodies[rb];
        const cues = unique(frame.cues.filter((c: any) => c.defender === rb)
          .map((c: any) => ({ stage: c.stage, target: c.opponent, slot: slot(c.opponent), seen: c.seen })));
        const picture = (id: number) => cues.filter((c: any) => c.stage === 'behavior' && c.target === id).at(-1)?.seen;
        const endSeen = picture(end), keeperSeen = picture(keeper);
        assert(endSeen && keeperSeen);
        const surface = event.surface.map((s: any) => {
          const cue = cues.find((c: any) => c.stage === 'behavior' && distance(c.seen.pos, s.pos) < 1e-10 && c.seen.age === s.age);
          assert(cue);
          return { slot: cue.slot, ...s };
        });
        const endOutsideKeeper = (endSeen.pos.y - keeperSeen.pos.y) * play.side;
        const hands = pi.jointInputs.find((j: any) => j.kind === 'hands' && j.a === keeper && j.b === end
          || j.kind === 'hands' && j.a === end && j.b === keeper);
        const candidates = event.candidates.map((candidate: any) => {
          const p = candidate.entry;
          let bounds: string[] = [];
          for (let j = 1; j < surface.length; j++) {
            if (Math.abs((surface[j - 1].pos.y + surface[j].pos.y) / 2 - p.y) < 1e-10)
              bounds = [surface[j - 1].slot, surface[j].slot];
          }
          const outer = play.side < 0 ? surface[0] : surface.at(-1);
          const label = bounds.length ? ((p.y - keeperSeen.pos.y) * play.side < 0
            ? (Math.abs(p.y - keeperSeen.pos.y) < 3 ? 'bang/interior crease' : 'bend/far interior crease')
            : 'outward crease') : (p.y - outer.pos.y) * play.side > 0 ? 'bounce/playside outside' : 'backside outside';
          const d = distance(body.pos, p), heading = Math.atan2(p.y - body.pos.y, p.x - body.pos.x);
          const command = { vel: { x: Math.cos(heading) * body.profile.vmax, y: Math.sin(heading) * body.profile.vmax },
            cutSkill: frame.agents[rb].requested.cutSkill, squeeze: 0 };
          const heldSamples = previewFreeMovement(body, command, event.t, 30, 'center');
          const samples = frozenEntryMovement(body, p, event.t, event.decisionInterval, command.cutSkill);
          assert(distance(samples[0].pos, heldSamples[0].pos) < 1e-12);
          assert(distance(samples[0].vel, heldSamples[0].vel) < 1e-12);
          const arrival = samples.find(s => distance(s.pos, p) <= .65)?.t ?? null;
          const radius = body.profile.radius + play.players[end].profile.radius;
          const armRadius = radius + play.players[end].profile.reach * .75;
          // Distinct checks: frozen acquired constant-velocity separation vs a
          // public-capability reach envelope. Neither predicts the held joint.
          const screen = samples.map(s => ({ t: s.t, pos: s.pos, support: s.support,
            pictureTorsoMargin: distance(s.pos, { x: endSeen.pos.x + endSeen.vel.x * s.t,
              y: endSeen.pos.y + endSeen.vel.y * s.t }) - radius * .9,
            pictureArmMargin: distance(s.pos, { x: endSeen.pos.x + endSeen.vel.x * s.t,
              y: endSeen.pos.y + endSeen.vel.y * s.t }) - armRadius,
            reachMarginWithQuarterSecondCredit: timeToReach({ ...endSeen, profile: play.players[end].profile }, s.pos, radius)
              + (hands ? .25 : 0) - s.t }));
          const approach = screen.filter(s => s.t <= (arrival ?? 1.5));
          const opposingEnvelope = approach.find(s => s.reachMarginWithQuarterSecondCredit <= 0);
          const beforeOriginalContact = screen.filter(s => s.t <= first.t - event.t + 1e-9);
          const atDecisionBeat = samples.find(s => s.t >= event.decisionInterval)!;
          const peerClearance = surface.map((b: any) => ({ slot: b.slot,
            minimumFirstSixTenths: Math.min(...samples.filter(s => s.t <= .6).map(s => distance(s.pos,
              { x: b.pos.x + b.vel.x * s.t, y: b.pos.y + b.vel.y * s.t }) - .9 * (b.radius + body.profile.radius))) }));
          return { ...candidate, selected: distance(p, event.selected) < 1e-10, label, bounds, command,
            geometricArrivalUsedBySelector: d / Math.max(2, Math.hypot(body.vel.x, body.vel.y)),
            publicTurnAwareArrivalEstimate: timeToReach(body, p), unloadedArrivalWithinPoint65: arrival,
            heldHeadingArrivalWithinPoint65: heldSamples.find(s => distance(s.pos, p) <= .65)?.t ?? null,
            earliestEndReachEnvelopeWithExistingBlockCredit: opposingEnvelope?.t ?? null,
            minimumPictureTorsoMarginThroughEntry: Math.min(...approach.map(s => s.pictureTorsoMargin)),
            minimumPictureArmMarginThroughEntry: Math.min(...approach.map(s => s.pictureArmMargin)),
            minimumPictureArmMarginBeforeOriginalContact: Math.min(...beforeOriginalContact.map(s => s.pictureArmMargin)),
            atNextDecisionBeat: atDecisionBeat, peerClearance, samples: screen };
        });
        reads.push({ ...event, surface, consumedRunnerCues: cues, acquiredEnd: { slot: slot(end), ...endSeen },
          acquiredKeeper: { slot: slot(keeper), ...keeperSeen }, endOutsideKeeper,
          actualKeeperHandsExist: !!hands, candidates,
          // Own body plus consumed images make this row portable for an offline
          // information/capability review without hidden defender trajectory.
          ownBody: body });
      }
    }
    findings.push({ input: play.input, side: play.side, initial: play.initial,
      provenance: collected.provenance, stateRngHistorySha256: digest(play.hashes),
      savedHistoryExact: true, actualPinHistoryExact: true, ticks: play.hashes.length,
      profiles: play.players.map((a: any) => ({ id: a.id, slot: a.slot, team: a.team, profile: a.profile })),
      designedPhaseChanges: switches, firstContact: first, endTime: play.endTime, gain: play.gain,
      outcome: play.outcome, reads, movement });
    console.log(`${play.input.id}: ${reads.length} precontact reads, saved/pin histories exact`);
  }
}
assert.deepEqual(findings.map(p => p.input.id), ['uc12-wz-s3', 'uc12-wz-s3-mirror', 'uc12-wz-weak-s3']);
const report = { protocol: 'under-center-zone-runner-information-v1',
  comparisonCommit: '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  caveats: ['Default crease selector; RUN_READ and RUN_READ_TURN remain off.',
    'Consumed images are controller information; movement actual before/after and hands existence are offline truth.',
    'Labels describe acquired geometry, not installed gap names or a new policy.',
    'Scratch preview requests unsqueezed full speed toward a frozen observed entry, updating heading on the recorded finite decision beat, in empty space for at most 1.5 s.',
    'A separate held-heading arrival and a first-step match to existing previewFreeMovement check distinguish fixed-heading misses from capability.',
    'Entry radius .65 yd and .6-s peer screens are diagnostic tolerances, not certified protection.',
    'A moving defender in a hand joint is not a free reacher or a constant-velocity object; both screens are uncertainty bounds.',
    'Quarter-second block credit reuses the current selector allowance. It cannot prove the future block win.',
    'No alternative native ending is generated; shared passive angular-law witness remains unresolved.'],
  observationReceipts: receipts, newObservedPlainPairs: 3, newGames: 0, newFullSuites: 0, findings };
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(`Saved ${destination}`);
