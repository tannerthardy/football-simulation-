/**
 * Assignment of behaviors at the snap, and behavior transitions on play
 * events (handoff, throw, catch, interception, fumble, recovery).
 */
import { clamp, type Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import { gapY } from '../playbook/alignment.js';
import { getRoute } from '../playbook/routes.js';
import type { RunConcept } from '../playbook/types.js';
import type { Agent, Behavior } from './agent.js';
import { isOL, planRunBlocking, playSideSign, PassProtector, ProtectionCoordinator, RunBlocker } from './behaviors/blocking.js';
import { BallCarrier } from './behaviors/carrier.js';
import { goTo, stand } from './behaviors/common.js';
import { Blitzer, FumbleScramble, ManCoverage, PassRusher, Pursuit, ZoneCoverage } from './behaviors/defense.js';
import { QBHandoff, QBPass } from './behaviors/qb.js';
import { DownfieldBlocker, RouteRunner, TrackBall } from './behaviors/receiver.js';
import type { PlaySim } from './playsim.js';

const READ_BASE: Record<string, number> = { DE: 0.12, DT: 0.12, NT: 0.12, LB: 0.25, CB: 0.5, NB: 0.4, DB: 0.45, FS: 0.45, SS: 0.38 };

export function assignBehaviors(sim: PlaySim): void {
  const off = sim.offAlign;
  const call = sim.offCall;

  // ---------------------------------------------------------- defense first
  for (const d of sim.defense) {
    const spot = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!;
    const key = d.slot.split('_')[0];
    const base = READ_BASE[key] ?? 0.3;
    d.readAt = d.profile.reactionTime + base * (1.35 - d.r('playRecognition')) + Math.abs(sim.rng.normal(0, 0.08));
    if (call.kind === 'pass' && call.pass?.fake) {
      const susceptibility = key === 'LB' || key === 'SS' ? 1 : key === 'DE' || key === 'DT' || key === 'NT' ? 0.35 : 0.6;
      d.fooledUntil = d.readAt + (1.1 - d.r('playRecognition')) * 0.9 * susceptibility * sim.rng.range(0.6, 1.3);
    }
    const role = spot.role;
    switch (role.kind) {
      case 'rush':
        d.behavior = new PassRusher(d, sim, spot.gap, spot.gapSign);
        break;
      case 'blitz':
        d.behavior = new Blitzer(d, sim, role.gap, spot.gapSign);
        break;
      case 'man': {
        const tgt = spot.manTarget ? sim.slot(spot.manTarget) : undefined;
        d.behavior = tgt ? new ManCoverage(d, sim, tgt, !!spot.press, spot.gap, spot.gapSign) : new ZoneCoverage(d, sim, 'robber', spot.gap, spot.gapSign);
        break;
      }
      case 'zone':
        d.behavior = new ZoneCoverage(d, sim, role.zone, spot.gap, spot.gapSign);
        break;
      case 'spy':
        d.behavior = new ZoneCoverage(d, sim, 'robber', spot.gap, spot.gapSign);
        break;
    }
  }

  // ---------------------------------------------------------- offense
  const qb = sim.qb;
  if (call.kind === 'pass' && call.pass) {
    const concept = call.pass;
    const coord = new ProtectionCoordinator();
    for (const a of sim.offense) if (isOL(a)) {
      coord.add(a);
      a.behavior = new PassProtector(coord);
    }
    for (const a of sim.offense) {
      if (a === qb || isOL(a)) continue;
      const ref = off.refOf[a.slot as keyof typeof off.refOf];
      const spot = off.spots[a.slot];
      const outside = Math.sign(a.pos.y - sim.ballY) || off.strongSign;
      const mkRoute = (id: string, delay = 0) => () => new RouteRunner(a, sim, getRoute(id), outside, delay);
      if (ref === 'B' || ref === 'B2' || !ref) {
        const assign = ref === 'B' ? concept.back : 'check';
        if (assign === 'block') {
          coord.add(a);
          a.behavior = new PassProtector(coord);
        } else if (assign === 'check') {
          coord.add(a);
          a.behavior = new PassProtector(coord, mkRoute(ref === 'B2' ? 'back_flat' : 'checkdown'), 1.0 + sim.rng.range(0, 0.3));
        } else {
          a.behavior = new RouteRunner(a, sim, getRoute(assign), outside, 0.1);
        }
        continue;
      }
      if (spot?.inline && concept.teBlock) {
        coord.add(a);
        a.behavior = new PassProtector(coord);
        continue;
      }
      const side = ref[0] === 'S' ? concept.strong : concept.weak;
      const num = Number(ref[1]) as 1 | 2 | 3 | 4;
      const routeId = side[num] ?? (num === 1 ? 'go' : 'seam');
      a.behavior = new RouteRunner(a, sim, getRoute(routeId), outside, spot?.inline ? 0.15 : 0);
    }
    const qbb = new QBPass(qb, sim, concept);
    qb.behavior = qbb;
    qbb.init(sim);
    return;
  }

  // Run play.
  const concept = call.run!;
  const plans = planRunBlocking(sim, concept);
  for (const [a, plan] of plans) a.behavior = new RunBlocker(plan);
  const rb = sim.slot('RB') ?? null;
  const mesh = meshFor(sim, concept);
  if (concept.scheme === 'qbDraw') {
    qb.behavior = new QBHandoff(mesh.qb, 1.0, null, 0, true);
    if (rb) rb.behavior = new RunBlocker({ kind: 'climb', target: null, drive: { x: 1, y: 0 } });
  } else {
    qb.behavior = new QBHandoff(mesh.qb, mesh.time, rb, mesh.pitch);
    if (rb) rb.behavior = new RunnerToMesh(mesh.rb, mesh.time, mesh.aim);
  }
  for (const a of sim.offense) {
    if (a.behavior.kind === 'idle') a.behavior = new DownfieldBlocker();
  }
}

interface Mesh {
  qb: Vec2;
  rb: Vec2;
  aim: Vec2;
  time: number;
  pitch: number;
}

function meshFor(sim: PlaySim, concept: RunConcept): Mesh {
  const ps = playSideSign(sim, concept);
  const los = sim.los;
  const by = sim.ballY;
  const qbType = sim.offCall.formation.qb;
  const teOnPlayside = ps === sim.offAlign.strongSign ? sim.offAlign.hasTE.S : sim.offAlign.hasTE.W;
  let aimY: number;
  switch (concept.aim) {
    case 'A':
      aimY = gapY(sim.offAlign, 'A', ps);
      break;
    case 'B':
      aimY = gapY(sim.offAlign, 'B', ps);
      break;
    case 'C':
      aimY = by + ps * (teOnPlayside ? 4.3 : 3.4);
      break;
    case 'D':
      aimY = gapY(sim.offAlign, 'D', ps);
      break;
    case 'edge':
      aimY = by + ps * 8;
      break;
  }
  const aim = { x: los + 0.6, y: aimY };
  let qb: Vec2;
  let rb: Vec2;
  let time = concept.meshTime;
  let pitch = 1.3;
  if (concept.scheme === 'toss') {
    qb = { x: los - 1.8, y: by + ps * 0.6 };
    rb = { x: los - 5.5, y: by + ps * 4.0 };
    pitch = 5;
    time = 0.45;
  } else if (concept.scheme === 'draw') {
    qb = { x: qbType === 'under' ? los - 5.5 : los - 6, y: by };
    rb = { x: qb.x + 0.6, y: by + ps * 0.8 };
  } else if (qbType === 'under') {
    qb = { x: los - 2.4, y: by + ps * 0.5 };
    rb = { x: los - 2.9, y: by + ps * 1.1 };
  } else if (qbType === 'pistol') {
    qb = { x: los - 4.2, y: by + ps * 0.3 };
    rb = { x: los - 4.5, y: by + ps * 0.95 };
  } else {
    qb = { x: los - 5.0, y: by };
    rb = { x: los - 4.4, y: by + ps * 0.9 };
  }
  return { qb, rb, aim, time, pitch };
}

/** Running back before the handoff: time the arrival at the mesh. */
export class RunnerToMesh implements Behavior {
  readonly kind = 'mesh';
  constructor(
    readonly mesh: Vec2,
    readonly meshTime: number,
    readonly aim: Vec2,
  ) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    const dt = this.meshTime - sim.t;
    const d = Math.hypot(this.mesh.x - a.pos.x, this.mesh.y - a.pos.y);
    if (dt <= 0.05 || d < 0.4) {
      // Through the mesh toward the aiming point.
      return goTo(a, this.aim, { through: a.profile.vmax * 0.7, speed: 0.8 });
    }
    const speed = clamp(d / dt / a.profile.vmax, 0.15, 0.85);
    if (sim.t < 0.15) return stand();
    return goTo(a, this.mesh, { speed, through: a.profile.vmax * 0.5 });
  }
}

// ------------------------------------------------------------ transitions

export function onHandoff(sim: PlaySim, _from: Agent, to: Agent): void {
  const aim = to.behavior instanceof RunnerToMesh ? to.behavior.aim : { x: sim.los + 1, y: to.pos.y };
  const patience = to.r('patience');
  to.behavior = new BallCarrier({ aim, aimUntil: sim.t + 0.3 + 0.5 * patience }, to);
}

export function onThrow(sim: PlaySim): void {
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const tgt = ball.target;
  if (tgt) tgt.behavior = new TrackBall(tgt, sim, tgt.behavior);
}

export function onBallCaught(sim: PlaySim, r: Agent): void {
  r.behavior = new BallCarrier({}, r);
  for (const a of sim.offense) if (a !== r) a.behavior = new DownfieldBlocker();
  for (const d of sim.defense) d.behavior = new Pursuit();
}

export function onInterception(sim: PlaySim, d: Agent): void {
  d.behavior = new BallCarrier({}, d);
  for (const o of sim.defense) if (o !== d) o.behavior = new DownfieldBlocker();
  for (const o of sim.offense) o.behavior = new Pursuit();
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onLooseBall(sim: PlaySim): void {
  for (const a of sim.agents) a.behavior = new FumbleScramble(new Pursuit());
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onRecovery(sim: PlaySim, a: Agent): void {
  a.behavior = new BallCarrier({}, a);
  for (const o of sim.teammates(a)) if (o !== a) o.behavior = new DownfieldBlocker();
  for (const o of sim.opponents(a)) o.behavior = new Pursuit();
}

export function idleBehavior(): Behavior {
  return { kind: 'idle', update: () => stand() };
}
