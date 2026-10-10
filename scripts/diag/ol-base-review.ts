/** Actual 11v11 OL base/posture witnesses, censored at three seconds.
 * node --import tsx scripts/diag/ol-base-review.ts [output-directory]
 * Observers read executed commands and force reports; they never query vision.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import { availability, baseRadiusAt, comHeightAt, padHeightAt, supportParams } from '../../src/physics/support.js';
import type { HandJoint, Intent, StepReport } from '../../src/physics/world.js';
import { Agent, type Engagement } from '../../src/sim/agent.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

export const olBaseConcepts = ['iz_strong', 'wz_strong', 'power', 'trap', 'counter', 'oz_strong'] as const;
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const FIRST_LEVEL = new Set(['drive', 'reach', 'down', 'combo', 'cutoff']);
const decisionDt = .05, inspectionSeconds = 3;
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const vec = (v: { x: number; y: number }) => ({ x: v.x, y: v.y });
/** Preserve RNG and sentinel values without advancing streams or retaining cycles. */
function snapshot(v: unknown): any {
  return JSON.parse(JSON.stringify(v, (_key, value) => {
    if (value instanceof Agent) return { agentIdx: value.idx };
    if (value instanceof PlaySim) return { playSimReference: true };
    if (value instanceof Map) return { entries: [...value] };
    if (value instanceof Set) return { values: [...value] };
    if (typeof value === 'number' && !Number.isFinite(value)) return { sentinel: String(value) };
    return value;
  }));
}
function engagement(e: Engagement | null) {
  if (!e) return null;
  return { blocker: e.blocker.idx, defender: e.defender.idx, helpers: e.helpers.map(a => a.idx),
    start: e.start, phi: e.phi, control: e.control, baseB: e.baseB, baseD: e.baseD,
    drive: e.drive && vec(e.drive), holding: e.holding };
}
function state(a: Agent) {
  const s = a.body.support!, p = supportParams(a.profile), plan = a.behavior instanceof RunBlocker ? a.behavior.plan : null;
  return { idx: a.idx, slot: a.slot, team: a.team, pos: vec(a.pos), vel: vec(a.vel), facing: a.facing,
    energy: a.body.energy, speed: Math.hypot(a.vel.x, a.vel.y), stance: a.stance, snapReadyAt: a.snapReadyAt,
    behavior: a.behavior.kind, firstLevel: OL.has(a.slot) && !!plan && FIRST_LEVEL.has(plan.kind),
    plan: plan && { kind: plan.kind, target: plan.target?.idx ?? null, drive: vec(plan.drive), pullRole: plan.pullRole ?? null,
      combination: plan.combination && { defender: plan.combination.defender.idx,
        members: plan.combination.members.map(b => b.idx), released: plan.combination.released,
        secureSince: plan.combination.secureSince } }, engagement: engagement(a.engagement),
    support: { posture: s.posture, state: s.state, cause: s.cause ?? null, xi: vec(s.xi),
      availability: availability(s, p, fatigueFactor(a.body.energy)), baseRadius: baseRadiusAt(p, s.posture),
      comHeight: comHeightAt(p, s.posture), padHeight: padHeightAt(p, s.posture),
      lean: vec(s.lean), load: vec(s.load), felt: vec(s.felt), out: s.out,
      tractionLimit: p.traction, legForceLimit: p.pushForce, armForceLimit: p.armForce } };
}
function player(a: Agent) {
  return { idx: a.idx, slot: a.slot, team: a.team, name: `${a.player.firstName} ${a.player.lastName}`,
    jersey: a.player.jersey, position: a.player.position, heightIn: a.player.measurables.heightIn,
    weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings }, profile: { ...a.profile } };
}
function context(sim: PlaySim) {
  return snapshot({ t: sim.t, phase: sim.phase, outcome: sim.outcome, endSpot: sim.endSpot,
    possession: sim.possession, ball: sim.ball, stats: sim.stats, penalty: sim.penalty,
    rng: sim.rng, qbMind: sim.qbMind, intents: sim.intents, events: sim.events,
    engagements: sim.engagements.map(engagement),
    agents: sim.agents.map(a => ({ idx: a.idx, body: a.body, mind: a.mind, behavior: a.behavior,
      recognition: a.recog, tags: a.tags, stance: a.stance, engagement: engagement(a.engagement),
      shedBy: [...a.shedBy].map(([b, t]) => [b.idx, t]), downUntil: a.downUntil,
      nextTackleAt: a.nextTackleAt, noCatchUntil: a.noCatchUntil, readAt: a.readAt })) });
}
const signature = (sim: PlaySim) => hash(context(sim));
export interface OLBaseInput { roster: number; offenseSeed: number; defenseSeed: number;
  concept: typeof olBaseConcepts[number]; flip: boolean; playSeed: number }

export function olBaseTrial(input: OLBaseInput, options: { observe: boolean; recording: boolean }) {
  const formation = FORMATION_BY_ID.ace_11, run = RUN_BY_ID[input.concept];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.offenseSeed), `Panel offense ${input.roster}`, `O${input.roster}`,
      { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.defenseSeed), `Panel defense ${input.roster}`, `D${input.roster}`,
      { strength: .55 }), 'base43'),
    offCall: { formation, flip: input.flip, kind: 'run', run, label: `${formation.name} · ${run.name}` },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: '4-3 Over · Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.playSeed, record: options.recording,
    recordLevel: 'full', recordEvery: 1,
  });
  const id = `OLB-R${input.roster}-${input.concept}-${input.flip ? 'L' : 'R'}-S${input.playSeed}`;
  const players = sim.agents.map(player), initial = sim.agents.map(state), initialContext = context(sim), initialSignature = hash(initialContext);
  const rows: any[] = [], firstContact = new Map<number, any>(), firstAcquisition = new Map<number, any>();
  let observations: any[] = [], acquisitions: any[] = [], pending: any = null;
  let maxMomentumResidual = 0, maxWorkResidual = 0, maxArmImpulseExcess = 0, maxArmWorkExcess = 0,
    maxMotorWorkExcess = 0, maxOverlap = 0;
  if (options.observe) {
    const originalSee = sim.see;
    sim.see = function(a, b, delayScale) {
      const result = originalSee.call(this, a, b, delayScale);
      if (OL.has(a.slot) && a.behavior instanceof RunBlocker)
        observations.push({ observer: a.idx, target: b.idx, t: sim.t, seen: snapshot(result) });
      return result;
    };
    const originalEngage = sim.engage;
    sim.engage = function(a, b, type, drive) {
      const beforeA = state(a), beforeB = state(b), result = originalEngage.call(this, a, b, type, drive);
      if (OL.has(a.slot)) {
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, distance = Math.hypot(dx, dy),
          relative = { x: a.vel.x - b.vel.x, y: a.vel.y - b.vel.y },
          axis = result?.drive && { x: -result.drive.x, y: -result.drive.y };
        const item = { t: sim.t, blocker: a.idx, defender: b.idx, successful: !!result,
          beforeA, beforeB, distance, relativeClosingSpeed: (relative.x * dx + relative.y * dy) / Math.max(1e-12, distance),
          actualPhi: axis ? Math.atan2(-((a.pos.x-b.pos.x)*-axis.y+(a.pos.y-b.pos.y)*axis.x),
            (a.pos.x-b.pos.x)*axis.x+(a.pos.y-b.pos.y)*axis.y)/(Math.PI/2) : null,
          engagement: engagement(result) };
        acquisitions.push(item);
        if (result && !firstAcquisition.has(a.idx)) firstAcquisition.set(a.idx, item);
      }
      return result;
    };
    const originalStep = sim.world.step;
    sim.world.step = function(intents, dt) {
      const before = sim.agents.map(state), requested = snapshot(intents),
        hands = this.joints.filter((j): j is HandJoint => j.kind === 'hands');
      const p0 = this.bodies.reduce((p, b) => ({ x: p.x+b.profile.massKg*b.vel.x, y: p.y+b.profile.massKg*b.vel.y }), { x: 0, y: 0 });
      const report = originalStep.call(this, intents, dt), after = sim.agents.map(state);
      const p1 = this.bodies.reduce((p, b) => ({ x: p.x+b.profile.massKg*b.vel.x, y: p.y+b.profile.massKg*b.vel.y }), { x: 0, y: 0 }),
        ground = report.groundImpulse.reduce((p,j) => ({ x:p.x+j.x,y:p.y+j.y }), { x:0,y:0 });
      maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x-p0.x-ground.x,p1.y-p0.y-ground.y));
      maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
      maxArmImpulseExcess = Math.max(maxArmImpulseExcess, ...report.armImpulse.map((j,i) => j-report.armImpulseLimit[i]));
      maxArmWorkExcess = Math.max(maxArmWorkExcess, ...report.armWork.map((j,i) => j-report.armWorkLimit[i]));
      maxMotorWorkExcess = Math.max(maxMotorWorkExcess, ...report.supportMotorWork.map((j,i) => j-report.supportMotorWorkLimit[i]));
      maxOverlap = Math.max(maxOverlap, report.maxPenetration);
      const deliveredHands = hands.map(j => ({ a: this.indexOf(j.a), b: this.indexOf(j.b),
        actor: this.indexOf(j.actor ?? j.a), extension: j.extension, push: j.push, hold: j.hold, steer: j.steer,
        normalImpulse: (j.normalForce ?? 0)*dt, tangentialImpulse: (j.tangentForce ?? 0)*dt }));
      for (const a of sim.offense.filter(a => OL.has(a.slot))) {
        const otherIsDefender = (i: number) => sim.agents[i]?.team === 'D';
        const bodyLoads = report.contacts.filter(c => c.impulse > 0 && ((c.i===a.idx && otherIsDefender(c.j)) || (c.j===a.idx && otherIsDefender(c.i))));
        const handLoads = deliveredHands.filter(j => (j.a===a.idx || j.b===a.idx) && (j.normalImpulse || j.tangentialImpulse));
        const strikes = report.strikes.filter(j => ((j.i===a.idx && otherIsDefender(j.j)) || (j.j===a.idx && otherIsDefender(j.i)))
          && Math.hypot(j.impulse.x,j.impulse.y)>0);
        if (!firstContact.has(a.idx) && (bodyLoads.length || handLoads.length || strikes.length))
          firstContact.set(a.idx, { interval:[sim.t,sim.t+dt], before:before[a.idx], after:after[a.idx],
            requested:requested[a.idx], bodyLoads, handLoads, strikes });
      }
      pending = { t:sim.t,end:sim.t+dt,before,afterPhysics:after,requested,deliveredHands,
        report: snapshot(report) };
      return report;
    };
  }
  sim.event('snap', sim.slot('C') ?? sim.qb);
  while (sim.phase === 'live' && sim.t < inspectionSeconds-1e-9) {
    observations=[]; acquisitions=[]; pending=null;
    const eventStart = sim.events.length;
    sim.tick();
    if (options.observe && pending) rows.push({ ...pending, observations, acquisitions,
      afterTick:sim.agents.map(state), events: snapshot(sim.events.slice(eventStart)) });
  }
  const end = { t:sim.t, phase:sim.phase, censored:sim.phase==='live', outcome:sim.outcome,
    endSpot:sim.endSpot && vec(sim.endSpot), carrier:sim.carrier?.idx ?? null,
    carrierPosition:sim.carrier && vec(sim.carrier.pos), penalty:sim.penalty ?? null };
  // No whistle/buildResult: a live inspection endpoint is not a timeout or gain.
  const pooledPrecontact = rows.flatMap(r=>r.before.filter((a:any)=>a.firstLevel && !a.engagement && r.t>=a.snapReadyAt)
    .map((a:any)=>({t:r.t,slot:a.slot,posture:a.support.posture,requestedPosture:r.requested[a.idx]?.posture ?? null,
      baseRadius:a.support.baseRadius,speed:a.speed})));
  const actualFirstLevelLoads = [...firstContact.values()].filter(c=>c.before.firstLevel);
  const rangeMean=(xs:number[])=>({n:xs.length,min:xs.length?Math.min(...xs):null,
    max:xs.length?Math.max(...xs):null,mean:xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null});
  const summary = {precontactFirstLevelPosture:rangeMean(pooledPrecontact.map((a:any)=>a.posture)),
    precontactUnsetPostureBins:pooledPrecontact.filter((a:any)=>a.requestedPosture===null).length,
    firstLevelLoadPrePosture:rangeMean(actualFirstLevelLoads.map(c=>c.before.support.posture)),
    firstLevelLoads:actualFirstLevelLoads.map(c=>({slot:c.before.slot,interval:c.interval,prePosture:c.before.support.posture,
      postPosture:c.after.support.posture,requestedPosture:c.requested?.posture ?? null,
      preBaseRadius:c.before.support.baseRadius,postBaseRadius:c.after.support.baseRadius}))};
  return { id,input,selection:'fixed-before-outcomes' as const,players,initial,initialContext,
    profileSha256:hash(players),fixture:{formation:formation.id,front:'over',coverage:'cover3',los:40,
      ballY:CENTER_Y,firstDownX:50,down:1,distance:10,flip:input.flip,playSeed:input.playSeed},
    resolvedOffCall:{formation:sim.offCall.formation.id,concept:sim.offCall.run?.id ?? null,flip:sim.offCall.flip},
    initialSignature,signature:signature(sim),end,summary,firstAcquisitions:[...firstAcquisition.values()],
    firstContacts:[...firstContact.values()],rows,
    invariants:{maxMomentumResidual,maxWorkResidual,maxArmImpulseExcess,maxArmWorkExcess,maxMotorWorkExcess,maxOverlap},
    physics:{handIntegration:sim.world.handIntegration,boundedAttachment:sim.world.boundedAttachment,
      substeps:sim.world.substeps ?? 'native'},
    recording:options.recording ? { frames:sim.frames,telemetry:sim.trace.data,events:sim.events } : null };
}

async function main() {
  if (process.argv.length>3) throw new Error('Usage: ol-base-review.ts [output-directory]');
  const output=process.argv[2] ?? 'out/ol-base-review';
  const scriptPath='scripts/diag/ol-base-review.ts', sourceBefore=sourceVersion(),scriptBefore=fileHash(scriptPath),
    startedAt=new Date().toISOString();
  const inputs:OLBaseInput[]=[];
  for (const [roster,offenseSeed,defenseSeed] of [[1,31,32],[2,41,42]])
    for (const concept of olBaseConcepts) for (const flip of [false,true])
      inputs.push({roster,offenseSeed,defenseSeed,concept,flip,playSeed:3});
  const rows:any[]=[],films:any[]=[],observerChecks:any[]=[];
  for (const input of inputs) {
    const recording=input.roster===1 && !input.flip, row=olBaseTrial(input,{observe:true,recording});
    if (recording) {
      const control=olBaseTrial(input,{observe:false,recording:false});
      const passed=row.signature===control.signature && row.initialSignature===control.initialSignature;
      if (!passed) throw new Error(`Observer changed state/controller/RNG: ${row.id}`);
      observerChecks.push({id:row.id,passed,observedSignature:row.signature,plainSignature:control.signature,
        observedInitialSignature:row.initialSignature,plainInitialSignature:control.initialSignature});
      films.push({...row,rows:undefined,recordingVerified:true});
    }
    rows.push({...row,recording:undefined});
    console.log(JSON.stringify({id:row.id,end:row.end,firstContacts:row.firstContacts.length}));
  }
  const sourceAfter=sourceVersion(),scriptAfter=fileHash(scriptPath);
  if(sourceBefore!==sourceAfter || scriptBefore!==scriptAfter) throw new Error('Source/tool changed during panel');
  const definitions={scope:'Real11v11 Ace/4-3 Over/Cover3 run snapshots at20Hz for3s; six calls, both flips, two rosters. No force, player or controller override. Ordinary snap, mesh, tackle and traffic remain active.',
    endpoint:'Natural finishes retained. A live3s endpoint is inspection-censored, with no forced whistle, timeout, credited gain or fabricated football result.',
    film:'Six predetermined first-roster/unflipped concepts, full positional and telemetry recording; no retrospective outcome selection.',
    frameTime:'Production recordFrame labels the completed physics/decision sample with its controller-start t before advancing the clock. Preserve those raw labels: a live3.0s endpoint normally has a final recorded frame labelled2.95s. Report load intervals and endpoint time separately; do not shift recordings or infer exact contact onset.',
    posture:'First-level means an OL currently executing drive/reach/down/combo/cutoff. Stance is the published high/low cue; support.posture is achieved physical posture. Missing intent.posture targets the current World default0.2, not low merely because the visual cue sayslow. Posture changes at the ordinary finite World rate.',
    load:'First actual OL-to-defender load is nonzero delivered hand, reported body normal impulse or achieved strike in a50ms interval. Acquisition, actual first force and contact duration do not establish a block win.',
    observations:'Existing vision calls copied once as consumed. No extra see calls, RNG draws, physics substeps or decision ticks. Six unobserved/unrecorded controls compare full endpoint body/controller/mind/RNG state.',
    accounting:'Actual ground, arm and corrective-support impulse/work budgets and reduced planar kinetic ledger. No anatomical3D force claims.',
    independence:'Left/right formation flips, calls and rosters are reused controlled inputs, not strict physical mirrors, independent NFL observations or a league-rate estimate.'};
  const report={schema:'ol-base-review-v1',sourceBefore,sourceAfter,scriptBefore,scriptAfter,startedAt,
    invocation:[process.execPath,...process.execArgv,...process.argv.slice(1)],node:process.version,
    decisionDt,inspectionSeconds,inputs,inputSha256:hash(inputs),
    moduleSha256:Object.fromEntries(['src/sim/behaviors/blocking.ts','src/physics/world.ts'].map(p=>[p,fileHash(p)])),
    profileSha256:hash(rows.map(r=>({id:r.id,players:r.players}))),definitions,observerChecks,
    overall:{reps:rows.length,films:films.length,censored:rows.filter(r=>r.end.censored).length,
      maxMomentumResidual:Math.max(...rows.map(r=>r.invariants.maxMomentumResidual)),
      maxWorkResidual:Math.max(...rows.map(r=>r.invariants.maxWorkResidual)),
      maxArmImpulseExcess:Math.max(...rows.map(r=>r.invariants.maxArmImpulseExcess)),
      maxArmWorkExcess:Math.max(...rows.map(r=>r.invariants.maxArmWorkExcess)),
      maxMotorWorkExcess:Math.max(...rows.map(r=>r.invariants.maxMotorWorkExcess)),
      maxOverlap:Math.max(...rows.map(r=>r.invariants.maxOverlap))},rows};
  mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'raw.json.gz'),gzipSync(JSON.stringify(report)+'\n',{level:9}));
  writeFileSync(join(output,'film.json.gz'),gzipSync(JSON.stringify({...report,rows:undefined,plays:films})+'\n',{level:9}));
  writeFileSync(join(output,'summary.json'),JSON.stringify({...report,rows:rows.map(({rows,...r})=>r)},null,2)+'\n');
  console.log(JSON.stringify({source:sourceBefore,...report.overall}));
}
if (process.argv[1]?.endsWith('/ol-base-review.ts')) await main();
