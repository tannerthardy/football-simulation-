/** Staged deep-help decision witness; not a measured field bust rate.
 * node --import tsx scripts/diag/coverage-cap-review.ts [output.json]
 * Observation wrappers copy already-consumed vision; no extra reads or draws.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Body } from '../../src/physics/kinematics.js';
import { World, type Intent } from '../../src/physics/world.js';
import { Agent } from '../../src/sim/agent.js';
import { CoverageJudgment } from '../../src/sim/coverage/judgment.js';
import { ReleaseReader, type ReceiverRead } from '../../src/sim/coverage/reads.js';
import type { Directive } from '../../src/sim/coverage/rules.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
/** Copy state/RNG without invoking controller methods; retain finite sentinels. */
function snapshot(value: unknown): any {
  return JSON.parse(JSON.stringify(value, (_key, v) => {
    if (v instanceof Agent) return { agentIdx: v.idx, slot: v.slot };
    if (v instanceof Map) return { entries: [...v] };
    if (v instanceof Set) return { values: [...v] };
    if (typeof v === 'number' && !Number.isFinite(v)) return { sentinel: String(v) };
    return v;
  }));
}
const input = {
  offenseSeed: 7, defenseSeed: 19, playSeed: 3, personnel: '11', defensivePersonnel: 'nickel',
  formation: 'gun_doubles_11', concept: 'four_verts', front: 'over', coverage: 'cover4',
  los: 40, ballY: 26, firstDownX: 50, observer: 'FS', ownReceiver: 'X', otherReceiver: 'H', cap: 'CB_W',
  staged: { observer: { pos: { x: 52, y: 20 }, facing: Math.PI },
    own: { pos: { x: 48, y: 20 }, vel: { x: 6, y: 0 } },
    other: { pos: { x: 50, y: 23 }, vel: { x: 6, y: 0 } },
    cap: { pos: { x: 50, y: 21 }, vel: { x: 0, y: 0 }, facing: Math.PI, since: 0 },
    otherDefenders: { pos: { x: 40, y: 40 } } },
  historySamples: 24, historyDt: .05, stageAt: .3, routeReadTimes: [.1, .3],
  primary: { type: 'man', receiver: 'X', overTop: true },
  physicalWindow: { start: .3, dt: .05, steps: 8, desiredVelocity: { x: 6, y: 0 }, desiredFacing: 0 },
};
const agentState = (a: Agent) => snapshot({ idx: a.idx, slot: a.slot, team: a.team,
  pos: a.pos, vel: a.vel, facing: a.facing, stance: a.stance,
  hiddenActualSupport: a.body.support, scenarioDownUntil: a.downUntil });
const readState = (r: ReceiverRead) => snapshot({ ...r, r: { idx: r.r.idx, slot: r.r.slot } });
const directiveState = (d: Directive) => snapshot(d);
const bodyState = (b: Body) => ({ pos: b.pos, vel: b.vel, facing: b.facing,
  energy: b.energy, sprintLoad: b.sprintLoad, squeeze: b.squeeze, spin: b.spin, support: b.support });

function trial(grounded: boolean, observe: boolean) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.offenseSeed), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(input.defenseSeed), 'D', 'D'), 'nickel'), seed: input.playSeed,
    offCall: { formation: FORMATION_BY_ID[input.formation], flip: false, kind: 'pass',
      pass: PASS_BY_ID[input.concept], label: 'staged cap witness' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID[input.coverage],
      pressure: null, label: 'staged cap witness' }, los: input.los, ballY: input.ballY, firstDownX: input.firstDownX,
  });
  const a = sim.slot(input.observer)!, own = sim.slot(input.ownReceiver)!, other = sim.slot(input.otherReceiver)!,
    cap = sim.slot(input.cap)!;
  Object.assign(a.body, structuredClone(input.staged.observer));
  Object.assign(own.body, structuredClone(input.staged.own));
  Object.assign(other.body, structuredClone(input.staged.other));
  for (const d of sim.defense) if (d !== a) d.body.pos = { ...input.staged.otherDefenders.pos };
  cap.body.pos = { ...input.staged.cap.pos }; cap.body.vel = { ...input.staged.cap.vel };
  cap.body.facing = input.staged.cap.facing;
  cap.body.support!.state = grounded ? 'down' : 'up'; cap.body.support!.since = input.staged.cap.since;
  // Prescribed moving pictures use consistent position/velocity and actual
  // delayed perception. This does not reconstruct a snap or preceding hit.
  const placeReceivers = (t: number) => {
    for (const [receiver, stage] of [[own, input.staged.own], [other, input.staged.other]] as const)
      receiver.body.pos = { x: stage.pos.x + stage.vel.x * (t - input.stageAt),
        y: stage.pos.y + stage.vel.y * (t - input.stageAt) };
  };
  for (let k = 1 - input.historySamples; k <= 0; k++) {
    placeReceivers(k * input.historyDt); sim.perception.record(sim.agents);
  }
  const reader = new ReleaseReader(a, sim), judgment = new CoverageJudgment();
  const context = () => snapshot({ t: sim.t, phase: sim.phase, ball: sim.ball, rng: sim.rng,
    perception: sim.perception, reader, judgment,
    agents: sim.agents.map(p => ({ idx: p.idx, body: p.body, mind: p.mind, stance: p.stance })) });
  const initialSignature = hash(context()), initialContext = { t: sim.t, phase: sim.phase,
    ball: snapshot(sim.ball), agents: sim.agents.map(agentState), rng: snapshot(sim.rng) };
  const players = [a, own, other, cap].map(p => snapshot({ idx: p.idx, slot: p.slot,
    player: p.player, profile: p.profile, initialMind: p.mind }));
  const consumedObservations: any[] = [], readHistory: any[] = [];
  if (observe) {
    const originalSee = sim.see;
    sim.see = function(observer, target, scale) {
      const seen = originalSee.call(this, observer, target, scale);
      consumedObservations.push({ t: sim.t, observer: observer.slot, target: target.slot, seen: snapshot(seen) });
      return seen;
    };
  }
  for (const t of input.routeReadTimes) {
    while (sim.t < t - 1e-9) {
      sim.t = Math.min(t, sim.t + input.historyDt); placeReceivers(sim.t);
      sim.perception.record(sim.agents);
    }
    reader.read(sim, own); reader.read(sim, other);
    if (observe) readHistory.push({ t, reads: reader.recordedReads(t).map(readState) });
  }
  const primary: Directive = { t: 'man', r: own, opts: { overTop: true } };
  const chosen = judgment.decide(a, sim, reader, primary, true);
  const decision = { t: sim.t, primary: directiveState(primary), chosen: directiveState(chosen),
    reason: judgment.reason, cachedReceiverReads: reader.recordedReads(sim.t).map(readState),
    hiddenActualCap: { ...agentState(cap), isDown: cap.isDown(sim.t), timeUntilUp: cap.timeUntilUp(sim.t) } };
  const decisionSignature = hash(context());
  // Same normal command in both controls: an attempted upfield cap continuation.
  // This is a two-body capability window, not an executed catch or coverage replay.
  const bodies = [structuredClone(own.body), structuredClone(cap.body)], world = new World(bodies);
  world.time = sim.t;
  const intents: Intent[] = bodies.map(() => ({ vel: { ...input.physicalWindow.desiredVelocity },
    facing: input.physicalWindow.desiredFacing }));
  const frames: any[] = [];
  for (let k = 0; k < input.physicalWindow.steps; k++) {
    const report = world.step(intents, input.physicalWindow.dt);
    frames.push(snapshot({ t: world.time, receiver: bodyState(bodies[0]), cap: bodyState(bodies[1]),
      capDepth: bodies[1].pos.x - bodies[0].pos.x,
      capLateral: Math.abs(bodies[1].pos.y - bodies[0].pos.y),
      bodyContactImpulse: report.contacts.reduce((s, c) => s + c.impulse, 0),
      groundImpulse: report.groundImpulse, workResidual: report.work.residual }));
  }
  return { grounded, initialSignature, initialContext, players, profileSha256: hash(players.map(p => p.profile)),
    consumedObservations, readHistory, decision, decisionSignature, physical: { intents, frames,
      firstReceiverPastCap: frames.find(f => f.capDepth <= 0)?.t ?? null,
      minCapDepth: Math.min(...frames.map(f => f.capDepth)),
      receiverTravel: bodies[0].pos.x - own.pos.x, capTravel: bodies[1].pos.x - cap.pos.x },
    finalSignature: hash({ context: context(), bodies, time: world.time, joints: world.joints }) };
}

const sourceSha256 = sourceVersion();
const down = trial(true, true), up = trial(false, true), plainDown = trial(true, false), plainUp = trial(false, false);
if (sourceVersion() !== sourceSha256) throw new Error('Engine source changed during this witness');
const observerNeutrality = [down, up].map((r, i) => {
  const plain = i === 0 ? plainDown : plainUp;
  return { grounded: r.grounded, initial: r.initialSignature === plain.initialSignature,
    decision: r.decisionSignature === plain.decisionSignature, final: r.finalSignature === plain.finalSignature };
});
if (observerNeutrality.some(r => !r.initial || !r.decision || !r.final)) throw new Error('Observer changed staged execution');
const report = { schema: 'coverage-cap-review-v1', sourceSha256,
  toolSha256: fileHash('scripts/diag/coverage-cap-review.ts'), sourceVersionToolSha256: fileHash('scripts/source-version.ts'),
  node: process.version, command: 'node --import tsx scripts/diag/coverage-cap-review.ts [output.json]',
  input, inputSha256: hash(input), observerNeutrality,
  scope: 'Staged reachable support state through generated Agents, actual delayed ReleaseReader and CoverageJudgment, plus an ordinary two-body World control. Primary man-X directive is supplied, not selected by the installed cover4 rule.',
  limits: [
    'No field prevalence, NFL reference, full-play catch, or bust-frequency estimate.',
    'The preceding hit and routes into this fixture are not simulated; prescribed constant-velocity receiver positions supply coherent delayed history, including synthetic pre-window samples.',
    'Support/isDown/timeUntilUp are hidden diagnostic state, not information currently exposed by Perceived.',
    'World uses the same fixed requested command in both controls; it does not replay either defender\'s football controller.',
    'Being upright does not prove a secure cap: this stationary upright control also loses its x-depth margin by the window end. It moves farther than the recovering control; neither is a completed help/tackle test.',
    'Read observation wrappers copy only existing calls; cached-read and RNG snapshots make no extra reads/draws.',
  ], grounded: down, uprightControl: up };
const output = process.argv[2] ?? 'data/reviews/physics-world/block-fit/coverage-cap-witness.json';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256, observerNeutrality,
  grounded: { chosen: down.decision.chosen, reason: down.decision.reason, physical: { ...down.physical, frames: undefined } },
  uprightControl: { chosen: up.decision.chosen, reason: up.decision.reason, physical: { ...up.physical, frames: undefined } } }, null, 2));
