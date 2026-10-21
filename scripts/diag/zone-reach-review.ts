/** Observational ordinary 11v11 panel for zone reach acquisition.
 * node --import tsx scripts/diag/zone-reach-review.ts [output.json.gz]
 * Forty zone inputs and eight installed negative controls. sim.run owns the natural finish;
 * this collector never parks players, fabricates a gain, or reads perception.
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
import type { Agent } from '../../src/sim/agent.js';
import { RunBlocker, isOL, type Combination } from '../../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/zone-fit/before.json.gz';
if (process.argv.length > 3) throw new Error('Usage: zone-reach-review.ts [output.json.gz]');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const runs = ['oz_strong', 'wz_strong'];
const fronts = ['over', 'under', 'odd', 'tite', 'bear'], seeds = [3, 11], rosterSeeds = [[31, 32]];
const controlInputs = [
  { run: 'iz_strong', front: 'over', seed: 3 },
  { run: 'duo', front: 'odd', seed: 11 },
  { run: 'power', front: 'under', seed: 3 },
  { run: 'counter', front: 'tite', seed: 11 },
];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rosterPairs = rosterSeeds.map(([o, d], i) => ({
  offense: generateTeam(new Rng(o), `Panel offense ${i + 1}`, `O${i + 1}`, { strength: .55 }),
  defense: generateTeam(new Rng(d), `Panel defense ${i + 1}`, `D${i + 1}`, { strength: .55 }),
}));
const vec = (v: { x: number; y: number }) => ({ x: v.x, y: v.y });
const films: any[] = [];

function trial(input: PlaySetup, roster: number, run: string, front: string, flip: boolean, seed: number, control = false) {
  const id = `ZR-R${roster + 1}-${run}-${front}-${flip ? 'L' : 'R'}-S${seed}`;
  const sim = new PlaySim(input), comboIds = new Map<Combination, number>();
  const comboId = (c: Combination) => {
    if (!comboIds.has(c)) comboIds.set(c, comboIds.size + 1);
    return comboIds.get(c)!;
  };
  const combo = (c: Combination | undefined) => c ? ({ id: comboId(c), members: c.members.map(a => a.slot),
    defender: c.defender.slot, backer: c.backer?.slot ?? null, released: c.released,
    secureSince: c.secureSince, nextRead: c.nextRead }) : null;
  const plan = (a: Agent) => {
    if (!(a.behavior instanceof RunBlocker)) return null;
    const b = a.behavior, p = b.plan;
    // Copy existing controller state without running a rule read.
    const state = b as unknown as { pullIdx: number; retarget: number; homeY: number | null;
      firstStep: { x: number; y: number } | null; nextRuleRead: number };
    const zoneRead = (b as unknown as { zoneRead?: unknown }).zoneRead;
    return { kind: p.kind, target: p.target?.slot ?? null, drive: vec(p.drive),
      climbTo: p.climbTo?.slot ?? null, pullRole: p.pullRole ?? null,
      pullPath: p.pullPath?.map(vec) ?? null, combination: combo(p.combination),
      pullIdx: state.pullIdx, retarget: state.retarget, homeY: state.homeY,
      firstStep: state.firstStep ? vec(state.firstStep) : null, nextRuleRead: state.nextRuleRead,
      zoneRead: zoneRead === undefined ? null : structuredClone(zoneRead) };
  };
  const engagement = (a: Agent) => {
    const e = a.engagement;
    if (!e) return null;
    const surfaceAxis = (e as typeof e & { surfaceAxis?: { x: number; y: number } }).surfaceAxis;
    return { blocker: e.blocker.slot, defender: e.defender.slot, helpers: e.helpers.map(b => b.slot),
      control: e.control, phi: e.phi, start: e.start, contactReported: e.contactReported ?? false,
      drive: e.drive ? vec(e.drive) : null, sealTarget: e.sealTarget,
      surfaceAxis: surfaceAxis ? vec(surfaceAxis) : null };
  };
  const body = (a: Agent) => ({ slot: a.slot, idx: a.idx, pos: vec(a.pos), vel: vec(a.vel),
    facing: a.facing, stance: a.stance, support: structuredClone(a.body.support),
    energy: a.body.energy, plan: plan(a), engagement: engagement(a), tags: [...a.tags] });
  const ownership = () => sim.offense.filter(a => a.behavior instanceof RunBlocker).map(a => ({
    slot: a.slot, plan: plan(a), engagement: engagement(a), tags: [...a.tags] }));
  const initial = { players: sim.agents.map(a => ({ slot: a.slot, team: a.team, profile: a.profile,
    ratings: a.player.ratings, body: structuredClone(a.body), snapReadyAt: a.snapReadyAt,
    decisionInterval: a.mind.decisionInterval, snapDelay: a.mind.snapDelay })), ownership: ownership() };
  const initialSha256 = hash(initial);
  const updates: any[] = [], trace: any[] = [];
  const olMetrics = new Map<string, any>();
  for (const a of sim.offense.filter(isOL)) olMetrics.set(a.slot, {
    controllerUpdates: 0, freeApproachUpdates: 0, engagedUpdates: 0,
    targetChanges: 0, lateKeeperFreeUpdates: 0, observedSecondLevelFirstLevelKindUpdates: 0,
    requestedSpeedMax: 0, approachSpeedMax: 0, firstContacts: [], firstHands: [],
    armImpulseSum: 0, armWorkSum: 0, groundImpulseMagnitudeSum: 0,
    supportMotorWorkSum: 0, deliveredStrikeCount: 0, falls: 0, downs: 0,
  });
  const firstContacts = new Set<string>(), firstHands = new Set<string>();
  let tickUpdates: any[] = [], staleMemberUpdates = 0, staleOLMemberUpdates = 0;
  let staleTickCount = 0, targetTransitions = 0, cancelledTransitions = 0, earnedClimbs = 0;
  let maxWorkResidual = 0, maxMotorWorkExcess = 0, maxMomentumResidual = 0;
  const observedSee = sim.see;
  let activeUpdate: Agent | null = null, consumed: any[] = [];
  sim.see = function (a, b, ...rest) {
    const seen = observedSee.call(this, a, b, ...rest);
    if (activeUpdate === a) consumed.push({ target: b.slot, image: structuredClone(seen) });
    return seen;
  };
  for (const a of sim.offense) {
    if (!(a.behavior instanceof RunBlocker)) continue;
    const b = a.behavior, update = b.update;
    b.update = function (aa, s) {
      const before = ownership(), beforeBody = body(aa), oldCombo = this.plan.combination;
      const beforeEvent = s.events.length;
      activeUpdate = aa; consumed = [];
      const requested = update.call(this, aa, s);
      activeUpdate = null;
      const after = ownership(), afterBody = body(aa);
      const oldAfter = combo(oldCombo), events = s.events.slice(beforeEvent);
      const stale = after.filter(m => m.plan?.combination && !m.plan.combination.released
        && m.plan.target !== m.plan.combination.defender);
      const ownStale = stale.find(m => m.slot === aa.slot);
      if (ownStale) { staleMemberUpdates++; if (isOL(aa)) staleOLMemberUpdates++; }
      const changedTargets = after.filter(m => before.find(n => n.slot === m.slot)?.plan?.target !== m.plan?.target);
      targetTransitions += changedTargets.length;
      const climbs = events.filter(e => e.type === 'block_climb');
      earnedClimbs += climbs.length;
      const cancelled = !climbs.length && oldCombo && !beforeBody.plan?.combination?.released
        && (oldAfter?.released || afterBody.plan?.combination?.id !== beforeBody.plan?.combination?.id);
      if (cancelled) cancelledTransitions++;
      const row = { t: s.t, observer: aa.slot, before, after, beforeBody, afterBody,
        oldCombinationAfter: oldAfter, changedTargets: changedTargets.map(m => m.slot),
        classification: climbs.length ? 'earned-climb' : cancelled ? 'cancelled-combination'
          : changedTargets.length ? 'target-change' : 'no-target-change',
        staleMembersAfter: stale.map(m => m.slot), requested: structuredClone(requested),
        consumedImages: consumed, events: structuredClone(events) };
      const zoneChanged = JSON.stringify(beforeBody.plan?.zoneRead) !== JSON.stringify(afterBody.plan?.zoneRead);
      const currentTarget = this.plan.target;
      const observedTarget = consumed.find((c: any) => c.target === currentTarget?.slot)?.image ?? null;
      const targetGeometry = currentTarget ? {
        slot: currentTarget.slot, actualPosition: vec(currentTarget.pos), actualVelocity: vec(currentTarget.vel),
        actualDepth: currentTarget.pos.x - s.los, observedPosition: observedTarget?.pos ?? null,
        observedVelocity: observedTarget?.vel ?? null,
        observedDepth: observedTarget?.pos ? observedTarget.pos.x - s.los : null,
        radiusSum: aa.profile.radius + currentTarget.profile.radius,
        actualLateralErrorToDrive: Math.abs((currentTarget.pos.x-aa.pos.x)*this.plan.drive.y
          - (currentTarget.pos.y-aa.pos.y)*this.plan.drive.x),
        actualAlongDrive: (currentTarget.pos.x-aa.pos.x)*this.plan.drive.x
          + (currentTarget.pos.y-aa.pos.y)*this.plan.drive.y,
      } : null;
      Object.assign(row, { targetGeometry });
      const m = olMetrics.get(aa.slot);
      const lateKeeper = !aa.engagement && this.plan.kind === 'combo' && !!this.plan.combination?.released;
      const secondLevelFirstKind = !aa.engagement && targetGeometry?.observedDepth != null
        && targetGeometry.observedDepth >= 2 && ['drive','reach','down','cutoff','draw','combo'].includes(this.plan.kind);
      if (m) {
        m.controllerUpdates++; if (aa.engagement) m.engagedUpdates++; else if (currentTarget) m.freeApproachUpdates++;
        if (changedTargets.some(t => t.slot === aa.slot)) m.targetChanges++;
        if (lateKeeper) m.lateKeeperFreeUpdates++;
        if (secondLevelFirstKind) m.observedSecondLevelFirstLevelKindUpdates++;
        m.requestedSpeedMax = Math.max(m.requestedSpeedMax, Math.hypot(requested.vel.x, requested.vel.y));
        if (!aa.engagement && currentTarget) m.approachSpeedMax = Math.max(m.approachSpeedMax, aa.speed);
      }
      tickUpdates.push(row);
      const soloZone = runs.includes(run) && isOL(aa) && this.plan.kind === 'reach'
        && (!this.plan.combination || this.plan.combination.released);
      Object.assign(row, { zoneReadChanged: zoneChanged, soloZoneReachUpdate: soloZone });
      if (changedTargets.length || cancelled || climbs.length || ownStale || lateKeeper || secondLevelFirstKind
        || zoneChanged || soloZone) updates.push(row);
      return requested;
    };
  }
  const tick = sim.tick;
  sim.tick = function () {
    const t = this.t, oldReport = this.lastStep;
    const p0 = this.agents.reduce((p, a) => ({ x: p.x + a.profile.massKg * a.vel.x,
      y: p.y + a.profile.massKg * a.vel.y }), { x: 0, y: 0 });
    tickUpdates = [];
    const before = this.agents.filter(isOL).map(body), eventStart = this.events.length;
    tick.call(this);
    if (tickUpdates.some(u => u.staleMembersAfter.length)) staleTickCount++;
    const report = this.lastStep !== oldReport ? this.lastStep : null;
    const loads = report ? this.agents.filter(isOL).map(a => ({ slot: a.slot,
      appliedIntent: structuredClone(this.intents[a.idx]), achievedPos: vec(a.pos), achievedVel: vec(a.vel),
      groundImpulse: vec(report.groundImpulse[a.idx]), armImpulse: report.armImpulse[a.idx],
      armImpulseLimit: report.armImpulseLimit[a.idx], armWork: report.armWork[a.idx],
      armWorkLimit: report.armWorkLimit[a.idx], supportMotorWork: report.supportMotorWork[a.idx],
      supportMotorWorkLimit: report.supportMotorWorkLimit[a.idx],
      physicalContacts: report.contacts.filter(c => c.i === a.idx || c.j === a.idx).map(c => ({
        other: this.agents[c.i === a.idx ? c.j : c.i].slot, impulse: c.impulse, closing: c.closing })),
      deliveredStrikes: report.strikes.filter(s => s.i === a.idx || s.j === a.idx).map(s => ({
        actor: this.agents[s.i].slot, target: this.agents[s.j].slot, impulse: vec(s.impulse), work: s.work })),
      liveHandsAfterPhysics: this.world.joints.filter(j => j.kind === 'hands' && (j.a === a.body || j.b === a.body)).map(j => ({
        a: this.agents.find(b => b.body === j.a)!.slot, b: this.agents.find(b => b.body === j.b)!.slot,
        normalForce: j.kind === 'hands' ? j.normalForce ?? 0 : 0, tangentForce: j.kind === 'hands' ? j.tangentForce ?? 0 : 0,
      })), fall: report.falls.includes(a.idx), down: report.downs.includes(a.idx),
    })) : [];
    for (const load of loads) {
      const a = this.slot(load.slot)!;
      const m = olMetrics.get(load.slot)!;
      m.armImpulseSum += load.armImpulse; m.armWorkSum += load.armWork;
      m.groundImpulseMagnitudeSum += Math.hypot(load.groundImpulse.x, load.groundImpulse.y);
      m.supportMotorWorkSum += load.supportMotorWork;
      m.deliveredStrikeCount += load.deliveredStrikes.length;
      m.falls += Number(load.fall); m.downs += Number(load.down);
      const nativeContact = (other: string, kind: 'body' | 'hands') => {
        const key = `${a.slot}:${other}`, visited = kind === 'body' ? firstContacts : firstHands;
        if (visited.has(key)) return;
        visited.add(key);
        const d = this.slot(other)!;
        const p = plan(a), drive = p?.drive ?? { x: 1, y: 0 };
        const delta = { x: d.pos.x-a.pos.x, y: d.pos.y-a.pos.y };
        const row = { t, completedAt: this.t, other, otherTeam: d.team,
          blockerPosition: vec(a.pos), defenderPosition: vec(d.pos),
          blockerVelocity: vec(a.vel), defenderVelocity: vec(d.vel),
          planKind: p?.kind ?? null, planTarget: p?.target ?? null,
          drive, lateralErrorToDrive: Math.abs(delta.x*drive.y-delta.y*drive.x),
          alongDrive: delta.x*drive.x+delta.y*drive.y,
          engagement: engagement(a), nativeLoad: load };
        (kind === 'body' ? m.firstContacts : m.firstHands).push(row);
      };
      for (const c of load.physicalContacts) nativeContact(c.other, 'body');
      for (const j of load.liveHandsAfterPhysics) nativeContact(j.a === a.slot ? j.b : j.a, 'hands');
    }
    if (report) {
      const p1 = this.agents.reduce((p, a) => ({ x: p.x + a.profile.massKg * a.vel.x,
        y: p.y + a.profile.massKg * a.vel.y }), { x: 0, y: 0 });
      const ground = report.groundImpulse.reduce((p, j) => ({ x: p.x + j.x, y: p.y + j.y }), { x: 0, y: 0 });
      maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
      maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
      for (let i = 0; i < report.supportMotorWork.length; i++) maxMotorWorkExcess = Math.max(maxMotorWorkExcess,
        report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    }
    // First divergent ownership states retain the actual completed native-step
    // load and motion, even in an unrecorded trial. Labels alone are not loads.
    for (const u of tickUpdates) if (updates.includes(u)) u.deliveredStep = loads;
    if (input.record) trace.push({ t, before, updates: tickUpdates,
      after: this.agents.filter(isOL).map(body), deliveredStep: loads,
      events: structuredClone(this.events.slice(eventStart)), phase: this.phase });
  };
  const result = sim.run();
  const signature = (s: PlaySim, r: PlayResult) => hash({ result: { ...r, frames: undefined, telemetry: undefined },
    bodies: s.agents.map(a => a.body), intents: s.intents, events: s.events,
    ownership: s.offense.filter(a => a.behavior instanceof RunBlocker).map(a => ({ slot: a.slot,
      target: a.behavior instanceof RunBlocker ? a.behavior.target?.slot ?? null : null,
      kind: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : null,
      engagement: a.engagement ? { blocker: a.engagement.blocker.slot, defender: a.engagement.defender.slot,
        helpers: a.engagement.helpers.map(b => b.slot) } : null, tags: [...a.tags] })), rngNext: s.rng.nextU32() });
  const observedSignature = signature(sim, result);
  const plainSim = new PlaySim({ ...input, record: false }), plain = plainSim.run();
  const plainSignature = signature(plainSim, plain);
  if (observedSignature !== plainSignature) throw new Error(`Observer/recording changed ${id}`);
  if (input.record) films.push({ id, selection: control ? 'installed-negative-control' : 'fixed-before-outcomes', roster, run, front, flip, seed,
    offCall: input.offCall.label, defCall: input.defCall.label, los: sim.los, firstDownX: sim.firstDownX,
    result, players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn,
      ratings: a.player.ratings, profile: a.profile })), trace });
  return { id, roster, run, front, flip, seed, control, formation: input.offCall.formation.id,
    initialSha256, profileSha256: hash(initial.players.map(a => ({
    slot: a.slot, profile: a.profile, ratings: a.ratings }))), observerVerified: true, observedSignature, plainSignature,
    result: { ...result, frames: undefined, telemetry: undefined }, naturalEnd: result.outcome !== 'timeout',
    staleMemberUpdates, staleOLMemberUpdates, staleTickCount, targetTransitions, cancelledTransitions, earnedClimbs,
    firstStale: updates.find(u => u.staleMembersAfter.length) ?? null, updates,
    olMetrics: Object.fromEntries(olMetrics),
    maxMomentumResidual, maxWorkResidual, maxMotorWorkExcess };
}

const trials: ReturnType<typeof trial>[] = [], cpuStart = process.cpuUsage(), wallStart = performance.now();
const runTrial = (roster: number, run: string, front: string, flip: boolean, seed: number, control = false) => {
    const pair = rosterPairs[roster], formation = FORMATION_BY_ID.ace_11;
    const personnel = FRONT_BY_ID[front].personnel[0];
    const row = trial({ offense: pickOffense(pair.offense, formation.personnel), defense: pickDefense(pair.defense, personnel),
      offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: `${formation.name} · ${RUN_BY_ID[run].name}` },
      defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null,
        label: `${FRONT_BY_ID[front].name} · Cover 3` }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
      record: control || (front === 'over' && seed === seeds[0]), recordLevel: 'full' }, roster, run, front, flip, seed, control);
    console.log(JSON.stringify({ id: row.id, yards: row.result.offenseYards, outcome: row.result.outcome,
      staleMemberUpdates: row.staleMemberUpdates, targetTransitions: row.targetTransitions, observerVerified: true }));
    return row;
};
for (const run of runs) for (const front of fronts)
  for (const flip of [false, true]) for (const seed of seeds) {
    trials.push(runTrial(0, run, front, flip, seed));
  }
for (const c of controlInputs) for (const flip of [false, true])
  trials.push(runTrial(0, c.run, c.front, flip, c.seed, true));
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Engine source changed during panel; refusing result');
const cpu = process.cpuUsage(cpuStart);
const summary = { snaps: trials.length, observerVerifiedCount: trials.filter(t => t.observerVerified).length,
  staleSnaps: trials.filter(t => t.staleMemberUpdates > 0).length,
  staleMemberUpdates: trials.reduce((s, t) => s + t.staleMemberUpdates, 0),
  staleOLMemberUpdates: trials.reduce((s, t) => s + t.staleOLMemberUpdates, 0),
  staleTicks: trials.reduce((s, t) => s + t.staleTickCount, 0),
  targetTransitions: trials.reduce((s, t) => s + t.targetTransitions, 0),
  cancelledTransitions: trials.reduce((s, t) => s + t.cancelledTransitions, 0),
  earnedClimbs: trials.reduce((s, t) => s + t.earnedClimbs, 0),
  meanYards: trials.reduce((s, t) => s + t.result.offenseYards, 0) / trials.length,
  naturalEnds: trials.filter(t => t.naturalEnd).length, censors: trials.filter(t => !t.naturalEnd).length };
const report = { schema: 'zone-reach-review-v1', sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(),
  command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)], node: process.version,
  collectorSha256: createHash('sha256').update(readFileSync('scripts/diag/zone-reach-review.ts')).digest('hex'),
  moduleSha256: Object.fromEntries(['src/sim/behaviors/blocking.ts', 'src/sim/run-block-fit.ts',
    'src/sim/engagement.ts', 'src/physics/world.ts'].map(p => [p,
    createHash('sha256').update(readFileSync(p)).digest('hex')])),
  cohort: { generatedRosterPairs: rosterSeeds, rosterSha256: hash(rosterPairs), strength: .55, playSeeds: seeds,
    runs, fronts, flips: [false, true], formation: 'ace_11', coverage: 'cover3', pressure: null,
    los: 40, ballY: CENTER_Y, firstDownX: 50, inputCohort: 'zone-40-plus-eight-installed-controls',
    rosterPair: rosterSeeds[0], controlInputs,
    fullPlayLimit: 'PlaySim.run owns the engine natural finish/timeout; no collector override' },
  definitions: {
    stale: 'After an existing RunBlocker.update, an unreleased combination pointer names a defender different from that member plan.target (including null). Counts are controller updates, not independent snaps.',
    cancellation: 'The update releases or detaches its previous live combination without emitting block_climb. Shared member state and the old object are retained.',
    earnedClimb: 'An actual block_climb emitted by the ordinary combination read; no cancellation is relabelled as a climb.',
    deliveredLoad: 'Native lastStep contacts/strikes, per-body arm/ground work and impulse, and tick-mean live hand-joint forces after physics. Engagement membership and planned assignment are recorded separately.',
    filmSelection: 'Fixed12: four OZ/WZ Over seed3 directions plus all eight installed nonzone controls. No retrospective selection.',
    zoneRead: 'Read-only RunBlocker.zoneRead getter copied from stored controller state, absent on baseline. Contains consumed zone image and planned phase/drive/aim/travel feasibility, not an additional observation.',
    surfaceAxis: 'Existing engagement geometry frame copied separately from its intended displacement drive and desired sealTarget; absent on baseline.',
    retainedZoneUpdates: 'Every ordinary solo OL reach update in an OZ/WZ play, plus every recorded zoneRead change and ordinary assignment transitions. Full fixed-film trace retains all controllers independently of these selection criteria.',
    observedSecondLevelFirstLevelKind: 'Free controller update with the already-consumed target image at least 2 yd beyond LOS while kind remains drive/reach/down/cutoff/draw/combo; descriptive classification, not automatic football error. No hidden position is used for this counter.',
    lateKeeper: 'Released-combination member remains kind combo and is not in a physical engagement; descriptive recovery opportunity.',
    contactLeverage: 'At the first native body or surviving-hands contact with each other player, signed along-drive and absolute lateral-to-drive center offsets are recorded. Plan drive is intended displacement, not proof of winning leverage.',
  }, limitations: [
    '40 balanced OZ/WZ snaps and eight nonzone installed controls on one generated roster are diagnostic football, not NFL rate calibration.',
    'Tick-mean joint fields retain only hands still present after physics/cleanup; per-body lastStep impulse/work also includes contacts removed during the tick.',
    'No extra sim.see, decision or RNG calls. All 48 observed/recorded executions are compared with plain recording-disabled execution.',
    'Wall/CPU includes observation, full replay recording and a plain rerun for every input; not a solver benchmark.',
    'Timeout outcomes are explicit censors, not natural rushing results. No custom inspection limit or fabricated whistle is introduced.',
  ], summary, wallMs: performance.now() - wallStart, cpuMs: (cpu.user + cpu.system) / 1000,
  filmIds: films.map(f => f.id), trials };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(report), { level: 9 }));
const filmOutput = output.replace(/\.json\.gz$/, '') + '-film.json.gz';
writeFileSync(filmOutput, gzipSync(JSON.stringify({ schema: 'zone-reach-film-v1', sourceBefore, sourceAfter,
  collectorSha256: report.collectorSha256, plays: films }), { level: 9 }));
console.log(JSON.stringify({ output, filmOutput, sourceBefore, sourceAfter, summary }, null, 2));
