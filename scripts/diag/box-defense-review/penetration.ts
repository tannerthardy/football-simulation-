/** Opposing reduced contact drill for stretch anchoring.
 *
 * The blocker uses production updateEngagements/stepRunRep. Only the defender's
 * bounded drill movement is prescribed. This contact island intentionally has
 * no runner route, release decision or surrounding traffic: it can diagnose
 * resistance to penetration, not establish native football protection.
 *
 * Node22.23.3; use baseline:run with an explicit output.json path. The same
 * collector is intended for accepted, anchor-only and combined runtime arms.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Intent } from '../../../src/physics/world.js';
import { supportParams } from '../../../src/physics/support.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { updateEngagements } from '../../../src/sim/engagement.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { contactFixture } from '../run-contact-technique.js';
import { sourceVersion } from '../../source-version.js';

const output = process.argv[2];
if (!output || process.argv.length !== 3) throw new Error('Usage: penetration.ts output.json');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const started = performance.now(), sourceBefore = sourceVersion();
const inputs = ([-1, 1] as const).flatMap(side => (['bull', 'cross-face'] as const).map(action => ({
  side, action, seed: 11, ticks: 40, dt: .05,
  blockerInitialVelocity: { x: -.2, y: side * .8 },
  defenderInitialVelocity: { x: -.8, y: side * .8 },
  defenderRequest: { x: -3, y: action === 'bull' ? 0 : -side },
})));

function run(input: typeof inputs[number]) {
  const start = performance.now();
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60,
    side: input.side, seed: input.seed });
  const { sim, blocker: b, defender: d, engagement: e } = f;
  sim.offCall.run = structuredClone(RUN_BY_ID.wz_strong);
  sim.offCall.run.direction = input.side === sim.offAlign.strongSign ? 'strong' : 'weak';
  // Installation and incoming motion are explicit drill initial conditions.
  // The already acquired hands, ratings, profiles and support are untouched.
  e.surfaceAxis = { x: -1, y: 0 };
  e.drive = { x: 1, y: 0 };
  e.nextMoveAt = Infinity;
  b.body.vel = { ...input.blockerInitialVelocity };
  d.body.vel = { ...input.defenderInitialVelocity };
  for (const a of sim.agents) if (a !== b && a !== d)
    a.body.pos = a === sim.carrier ? { x: 0, y: 1 } : { x: 200 + 3 * a.idx, y: 10 };
  // Replace the fixture's stationary visual history with the declared drill
  // picture. No future runner path or opponent private assignment is supplied.
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents, sim.carrier?.idx ?? null);
  const initial = structuredClone({
    bodies: sim.agents.map(a => ({ slot: a.slot, body: a.body, ratings: a.player.ratings })),
    drive: e.drive, surfaceAxis: e.surfaceAxis, sealTarget: e.sealTarget,
    run: sim.offCall.run, strongSign: sim.offAlign.strongSign,
    control: e.control, side: e.side,
    hand: e.hands ? { extension: e.hands.extension, push: e.hands.push,
      hold: e.hands.hold, steer: e.hands.steer,
      actor: e.hands.actor === b.body ? 'blocker' : 'defender' } : null,
  });
  const b0 = { ...b.pos }, d0 = { ...d.pos }, t0 = sim.t;
  let movement: Record<string, unknown> | null = null;
  let ended: unknown = null;
  runContactObservers.set(sim, (rep, phase, data) => {
    if (rep !== e) return;
    if (phase === 'movement') movement = structuredClone(data) as Record<string, unknown>;
    if (phase === 'end') ended = structuredClone(data);
  });
  const budgets = { maxWorkResidual: 0, maxArmImpulseExcess: 0, maxArmWorkExcess: 0,
    maxSupportWorkExcess: 0, maxGroundImpulseExcess: 0, maxPenetration: 0 };
  const totals = { anchorTicks: 0, loadedTicks: 0, normalImpulse: 0, tangentImpulse: 0,
    maxBlockerDepthLoss: 0, maxDefenderPenetration: 0, maxRelativeDepthLost: 0 };
  const frames: unknown[] = [];
  let firstDefenderBackfieldSide: number | null = null, error: string | null = null;
  for (let k = 0; k < input.ticks; k++) {
    if (performance.now() - start > 4000) { error = 'four-second wall budget'; break; }
    const entered = structuredClone({ blocker: b.body, defender: d.body });
    const commands: Intent[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    movement = null;
    updateEngagements(sim, commands);
    if ((ended as { reason?: string } | null)?.reason === 'runner passed defender') {
      error = 'invalid drill initialization: distant carrier ended rep as runner passed defender';
      break;
    }
    // Installed opposing drill action. The blocker command is never replaced.
    commands[d.idx] = { vel: { ...input.defenderRequest }, facing: Math.PI,
      push: 1, posture: .85 };
    const consumedCommands = structuredClone(commands);
    const request = movement as Record<string, unknown> | null;
    const anchored = request?.anchored === true;
    const controllerActive = sim.engagements.includes(e);
    const hand = controllerActive ? e.hands : undefined;
    const handRequest = hand ? { extension: hand.extension, push: hand.push,
      hold: hand.hold, steer: hand.steer, drive: hand.drive, shove: hand.shove,
      actor: hand.actor === b.body ? 'blocker' : 'defender' } : null;
    let report;
    try { report = sim.world.step(commands, sim.dt); }
    catch (cause) { error = String(cause); break; }
    sim.t = Math.round((t0 + (k + 1) * sim.dt) * 1e10) / 1e10;
    sim.world.time = sim.t;
    sim.perception.record(sim.agents, sim.carrier?.idx ?? null);
    const elapsed = sim.t - t0;
    budgets.maxWorkResidual = Math.max(budgets.maxWorkResidual, Math.abs(report.work.residual));
    budgets.maxPenetration = Math.max(budgets.maxPenetration, report.maxPenetration);
    for (const a of sim.agents) {
      const i = a.idx;
      budgets.maxArmImpulseExcess = Math.max(budgets.maxArmImpulseExcess,
        report.armImpulse[i] - report.armImpulseLimit[i]);
      budgets.maxArmWorkExcess = Math.max(budgets.maxArmWorkExcess,
        report.armWork[i] - report.armWorkLimit[i]);
      budgets.maxSupportWorkExcess = Math.max(budgets.maxSupportWorkExcess,
        report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
      budgets.maxGroundImpulseExcess = Math.max(budgets.maxGroundImpulseExcess,
        Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y)
          - supportParams(a.profile).traction * sim.dt);
    }
    const liveHand = !!hand && sim.world.joints.includes(hand);
    const normal = liveHand ? hand!.normalForce ?? 0 : 0;
    const tangent = liveHand ? hand!.tangentForce ?? 0 : 0;
    const relativeDepth = d.pos.x - b.pos.x;
    totals.anchorTicks += Number(anchored);
    totals.loadedTicks += Number(Math.hypot(normal, tangent) > 1e-6);
    totals.normalImpulse += Math.abs(normal) * sim.dt;
    totals.tangentImpulse += Math.abs(tangent) * sim.dt;
    totals.maxBlockerDepthLoss = Math.max(totals.maxBlockerDepthLoss, b0.x - b.pos.x);
    totals.maxDefenderPenetration = Math.max(totals.maxDefenderPenetration, d0.x - d.pos.x);
    totals.maxRelativeDepthLost = Math.max(totals.maxRelativeDepthLost,
      (d0.x - b0.x) - relativeDepth);
    if (relativeDepth < 0 && firstDefenderBackfieldSide === null) firstDefenderBackfieldSide = elapsed;
    frames.push(structuredClone({ t: sim.t, elapsed, entered, controllerActive,
      movement: request, consumedCommands, handRequest,
      achieved: { blocker: b.body, defender: d.body },
      geometry: { blockerDepthLoss: b0.x - b.pos.x, defenderPenetration: d0.x - d.pos.x,
        relativeDepth, relativeShoulder: input.side * (d.pos.y - b.pos.y),
        separation: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y),
        blockerLateral: input.side * (b.pos.y - b0.y), defenderLateral: input.side * (d.pos.y - d0.y) },
      load: { liveHand, normal, tangent, forceOnB: hand?.forceOnB },
      budgets: { work: report.work,
        armImpulse: report.armImpulse, armImpulseLimit: report.armImpulseLimit,
        armWork: report.armWork, armWorkLimit: report.armWorkLimit,
        groundImpulse: report.groundImpulse, groundWork: report.groundWork,
        supportMotorWork: report.supportMotorWork, supportMotorWorkLimit: report.supportMotorWorkLimit },
      contacts: report.contacts.map(c => ({ ...c, a: sim.agents[c.i].slot, b: sim.agents[c.j].slot })),
    }));
  }
  runContactObservers.delete(sim);
  if (hash(f.capacities) !== f.capacitySha256) throw new Error('A fixed fixture capacity changed');
  return { input, inputSha256: hash(input), initial, initialSha256: hash(initial),
    capacitySha256: f.capacitySha256, capacities: f.capacities,
    terminal: false, censor: 'explicit two-second contact drill; no football ending',
    error, elapsedSeconds: (performance.now() - start) / 1000, totals, budgets,
    firstDefenderBackfieldSide, ended, frames,
    final: { elapsed: sim.t - t0, blockerDepthLoss: b0.x - b.pos.x,
      defenderPenetration: d0.x - d.pos.x, relativeDepth: d.pos.x - b.pos.x,
      relativeShoulder: input.side * (d.pos.y - b.pos.y),
      blockerLateral: input.side * (b.pos.y - b0.y),
      blockerSupport: b.body.support?.state, defenderSupport: d.body.support?.state,
      liveHands: !!e.hands && sim.world.joints.includes(e.hands) },
  };
}

const rows = inputs.map(run);
const sourceAfter = sourceVersion();
if (sourceAfter !== sourceBefore) throw new Error('Runtime source changed during collection');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceBefore, sourceAfter,
  collectorSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  settings: '44 accepted flags; RUN_CONTACT_COMPONENTS=1; CF_FLOW unset; no experimental activation',
  scope: 'four reduced contact drills; existing fixed contactFixture profiles/ratings; acquired hands; scripted defender only',
  initialization: 'fixture-generated acquired contact; explicit mirrored incoming velocities; current carrier parked behind surface at(0,1), other nonparticipants beyond x200; 24 identical past pictures; no fabricated felt load',
  limitation: 'These initial conditions and defender actions are prescribed diagnostics. No runner arrival, information-choice, team traffic or outcome realism claim.',
  units: 'positions yd; velocity yd/s; forces kg*yd/s^2; work kg*yd^2/s^2',
  elapsedSeconds: (performance.now() - started) / 1000, rows }));
console.log(JSON.stringify({ output, source: sourceBefore,
  rows: rows.map(({ frames, initial, capacities, ...row }) => row) }, null, 2));
if (rows.some(row => row.error)) process.exitCode = 1;
