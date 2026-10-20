/**
 * Reduced split-zone slice contact witness. This starts from an analytically
 * staged snap-time state, including a moving TE, not a simulated motion path.
 * The ordinary RunBlocker, RunDefender, hand-fight controller and World execute
 * the rep. Twenty stationary, distant bystanders preserve PlaySim indexing and
 * the offensive surface's lateral landmarks; they never supply a forced block.
 * No coverage exchange, ball flight, mesh, full play or credited gain is tested.
 */
import { CENTER_Y } from '../core/field.js';
import { Rng } from '../core/rng.js';
import type { Vec2 } from '../core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../league/team.js';
import { RUN_BY_ID } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../playbook/defense.js';
import { FORMATION_BY_ID } from '../playbook/formations.js';
import { fatigueFactor } from '../physics/kinematics.js';
import { availability, baseRadiusAt, supportParams } from '../physics/support.js';
import type { HandJoint, Intent, StepReport } from '../physics/world.js';
import type { Agent } from '../sim/agent.js';
import { RunBlocker, type RunBlockPlan } from '../sim/behaviors/blocking.js';
import { RunDefender } from '../sim/behaviors/defense.js';
import { inBlockReach, updateEngagements } from '../sim/engagement.js';
import { PlaySim } from '../sim/playsim.js';
import type { Frame } from '../sim/types.js';

export type SliceGeometry = 'wideSurface' | 'penetratingEdge' | 'initialReachNegative';
export interface MotionContactInput {
  seed: number;
  side: 1 | -1;
  initialSpeed: number;
  geometry: SliceGeometry;
  substeps: number;
}
export const motionContactGeometries = {
  wideSurface: { edgeDepth: .3, edgeWidth: 5.2 },
  penetratingEdge: { edgeDepth: -.7, edgeWidth: 5.2 },
  initialReachNegative: { edgeDepth: .3, edgeWidth: 13.5 },
} as const;
export const motionContactDt = .05;
export const motionContactDuration = 2.5;
const vec = (p: Vec2) => ({ x: p.x, y: p.y });
const parked = { kind: 'parked-reference', update: (): Intent => ({ vel: { x: 0, y: 0 } }) };

/** Read achieved force channels, never engagement labels or requested strikes. */
export function motionContactLoads(report: Pick<StepReport, 'contacts' | 'strikes'>, a: number, b: number,
  hands?: Pick<HandJoint, 'normalForce' | 'tangentForce'>) {
  const pair = (r: { i: number; j: number }) => (r.i === a && r.j === b) || (r.i === b && r.j === a);
  const contacts = report.contacts.filter(r => pair(r) && r.impulse > 0);
  const strikes = report.strikes.filter(r => pair(r) && Math.hypot(r.impulse.x, r.impulse.y) > 0);
  const handNormalForce = hands?.normalForce ?? 0, handTangentialForce = hands?.tangentForce ?? 0;
  const sources: Array<'body' | 'hands' | 'strike'> = [];
  if (contacts.length) sources.push('body');
  if (handNormalForce || handTangentialForce) sources.push('hands');
  if (strikes.length) sources.push('strike');
  return { contacts, strikes, sources, handNormalForce, handTangentialForce,
    handBodyLoaded: sources.includes('body') || sources.includes('hands'), loaded: sources.length > 0 };
}

function body(a: Agent) {
  const s = a.body.support!, params = supportParams(a.profile);
  return { pos: vec(a.pos), vel: vec(a.vel), facing: a.facing, energy: a.body.energy, spin: a.body.spin ?? 0,
    support: { state: s.state, cause: s.cause ?? null, posture: s.posture, xi: vec(s.xi), lean: vec(s.lean),
      load: vec(s.load), felt: vec(s.felt), out: s.out, base: baseRadiusAt(params, s.posture),
      availability: availability(s, params, fatigueFactor(a.body.energy)) } };
}

/** Build exact paired state. The only speed-dependent input is TE velocity. */
function build(input: MotionContactInput, recording: boolean) {
  if (![1, -1].includes(input.side) || !Number.isFinite(input.initialSpeed) || input.initialSpeed < 0
    || !Number.isInteger(input.substeps) || input.substeps < 1 || !motionContactGeometries[input.geometry])
    throw new Error('Invalid motion-contact input');
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.seed), 'Slice offense', 'OFF', { strength: .55 }), '12'),
    defense: pickDefense(generateTeam(new Rng(input.seed + 1), 'Slice defense', 'DEF', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.gun_wing_12, flip: input.side > 0, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Reduced slice contact' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Reduced edge fit' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.seed, record: recording, recordLevel: 'full', recordEvery: 1,
  });
  sim.world.substeps = input.substeps;
  const te = sim.slot('H')!, end = sim.slot('DE_W')!, side = input.side;
  for (const a of sim.agents) {
    a.engagement = null;
    a.body.vel = { x: 0, y: 0 };
    a.body.pos = { x: 5 + a.idx * .8,
      y: a.pos.y + (a.team === 'D' ? (side - 1) * a.mind.alignmentError : 0) };
    a.body.facing = a.team === 'O' ? 0 : Math.PI;
    a.behavior = parked;
    a.downUntil = 99;
  }
  sim.engagements.length = 0;
  sim.world.joints.length = 0;
  const g = motionContactGeometries[input.geometry];
  te.body.pos = { x: sim.los - 1.4, y: CENTER_Y + side * 1.8 };
  te.body.vel = { x: 0, y: -side * input.initialSpeed };
  te.body.facing = -side * Math.PI / 2;
  end.body.pos = { x: sim.los + g.edgeDepth, y: CENTER_Y - side * g.edgeWidth };
  end.body.facing = Math.PI;
  te.downUntil = end.downUntil = -1;
  // Execute the same production split-zone slice landmarks and shoulder fit.
  const plan: RunBlockPlan = { kind: 'pull', target: end, pullRole: 'kick',
    drive: { x: .3 / Math.hypot(.3, 1), y: -side / Math.hypot(.3, 1) },
    pullPath: [{ x: sim.los - 1.4, y: te.pos.y }, { x: sim.los - 1.3, y: end.pos.y + side * .65 }] };
  const installation = { name: 'formation-consistent-v2' as const,
    formationFlip: sim.offCall.flip, strongSign: sim.offAlign.strongSign,
    stagedTESide: side, sliceSign: -sim.offAlign.strongSign, plannedDriveSign: Math.sign(plan.drive.y) };
  if (installation.strongSign !== side || installation.sliceSign !== installation.plannedDriveSign)
    throw new Error('Staged slice installation does not match formation strength');
  te.behavior = new RunBlocker(plan);
  end.behavior = new RunDefender('C', -side);
  end.runFit = { gap: 'C', side: -side, kind: 'edge', technique: 'control', edge: 'box', pace: 'stack' };
  // A mirrored physical witness also mirrors the geometric execution offset.
  // Preserve its generated magnitude and cadence; do not zero player mistakes.
  const executionErrors = { te: te.mind.executionError, end: end.mind.executionError };
  for (const a of [te, end]) Object.defineProperty(a.mind, 'executionError', { value: side * a.mind.executionError });
  // Stationary QB is a reference ball/mesh cue, outside this contact island.
  // Its possession is scaffolding; no handoff/ball/tackle controller is run.
  sim.ball = { kind: 'held', carrier: sim.qb };
  const initialPositions = sim.agents.map(a => vec(a.pos));
  // Analytical constant-velocity history is consistent with the staged state.
  // This does not validate a player's actual legal presnap path or acceleration.
  for (let k = 23; k >= 0; k--) {
    for (const a of sim.agents) a.body.pos = { x: initialPositions[a.idx].x - a.vel.x * k * motionContactDt,
      y: initialPositions[a.idx].y - a.vel.y * k * motionContactDt };
    sim.perception.record(sim.agents);
  }
  sim.agents.forEach(a => { a.body.pos = initialPositions[a.idx]; });
  return { sim, te, end, plan, executionErrors, installation };
}

/**
 * Fixed 20 Hz football controls at all physics resolutions. The ending is an
 * inspection censor, never a prescribed kickout, tackle or football timeout.
 */
export function motionContact(input: MotionContactInput, options: { observe?: boolean; recording?: boolean } = {}) {
  const observe = options.observe ?? true, recording = options.recording ?? false;
  const { sim, te, end, plan, executionErrors, installation } = build(input, recording);
  const frames: any[] = [], replayFrames: Frame[] = [];
  // Preserve the actual observation timestamp when the positional frame is at
  // the end of its 50 ms interval. Never issue extra perception reads.
  let observations: NonNullable<NonNullable<typeof sim.trace.data>['frames'][number]['perception']> = [];
  const plainSee = sim.see;
  if (recording) sim.see = function (a, b, delayScale) {
    const seen = plainSee.call(this, a, b, delayScale);
    observations.push({ a: a.idx, b: b.idx, t: this.t, source: 'see', position: [seen.pos.x, seen.pos.y],
      velocity: [seen.vel.x, seen.vel.y], age: seen.age ?? null });
    return seen;
  };
  const player = (a: Agent) => ({ idx: a.idx, team: a.team, slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`,
    jersey: a.player.jersey, position: a.player.position, heightIn: a.player.measurables.heightIn,
    weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings }, profile: { ...a.profile } });
  const initial = { te: body(te), end: body(end), plan: { ...plan, target: end.idx,
    drive: vec(plan.drive), pullPath: plan.pullPath?.map(vec) }, installation,
    readyAt: { te: te.snapReadyAt, end: end.snapReadyAt }, executionErrors,
    mirroredExecutionErrors: { te: te.mind.executionError, end: end.mind.executionError },
    teKineticEnergyKgYd2PerS2: .5 * te.profile.massKg * input.initialSpeed ** 2,
    initialReachable: inBlockReach(te, end, 'run') };
  // This is a deterministic fixture-state audit, not a restart/checkpoint API.
  // Named streams/cached mind values are read, never advanced, for comparison.
  const copyState = (x: unknown) => JSON.parse(JSON.stringify(x, (_key, value) =>
    value instanceof Map ? { entries: [...value] } : value instanceof Set ? { values: [...value] } : value));
  const initialContext = { installation, rng: copyState(sim.rng), agents: sim.agents.map(a => ({ idx: a.idx, slot: a.slot,
    body: copyState(a.body), mind: copyState(a.mind), readyAt: a.snapReadyAt, runFit: a.runFit ?? null,
    behavior: a.behavior.kind })), history: { samples: 24, dt: motionContactDt, law: 'constant-velocity backward from staged state' } };
  const filmFrame = () => {
    replayFrames.push({ t: sim.t, agents: sim.agents.flatMap(a => [a.pos.x, a.pos.y, a.facing]),
      ball: [sim.qb.pos.x, sim.qb.pos.y, .9], carrier: sim.qb.idx });
    sim.trace.state(sim);
    const traceFrame = sim.trace.data?.frames.at(-1);
    if (traceFrame && observations.length) traceFrame.perception = observations.slice();
  };
  if (recording) filmFrame();
  let firstAcquisition: any = null, firstContact: any = null, firstHandBodyContact: any = null, closest = Infinity;
  const contactMetrics = { engagedDecisionIntervals: 0, actualLoadedDecisionIntervals: 0,
    handBodyLoadedDecisionIntervals: 0, engagedHandBodyLoadedDecisionIntervals: 0,
    handNormalAbsoluteImpulse: 0, handTangentialAbsoluteImpulse: 0, bodyNormalImpulse: 0,
    strikeImpulseMagnitudeSum: 0, strikeKineticWork: 0 };
  let momentumResidual = 0, workResidual = 0, motorWorkExcess = 0, armImpulseExcess = 0, armWorkExcess = 0, overlap = 0;
  const falls: Array<{ t: number; slot: string; cause: string | null }> = [];
  const history: unknown[] = [];
  const momentum = () => sim.agents.reduce((p, a) => ({ x: p.x + a.profile.massKg * a.vel.x,
    y: p.y + a.profile.massKg * a.vel.y }), { x: 0, y: 0 });
  for (let k = 0; k < Math.round(motionContactDuration / motionContactDt); k++) {
    sim.t = k * motionContactDt;
    observations = [];
    sim.perception.record(sim.agents);
    for (const a of [te, end]) a.mind.update(sim.t, motionContactDt, a.body.energy,
      a.engagement ? .65 : Math.hypot(te.pos.x - end.pos.x, te.pos.y - end.pos.y) < 3 ? .25 : 0);
    const before = observe ? { te: body(te), end: body(end) } : null;
    // Production snap reaction gates actuation, while initial momentum remains
    // an input to the same World. It must be braked rather than zeroed by a gate.
    for (const a of sim.agents) sim.intents[a.idx] = a === te || a === end
      ? sim.t < a.snapReadyAt ? { vel: { x: 0, y: 0 }, facing: a.facing } : a.behavior.update(a, sim)
      : { vel: { x: 0, y: 0 }, facing: a.facing };
    if (te.engagement && !firstAcquisition) firstAcquisition = { t: sim.t, te: body(te), end: body(end),
      distance: Math.hypot(te.pos.x - end.pos.x, te.pos.y - end.pos.y), control: te.engagement.control,
      relativeSpeed: Math.hypot(te.vel.x - end.vel.x, te.vel.y - end.vel.y) };
    updateEngagements(sim, sim.intents);
    for (const a of [te, end]) if (sim.t < a.snapReadyAt) sim.intents[a.idx] = { ...sim.intents[a.idx],
      vel: { x: 0, y: 0 }, facing: a.facing, push: 0, dive: undefined, lunge: undefined, posture: a.body.support!.posture };
    const hands = te.engagement?.hands;
    const capacities = hands ? { push: hands.push, hold: hands.hold, steer: hands.steer } : null;
    const p0 = momentum();
    sim.world.time = sim.t;
    const report = sim.world.step(sim.intents, motionContactDt);
    sim.lastStep = report;
    const p1 = momentum(), ground = report.groundImpulse.reduce((p, j) => ({ x: p.x + j.x, y: p.y + j.y }), { x: 0, y: 0 });
    momentumResidual = Math.max(momentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
    workResidual = Math.max(workResidual, Math.abs(report.work.residual));
    motorWorkExcess = Math.max(motorWorkExcess, ...report.supportMotorWork.map((w, i) => w - report.supportMotorWorkLimit[i]));
    armImpulseExcess = Math.max(armImpulseExcess, ...report.armImpulse.map((w, i) => w - report.armImpulseLimit[i]));
    armWorkExcess = Math.max(armWorkExcess, ...report.armWork.map((w, i) => w - report.armWorkLimit[i]));
    overlap = Math.max(overlap, report.maxPenetration);
    const loads = motionContactLoads(report, te.idx, end.idx, hands), physical = loads.contacts;
    contactMetrics.engagedDecisionIntervals += Number(!!te.engagement);
    contactMetrics.actualLoadedDecisionIntervals += Number(loads.loaded);
    contactMetrics.handBodyLoadedDecisionIntervals += Number(loads.handBodyLoaded);
    contactMetrics.engagedHandBodyLoadedDecisionIntervals += Number(!!te.engagement && loads.handBodyLoaded);
    contactMetrics.handNormalAbsoluteImpulse += Math.abs(loads.handNormalForce) * motionContactDt;
    contactMetrics.handTangentialAbsoluteImpulse += Math.abs(loads.handTangentialForce) * motionContactDt;
    contactMetrics.bodyNormalImpulse += physical.reduce((s, c) => s + c.impulse, 0);
    contactMetrics.strikeImpulseMagnitudeSum += loads.strikes.reduce((s, c) => s + Math.hypot(c.impulse.x, c.impulse.y), 0);
    contactMetrics.strikeKineticWork += loads.strikes.reduce((s, c) => s + c.work, 0);
    if ((!firstContact && loads.loaded) || (!firstHandBodyContact && loads.handBodyLoaded)) {
      const dx = end.pos.x - te.pos.x, dy = end.pos.y - te.pos.y, d = Math.hypot(dx, dy),
        vx = te.vel.x - end.vel.x, vy = te.vel.y - end.vel.y;
      const contact = { interval: [sim.t, sim.t + motionContactDt], source: loads.sources[0], sources: loads.sources, before,
        bodyClosingAtTouch: physical.length ? Math.max(...physical.map(c => c.closing)) : null,
        bodyNormalImpulse: physical.reduce((s, c) => s + c.impulse, 0),
        endpointRelativeNormalSpeed: (vx * dx + vy * dy) / d,
        endpointRelativeTangentialSpeed: (-vx * dy + vy * dx) / d,
        handNormalImpulse: (hands?.normalForce ?? 0) * motionContactDt,
        handTangentialImpulse: (hands?.tangentForce ?? 0) * motionContactDt, capacities,
        strikes: loads.strikes,
        after: { te: body(te), end: body(end) } };
      if (!firstContact && loads.loaded) {
        firstContact = contact;
        sim.event('block_contact', te, end, `Reduced slice: actual ${loads.sources.join('/')} load`);
      }
      if (!firstHandBodyContact && loads.handBodyLoaded) firstHandBodyContact = contact;
    }
    for (const idx of report.falls) if (idx === te.idx || idx === end.idx)
      falls.push({ t: sim.t + motionContactDt, slot: sim.agents[idx].slot, cause: sim.agents[idx].body.support?.cause ?? null });
    const distance = Math.hypot(te.pos.x - end.pos.x, te.pos.y - end.pos.y);
    closest = Math.min(closest, distance);
    if (observe) frames.push({ t: sim.t, end: sim.t + motionContactDt, before, after: { te: body(te), end: body(end) },
      intents: [sim.intents[te.idx], sim.intents[end.idx]], distance, acquired: !!te.engagement,
      tags: { te: [...te.tags], end: [...end.tags] }, handCapacities: capacities,
      handForces: hands ? { normal: hands.normalForce ?? 0, tangent: hands.tangentForce ?? 0 } : null,
      handImpulses: hands ? { normal: (hands.normalForce ?? 0) * motionContactDt, tangent: (hands.tangentForce ?? 0) * motionContactDt } : null,
      contacts: physical, strikes: loads.strikes, loadSources: loads.sources,
      groundImpulse: [report.groundImpulse[te.idx], report.groundImpulse[end.idx]],
      groundWork: [report.groundWork[te.idx], report.groundWork[end.idx]], work: report.work,
      armImpulse: [report.armImpulse[te.idx], report.armImpulse[end.idx]],
      armImpulseLimit: [report.armImpulseLimit[te.idx], report.armImpulseLimit[end.idx]],
      armWork: [report.armWork[te.idx], report.armWork[end.idx]], armWorkLimit: [report.armWorkLimit[te.idx], report.armWorkLimit[end.idx]],
      substeps: report.substeps });
    history.push([body(te), body(end), sim.intents[te.idx], sim.intents[end.idx], report.work,
      report.groundImpulse[te.idx], report.groundImpulse[end.idx]]);
    sim.t = (k + 1) * motionContactDt;
    if (recording) filmFrame();
  }
  return { input, id: `MC-S${input.seed}-${input.geometry}-${input.side < 0 ? 'L' : 'R'}-V${input.initialSpeed}-P${input.substeps}`,
    selection: 'fixed-before-outcomes' as const, negativeControl: input.geometry === 'initialReachNegative',
    decisionDt: motionContactDt, duration: motionContactDuration, initial, initialContext,
    participants: { te: player(te), end: player(end) }, closest, firstAcquisition, firstContact, firstHandBodyContact,
    contactMetrics, falls,
    contactClassification: firstHandBodyContact ? 'hand-body-loaded-contact' : firstContact ? 'strike-only-contact'
      : firstAcquisition ? 'acquired-without-actual-load' : 'no-acquisition-within-window',
    endpoint: { te: body(te), end: body(end), engaged: !!te.engagement },
    invariants: { momentumResidual, workResidual, motorWorkExcess, armImpulseExcess, armWorkExcess, overlap },
    physicalHistory: history, rngNext: sim.rng.nextU32(), frames,
    recording: recording ? { frames: replayFrames, telemetry: sim.trace.data, events: sim.events, players: sim.agents.map(player) } : null };
}
