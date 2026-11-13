/** Six predeclared ordinary joined-combination witnesses, with a neutral B/C tap.
 * node --import tsx scripts/diag/combo-attention-witness.ts OUTPUT.json.gz
 * All pictures, decision boundaries and solves come from the unmodified run.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { availability, supportParams } from '../../src/physics/support.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import type { HandJoint, Joint } from '../../src/physics/world.js';
import type { Agent, Engagement } from '../../src/sim/agent.js';
import { RunBlocker, type Combination } from '../../src/sim/behaviors/blocking.js';
import { axisOf, helperSupport } from '../../src/sim/engagement.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../../scripts/source-version.js';

const output = process.argv[2];
if (process.argv.length !== 3 || !output?.endsWith('.json.gz')) throw new Error('Usage: combo-attention-witness.ts OUTPUT.json.gz');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const vec = (v: {x: number; y: number}) => ({x: v.x, y: v.y});
const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', {strength: .55});
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', {strength: .55});
const fixed = [{run:'power',front:'under',seed:3},{run:'split_zone',front:'tite',seed:3}];
const cohort = {rosterSeeds: [31, 32], rosterSha256: hash({offense, defense}), strength: .55,
  formations: {power:'ace_11',split_zone:'gun_wing_12'}, coverage: 'cover3', pressure: null, los: 40, ballY: CENTER_Y, firstDownX: 50,
  fixtures: fixed.flatMap(c => [false, true].map(flip => ({...c, flip}))),
  selection: 'Four predeclared existing cutoff witnesses: Power Under R/L S3 and inside-shade Split/Tite R/L S3, roster31/32. Candidate-only; promoted C cached data reused separately. Same inputs diagnose mechanics, not NFL rates.'};

function collect(input: PlaySetup, run: string, front: string, flip: boolean, seed: number) {
  const sim = new PlaySim(input), id = `CA-R1-${run}-${front}-${flip ? 'L' : 'R'}-S${seed}`;
  const comboIds = new Map<Combination, number>(), jointIds = new WeakMap<Joint, number>();
  let nextJointId = 1;
  const cid = (c: Combination) => {
    if (!comboIds.has(c)) comboIds.set(c, comboIds.size + 1);
    return comboIds.get(c)!;
  };
  const nativeJoint = (j: Joint | undefined) => {
    if (!j) return null;
    if (!jointIds.has(j)) jointIds.set(j, nextJointId++);
    return {id: jointIds.get(j)!, kind: j.kind, live: sim.world.joints.includes(j),
      a: sim.agents.find(a => a.body === j.a)!.slot, b: sim.agents.find(a => a.body === j.b)!.slot,
      actor: j.kind === 'hands' && j.actor ? sim.agents.find(a => a.body === j.actor)!.slot : null,
      state: Object.fromEntries(Object.entries(j).filter(([k]) => !['a', 'b', 'actor'].includes(k)))};
  };
  const supportAvailability = (a: Agent) => a.body.support
    ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
  const engagement = (e: Engagement | null) => {
    if (!e) return null;
    const axis = axisOf(sim, e), lat = {x: -axis.y, y: axis.x};
    return {blocker: e.blocker.slot, defender: e.defender.slot, helpers: e.helpers.map(a => a.slot),
      control: e.control, phi: e.phi, baseB: e.baseB, baseD: e.baseD, start: e.start,
      drive: e.drive && vec(e.drive), surfaceAxis: e.surfaceAxis && vec(e.surfaceAxis), axis: vec(axis),
      hands: nativeJoint(e.hands), helperHands: [...(e.helperHands ?? [])].map(([a, j]) => ({slot: a.slot, joint: nativeJoint(j)})),
      members: [e.blocker, ...e.helpers].map(a => {
        const dx = a.pos.x - e.defender.pos.x, dy = a.pos.y - e.defender.pos.y;
        return {slot: a.slot, position: vec(a.pos), velocity: vec(a.vel), supportAvailability: supportAvailability(a),
          down: a.isDown(sim.t), surfacePhi: Math.atan2(-(dx * lat.x + dy * lat.y), dx * axis.x + dy * axis.y) / (Math.PI / 2),
          helperSupport: e.helpers.includes(a) ? helperSupport(sim, e, a) : null,
          hands: nativeJoint(a === e.blocker ? e.hands : e.helperHands?.get(a))};
      })};
  };
  const plan = (a: Agent) => {
    if (!(a.behavior instanceof RunBlocker)) return null;
    const p = a.behavior.plan;
    return {kind: p.kind, target: p.target?.slot ?? null, drive: vec(p.drive), climbTo: p.climbTo?.slot ?? null,
      pullRole: p.pullRole ?? null, pullPath: p.pullPath?.map(vec) ?? null, contactFit: p.contactFit ? {target:p.contactFit.target.slot,axis:vec(p.contactFit.axis),sealTarget:p.contactFit.sealTarget} : null, combination: p.combination ? {
        id: cid(p.combination), members: p.combination.members.map(a => a.slot), defender: p.combination.defender.slot,
        backer: p.combination.backer?.slot ?? null, released: p.combination.released} : null};
  };
  const body = (a: Agent) => ({slot: a.slot, idx: a.idx, snapReadyAt: a.snapReadyAt,
    decisionInterval: a.mind.decisionInterval, urgency: a.mind.urgency,
    physical: {pos: vec(a.pos), vel: vec(a.vel), facing: a.facing, stance: a.stance,
      support: structuredClone(a.body.support), energy: a.body.energy},
    plan: plan(a), engagement: engagement(a.engagement), tags: [...a.tags]});
  const discover = () => {
    for (const a of sim.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination) cid(a.behavior.plan.combination);
  };
  type PersonalRead = {nextRead: number; secureSince: number; readAt: number; proposal: null | {
    t: number; climber: Agent; keeper: Agent; engagement: Engagement; hands: HandJoint; phi: number; cost: number}};
  const combination = (c: Combination) => {
    const observed = c as Combination & {reads?: [PersonalRead, PersonalRead]; checkSince?: number; checkNextRead?: number};
    const e = c.members[0].engagement;
    return {id: cid(c), members: c.members.map(a => a.slot), defender: c.defender.slot,
      backer: c.backer?.slot ?? null, released: c.released,
      legacySchedule: {nextRead: c.nextRead ?? null, secureSince: c.secureSince ?? null},
      optionalHelperSchedule: {checkNextRead: observed.checkNextRead ?? null, checkSince: observed.checkSince ?? null},
      personalReads: observed.reads?.map((r, i) => ({observer: c.members[i].slot, nextRead: r.nextRead,
        secureSince: r.secureSince, readAt: r.readAt, proposal: r.proposal ? {t: r.proposal.t,
          climber: r.proposal.climber.slot, keeper: r.proposal.keeper.slot, defender: r.proposal.engagement.defender.slot,
          hands: nativeJoint(r.proposal.hands), phi: r.proposal.phi, cost: r.proposal.cost} : null})) ?? null,
      genuinelyJoined: !!e && e.defender === c.defender && !c.released && c.members.every(a => a.engagement === e
        && (a === e.blocker || e.helpers.includes(a)) && a.behavior instanceof RunBlocker
        && a.behavior.plan.combination === c && a.behavior.plan.target === c.defender),
      memberState: c.members.map(body)};
  };
  discover();
  const initialProjection = {players: sim.agents.map(a => ({slot: a.slot, team: a.team, profile: a.profile,
    ratings: a.player.ratings, body: structuredClone(a.body), snapReadyAt: a.snapReadyAt,
    decisionInterval: a.mind.decisionInterval, snapDelay: a.mind.snapDelay})),
    ownership: sim.offense.filter(a => a.behavior instanceof RunBlocker).map(a => ({slot: a.slot, plan: plan(a),
      engagement: null, tags: [...a.tags]}))};
  const cutoffBlocker=sim.slot(flip?'RT':'LT')!, installedPlan=plan(cutoffBlocker)!;
  const installedTarget=(cutoffBlocker.behavior as RunBlocker).plan.target!;
  const surfaceInstallation={blocker:cutoffBlocker.slot,defender:installedTarget.slot,bodyContact:cutoffBlocker.profile.radius+installedTarget.profile.radius,
    blockerPos:vec(cutoffBlocker.pos),defenderPos:vec(installedTarget.pos),plan:structuredClone(installedPlan)};
  const ticks: any[] = [], climbs: any[] = [], backerContacts: any[] = [];
  const touched = new Set<string>();
  let activeTick: any = null, phase = 'outside-tick', activeBoundary: any = null;
  const see = sim.see;
  sim.see = function (observer, target, ...rest) {
    const seen = see.call(this, observer, target, ...rest);
    if (activeTick) activeTick.consumedImages.push({ordinal: activeTick.consumedImages.length,
      phase, observer: observer.slot, target: target.slot, image: structuredClone(seen)});
    return seen;
  };
  const event = sim.event;
  sim.event = function (type, a, b, note) {
    event.call(this, type, a, b, note);
    if (type !== 'block_climb' || !a || !activeTick) return;
    const previous = activeBoundary?.beforeCombinations ?? activeTick.beforeCombinations;
    const old = previous.find((c: any) => !c.released && c.members.includes(a.slot) && c.backer === b?.slot);
    const c = old ? [...comboIds.keys()].find(c => cid(c) === old.id) : null;
    const after = c ? combination(c) : null;
    const row = {t: this.t, phase, initiatingObserver: activeBoundary?.observer ?? null,
      decisionImageOrdinalRange: {first: activeBoundary?.firstImageOrdinal ?? 0, end: activeTick.consumedImages.length},
      event: structuredClone(this.events.at(-1)), climber: a.slot,
      backer: b?.slot ?? null, beforeCombination: old ?? null, eventBoundaryCombination: after,
      consumedImages: structuredClone(activeTick.consumedImages),
      physicalBodiesUnchangedAtDecision: old && after ? hash(old.memberState.map((s: any) => s.physical))
        === hash(after.memberState.map(s => s.physical)) : null};
    activeTick.climbs.push(row); climbs.push(row);
  };
  const methods = sim as PlaySim & {prepareJoinedRunBlocks?: () => void};
  const prepare = methods.prepareJoinedRunBlocks, hasPrepass = typeof prepare === 'function';
  if (prepare) methods.prepareJoinedRunBlocks = function () {
    const oldPhase = phase, oldBoundary = activeBoundary;
    discover();
    const row = {t: this.t, beforeCombinations: [...comboIds.keys()].map(combination), afterCombinations: [] as any[],
      firstImageOrdinal: activeTick?.consumedImages.length ?? 0, endImageOrdinal: 0};
    phase = 'joined-prepass'; activeBoundary = row;
    prepare.call(this);
    discover(); row.afterCombinations = [...comboIds.keys()].map(combination);
    row.endImageOrdinal = activeTick?.consumedImages.length ?? 0;
    if (activeTick) activeTick.prepass = row;
    phase = oldPhase; activeBoundary = oldBoundary;
  };
  for (const a of sim.offense) if (a.behavior instanceof RunBlocker) {
    const behavior = a.behavior, update = behavior.update;
    behavior.update = function (actor, s) {
      const oldPhase = phase, oldBoundary = activeBoundary;
      discover();
      const row = {observer: actor.slot, t: s.t, beforeBody: body(actor),
        beforeCombinations: [...comboIds.keys()].map(combination), firstImageOrdinal: activeTick?.consumedImages.length ?? 0,
        endImageOrdinal: 0, afterBody: null as any, afterCombinations: [] as any[], requested: null as any};
      phase = 'run-block-command'; activeBoundary = row;
      const requested = update.call(this, actor, s);
      discover(); row.requested = structuredClone(requested); row.afterBody = body(actor);
      row.afterCombinations = [...comboIds.keys()].map(combination);
      row.endImageOrdinal = activeTick?.consumedImages.length ?? 0;
      if (activeTick && (row.firstImageOrdinal !== row.endImageOrdinal
        || hash(row.beforeCombinations.map(c => c.personalReads)) !== hash(row.afterCombinations.map(c => c.personalReads))
        || hash(row.beforeBody.plan) !== hash(row.afterBody.plan))) activeTick.commands.push(row);
      phase = oldPhase; activeBoundary = oldBoundary;
      return requested;
    };
  }
  const loads = (slots: string[], report: NonNullable<PlaySim['lastStep']>) => slots.map(slot => {
    const a = sim.slot(slot)!;
    return {slot, appliedIntent: structuredClone(sim.intents[a.idx]), achievedPos: vec(a.pos), achievedVel: vec(a.vel),
      groundImpulse: vec(report.groundImpulse[a.idx]), armImpulse: report.armImpulse[a.idx], armImpulseLimit: report.armImpulseLimit[a.idx],
      armWork: report.armWork[a.idx], armWorkLimit: report.armWorkLimit[a.idx],
      supportMotorWork: report.supportMotorWork[a.idx], supportMotorWorkLimit: report.supportMotorWorkLimit[a.idx],
      groundTractionLimit: supportParams(a.profile).traction * sim.dt,
      physicalContacts: report.contacts.filter(c => c.i === a.idx || c.j === a.idx).map(c => ({
        other: sim.agents[c.i === a.idx ? c.j : c.i].slot, impulse: c.impulse, closing: c.closing})),
      liveHandsAfterPhysics: sim.world.joints.filter(j => j.kind === 'hands' && (j.a === a.body || j.b === a.body)).map(nativeJoint),
      fall: report.falls.includes(a.idx), down: report.downs.includes(a.idx)};
  });
  const tick = sim.tick;
  sim.tick = function () {
    discover();
    activeTick = {t:this.t,beforeAllBodiesSha256:hash(this.agents.map(a=>a.body)),beforeAllAssignmentsSha256:hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)}))),beforeCutoff:body(cutoffBlocker),beforeCombinations: [...comboIds.keys()].map(combination), consumedImages: [], commands: [], climbs: [], prepass: null};
    phase = 'native-tick';
    const previousReport = this.lastStep;
    tick.call(this);
    const report = this.lastStep !== previousReport ? this.lastStep : null;
    activeTick.completedAt = this.t;
    activeTick.afterAllBodiesSha256=hash(this.agents.map(a=>a.body));
    activeTick.completedIntentSha256=hash(this.intents);
    activeTick.afterAllAssignmentsSha256=hash(this.offense.map(a=>({slot:a.slot,plan:plan(a)})));
    activeTick.afterCutoff=body(cutoffBlocker);
    activeTick.afterInstalledTarget=body(installedTarget);
    activeTick.cutoffLoads=report?loads([cutoffBlocker.slot,installedTarget.slot],report):[];
    activeTick.workLedger=report?structuredClone(report.work):null;
    activeTick.afterCombinations = [...comboIds.keys()].map(combination);
    for (const row of activeTick.climbs) {
      const c = row.beforeCombination ? [...comboIds.keys()].find(c => cid(c) === row.beforeCombination.id) : null;
      row.afterWholeTickCombination = c ? combination(c) : null;
      row.completedAt = this.t; row.physicsStepRecorded = !!report;
      row.loads = report && c ? loads(c.members.map(a => a.slot), report) : [];
    }
    if (report) for (const climb of climbs) {
      const key = `${climb.climber}/${climb.backer}`;
      if (!climb.backer || touched.has(key)) continue;
      const a = this.slot(climb.climber)!, b = this.slot(climb.backer)!;
      const hands = this.world.joints.filter(j => j.kind === 'hands'
        && ((j.a === a.body && j.b === b.body) || (j.a === b.body && j.b === a.body))
        && Math.hypot(j.normalForce ?? 0, j.tangentForce ?? 0) > 1e-6);
      const contacts = report.contacts.filter(c => ((c.i === a.idx && c.j === b.idx) || (c.i === b.idx && c.j === a.idx)) && c.impulse > 1e-6);
      if (hands.length || contacts.length) {
        touched.add(key); backerContacts.push({climbT: climb.t, completedAt: this.t, climber: a.slot, backer: b.slot,
          hands: hands.map(nativeJoint), bodyContacts: structuredClone(contacts), loads: loads([a.slot], report)});
      }
    }
    ticks.push(activeTick); activeTick = null; phase = 'outside-tick';
  };
  const result = sim.run();
  const signature = (s: PlaySim, r: PlayResult) => {
    const combos = new Set<Combination>();
    for (const a of s.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination) combos.add(a.behavior.plan.combination);
    return hash({result: {...r, frames: undefined, telemetry: undefined}, bodies: s.agents.map(a => a.body),
      intents: s.intents, events: s.events, rngNext: s.rng.nextU32(),
      ownership: s.offense.filter(a => a.behavior instanceof RunBlocker).map(a => ({slot: a.slot,
        target: a.behavior instanceof RunBlocker ? a.behavior.target?.slot ?? null : null,
        kind: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : null, contactFit:plan(a)?.contactFit??null,
        engagement: a.engagement ? {blocker: a.engagement.blocker.slot, defender: a.engagement.defender.slot,
          helpers: a.engagement.helpers.map(b => b.slot)} : null, tags: [...a.tags]})),
      personalReads: [...combos].map(c => ({members: c.members.map(a => a.slot),
        reads: (c as Combination & {reads?: [PersonalRead, PersonalRead]}).reads?.map(r => ({nextRead: r.nextRead,
          secureSince: r.secureSince, readAt: r.readAt, proposal: r.proposal ? {t: r.proposal.t,
            climber: r.proposal.climber.slot, keeper: r.proposal.keeper.slot, defender: r.proposal.engagement.defender.slot,
            phi: r.proposal.phi, cost: r.proposal.cost} : null})) ?? null})),
      physicalJoints: s.world.joints.map(j => ({kind: j.kind, a: s.agents.find(a => a.body === j.a)!.slot,
        b: s.agents.find(a => a.body === j.b)!.slot, ...Object.fromEntries(Object.entries(j).filter(([k]) => !['a', 'b', 'actor'].includes(k))),
        actor: j.kind === 'hands' && j.actor ? s.agents.find(a => a.body === j.actor)!.slot : null}))});
  };
  const observedSignature = signature(sim, result), plainSim = new PlaySim({...input, record: false}), plain = plainSim.run();
  const plainSignature = signature(plainSim, plain);
  if (observedSignature !== plainSignature) throw new Error(`Attention observer changed ${id}`);
  const eventClimbs = result.events.filter(e => e.type === 'block_climb');
  if (eventClimbs.length !== climbs.length) throw new Error(`Missing whole-tick climb ${id}`);
  return {id, run, front, flip, seed, formation: input.offCall.formation.id, selection: 'fixed-before-outcomes',
    offCall: input.offCall.label, defCall: input.defCall.label, los: sim.los, firstDownX: sim.firstDownX,
    surfaceInstallation, initialProjection, initialSha256: hash(initialProjection), profileSha256: hash(initialProjection.players.map(a => ({slot: a.slot, profile: a.profile, ratings: a.ratings}))),
    prepassAvailable: hasPrepass, personalReadSchemaAvailable: ticks.some(t => t.afterCombinations.some((c: any) => c.personalReads !== null)),
    observerVerified: true, observedSignature, plainSignature, naturalEnd: result.outcome !== 'timeout',
    result, ticks, climbs, backerContacts,
    players: sim.agents.map(a => ({team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn,
      ratings: a.player.ratings, profile: a.profile}))};
}
const plays = fixed.flatMap(c => [false, true].map(flip => {
  const formation = FORMATION_BY_ID[c.run==='split_zone'?'gun_wing_12':'ace_11'], personnel = FRONT_BY_ID[c.front].personnel[0];
  return collect({offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
    offCall: {formation, flip, kind: 'run', run: RUN_BY_ID[c.run], label: `${formation.name} · ${RUN_BY_ID[c.run].name}`},
    defCall: {personnel, front: FRONT_BY_ID[c.front], coverage: COVERAGE_BY_ID.cover3, pressure: null,
      label: `${FRONT_BY_ID[c.front].name} · Cover 3`}, los: 40, ballY: CENTER_Y, firstDownX: 50,
    seed: c.seed, record: true, recordLevel: 'full'}, c.run, c.front, flip, c.seed);
}));
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Engine changed during witness collection');
const report = {schema:'cutoff-installed-surface-native-witness-v1', sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(),
  collectorSha256: createHash('sha256').update(readFileSync('out/cutoff-surface/collect-four.ts')).digest('hex'),
  instrumentationSourceSha256:'46e3be84d1e29f81f4d2be60b94e7ae6759587ceef266a16d0581d1a82149ccb',generatedInstrumentSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  moduleSha256: Object.fromEntries(['src/sim/agent.ts','src/sim/behaviors/blocking.ts','src/sim/behaviors/carrier.ts','src/sim/behaviors/defense.ts','src/sim/engagement.ts','src/physics/world.ts','src/players/physical.ts','src/sim/playsim.ts'].map(p => [p,
    createHash('sha256').update(readFileSync(p)).digest('hex')])), cohort, plays,
  definitions: {observers: 'All existing sim.see calls across every native tick are captured with actual observer and phase. No see calls are added.',
    prepass: 'Only wrap prepareJoinedRunBlocks when the source actually has it. Historical B has no prepass or personal reads; no equivalent fields are invented.',
    personalReads: 'Personal readAt/nextRead/secureSince and actual same-tick proposals are snapshots of native state. Legacy shared nextRead is only labelled historical bookkeeping.',
    decisionBoundary: 'beforeCombination is the current public prepass or RunBlocker command entry; eventBoundaryCombination is actual block_climb emission. A later command can legitimately acquire different work.',
    physics: 'CompletedAt, ownership and loads come from the actual completed native tick containing the release. Backer contacts require positive hand load or body impulse after that climb.',
    installedSurface: 'surfaceInstallation and initialProjection explicitly record the new target-bound desired contactFit before movement. Cached C has no equivalent field; absent historical state is not reconstructed. It is an intended installation change, while all common initial profiles, bodies, target/kind/drive assignments must match cached C.',
    controls: 'Observed versus plain runs compare final physical bodies, intents, events, ownership, live joint state, extant personal read state and the next native RNG value.',
    units: 'Positions yd, time s, impulses kg·yd/s, force kg·yd/s², work kg·yd²/s². Joint IDs are local to each play/source.'}};
mkdirSync(dirname(output), {recursive: true}); writeFileSync(output, gzipSync(JSON.stringify(report), {level: 9}));
console.log(JSON.stringify({output, sourceBefore, sourceAfter, clips: plays.length,
  observerControls: plays.filter(p => p.observerVerified).length, naturalEnds: plays.filter(p => p.naturalEnd).length,
  prepassAvailable: plays.filter(p => p.prepassAvailable).length, climbs: plays.reduce((n, p) => n + p.climbs.length, 0)}, null, 2));
