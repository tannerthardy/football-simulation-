/**
 * Assignment of behaviors at the snap, and behavior transitions on play
 * events (handoff, throw, catch, interception, fumble, recovery).
 */
import { arriveVelocity, gaitLag } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { READ_SCHEMES, RUN_READ, runRead } from './run-read.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import { gapY, lineOffset } from '../playbook/alignment.js';
import { getRoute } from '../playbook/routes.js';
import type { Gap, RunConcept, SkillSlot } from '../playbook/types.js';
import type { Agent, Behavior } from './agent.js';
import { isOL, planRunBlocking, playSideSign, PassProtector, ProtectionCoordinator, RunBlocker } from './behaviors/blocking.js';
import { BallCarrier } from './behaviors/carrier.js';
import { goTo, stand } from './behaviors/common.js';
import { Blitzer, FumbleScramble, ManCoverage, PassRusher, Pursuit, ZoneCoverage } from './behaviors/defense.js';
import { QBHandoff, QBPass } from './behaviors/qb.js';
import { DownfieldBlocker, RouteRunner, TrackBall } from './behaviors/receiver.js';
import type { PlaySim } from './playsim.js';
import { buildRunFits } from './run-fits.js';
import { handoffReach } from './ball-transfer.js';
import { CoverageDefender } from './coverage/defender.js';
import { installReceiverRoute, type InstalledReceiverRoute } from './receiver-forecast.js';
import { installBlockLook } from './behaviors/block-look.js';

const READ_BASE: Record<string, number> = { DE: 0.12, DT: 0.12, NT: 0.12, LB: 0.25, CB: 0.5, NB: 0.4, DB: 0.45, FS: 0.45, SS: 0.38 };

/** STANCE_TELL (experimental, off): an offensive lineman can tip his first
 * step pre-snap through his stance (weight on the play-side hand or foot, a
 * cheated stagger). Disciplined linemen hide it more often. A habit lean, a
 * lean that has nothing to do with the play, shows on any snap, pass or run,
 * so a lean alone never says run. */
const STANCE_TELL = process.env.STANCE_TELL === '1';
const STANCE_HABIT = 0.1;
function stanceLeak(a: Agent): number {
  return clamp(0.15 + 0.45 * (1 - a.r('discipline')), 0.1, 0.6);
}

/** DEF_STANCE (experimental, off): a front defender lines up hand(s) down or
 * standing up, and the stance is a tradeoff the body carries:
 *  - hand down: low pads at the snap (posture 0.7, the existing pad-level
 *    and leverage physics), primed to fire forward, eyes on the man in
 *    front, so the backfield is seen later;
 *  - standing up: high pads (0.3), a later forward start, and the backfield
 *    in view at the ordinary delay; the stance a dropping end uses.
 * Interior men are down; an end stands when he is dropping, when he is a
 * linebacker playing the end, and as the odd (3-4) front's outside man.
 * Pad level then moves at its usual finite rate toward what he asks for.
 * The get-off cost and the vision cost are assumptions, not fitted values. */
const DEF_STANCE = process.env.DEF_STANCE === '1';
const STAND_GETOFF = 0.04;
function setFrontStance(sim: PlaySim, d: Agent, role: string): void {
  const k = d.slot.split('_')[0];
  if (k !== 'DT' && k !== 'NT' && k !== 'DE') return;
  let stance: 'down' | 'up' = 'down';
  if (k === 'DE' && (role === 'zone' || role === 'man' || role === 'spy' || d.player.position === 'LB'
    || sim.defCall.personnel === 'base34')) stance = 'up';
  d.setStance = stance;
  d.body.support!.posture = stance === 'down' ? 0.7 : 0.3;
  if (stance === 'up') d.snapReadyAt += STAND_GETOFF;
}

export function assignBehaviors(sim: PlaySim): void {
  if (STANCE_TELL) for (const a of sim.offense) {
    if (!isOL(a)) continue;
    const r = sim.rng.fork(`stance-habit:${a.slot}`);
    a.stanceLean = r.next() < STANCE_HABIT ? (r.next() < 0.5 ? -1 : 1) : 0;
  }
  const off = sim.offAlign;
  const call = sim.offCall;
  for (const [slot, look] of Object.entries(call.receiverBlockLook ?? {})) {
    if (!look) continue;
    const spot = off.spots[slot];
    if (!spot || spot.inline || spot.backfield) throw new Error('Block look is a detached perimeter receiver responsibility');
    if (!Number.isFinite(look.until) || look.until <= 0) throw new Error('Block look requires a positive called release time');
  }

  // ---------------------------------------------------------- defense first
  const fits = buildRunFits(sim);
  for (const d of sim.defense) {
    d.runFit = fits.get(d);
    const spot = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!;
    const key = d.slot.split('_')[0];
    const base = READ_BASE[key] ?? 0.3;
    d.readAt = d.profile.reactionTime + base * (1.35 - d.r('playRecognition')) + Math.abs(sim.dice('read', d).normal(0, 0.08));
    const role = spot.role;
    if (DEF_STANCE) setFrontStance(sim, d, role.kind);
    switch (role.kind) {
      case 'rush':
        d.behavior = new PassRusher(d, sim, d.runFit!.gap, d.runFit!.side);
        break;
      case 'blitz':
        d.behavior = new Blitzer(d, sim, role.gap, spot.gapSign);
        break;
      case 'man': {
        const tgt = spot.manTarget ? sim.slot(spot.manTarget) : undefined;
        d.behavior = tgt
          ? new ManCoverage(d, sim, tgt, !!spot.press, spot.gap, spot.gapSign,
            { lev: role.lev, trail: role.trail, overTop: role.overTop, protectDepth: role.protectDepth })
          : new ZoneCoverage(d, sim, 'robber', spot.gap, spot.gapSign);
        break;
      }
      case 'zone': {
        // A rule-driven (pattern-match) seat runs its rule; spot drops and
        // plain zones keep the landmark technique.
        const style = role.style ?? (role.zone === 'robber' || role.zone === 'hole' ? 'match' : sim.defCall.zoneStyle ?? 'match');
        d.behavior = role.rule && style === 'match'
          ? new CoverageDefender(d, sim, role.rule, role.zone, style, spot.gap, spot.gapSign)
          : new ZoneCoverage(d, sim, role.zone, spot.gap, spot.gapSign, role.style);
        break;
      }
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
    const receiverPriors = new Map<Agent, InstalledReceiverRoute>();
    for (const a of sim.offense) if (isOL(a)) {
      coord.add(a);
      a.behavior = new PassProtector(coord);
    }
    for (const a of sim.offense) {
      if (a === qb || isOL(a)) continue;
      const ref = off.refOf[a.slot as keyof typeof off.refOf];
      const spot = off.spots[a.slot];
      const outside = Math.sign(a.pos.y - sim.ballY) || off.strongSign;
      const blockLook = call.receiverBlockLook?.[a.slot as SkillSlot];
      const mkRoute = (id: string, delay = 0, conditional = false) => {
        const route = getRoute(id);
        // Capture the installed call/alignment now, including deferred checkdowns.
        // Neither live route progress nor the eventual protector release position
        // becomes the QB's prior. Play-action activation is also conditional.
        receiverPriors.set(a, installReceiverRoute(a.pos, sim.los, outside, route,
          conditional || blockLook || (concept.fake && (ref === 'B' || ref === 'B2')) ? null : delay,
          a.profile, a.r('routeRunning')));
        return () => installBlockLook(a, sim, () => new RouteRunner(a, sim, route, outside,
          blockLook ? sim.t + delay : delay), true);
      };
      if (ref === 'B' || ref === 'B2' || !ref) {
        const assign = ref === 'B' ? concept.back : 'check';
        if (assign === 'block') {
          coord.add(a);
          a.behavior = new PassProtector(coord);
        } else if (assign === 'check') {
          coord.add(a);
          a.behavior = new PassProtector(coord, mkRoute(ref === 'B2' ? 'back_flat' : 'checkdown', 0, true), 1.0 + sim.dice('check', a).range(0, 0.3));
        } else {
          a.behavior = mkRoute(assign, 0.1)();
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
      a.behavior = mkRoute(routeId, spot?.inline ? 0.15 : 0)();
    }
    // Play action: the back sells the run through the mesh first.
    const back = sim.slot('RB');
    if (concept.fake && back && back.behavior.kind !== 'idle') {
      const side = Math.sign(back.pos.y - qb.pos.y) || 1;
      back.behavior = new PlayActionFake(back.behavior, { x: sim.los - 4.0, y: (qb.pos.y + back.pos.y) / 2 + side * 0.4 }, 0.7);
    }
    const qbb = new QBPass(qb, sim, concept, receiverPriors);
    qb.behavior = qbb;
    qbb.init(sim);
    return;
  }

  // Run play.
  const concept = call.run!;
  const plans = planRunBlocking(sim, concept);
  for (const [a, plan] of plans) a.behavior = new RunBlocker(plan);
  if (STANCE_TELL) for (const [a, plan] of plans) {
    if (!isOL(a)) continue;
    // His first step's lateral direction is what his weight shows if it leaks:
    // on zone every lineman's first step is the play-side track; a gap down
    // block steps along its drive; a puller (weight back, light hand) opens
    // along his path.
    const zone = ['insideZone', 'outsideZone', 'wideZone', 'splitZone', 'toss', 'duo'].includes(concept.scheme);
    const first = plan.kind === 'pull' && plan.pullPath?.length ? plan.pullPath[0].y - a.pos.y
      : zone ? playSideSign(sim, concept) : plan.drive.y;
    const dir = Math.abs(first) > 0.3 ? Math.sign(first) : 0;
    if (dir && sim.rng.fork(`stance:${a.slot}`).next() < stanceLeak(a)) a.stanceLean = dir;
  }
  const rb = sim.slot('RB') ?? null;
  const mesh = meshFor(sim, concept);
  if (concept.scheme === 'qbDraw') {
    qb.behavior = new QBHandoff(mesh.qb, 1.0, null, 0, true);
    if (rb) rb.behavior = new RunBlocker({ kind: 'climb', target: null, drive: { x: 1, y: 0 } });
  } else {
    qb.behavior = new QBHandoff(mesh.qb, mesh.time, rb, mesh.pitch);
    if (rb) rb.behavior = new RunnerToMesh(mesh.rb, mesh.time, mesh.aim, mesh.ride);
  }
  for (const a of sim.offense) {
    if (a.behavior.kind === 'idle') a.behavior = new DownfieldBlocker();
    if (a !== qb && !isOL(a) && call.receiverBlockLook?.[a.slot as SkillSlot]) {
      const job = a.behavior;
      a.behavior = installBlockLook(a, sim, () => job, false);
    }
  }
}

interface Mesh {
  qb: Vec2;
  rb: Vec2;
  aim: Vec2;
  time: number;
  pitch: number;
  /** A stretch back takes the ball on the move, riding his track. */
  ride: boolean;
}

/** Stretch mesh on the back's track (STRETCH_MESH=0: inside mesh, the stretch back stops). */
const STRETCH_MESH = process.env.STRETCH_MESH !== '0';

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
      aimY = by + ps * lineOffset(teOnPlayside ? 4.3 : 3.4, teOnPlayside, sim.offAlign.line);
      break;
    case 'D':
      aimY = gapY(sim.offAlign, 'D', ps);
      break;
    case 'edge':
      aimY = by + ps * lineOffset(8, teOnPlayside, sim.offAlign.line);
      break;
  }
  const aim = { x: los + 0.6, y: aimY };
  let qb: Vec2;
  let rb: Vec2;
  let time = concept.meshTime;
  let pitch = 0;
  if (concept.scheme === 'toss') {
    qb = { x: los - 1.8, y: by + ps * 0.6 };
    rb = { x: los - 5.5, y: by + ps * 4.0 };
    pitch = 5;
    time = 0.45;
  } else if (concept.scheme === 'draw') {
    qb = { x: qbType === 'under' ? los - 5.5 : los - 6, y: by };
    rb = { x: qb.x + 0.6, y: by + ps * 0.8 };
  } else if (qbType === 'under' && STRETCH_MESH && (concept.scheme === 'outsideZone' || concept.scheme === 'wideZone')) {
    // Stretch from under center: the QB opens and gets depth to put the ball
    // on the back's track outside the tackle's stance, so the back takes it
    // already running wide (STRETCH_MESH=0 restores the inside mesh).
    qb = { x: los - 4.4, y: by + ps * 2.1 };
    rb = { x: los - 5.0, y: by + ps * 2.8 };
  } else if (qbType === 'under') {
    // Reverse pivot and a couple of steps back: the mesh is ~3.5–4 yd deep.
    qb = { x: los - 3.5, y: by + ps * 0.5 };
    rb = { x: los - 4.0, y: by + ps * 1.1 };
  } else if (qbType === 'pistol') {
    qb = { x: los - 4.4, y: by + ps * 0.3 };
    rb = { x: los - 4.9, y: by + ps * 0.95 };
  } else {
    qb = { x: los - 5.0, y: by };
    rb = { x: los - 4.4, y: by + ps * 0.9 };
  }
  // Backs take the handoff on the move, running through the mesh at the
  // exchange tempo (NFL backs 3.8-5.5 yd/s at the handoff). The draw back has
  // shown pass set and takes it standing; STRETCH_MESH=0 restores the stretch
  // back's old stop-at-the-landmark mesh.
  const stretch = concept.scheme === 'outsideZone' || concept.scheme === 'wideZone';
  return { qb, rb, aim, time, pitch, ride: concept.scheme !== 'draw' && (stretch ? STRETCH_MESH : true) };
}

/**
 * Play-action fake by the back: ride the mesh and take a step downhill — the
 * run cue linebackers read — then his pass job from beside the QB.
 */
export class PlayActionFake implements Behavior {
  readonly kind = 'pa-fake';
  get passOption(): boolean { return this.job.passOption === true; }
  private meshed = false;
  constructor(
    private readonly job: Behavior,
    private readonly mesh: Vec2,
    private readonly until: number,
  ) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t >= this.until || sim.carrier !== sim.qb) {
      a.behavior = this.job;
      return this.job.update(a, sim);
    }
    if (!this.meshed && Math.hypot(this.mesh.x - a.pos.x, this.mesh.y - a.pos.y) < 0.7) this.meshed = true;
    if (!this.meshed) return goTo(a, this.mesh, { speed: 0.9, through: a.profile.vmax * 0.5 });
    return goTo(a, { x: this.mesh.x + 1.0, y: this.mesh.y }, { speed: 0.6 });
  }
}

/** Running back before the handoff: time the arrival at the mesh. */
export class RunnerToMesh implements Behavior {
  readonly kind = 'mesh';
  constructor(
    readonly mesh: Vec2,
    readonly meshTime: number,
    readonly aim: Vec2,
    readonly ride = false,
  ) {}
  private passed = false;
  private departed = false;
  private nextRead = 0;
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind === 'pitch' && sim.ball.target === a) {
      return goTo(a, sim.ball.intended, { speed: 0.8, facing: Math.atan2(sim.qb.pos.y-a.pos.y, sim.qb.pos.x-a.pos.x) });
    }
    // Eyes on the key from the snap: the read builds through the mesh, but
    // he cannot cut until he has the ball.
    const run = sim.offCall.run;
    if (RUN_READ && run && READ_SCHEMES.has(run.scheme)) runRead(a, sim, run.scheme, playSideSign(sim, run), this.aim, false);
    // He leaves as late as his own start allows, and then goes: on his beat
    // he previews his body going hard to the mesh and holds his stance while
    // one more beat would still get him there for the exchange. A slow start
    // means leaving on the snap; a quick one lets him stay patient.
    if (!this.departed && sim.t >= this.nextRead) {
      const interval = a.mind.decisionInterval;
      this.nextRead = sim.t + interval;
      this.departed = sim.t + interval + this.arrival(a, sim) >= this.meshTime;
    }
    if (!this.departed) return stand(Math.atan2(this.mesh.y - a.pos.y, this.mesh.x - a.pos.x));
    const dt = this.meshTime - sim.t;
    const d = Math.hypot(this.mesh.x - a.pos.x, this.mesh.y - a.pos.y);
    // Leave on the snap and get to the mesh on time: budget for the
    // acceleration it takes to get going, not just the distance.
    const tAcc = gaitLag(a.profile) * 0.9;
    const speed = clamp(d / Math.max(0.2, dt - tAcc) / a.profile.vmax, 0.3, 1);
    // The deadline is a cadence cue, not possession. Brake into the mesh
    // until the QB actually gives him the ball; onHandoff installs the run.
    // Running through an expired landmark used to strand him yards away.
    if (this.ride) {
      // Being close to the landmark is not permission to leave before the
      // installed exchange window. Gun backs can start almost on the mesh.
      // Keep approaching it until the QB can actually put the ball in, then
      // ride through at the existing tempo (possession still comes from him).
      // He rides through only with the QB there to give it, as he sees him,
      // and through the QB's pocket: his body at the QB's arm's length on the
      // landmark's side, not at a landmark on the edge of the QB's reach.
      // A back who outruns a late QB, or passes beyond his hands, is gone.
      // Where he sees the QB getting to by the time he reaches the mesh.
      const qb = sim.see(a, sim.qb), reach = handoffReach(sim.qb, a);
      const lead = Math.min(.5, d / Math.max(1, Math.hypot(a.vel.x, a.vel.y)));
      const qbAt = { x: qb.pos.x + qb.vel.x * lead, y: qb.pos.y + qb.vel.y * lead };
      const ready = Math.hypot(qbAt.x - this.mesh.x, qbAt.y - this.mesh.y) <= reach;
      const off = { x: this.mesh.x - qbAt.x, y: this.mesh.y - qbAt.y }, len = Math.hypot(off.x, off.y) || 1;
      const arm = Math.min(len, sim.qb.profile.reach);
      const pocket = ready ? { x: qbAt.x + off.x / len * arm, y: qbAt.y + off.y / len * arm } : this.mesh;
      const inHands = Math.hypot(qb.pos.x - a.pos.x, qb.pos.y - a.pos.y) <= reach;
      if (ready && inHands && sim.t >= this.meshTime - .15) this.passed = true;
      if (this.passed) return goTo(a, this.aim, { speed: .55, through: a.profile.vmax * .55 });
      // The on-time pace only slows an early back; with the QB there he
      // carries his exchange tempo into the pocket instead of braking to it.
      return goTo(a, pocket, ready ? { speed: Math.max(speed, .55), through: a.profile.vmax * .55 } : { speed, through: 0 });
    }
    return goTo(a, this.mesh, { speed, through: 0 });
  }

  /** Seconds his own body takes to reach the mesh from where he stands, going
   * hard and arriving at the exchange speed (free movement, no contact). */
  private arrival(a: Agent, sim: PlaySim): number {
    const through = this.ride ? a.profile.vmax * .55 : 0;
    const path = previewFreeMovement(a.body, (body) => ({ vel: arriveVelocity(body as typeof a.body, this.mesh, a.profile.vmax, through) }),
      sim.t, 60, sim.world.handContact);
    const k = path.findIndex((s) => Math.hypot(this.mesh.x - s.pos.x, this.mesh.y - s.pos.y) < .5);
    return k < 0 ? Infinity : path[k].t;
  }
}

// ------------------------------------------------------------ transitions

/** A replaced controller must relinquish only the contact it owns. In
 * particular a pre-throw fumble cannot leave a press palm joining two
 * players whose new controllers are chasing the loose ball. */
function clearPressContacts(sim: PlaySim): void {
  for (const a of sim.agents) {
    const behavior = a.behavior as Behavior & { clearPressContact?: (sim: PlaySim) => void };
    behavior.clearPressContact?.(sim);
  }
}

export function onHandoff(sim: PlaySim, _from: Agent, to: Agent): void {
  clearPressContacts(sim);
  const aim = to.behavior instanceof RunnerToMesh ? to.behavior.aim : { x: sim.los + 1, y: to.pos.y };
  const patience = to.r('patience');
  // A split-zone slice travels against the runner's flow. It is a backside
  // cutoff, not a pull that lengthens the runner's designed track.
  const pullers = sim.offense.filter((a) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && sim.offCall.run?.scheme!=='splitZone');
  const key=sim.defense.filter((d)=>d.pos.x>sim.los+2 && d.pos.x<sim.los+7 && Math.abs(d.pos.y-sim.ballY)<4)
    .sort((p,q)=>Math.abs(p.pos.y-sim.ballY)-Math.abs(q.pos.y-sim.ballY))[0];
  const run = sim.offCall.run, meshAim = to.behavior instanceof RunnerToMesh;
  const aimGap = run && meshAim ? (() => {
    const side = playSideSign(sim, run), gap: Gap = run.aim === 'edge' ? 'D' : run.aim;
    return { gap, side, offset: aim.y - gapY(sim.offAlign, gap, side) };
  })() : undefined;
  to.behavior = new BallCarrier({ aim, aimGap, aimUntil: sim.t + (pullers.length ? 0.65 + 0.75 * patience : 0.3 + 0.5 * patience),
    run:sim.offCall.run ? {scheme:sim.offCall.run.scheme,side:playSideSign(sim,sim.offCall.run),readKey:key,
      kick:sim.offCall.run.scheme==='splitZone' ? undefined : sim.offense.find((b)=>b.behavior instanceof RunBlocker && (b.behavior.plan.pullRole==='kick'||b.behavior.plan.pullRole==='trap'))} : undefined }, to);
}

export function onThrow(sim: PlaySim): void {
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  clearPressContacts(sim);
  const tgt = ball.target;
  if (tgt) tgt.behavior = new TrackBall(tgt, sim, tgt.behavior);
}

export function onBallCaught(sim: PlaySim, r: Agent): void {
  clearPressContacts(sim);
  r.behavior = new BallCarrier({}, r);
  for (const a of sim.offense) if (a !== r) a.behavior = new DownfieldBlocker();
  // A physical catch is authoritative for the ball/rules, not a notification
  // to every opponent. Defenders retain their job and acquire their own cue.
}

export function onInterception(sim: PlaySim, d: Agent): void {
  clearPressContacts(sim);
  d.behavior = new BallCarrier({}, d);
  for (const o of sim.defense) if (o !== d) o.behavior = new DownfieldBlocker();
  for (const o of sim.offense) o.behavior = new Pursuit();
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onLooseBall(sim: PlaySim): void {
  clearPressContacts(sim);
  for (const a of sim.agents) a.behavior = new FumbleScramble(new Pursuit());
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onRecovery(sim: PlaySim, a: Agent): void {
  clearPressContacts(sim);
  a.behavior = new BallCarrier({}, a);
  for (const o of sim.teammates(a)) if (o !== a) o.behavior = new DownfieldBlocker();
  for (const o of sim.opponents(a)) o.behavior = new Pursuit();
}

export function idleBehavior(): Behavior {
  return { kind: 'idle', update: () => stand() };
}
