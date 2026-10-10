/** Matched, source-pinned controlled 11v11 run panel; no controller/RNG edits.
 * node --import tsx scripts/diag/run-contact-review.ts [out/run-contact-review/baseline.json]
 * Three generated roster pairs × six calls × two fronts × both directions × two seeds.
 * Full recording: fixed first-roster/Over/first-seed subset plus one labelled
 * Counter diagnostic reproducing the rejected near-zero mobility allocation.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import type { Vec2 } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import { baseRadiusAt, omega0, recoverySpeed, supportParams } from '../../src/physics/support.js';
import type { GraspJoint } from '../../src/physics/world.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/run-contact-review/baseline.json';
if (process.argv.length > 3) throw new Error('Usage: run-contact-review.ts [output.json]');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const runs = ['iz_strong', 'oz_strong', 'wz_strong', 'power', 'counter', 'trap'];
const fronts = ['over', 'under'], seeds = [3, 11], rosterSeeds = [[31, 32], [41, 42], [51, 52]];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const q = (value: number) => Math.round(value * 1e6) / 1e6;
const vec = (v: Vec2) => ({ x: q(v.x), y: q(v.y) });
const mean = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const quantile = (xs: number[], p: number) => xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)] : null;
const rosterPairs = rosterSeeds.map(([o, d], i) => ({ offense: generateTeam(new Rng(o), `Panel offense ${i + 1}`, `O${i + 1}`, { strength: .55 }),
  defense: generateTeam(new Rng(d), `Panel defense ${i + 1}`, `D${i + 1}`, { strength: .55 }) }));

function body(a: Agent) {
  const s = a.body.support!, p = supportParams(a.profile), radius = baseRadiusAt(p, s.posture), speed = recoverySpeed(p, 0, fatigueFactor(a.body.energy));
  return { slot: a.slot, pos: vec(a.pos), vel: vec(a.vel), facing: q(a.facing), energy: q(a.body.energy),
    support: { state: s.state, cause: s.cause ?? null, xi: vec(s.xi), out: q(s.out), posture: q(s.posture),
      baseRadiusYd: q(radius), recoverySpeedYdS: q(speed), fallThresholdYd: q(radius + speed / omega0(p, s.posture)),
      lean: vec(s.lean), load: vec(s.load), felt: vec(s.felt), feetLock: q(s.feetLock),
      causes: s.causes ? { contact: q(s.causes.contact), legs: q(s.causes.legs), overspeed: q(s.causes.overspeed) } : null,
      foot: s.foot ? { offset: vec(s.foot.offset), target: vec(s.foot.target), desired: vec(s.foot.desired), achieved: vec(s.foot.achieved),
        force: vec(s.foot.force), capacity: q(s.foot.capacity), mobility: q(s.foot.mobility), state: s.foot.state } : null } };
}
function holds(sim: PlaySim, carrier: Agent) {
  return sim.world.joints.filter((j): j is GraspJoint => j.kind === 'grasp' && j.b === carrier.body).map(j => {
    const d = sim.agents.find(a => a.body === j.a)!;
    return { holder: d.slot, holderState: d.body.support!.state, holderPos: vec(d.pos), holderVel: vec(d.vel),
      legs: q(j.legs), capacity: q(j.capacity), force: q(j.force ?? 0), reach: q(j.reach), hold: j.hold === undefined ? null : q(j.hold),
      slipping: j.slipping ?? false, broken: j.broken ?? false, origin: j.origin ?? null };
  });
}
function signature(sim: PlaySim, result: PlayResult) {
  return hash({ result: { ...result, frames: undefined, telemetry: undefined }, bodies: sim.agents.map(a => a.body),
    intents: sim.intents, rngNext: sim.rng.nextU32() });
}
function finite(value: unknown, path = 'report'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Nonfinite ${path}`);
  if (Array.isArray(value)) value.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => finite(v, `${path}.${k}`));
}
const films: unknown[] = [];
function trial(input: PlaySetup, roster: number, run: string, front: string, seed: number, flip: boolean) {
  const id = `RC-R${roster + 1}-${run}-${front}-${flip ? 'L' : 'R'}-S${seed}`;
  const sim = new PlaySim(input), rb = sim.slot('RB')!, samples: any[] = [];
  const original = sim.world.step;
  let pending: any = null, lowerJointTicks = 0, carrierHoldTicks = 0, maxHoldForce = 0, lowerReachReleases = 0;
  let maxMomentumResidual = 0, maxWorkResidual = 0, maxMotorWorkExcess = 0;
  const carrierFalls: Array<{ t: number; cause: string | null }> = [];
  sim.world.step = function (intents, dt) {
    const carrier = sim.carrier, isOffCarrier = carrier?.team === 'O', before = isOffCarrier ? body(carrier!) : null;
    const beforeHolds = isOffCarrier ? holds(sim, carrier!) : [];
    const p0 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
    const report = original.call(this, intents, dt);
    const p1 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
    const ground = report.groundImpulse.reduce((p, j) => ({ x: p.x + j.x, y: p.y + j.y }), { x: 0, y: 0 });
    maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
    for (let i = 0; i < report.supportMotorWork.length; i++) maxMotorWorkExcess = Math.max(maxMotorWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    lowerReachReleases += report.lowerHoldReleases;
    const afterHolds = isOffCarrier ? holds(sim, carrier!) : [];
    if ([...beforeHolds, ...afterHolds].some(j => !j.broken && j.capacity > 0 && j.legs > 0)) lowerJointTicks++;
    if ([...beforeHolds, ...afterHolds].some(j => !j.broken && j.capacity > 0)) carrierHoldTicks++;
    for (const j of afterHolds) maxHoldForce = Math.max(maxHoldForce, j.force);
    if (isOffCarrier && report.falls.includes(carrier!.idx)) carrierFalls.push({ t: q(sim.t + dt), cause: carrier!.body.support!.cause ?? null });
    pending = { t: q(sim.t), tickEnd: q(sim.t + dt), carrier: carrier?.slot ?? null, before, afterPhysics: isOffCarrier ? body(carrier!) : null,
      intended: isOffCarrier ? { velocity: vec(intents[carrier!.idx]?.vel ?? { x: 0, y: 0 }), push: intents[carrier!.idx]?.push ?? null,
        posture: intents[carrier!.idx]?.posture ?? null, behavior: carrier!.behavior.kind } : null,
      beforeHolds, afterHolds, carrierGroundImpulse: isOffCarrier ? vec(report.groundImpulse[carrier!.idx]) : null,
      carrierSupportMotorWork: isOffCarrier ? q(report.supportMotorWork[carrier!.idx]) : null,
      carrierSupportMotorWorkLimit: isOffCarrier ? q(report.supportMotorWorkLimit[carrier!.idx]) : null,
      carrierPhysicalContacts: isOffCarrier ? report.contacts.filter(c => c.i === carrier!.idx || c.j === carrier!.idx).map(c => ({ other: sim.agents[c.i === carrier!.idx ? c.j : c.i].slot,
        opponent: sim.agents[c.i === carrier!.idx ? c.j : c.i].team !== carrier!.team, impulse: q(c.impulse), closing: q(c.closing) })) : [],
      carrierFall: isOffCarrier && report.falls.includes(carrier!.idx), carrierDown: isOffCarrier && report.downs.includes(carrier!.idx),
      lowerReachReleases: report.lowerHoldReleases, substeps: report.substeps };
    return report;
  };
  sim.event('snap', sim.slot('C') ?? sim.qb);
  while (sim.phase === 'live' && sim.t < 25) {
    const startEvents = sim.events.length;
    sim.tick();
    if (pending) samples.push({ ...pending, newEvents: sim.events.slice(startEvents).filter(e => ['carrier_contact', 'tackle_wrap', 'tackle', 'hit', 'fall', 'broken_tackle', 'missed_tackle', 'fumble', 'holding'].includes(e.type)).map(e => ({ t: e.t, type: e.type, a: e.a === undefined ? null : sim.agents[e.a].slot,
      b: e.b === undefined ? null : sim.agents[e.b].slot, note: e.note ?? null })),
      afterTickHolds: holds(sim, rb), bond: sim.bond ? { carrier: sim.bond.carrier.slot, start: sim.bond.start, progressX: q(sim.bond.progressX),
        stalled: q(sim.bond.stalled ?? 0), down: sim.bond.down, tacklers: sim.bond.tacklers.map(a => a.slot) } : null });
    pending = null;
  }
  if (sim.phase === 'live') sim.whistle('timeout', (sim.carrier ?? sim.qb).pos);
  sim.world.step = original;
  const result = sim.buildResult(), first = sim.events.find(e => e.type === 'carrier_contact');
  const firstCarrier = first?.a === undefined ? null : sim.agents[first.a];
  const firstContact = first ? { t: first.t, carrier: firstCarrier?.slot ?? null, opponent: first.b === undefined ? null : sim.agents[first.b].slot,
    kind: first.note ?? null, x: sim.firstContactX, yardsBeforeContact: sim.firstContactX === null ? null : sim.firstContactX - sim.los,
    afterTransfer: first.t >= sim.handoffAt && sim.handoffAt >= 0 && firstCarrier !== sim.qb } : null;
  const last = samples[samples.length - 1], lastBond = last?.bond;
  const finishCause = result.outcome !== 'tackle' ? result.outcome : rb.body.support!.state === 'down' ? 'physical-down-by-contact'
    : lastBond && lastBond.stalled >= .8 ? 'forward-progress-stalled' : lastBond && sim.t - lastBond.start > 4 ? 'four-second-held-whistle'
      : 'tackle-other-or-fumble-recovery';
  const observedSignature = signature(sim, result);
  let observerVerified: boolean | null = null;
  const diagnosticWitness = roster === 2 && run === 'counter' && front === 'under' && flip && seed === seeds[0];
  if ((roster === 0 && front === 'over' && !flip && seed === seeds[0]) || diagnosticWitness) {
    const control = new PlaySim({ ...input, record: false }), plain = control.run();
    observerVerified = observedSignature === signature(control, plain);
    if (!observerVerified) throw new Error(`Observer or recording changed state/RNG in ${id}`);
  }
  if (input.record) films.push({ id, roster, run, front, seed, flip,
    selection: diagnosticWitness ? 'diagnostic-rejected-allocation-witness' : 'fixed-before-outcomes',
    offCall: input.offCall.label, defCall: input.defCall.label,
    los: sim.los, firstDownX: sim.firstDownX, result, players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name,
      jersey: a.player.jersey, position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn, ratings: a.player.ratings })) });
  const t0 = first?.t ?? sim.handoffAt;
  const window = samples.filter(s => s.tickEnd >= t0 - .4 && s.t <= t0 + 1.5);
  return { id, roster, run, scheme: RUN_BY_ID[run].scheme, front, seed, flip, observedSignature, observerVerified,
    rbProfile: { ...rb.profile }, rbRatings: { ...rb.player.ratings }, yards: result.offenseYards, outcome: result.outcome,
    finishCause, duration: result.duration, possession: result.possession, turnover: result.turnover, penalty: result.penalty?.kind ?? null,
    handoffAt: sim.handoffAt >= 0 ? sim.handoffAt : null, firstContact,
    yardsAfterFirstContact: firstContact?.yardsBeforeContact === null || !firstContact ? null : result.offenseYards - firstContact.yardsBeforeContact,
    firstBlockContactAt: sim.events.find(e => e.type === 'block_contact')?.t ?? null,
    missedAttempts: result.stats.missedTackles, brokenHolds: result.stats.brokenTackles, carrierFalls, lowerJointTicks, carrierHoldTicks,
    maxHoldForce: q(maxHoldForce), lowerReachReleases, maxMomentumResidual, maxWorkResidual, maxMotorWorkExcess,
    stateAtFinish: body(rb), contactWindow: window };
}

const trials: ReturnType<typeof trial>[] = [];
const cpuStart = process.cpuUsage(), wallStart = performance.now();
for (let roster = 0; roster < rosterPairs.length; roster++) for (const run of runs) for (const front of fronts) for (const flip of [false, true]) for (const seed of seeds) {
  const pair = rosterPairs[roster], formation = FORMATION_BY_ID.ace_11, personnel = FRONT_BY_ID[front].personnel[0];
  const record = (roster === 0 && front === 'over' && seed === seeds[0])
    || (roster === 2 && run === 'counter' && front === 'under' && flip && seed === seeds[0]);
  trials.push(trial({ offense: pickOffense(pair.offense, formation.personnel), defense: pickDefense(pair.defense, personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: `${formation.name} · ${RUN_BY_ID[run].name}` },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: `${FRONT_BY_ID[front].name} · Cover 3` },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed, record, recordLevel: 'full' }, roster, run, front, seed, flip));
}
function summarize(items: typeof trials) {
  const withContact = items.filter(t => t.firstContact?.yardsBeforeContact !== null && t.firstContact), afterTransfer = withContact.filter(t => t.firstContact!.afterTransfer);
  return { snaps: items.length, meanYards: mean(items.map(t => t.yards)), medianYards: quantile(items.map(t => t.yards), .5),
    stuffs: items.filter(t => t.yards <= 0).length, stuffRate: items.filter(t => t.yards <= 0).length / items.length,
    explosives10: items.filter(t => t.yards >= 10).length, explosive10Rate: items.filter(t => t.yards >= 10).length / items.length,
    firstCarrierContactSamples: withContact.length, firstNonQBContactAfterTransferSamples: afterTransfer.length,
    meanYardsBeforeFirstCarrierContact: mean(withContact.map(t => t.firstContact!.yardsBeforeContact!)),
    meanYardsAfterFirstCarrierContact: mean(withContact.map(t => t.yardsAfterFirstContact!)),
    meanFirstContactTime: mean(withContact.map(t => t.firstContact!.t)),
    meanYardsAfterFirstContactAfterTransfer: mean(afterTransfer.map(t => t.yardsAfterFirstContact!)),
    lowerHeldSnaps: items.filter(t => t.lowerJointTicks > 0).length, lowerJointTicks: items.reduce((s, t) => s + t.lowerJointTicks, 0),
    lowerReachReleases: items.reduce((s, t) => s + t.lowerReachReleases, 0), missedAttempts: items.reduce((s, t) => s + t.missedAttempts, 0),
    brokenHolds: items.reduce((s, t) => s + t.brokenHolds, 0), timeouts: items.filter(t => t.outcome === 'timeout').length,
    finishCauses: Object.fromEntries([...new Set(items.map(t => t.finishCause))].map(c => [c, items.filter(t => t.finishCause === c).length])),
    carrierFallCauses: Object.fromEntries([...new Set(items.flatMap(t => t.carrierFalls.map(f => f.cause ?? 'unknown')))].map(c => [c, items.flatMap(t => t.carrierFalls).filter(f => (f.cause ?? 'unknown') === c).length])) };
}
const cpu = process.cpuUsage(cpuStart), sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Engine source changed during panel; refusing result');
const report = { schema: 'run-contact-review-v1', sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(), node: process.version,
  executable: process.execPath, command: [process.execPath, '--import', 'tsx', 'scripts/diag/run-contact-review.ts', output],
  scriptSha256: createHash('sha256').update(readFileSync('scripts/diag/run-contact-review.ts')).digest('hex'),
  cohort: { generatedRosterPairs: rosterSeeds, rosterSha256: hash(rosterPairs), strength: .55, playSeeds: seeds, runs, fronts, flips: [false, true],
    formation: 'ace_11', coverage: 'cover3', pressure: null, los: 40, ballY: CENTER_Y, firstDownX: 50, fullPlayLimitSeconds: 25 },
  observerVerifiedCount: trials.filter(t => t.observerVerified === true).length, wallMs: performance.now() - wallStart, cpuMs: (cpu.user + cpu.system) / 1000,
  definitions: { stuff: 'offense-credited rush gain <= 0 yards', explosive: 'offense-credited rush gain >= 10 yards',
    firstContact: 'First existing carrier_contact event: opponent torso contact or successful grasp; never block_contact, miss or mere proximity.',
    yardsAfterContact: 'Offense-credited final/fumble gain minus first carrier-contact x relative to LOS; includes forward-progress officiating.',
    lowerJointTicks: 'Native 20 Hz world tick with a live positive-capacity lower grasp on its offensive ballcarrier, sampled before/after physics.',
    fallCause: 'Existing reduced-support attribution, not proof of exclusive causation.', filmSelection: 'Fixed12: all six concepts/both flips at first roster pair, Over front, first play seed. Additional labelled diagnostic: RC-R3-counter-under-L-S3 reproduces rejected allocation failure; it is not representative film selection.',
    contactWindow: 'Every native tick from 0.4 s before to 1.5 s after first carrier contact (transfer if no contact). Post-physics state precedes new tackle attempts.' },
  limitations: ['144 balanced controlled snaps and three generated roster pairs are neither NFL rate estimates nor natural playcalling.',
    'Subtick force/recovery transitions are summarized by interval means/endpoints; holds born and broken within a tick can be missed.',
    'First contact can occur on the quarterback before a transfer; those snaps are separately identifiable and excluded from after-transfer subsets.',
    'Missed attempts and broken holds count actual engine events; pursuit failures are not invented tackle misses.',
    'There is no throw, selection or randomness override. Recording and observer equivalence checks cover six predetermined trials plus the labelled Counter diagnostic.',
    'Wall/CPU includes read-only observer accounting and recording; not a solver performance benchmark.',
    'Physics fall-cause labels are diagnostics; a constraint and control trajectory can contribute together.'],
  summary: summarize(trials), byConcept: runs.map(run => ({ run, ...summarize(trials.filter(t => t.run === run)) })),
  byConceptFront: runs.flatMap(run => fronts.map(front => ({ run, front, ...summarize(trials.filter(t => t.run === run && t.front === front)) }))),
  filmIds: films.map(f => (f as { id: string }).id), trials };
finite(report); finite(films);
mkdirSync(dirname(output), { recursive: true });
const raw = JSON.stringify(report, null, 2) + '\n';
writeFileSync(output, raw);
writeFileSync(output + '.gz', gzipSync(raw));
const film = JSON.stringify({ schema: 'run-contact-review-film-v1', sourceBefore, sourceAfter, plays: films }) + '\n';
writeFileSync(output.replace(/\.json$/, '') + '-film.json', film);
const compact = { ...report, schema: 'run-contact-review-compact-v1', retainedTraceSelection: 'Same predetermined12 film fixtures plus labelled Counter diagnostic; every native tick in their contact windows.',
  trials: trials.map(t => {
    const { contactWindow, ...row } = t;
    return report.filmIds.includes(t.id) ? { ...row, contactWindow } : row;
  }) };
writeFileSync(output.replace(/\.json$/, '') + '-compact.json', JSON.stringify(compact, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, observerVerifiedCount: report.observerVerifiedCount, summary: report.summary, byConcept: report.byConcept }, null, 2));
