import { plannedFakeEnd } from './called-drop.js';
/**
 * Assignment of behaviors at the snap, and behavior transitions on play
 * events (handoff, throw, catch, interception, fumble, recovery).
 */
import { ownRoutes } from './ball-estimate.js';
import { paFakeSide } from './pa-look.js';
import { arriveVelocity, gaitLag } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { READ_SCHEMES, RUN_READ, runRead } from './run-read.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import { gapY, lineOffset } from '../playbook/alignment.js';
import { GUN_QB_DEPTH } from '../playbook/formations.js';
import { getRoute } from '../playbook/routes.js';
import { CONCEPT_MENU } from '../playbook/concepts.js';
/** PA_DROP (qb.ts): the play-action back's fake track beside the QB, not on his drop line. */
const PA_DROP_FAKE = process.env.PA_DROP !== '0';
import type { Gap, PassConcept, RunConcept, SkillSlot } from '../playbook/types.js';
import type { Agent, Behavior } from './agent.js';
import { boxThreats, isOL, planRunBlocking, playSideSign, PassProtector, PRO_CALL, ProtectionCoordinator, RpoRunBlocker, RunBlocker } from './behaviors/blocking.js';
import { BallCarrier } from './behaviors/carrier.js';
import { goTo, stand } from './behaviors/common.js';
import { Blitzer, FumbleScramble, ManCoverage, PassRusher, Pursuit, ZoneCoverage } from './behaviors/defense.js';
import { QBHandoff, QBPass } from './behaviors/qb.js';
import { GUN_SNAP, QB_EXTEND, snapSecured } from './ball-transfer.js';
import { ConvoyCue, DownfieldBlocker, RCV_SEEN, RouteRunner, TrackBall } from './behaviors/receiver.js';
import { ScreenBlocker } from './behaviors/screen.js';
import { LOOSE_SEEN, looseSeenStart, possessionSeenStart } from './behaviors/loose-seen.js';
import type { PlaySim } from './playsim.js';
import { buildRunFits } from './run-fits.js';
import { handoffReach } from './ball-transfer.js';
import { CoverageDefender } from './coverage/defender.js';
import { installReceiverRoute, type InstalledReceiverRoute } from './receiver-forecast.js';
import { installBlockLook, ReceiverBlockLook } from './behaviors/block-look.js';
import { screenSpot } from './screen-spot.js';

const READ_BASE: Record<string, number> = { DE: 0.12, DT: 0.12, NT: 0.12, LB: 0.25, CB: 0.5, NB: 0.4, DB: 0.45, FS: 0.45, SS: 0.38 };

/** STANCE_TELL (experimental, off): an offensive lineman can tip his first
 * step pre-snap through his stance (weight on the play-side hand or foot, a
 * cheated stagger). Disciplined linemen hide it more often. A habit lean, a
 * lean that has nothing to do with the play, shows on any snap, pass or run,
 * so a lean alone never says run.
 * Calibrated (with the DL read rate in defense.ts and KEY_REACT on): NFL zone
 * DL move laterally before or with their key's first step on 43-50% of snaps
 * and almost never the wrong way (2-4%); a leak rate of 0.5-0.9 and a read
 * rate of 0.6-1 give 44-46% of DL a tell step, wrong-way first moves 0-2%,
 * and DL lateral speed relative to their own line's matching the NFL by
 * 0.3 s. The rates stand in for pre-snap tips the sim has no body for. */
const STANCE_TELL = process.env.STANCE_TELL !== '0';
const STANCE_HABIT = 0.1;
function stanceLeak(a: Agent): number {
  return clamp(0.5 + 0.45 * (1 - a.r('discipline')), 0.1, 0.9);
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

/** BACK_RELEASE (experimental, off): the back's route on a dropback is part
 * of the concept and the protection count, not a fixed check-release over
 * the middle.
 *  - The count is what the offense sees before the snap: defenders in the
 *    box (0-6 yd off the ball, within 3 yd outside the tackles) against the
 *    protectors (the five linemen and any end the concept keeps in). With no
 *    more of them than protectors, the back has no pickup: he releases from
 *    the snap.
 *  - Otherwise he checks: he sets beside the QB, takes a man the line hands
 *    him, and leaves once he sees nobody coming (his man dropped). The read
 *    is his own picture; there is no fixed wait beyond the read.
 *  - Either way he releases outside the box, into space: to the flat on his
 *    side, or on an angle when a teammate already runs that flat.
 * NFL backs on dropbacks run FLAT 48%, ANGLE 20%, OUT 10% of their routes
 * (BDB 2025 routeRan); 84% of released backs are wide of the box at the
 * throw, 15% over the middle (back_release_reference.py). */
const BACK_RELEASE = process.env.BACK_RELEASE !== '0';
/** The check-releasing back's read: how long before he trusts that no one is coming (s). */
const CHECK_READ = 0.55;
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
        d.behavior = new PassRusher(d, sim, d.runFit!.gap, d.runFit!.side, spot.rushGap);
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
    // A thrown run-pass option: the line blocks the run (call.run).
    const lineRun = call.run ? planRunBlocking(sim, call.run) : null;
    for (const a of sim.offense) if (isOL(a)) {
      const plan = lineRun?.get(a);
      if (plan) { a.behavior = new RpoRunBlocker(plan); continue; }
      coord.add(a);
      a.behavior = new PassProtector(coord);
    }
    // A screen receiver who sells a block first releases into his route on the count.
    const mkScreenRoute = (a: Agent, id: string) => {
      const route = getRoute(id);
      const outside = Math.sign(a.pos.y - sim.ballY) || off.strongSign;
      receiverPriors.set(a, installReceiverRoute(a.pos, sim.los, outside, route, null, a.profile, a.r('routeRunning')));
      ownRoutes.set(a, receiverPriors.get(a)!);
      return () => new RouteRunner(a, sim, route, outside, 0);
    };
    // PRO_CALL: the box count against the protectors this concept keeps in
    // (the line, blocking and checking backs, a blocking inline end). Short of
    // the count, a back installed on a free route stays in as a check-release.
    const callCount = PRO_CALL && !lineRun && !concept.screen ? boxThreats(sim).length : 0;
    let inCount = coord.protectors.length;
    if (PRO_CALL) for (const a of sim.offense) {
      if (a === qb || isOL(a)) continue;
      const ref = off.refOf[a.slot as keyof typeof off.refOf];
      // With BACK_RELEASE a checking back is in only if the call needs him (below).
      if ((ref === 'B2' || !ref || (ref === 'B' && (concept.back === 'block' || concept.back === 'check'))) && !(BACK_RELEASE && (ref !== 'B' || concept.back === 'check'))) inCount++;
      else if (off.spots[a.slot]?.inline && concept.teBlock && ref !== 'B') inCount++;
    }
    for (const a of sim.offense) {
      if (a === qb || isOL(a)) continue;
      const ref = off.refOf[a.slot as keyof typeof off.refOf];
      const spot = off.spots[a.slot];
      // BACK_AS_THREE: the back who is #3 runs #3's flat, on the strong side.
      const outside = ref === 'B' && concept.backIsThree ? off.strongSign : Math.sign(a.pos.y - sim.ballY) || off.strongSign;
      const blockLook = call.receiverBlockLook?.[a.slot as SkillSlot];
      const mkRoute = (id: string, delay = 0, conditional = false) => {
        const route = getRoute(id);
        // Capture the installed call/alignment now, including deferred checkdowns.
        // Neither live route progress nor the eventual protector release position
        // becomes the QB's prior. Play-action activation is also conditional.
        receiverPriors.set(a, installReceiverRoute(a.pos, sim.los, outside, route,
          conditional || blockLook || (concept.fake && (ref === 'B' || ref === 'B2')) ? null : delay,
          a.profile, a.r('routeRunning')));
        // BALL_EST: his own route is his own knowledge (the prior for a ball thrown to him).
        ownRoutes.set(a, receiverPriors.get(a)!);
        return () => installBlockLook(a, sim, () => new RouteRunner(a, sim, route, outside,
          blockLook ? sim.t + delay : delay), true);
      };
      // BACK_AS_THREE: the back is #3 in the route: on the snap to the flat on the strong side, out of the protection.
      if (ref === 'B' && concept.backIsThree) {
        a.behavior = mkRoute(concept.back, 0.1)();
        continue;
      }
      if (ref === 'B' || ref === 'B2' || !ref) {
        const assign = ref === 'B' ? concept.back : 'check';
        if (BACK_RELEASE && (assign === 'check' || (CONCEPT_MENU && BACK_ROUTES.has(assign)))) {
          const route = backRelease(sim, concept, a);
          // PRO_CALL decides whether he is in the count (the call's backsIn);
          // without it, the box count stand-in.
          const needed = PRO_CALL ? callCount > inCount : protectionCount(sim, concept) > 0;
          if (!needed) {
            a.behavior = mkRoute(route, 0.1)();
          } else {
            coord.add(a);
            if (PRO_CALL) { coord.backsIn.add(a); inCount++; }
            a.behavior = new PassProtector(coord, mkRoute(route, 0, true), CHECK_READ + a.profile.reactionTime + sim.dice('check', a).range(0, 0.15));
          }
          continue;
        }
        if (assign === 'block') {
          coord.add(a);
          if (PRO_CALL) coord.backsIn.add(a);
          a.behavior = new PassProtector(coord);
        } else if (assign === 'check') {
          coord.add(a);
          if (PRO_CALL) coord.backsIn.add(a);
          a.behavior = new PassProtector(coord, mkRoute(ref === 'B2' ? 'back_flat' : 'checkdown', 0, true), 1.0 + sim.dice('check', a).range(0, 0.3));
        } else if (PRO_CALL && callCount > inCount) {
          // Short of the count: he checks his man first, then runs his route.
          coord.add(a);
          coord.backsIn.add(a);
          inCount++;
          a.behavior = new PassProtector(coord, mkRoute(assign, 0, true), 1.0 + sim.dice('check', a).range(0, 0.3));
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
      if (PRO_CALL && spot?.inline && callCount > inCount) {
        // Short of the count: an attached end checks his man first, then runs his route.
        coord.add(a);
        inCount++;
        a.behavior = new PassProtector(coord, mkRoute(routeId, 0, true), 1.0 + sim.dice('check', a).range(0, 0.3));
        continue;
      }
      a.behavior = mkRoute(routeId, spot?.inline ? 0.15 : 0)();
    }
    if (concept.screen) installScreen(sim, concept, coord, mkScreenRoute);
    // Play action: the back sells the run through the mesh first.
    const back = sim.slot('RB');
    if ((concept.fake || lineRun) && back && back.behavior.kind !== 'idle') {
      const side = Math.sign(back.pos.y - qb.pos.y) || 1;
      // PA_DROP: a back aligned behind the QB runs his fake on a track beside him (a zone track to the B gap, strong),
      // not on the QB's drop line; off, the fake point sat 0.4 yd off it and the QB dropped into him.
      const behind = Math.abs(back.pos.y - qb.pos.y) < 1;
      const fakeY = PA_DROP_FAKE && behind ? qb.pos.y + off.strongSign * 1.5 : (qb.pos.y + back.pos.y) / 2 + side * 0.4;
      // The fake ends when the call says (called-drop.ts plannedFakeEnd: the back, the QB and the line share it).
      back.behavior = new PlayActionFake(back.behavior, { x: sim.los - 4.0, y: fakeY }, plannedFakeEnd(sim.offCall.formation.qb !== 'under'));
      // PA_HINGE: the line knows the fake's side from the call.
      paFakeSide.set(sim, Math.sign(fakeY - sim.ballY) || off.strongSign);
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
    qb.behavior = new QBHandoff(mesh.qb, mesh.time, rb, mesh.pitch, false, mesh.ballPoint,
      GUN_SNAP && GUN_MESH && sim.offCall.formation.qb === 'gun' ? snapSecured(qb.pos, { x: sim.los, y: sim.ballY }) + QB_EXTEND : undefined);
    if (rb) rb.behavior = new RunnerToMesh(mesh.rb, mesh.time, mesh.aim, mesh.ride, mesh.through ?? 0, GUN_MESH_GO && !!mesh.ballPoint);
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
  /** DRAW_NFL: the speed at which a non-riding back arrives at the mesh (0: stop there). */
  through?: number;
  /** GUN_MESH: where the ball goes into the back's pocket; the QB gives it when he reaches it. */
  ballPoint?: Vec2;
}

/** Stretch mesh on the back's track (STRETCH_MESH=0: inside mesh, the stretch back stops). */
const STRETCH_MESH = process.env.STRETCH_MESH !== '0';
/** IZ_GUN_A (default off): inside zone from the gun with the back offset to
 * the backside aims at the play-side A gap (the centre's play-side hip), not
 * the B gap. He crosses the quarterback's face and the B gap was over 4 yd of
 * lateral travel: tracked backs from that alignment slow their drift (2.5 ->
 * 1.6 yd/s after the handoff) and 73% cross behind the moved centre; ours
 * held 3.3 yd/s across the formation and 6% did. Under centre the B-gap
 * landmark stays (tracked backs cross +1.0 yd play side of the line). */
export const IZ_GUN_A = process.env.IZ_GUN_A !== '0';
/** MESH_GUN_SIDE (default off): an offset back crossing the gun QB's face takes
 * the ball still on the QB's backside half, not squarely in front of him.
 * Tracked 2022 gun runs with the back offset backside: at the handoff he is
 * 0.70 yd (inside zone) / 0.25 yd (outside zone) backside of the QB and about
 * half a yard in front of him, still going downhill as fast as across (2.7 and
 * 2.7 yd/s); ours took it level with the QB, 0.9 yd in front, at 3.2 across
 * and 2.0 downhill, and kept drifting play side after the handoff. The mesh
 * point stays at the two bodies' clearance in front of the QB. */
export const MESH_GUN_SIDE = process.env.MESH_GUN_SIDE !== '0';
/** GUN_MESH (experimental, off): a gun back aligned away from the play crosses
 * in front of the QB and takes the ball there, on his own track: the exchange
 * point is half a yard in front of the QB (toward the line) and just short of
 * his face (tracked 2022 gun handoffs, back relative to the QB: stretch -0.16
 * lateral / +0.53 depth; inside zone, power, counter, trap -0.5 to -0.8 / +0.5),
 * and the QB gives it when the back reaches that point, not when he first comes
 * within reach (ours took it a yard short of the QB's face, level with him, at
 * full reach, braking: IZ 2.2 yd/s at the exchange vs NFL 3.8). */
export const GUN_MESH = process.env.GUN_MESH !== '0';
/** GUN_MESH_GO (experimental, off; with GUN_MESH): the gun back leaves on the
 * snap and builds speed to the exchange (slow to fast) rather than standing
 * until a full-speed run would just make it. Tracked 2022 gun backs are moving
 * 1.8 yd/s laterally at 0.5 s and 3.5-4.7 at the handoff; ours stood, then ran
 * (1.06 at 0.5 s). His pace is the steadiest on-time tempo (MESH_TEMPO). */
export const GUN_MESH_GO = process.env.GUN_MESH_GO !== '0';
/** DRAW_NFL (default off): the gun draw exchange from 2022 tracking. The QB
 * gives ground only half a yard (tracked 5.09 yd deep at the handoff, ours
 * 5.90), the back takes it beside him (1.07 yd off his line, 0.6 yd in front)
 * already moving upfield at 1.9 yd/s (ours standing at the landmark), at 1.50
 * s on the sim clock (ours 1.30; under center tracked 1.60); the installed
 * exchange time is kept, since the back now leaves later on his own. Ours took it
 * deep and still, crossed the line 0.3 s late and met the first defender at
 * +0.2 yd (tracked +1.25). */
export const DRAW_NFL = process.env.DRAW_NFL !== '0';

/** COUNTER_C (off): counter's mesh aim is the C gap (the play-side tackle's
 * outside hip) instead of B. */
export const COUNTER_C = process.env.COUNTER_C !== '0';
function meshFor(sim: PlaySim, concept: RunConcept): Mesh {
  const ps = playSideSign(sim, concept);
  const los = sim.los;
  const by = sim.ballY;
  const qbType = sim.offCall.formation.qb;
  const teOnPlayside = ps === sim.offAlign.strongSign ? sim.offAlign.hasTE.S : sim.offAlign.hasTE.W;
  let aimY: number;
  const rbSeen = sim.slot('RB');
  const gunBackside = IZ_GUN_A && concept.scheme === 'insideZone' && qbType === 'gun' && concept.aim === 'B'
    && !!rbSeen && (rbSeen.pos.y - by) * ps < -1;
  // COUNTER_C: GT counter aims at the play-side tackle's outside hip (C).
  switch (gunBackside ? 'A' : COUNTER_C && concept.scheme === 'counter' ? 'C' : concept.aim) {
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
  let ballPoint: Vec2 | undefined;
  // GUN_SNAP: the gun back paces to the QB's readiness he can foresee: the snap
  // secured in the QB's hands plus his own handoff action (QB_EXTEND), not an
  // installed per-concept mesh time.
  if (GUN_SNAP && GUN_MESH && qbType === 'gun') time = snapSecured(sim.qb.pos, { x: los, y: by }) + QB_EXTEND;
  if (concept.scheme === 'toss') {
    qb = { x: los - 1.8, y: by + ps * 0.6 };
    rb = { x: los - 5.5, y: by + ps * 4.0 };
    pitch = 5;
    time = 0.45;
  } else if (concept.scheme === 'draw' && DRAW_NFL) {
    const dir = sim.attackDir('O'), back = sim.slot('RB');
    const side = back ? Math.sign(back.pos.y - by) || ps : ps;
    qb = { x: qbType === 'under' ? los - 4.8 * dir : los - (GUN_QB_DEPTH + .55) * dir, y: by };
    rb = { x: qb.x + 0.6 * dir, y: by + side * 1.07 };
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
    qb = { x: los - GUN_QB_DEPTH, y: by };
    rb = { x: qb.x + 0.6, y: by + ps * 0.9 };
    // An offset back aligned away from the play crosses the QB's face: he
    // takes the ball as he passes in front of him, at the two bodies'
    // clearance, not on the far hip a yard beyond (that landmark put his line
    // through the QB and three and a half yards away; he left on the snap and
    // braked into the QB, meeting the ball at 2.4-2.5 yd/s, tracked 3.8-4.6).
    const back = sim.slot('RB');
    if (back && (back.pos.y - by) * ps < -1) {
      const clear = sim.qb.profile.radius + back.profile.radius + .15;
      rb = { x: qb.x + sim.attackDir('O') * clear, y: by };
      if (MESH_GUN_SIDE) {
        const side = concept.scheme === 'outsideZone' || concept.scheme === 'wideZone' ? .25 : .7;
        const lat = Math.min(side, clear);
        rb = { x: qb.x + sim.attackDir('O') * Math.sqrt(clear * clear - lat * lat), y: qb.y - ps * lat };
      }
      if (GUN_MESH) {
        const stretchy = concept.scheme === 'outsideZone' || concept.scheme === 'wideZone';
        rb = { x: qb.x + sim.attackDir('O') * .5, y: qb.y - ps * (stretchy ? .16 : .65) };
        ballPoint = rb;
      }
    }
  }
  // Backs take the handoff on the move, running through the mesh at the
  // exchange tempo (NFL backs 3.8-5.5 yd/s at the handoff). The draw back has
  // shown pass set and takes it standing; STRETCH_MESH=0 restores the stretch
  // back's old stop-at-the-landmark mesh.
  const stretch = concept.scheme === 'outsideZone' || concept.scheme === 'wideZone';
  return { qb, rb, aim, time, pitch, ride: concept.scheme !== 'draw' && (stretch ? STRETCH_MESH : true),
    through: DRAW_NFL && concept.scheme === 'draw' ? 1.9 : 0, ballPoint };
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

/** MESH_TEMPO (default off): a riding back times his run to the mesh instead
 * of braking into it. On each beat he previews his own body and takes the
 * steadiest tempo that still reaches the mesh by the installed exchange time,
 * carries it through (no stop at the landmark while the QB is still opening),
 * and leaves his stance by that same tempo. With the QB there he carries at
 * least the exchange tempo, 0.85 of top speed (installed 0.55). Tracked 2022
 * backs are still accelerating at the handoff (outside zone under center 5.25
 * yd/s, gun 4.4); the installed back braked to the landmark and met the ball
 * at 3.6 and 3.3. */
export const MESH_TEMPO = process.env.MESH_TEMPO !== '0';
const MT = (): number => MESH_TEMPO ? .85 : .55;
/** Running back before the handoff: time the arrival at the mesh. */
export class RunnerToMesh implements Behavior {
  readonly kind = 'mesh';
  constructor(
    readonly mesh: Vec2,
    readonly meshTime: number,
    readonly aim: Vec2,
    readonly ride = false,
    readonly arriveAt = 0,
    /** GUN_MESH_GO: leave on the snap. */
    readonly goOnSnap = false,
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
    if (this.goOnSnap) this.departed = true;
    if (!this.goOnSnap && !this.departed && sim.t >= this.nextRead) {
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
      if (this.passed) return goTo(a, this.aim, { speed: MT(), through: a.profile.vmax * MT() });
      // The on-time pace only slows an early back; with the QB there he
      // carries his exchange tempo into the pocket instead of braking to it.
      if (MESH_TEMPO) {
        if (sim.t >= this.nextTempo) { this.nextTempo = sim.t + a.mind.decisionInterval; this.tempo = this.onTimeTempo(a, sim); }
        // A QB still well short of the mesh at the landmark: do not run past him.
        const qbFar = Math.hypot(qbAt.x - this.mesh.x, qbAt.y - this.mesh.y) - reach;
        const w = ready ? Math.max(this.tempo, MT()) : this.tempo;
        return goTo(a, pocket, !ready && d < .8 && qbFar > .5 ? { speed: w, through: 0 } : { speed: w, through: a.profile.vmax * w });
      }
      return goTo(a, pocket, ready ? { speed: Math.max(speed, MT()), through: a.profile.vmax * MT() } : { speed, through: 0 });
    }
    return goTo(a, this.mesh, { speed, through: this.arriveAt });
  }

  private tempo = 1;
  private nextTempo = 0;
  /** MESH_TEMPO: the steadiest tempo (share of top speed) at which his own body,
   * previewed running through the mesh without braking, gets there by the
   * installed exchange time; full speed if none does. */
  private onTimeTempo(a: Agent, sim: PlaySim): number {
    const left = this.meshTime - sim.t;
    const reachBy = (w: number) => { const v = a.profile.vmax * w;
      const path = previewFreeMovement(a.body, (body) => ({ vel: arriveVelocity(body as typeof a.body, this.mesh, v, v) }), sim.t, 60, sim.world.handContact);
      const k = path.findIndex((q) => Math.hypot(this.mesh.x - q.pos.x, this.mesh.y - q.pos.y) < .5);
      return k < 0 ? Infinity : path[k].t; };
    if (reachBy(1) >= left) return 1;
    let lo = .3, hi = 1;
    if (reachBy(lo) <= left) return lo;
    for (let i = 0; i < 6; i++) { const mid = (lo + hi) / 2; if (reachBy(mid) <= left) hi = mid; else lo = mid; }
    return hi;
  }

  /** Seconds his own body takes to reach the mesh from where he stands, going
   * hard and arriving at the exchange speed (free movement, no contact). */
  private arrival(a: Agent, sim: PlaySim): number {
    const through = this.ride ? a.profile.vmax * MT() : 0;
    const path = previewFreeMovement(a.body, (body) => ({ vel: arriveVelocity(body as typeof a.body, this.mesh, this.ride && MESH_TEMPO ? through : a.profile.vmax, through) }),
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
  r.behavior = new BallCarrier({ screenCatch: !!sim.offCall?.pass?.screen, catchAt: sim.t }, r);
  // Screen blockers keep their jobs through the catch; everyone else turns to the convoy.
  for (const a of sim.offense) if (a !== r && !(a.behavior instanceof ScreenBlocker))
    a.behavior = RCV_SEEN ? new ConvoyCue(a.behavior, r) : new DownfieldBlocker();
  // A physical catch is authoritative for the ball/rules, not a notification
  // to every opponent. Defenders retain their job and acquire their own cue.
}

export function onInterception(sim: PlaySim, d: Agent): void {
  clearPressContacts(sim);
  d.behavior = new BallCarrier({}, d);
  // LOOSE_SEEN: each player switches when he sees the interceptor with the ball or hears it called.
  if (LOOSE_SEEN) { possessionSeenStart(sim, d); return; }
  for (const o of sim.defense) if (o !== d) o.behavior = new DownfieldBlocker();
  for (const o of sim.offense) o.behavior = new Pursuit();
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onLooseBall(sim: PlaySim): void {
  clearPressContacts(sim);
  // LOOSE_SEEN: nobody is told; each recognizes the loose ball himself and releases his own block.
  if (LOOSE_SEEN) { looseSeenStart(sim); return; }
  for (const a of sim.agents) a.behavior = new FumbleScramble(new Pursuit());
  for (const e of [...sim.engagements]) sim.disengage(e);
}

export function onRecovery(sim: PlaySim, a: Agent): void {
  clearPressContacts(sim);
  a.behavior = new BallCarrier({}, a);
  if (LOOSE_SEEN) { possessionSeenStart(sim, a); return; }
  for (const o of sim.teammates(a)) if (o !== a) o.behavior = new DownfieldBlocker();
  for (const o of sim.opponents(a)) o.behavior = new Pursuit();
}

export function idleBehavior(): Behavior {
  return { kind: 'idle', update: () => stand() };
}

/**
 * Install a screen's jobs over the concept's routes and protection
 * (docs/football-handbook/screens.md). The screen receiver: a back or an
 * attached end sells his block and releases on the count; a detached receiver
 * runs his screen route from the snap. Released linemen pass-set until the
 * count, then work out/up/in; perimeter receivers stalk or crack from the snap.
 */
function installScreen(sim: PlaySim, concept: NonNullable<PlaySim['offCall']['pass']>, coord: ProtectionCoordinator,
  mkScreenRoute: (a: Agent, id: string) => () => Behavior): void {
  const spec = concept.screen!;
  const off = sim.offAlign;
  const slotOf = (ref: string) => off.numbering[ref as keyof typeof off.numbering];
  // The catch point: the receiver's screen route landmark.
  const designed = screenSpot(sim, concept);
  if (!designed) throw new Error(`Screen receiver ${spec.receiver} is not in the formation`);
  const { receiver, routeId, side, spot } = designed;
  const route = getRoute(routeId);
  const jitter = (a: Agent) => sim.dice('screen', a).normal(0, 0.12);
  if (spec.tempo === 'slow' && (off.spots[receiver.slot]?.backfield || off.spots[receiver.slot]?.inline)) {
    coord.add(receiver);
    receiver.behavior = new PassProtector(coord, mkScreenRoute(receiver, routeId), (spec.receiverRelease ?? spec.count + 0.1) + jitter(receiver), true);
  }
  // A detached receiver who sells a stalk block first: the ordinary block
  // look on the corner over him, then his route from where the sell left him.
  if (spec.receiverSell && !off.spots[receiver.slot]?.backfield && !off.spots[receiver.slot]?.inline) {
    const corners = sim.defense.filter(d => d.player.position === 'CB');
    if (corners.length) {
      const target = corners.reduce((b, d) => Math.hypot(d.pos.x - receiver.pos.x, d.pos.y - receiver.pos.y)
        < Math.hypot(b.pos.x - receiver.pos.x, b.pos.y - receiver.pos.y) ? d : b);
      mkScreenRoute(receiver, routeId);
      // SCREEN_QB: the screen receiver's sell stays behind the line, as tracked (BDB 2025 WR-in screens: 0.5 yd
      // behind it at 1.0 and 1.5 s; screen_tunnel_path.py); off, 0.5 yd past it.
      receiver.behavior = new ReceiverBlockLook(target, spec.receiverSell + jitter(receiver), true,
        () => new RouteRunner(receiver, sim, route, side, sim.t), process.env.SCREEN_QB === '1' ? -0.5 : 0.5);
    }
  }
  const line = sim.offense.filter(isOL).sort((a, b) => (b.pos.y - a.pos.y) * side);
  for (const blk of spec.blocks) {
    const a = blk.who === 'T' ? line[0] : blk.who === 'G' ? line[1] : blk.who === 'C' ? sim.slot('C') : sim.slot(slotOf(blk.who) ?? '');
    if (!a || a === receiver) continue;
    if (isOL(a)) {
      a.behavior = new PassProtector(coord, () => new ScreenBlocker(a, blk.job, side, spot, true), Math.max(0, spec.count + jitter(a)), true);
    } else {
      a.behavior = new ScreenBlocker(a, blk.job, side, spot, false);
    }
  }
}


/** BACK_RELEASE: box defenders seen before the snap minus protectors (the
 * five linemen and the ends the concept keeps in). Above zero the back has a
 * pickup to check. */
function protectionCount(sim: PlaySim, concept: PassConcept): number {
  const dir = sim.attackDir('O');
  const ol = sim.offense.filter(isOL).map(o => o.pos.y);
  const lo = Math.min(...ol) - 3, hi = Math.max(...ol) + 3;
  let box = 0;
  for (const d of sim.defense) {
    const depth = (d.pos.x - sim.los) * dir;
    if (depth > 0 && depth <= 6 && d.pos.y >= lo && d.pos.y <= hi) box++;
  }
  let prot = ol.length;
  if (concept.teBlock) for (const o of sim.offense) if (sim.offAlign.spots[o.slot]?.inline) prot++;
  return box - prot;
}

/** BACK_RELEASE: the back's release into space: the flat on his side, or an
 * angle when the concept already sends a receiver to that flat. */
const BACK_ROUTES = new Set(['angle', 'back_out', 'wheel', 'back_flat', 'swing']);
function backRelease(sim: PlaySim, concept: PassConcept, a: Agent): string {
  // A concept that names the back's route (CONCEPT_MENU: angle, out, wheel) gives it; the release decides only
  // whether he is free to run it.
  if (CONCEPT_MENU && BACK_ROUTES.has(concept.back)) return concept.back;
  const side = Math.sign(a.pos.y - sim.ballY) || sim.offAlign.strongSign;
  const routes = Object.values(side === sim.offAlign.strongSign ? concept.strong : concept.weak);
  return routes.some(r => r === 'flat' || r === 'out' || r === 'quick_out') ? 'angle' : 'back_flat';
}
