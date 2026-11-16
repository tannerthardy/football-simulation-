/**
 * Catch contests. Each tick, the ball segment is tested against every
 * player's catch envelope (horizontal reach, height up to max catch height).
 * Opportunities are resolved in the order the ball reaches them: an
 * undercutting defender gets the first chance; at the receiver, nearby
 * defenders who are in phase (facing the ball) contest.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2, type Vec3 } from '../core/vec.js';
import { DRAG_TUMBLE } from '../physics/ball.js';
import { closestCatchOpportunity } from '../physics/catch-opportunity.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { BALL_EST_DEF_ONLY, BALL_EST_INCIDENTAL, BALL_EST_NO_TRACKPEN, estimatesFor } from './ball-estimate.js';
import { BAT_HANDS, handsLevel, handsTop } from './bat-hands.js';
import { bodyHeight, SHOULDER } from './sight.js';
import { shouldersOf, TRUNK_TWIST } from '../physics/kinematics.js';

const INELIGIBLE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
/** Extra hand extension available while tracking a visible ball. */
export const TRACKING_REACH_BONUS = .3;
/** Half the football's width across its short axis (about 0.1 yd); a ball this close to a body touches it. */
const BALL_HALF_WIDTH = 0.1;
/** Default on (TIP_AWAY=0 turns it off): a defender who breaks up or bats a pass
 * has sent it away from his own hands. He cannot also catch that deflection;
 * teammates and the receiver still can. Without it he may play his own tip
 * a quarter second later, a second interception chance after the contest
 * already decided he could not catch it cleanly. */
const TIP_AWAY = process.env.TIP_AWAY !== '0';
/** How long a defender who touched the ball stays out of its flight. */
const touchedUntil = (sim: PlaySim, beat: number) => sim.t + (TIP_AWAY ? 10 : beat);
/** DEFLECT_BALL (on since run-ref-22; DEFLECT_BALL=0 restores): a ball the receiver fails
 * to catch only comes off him if he touched it, and then it leaves fast and
 * low. Whether he touched it is decided from where the ball was in his catch
 * window (stretch to the edge of his reach, above or below his hands): dice
 * decide the touch, the ball's physics the aftermath. Untouched, it keeps its
 * flight (an overthrow can still be picked behind him). Touched squarely, a
 * ball he did not hold pops up and dies (15% of its horizontal speed, vz up to
 * about 1.7 yd/s); a glancing touch at the edge of his reach keeps up to 55%
 * and stays low. A defender catches a tipped ball only within his hands'
 * reach and seeing it. Off,
 * every miss popped the ball up at 20% speed near the receiver and a defender
 * caught it 10-40% of the time: 17 of 21 short interceptions on the
 * league-sampled panel came off the receiver (3.8% of short throws; NFL 0.4%). */
const DEFLECT_BALL = process.env.DEFLECT_BALL !== '0';

/** CATCH_HANDS (off; CATCH_HANDS=1 turns it on; estimated, C14): the catch is a
 * contest of both players' hands, resolved in the order the ball reaches them.
 * A defender whose hands' envelope the ball reaches first, and who sees it,
 * plays the ball himself (defenderPlay), even with the receiver in the same
 * window; off, the receiver's window always came first. At the receiver,
 * every unengaged defender near him acts, not only the best one: one with the
 * ball inside his own envelope who sees it plays the ball through the hands
 * (a hand on it is a breakup, or a pick when he can secure it); one whose arms
 * reach the receiver's hands at the catch, seeing the ball or not, plays the
 * hands: a rake or punch through the arms that adds difficulty to the catch in
 * proportion to how deep into his reach the hands are and his technique. The
 * receiver's contested-catch skill resists both. Off, a defender within
 * reach changed the catch chance by about 5% unless one dice roll made him
 * break it up (median 0.14 on the panel). NFL tight throws on target complete
 * 33% (defender within 0.75 yd at arrival 27%, torsos within 1 yd 24% vs 50%
 * not; in front of the receiver 15-19%); ours 57-59% (catchpoint.py, BDB 2025
 * weeks 1-3 vs develop 3506343d). Constants are estimates fitted to those
 * behaviours, not to yards. */
const CATCH_HANDS = process.env.CATCH_HANDS !== '0';
/** CATCH_SPEED (experimental, off; CATCH_SPEED=1 turns it on): tracking a ball he is not facing while he runs.
 * Replaces the over-the-shoulder step (from behind and above 6.5 yd/s only) with a term that grows with his speed
 * above 3 yd/s, with how far the ball comes from behind his line of run (0.46 of it straight across, none once he is facing it, past 120 deg),
 * and with how long it has been in the air (a ball dropping in from distance is harder to keep in view while
 * running than a flat ball across his face). Ball tracking softens it; it enters the difficulty through hands like the
 * other terms. Estimated stand-in, calibrated to the NFL's fall in completion with speed on well-placed balls with no
 * defender within 2 yd (catch_speed.py); what replaces it is a physical model of hands and eyes at speed. */
export const CATCH_SPEED = process.env.CATCH_SPEED !== '0';
/** Estimated: the NFL's loss from a slow to a running catch on balls from behind with no defender within 2 yd. */
export const CATCH_SPEED_K = 0.37;
/** Estimated second constant: a ball straight across his line, against one from behind. The NFL's pooled loss from a slow
 * (< 5 yd/s) to a running catch on well-placed balls across his line, 73 -> 65% (8.4 points), against 90 -> 71% (18.4)
 * from behind (catch_speed.py, BDB 2025 weeks 1-3, short and deep pooled). */
export const CATCH_SPEED_ACROSS = 0.46;
/** The tracking-on-the-run term (added to the catch difficulty). */
export function runTrackTerm(rs: number, cosFromBehind: number, airTime: number, ballTracking: number): number {
  const speed = clamp((rs - 3) / 4.5, 0, 1);
  // From behind 1; straight across his line CATCH_SPEED_ACROSS; facing it (past 120 deg) 0.
  const angle = cosFromBehind >= 0 ? CATCH_SPEED_ACROSS + (1 - CATCH_SPEED_ACROSS) * cosFromBehind
    : clamp(CATCH_SPEED_ACROSS * (1 + cosFromBehind / 0.5), 0, 1);
  const flight = clamp(airTime / 1.3, 0, 1);
  return CATCH_SPEED_K * speed * angle * flight * (0.7 + 0.6 * (1 - ballTracking));
}
/** CATCH_HANDS: scale of a hand through the receiver's arms (estimated; to be
 * fitted on the panel against NFL completion by the defender's closeness). */
const HANDS_SCALE = 1.2;
/** CATCH_SECURE (off; CATCH_SECURE=1 turns it on; estimated, C14): a catch is
 * not an instant. A won catch roll puts the ball in the receiver's hands for a
 * securing window before it is a catch: about 0.2-0.45 s, longer for a harder
 * catch (stretch, height, a ball from behind) and shorter for sure hands. A
 * defender who arrives inside that window gets one try to dislodge it from what
 * he physically delivers: his hand to the ball (within his reach of it, timed
 * by how far into the window he arrives) or a hit (his closing speed into the
 * receiver's body). A dislodged ball comes loose (DEFLECT_BALL's physics) and
 * the pass is incomplete unless someone secures the loose ball. Off, the catch
 * resolved the instant the ball entered the receiver's reach, with every
 * defender frozen there: NFL tight throws on target with the nearest defender
 * 0.75-1.5 yd away at arrival complete 28%, ours 46-59% (catchpoint.py, same
 * operator). */
const CATCH_SECURE = process.env.CATCH_SECURE !== '0';
/** CATCH_POINT (off; CATCH_POINT=1 turns it on; C14 open end): a receiver
 * tracking the ball catches it where it comes to his hands, not where it first
 * crosses the edge of his reach. Off, the catch resolved on the first tick the
 * ball entered his envelope, while it was still approaching (median 1.38 yd
 * from his centre on completions), so open, on-target balls carried the full
 * stretch penalty: on the panel, with nobody within 3 yd, 58% were caught
 * (25% failed the hard-catch roll, 11% the drop roll); NFL 81%. On, while the
 * ball is still closing on him at the end of the tick (closest approach not yet
 * reached) and will still be catchable a tick on (not about to reach the
 * ground or rise past his hands), his catch waits for that approach. */
const CATCH_POINT = process.env.CATCH_POINT !== '0';

interface Opp {
  a: Agent;
  s: number;
  dh: number;
  z: number;
  /** The ball where this player's window meets it. */
  b: Vec3;
}

/**
 * Can the player see the ball coming? Facing within ~110° of the incoming
 * ball (a look over the shoulder); trailing defenders with their back to the
 * ball are playing blind.
 */
function facingBall(a: Agent, ballVel: Vec3, sim?: PlaySim): boolean {
  // BALL_EST bit 32: he plays a ball only on his own sight of it (one perception per player).
  if (BALL_EST_INCIDENTAL && sim && estimatesFor(a)) return sim.ballEstimates?.seenReady(a, sim) ?? false;
  if (a.tags.has('looking')) return true;
  const sp = Math.hypot(ballVel.x, ballVel.y) || 1;
  const f = shouldersOf(a.body); // a look over the shoulder is the shoulders turned, not the hips
  const c = Math.cos(f) * (-ballVel.x / sp) + Math.sin(f) * (-ballVel.y / sp);
  return c > -0.35;
}

/** bodyStarts, when supplied, is indexed by agent and spans the same interval
 * as prev/cur. Omitted endpoints describe an explicit stationary-body query;
 * never reuse a previous tick's positions or extrapolate from velocity. */
export function resolveCatchOpportunities(sim: PlaySim, prev: Vec3, cur: Vec3,
  bodyStarts?: readonly Readonly<Vec2>[]): void {
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const tAir = sim.t - ball.releaseT;
  if (tAir < 0.1) return;
  const opps: Opp[] = [];
  for (const a of sim.agents) {
    if (a === ball.thrower || a.isDown(sim.t) || sim.t < a.noCatchUntil) continue;
    // Ineligibility is a rule consequence, not an inability to touch the ball.
    // Historical tapes without snap facts retain their old reduced filter.
    if (a.team === 'O' && INELIGIBLE.has(a.slot) && !sim.snapEligibility.has(a.player.id)) continue;
    const batWindow = a.team === 'D' && tAir < 0.4 && !!a.engagement;
    if (a.engagement && !batWindow) continue;
    // Existing targeted tracking is a separate controller contract. Everyone
    // else on offense must have acquired this flight before reaching for it;
    // legal eligibility or an installed outlet alone does not provide eyes.
    if (a.team === 'O' && !a.tags.has('onBall') && !(BALL_EST_INCIDENTAL && !BALL_EST_DEF_ONLY ? (sim.ballEstimates?.seenReady(a, sim) ?? false) : sim.incidentalCatchReadiness.query(a, sim.t))) continue;
    const tracking = a === ball.target || a.tags.has('onBall');
    const reach = a.profile.reach + (tracking ? TRACKING_REACH_BONUS : 0);
    // Receivers tracking the ball time a full leap; defenders playing it get a
    // partial leap; everyone else only gets hands up.
    const p = a.profile;
    const top = a.team === 'O' && tracking ? p.maxCatchHeight : tracking ? p.reactReach + 0.5 * (p.maxCatchHeight - p.reactReach) : batWindow ? p.reactReach * 0.95 : p.reactReach;
    const body0 = bodyStarts ? bodyStarts[a.idx] : a.pos;
    if (!body0) continue; // An incomplete supplied interval cannot grant reach.
    const opportunity = closestCatchOpportunity(body0, a.pos, prev, cur, { reach, low: .1, top });
    if (opportunity) opps.push({ a, ...opportunity, b: { x: prev.x + (cur.x - prev.x) * opportunity.s, y: prev.y + (cur.y - prev.y) * opportunity.s, z: opportunity.z } });
  }
  if (CATCH_POINT && !ball.deflected) {
    // A tracking receiver whose closest approach is still ahead waits for it.
    for (let i = opps.length - 1; i >= 0; i--) {
      const o = opps[i];
      if (o.a.team !== 'O' || !(o.a === ball.target || o.a.tags.has('onBall')) || o.s < 0.999) continue;
      const vx = cur.x - prev.x, vy = cur.y - prev.y;
      const closing = (o.a.pos.x - cur.x) * vx + (o.a.pos.y - cur.y) * vy > 0;
      // Wait only when the ball will still be catchable a tick on: not about
      // to reach the ground (a low ball at his shoetops) or rise past his hands.
      const zNext = cur.z + (cur.z - prev.z);
      if (closing && zNext > 0.25 && zNext <= o.a.profile.maxCatchHeight) opps.splice(i, 1);
    }
  }
  if (opps.length === 0) return;
  opps.sort((p, q) => p.s - q.s);

  for (const o of opps) {
    if (sim.ball.kind !== 'air') return;
    if (o.a.team === 'O') {
      receiverContest(sim, o, opps);
      return;
    }
    // A defender reaches the ball first. If an offensive player is in the same
    // window, it's a contested catch at the receiver instead.
    const off = opps.find((p) => p.a.team === 'O' && Math.abs(p.s - o.s) < 0.35);
    // CATCH_HANDS: the ball reaches his hands first and he sees it: his play.
    if (off && !(CATCH_HANDS && facingBall(o.a, sim.ball.flight.vel, sim) && o.s < off.s)) {
      receiverContest(sim, off, opps);
      return;
    }
    if (defenderPlay(sim, o, tAir)) return;
  }
}

function receiverContest(sim: PlaySim, o: Opp, opps: Opp[]): void {
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const R = o.a;
  const rng = sim.dice('catch', R);
  const bv = ball.flight.vel;
  const ballSpeed = Math.hypot(bv.x, bv.y, bv.z);
  const airTime = sim.t - ball.releaseT;

  const reach = R.profile.reach + 0.3;
  const stretch = (o.dh / reach) ** 2;
  const chest = R.profile.heightYd * 1.02;
  const high = o.z > chest ? (o.z - chest) / Math.max(0.2, R.profile.maxCatchHeight - chest) : 0;
  const low = o.z < 0.5 ? (0.5 - o.z) / 0.4 : 0;
  // BALL_EST bit 2: his tracking acts through his own estimate; no second charge at the catch.
  const trackPen = airTime > 1.4 && !BALL_EST_NO_TRACKPEN ? (1 - R.r('ballTracking')) * 0.25 : 0;
  // Over-the-shoulder catches at speed (ball arriving from behind the receiver).
  const rs = R.speed;
  const fromBehindRun = rs > 1 ? (R.vel.x * bv.x + R.vel.y * bv.y) / (rs * (Math.hypot(bv.x, bv.y) || 1)) : 0;
  // TRUNK_TWIST: the term is about tracking a ball he is not facing while he runs (CATCH_SPEED's own words), and the line of run
  // stands in for "facing" because his hips were all the body he had. A receiver whose shoulders are on the ball keeps his speed and
  // faces it: the cost is charged against where his chest points when that is more favourable than his line of run (a trunk can only
  // lower it). Off, or with no twist, his shoulders are his hips and this is the line of run as before.
  const fromBehind = TRUNK_TWIST && rs > 1 && R.body.trunk
    ? Math.min(fromBehindRun, (Math.cos(shouldersOf(R.body)) * bv.x + Math.sin(shouldersOf(R.body)) * bv.y) / (Math.hypot(bv.x, bv.y) || 1))
    : fromBehindRun;
  const shoulder = CATCH_SPEED ? runTrackTerm(rs, fromBehind, airTime, R.r('ballTracking'))
    : fromBehind > 0.3 && rs > 6.5 ? 0.12 + 0.12 * (1 - R.r('ballTracking')) : 0;
  const diff = 0.5 * stretch + 0.4 * high + 0.35 * low + (ballSpeed > 24 ? 0.08 : 0) + trackPen + shoulder;
  const hands = R.r('hands');
  let pCatch = clamp(0.985 - diff * (1.3 - hands) - 0.06 * (1 - hands), 0.2, 0.99);
  if (ball.deflected) pCatch *= 0.3;

  // Separation at the catch point (stat).
  let sep = Infinity;
  for (const d of sim.defense) sep = Math.min(sep, Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y));
  if (R === ball.target) sim.stats.separation = Math.round(sep * 10) / 10;

  // Contest from defenders near the catch point.
  let diffHands = 0;
  let bestD: Agent | null = null;
  let bestQ = 0;
  for (const d of sim.defense) {
    if (d.isDown(sim.t) || d.engagement) continue;
    const dd = Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y);
    const near = opps.find((p) => p.a === d);
    // Downfield, a trailing defender in phase can still play through the hands.
    const range = airTime > 1.3 ? 2.2 : 1.35;
    if (dd > range && !near) continue;
    const prox = near ? 1 - near.dh / (d.profile.reach + 0.3) * 0.5 : 1 - dd / range;
    const q = clamp(prox, 0, 1) * (facingBall(d, bv, sim) ? 1 : 0.45);
    if (q > bestQ) {
      bestQ = q;
      bestD = d;
    }
  }
  if (CATCH_HANDS && !ball.deflected) {
    const hands = contestHands(sim, R, o, opps, rng, high);
    if (hands === 'over') return;
    diffHands = hands;
  } else if (bestD && bestQ > 0.05 && !ball.deflected) {
    const D = bestD;
    const heightEdge = clamp(1 + (D.profile.maxCatchHeight - R.profile.maxCatchHeight) * (high > 0 ? 0.9 : 0.25), 0.5, 1.6);
    const pbu = bestQ * (0.2 + 0.45 * D.r('ballSkills')) * (1.15 - 0.55 * R.r('contestedCatch')) * heightEdge;
    const pInt = pbu * (0.06 + 0.22 * D.r('ballSkills')) * (facingBall(D, bv, sim) ? 1 : 0.2);
    const roll = rng.next();
    // Playing through a receiver's hands is not the same as reaching the
    // ball. Possession requires this defender's own height/reach envelope.
    const canIntercept = opps.some(p => p.a === D);
    if (roll < pInt && canIntercept) {
      if (inBounds(D)) {
        sim.possess(D, 'interception');
        return;
      }
    } else if (roll < pbu) {
      sim.stats.passDefendedBy = D.player.id;
      sim.event('pbu', D, R);
      D.noCatchUntil = touchedUntil(sim, 0.25);
      R.noCatchUntil = sim.t + 0.6;
      deflect(sim, 0.3, 'tip', D);
      return;
    }
    pCatch *= 0.82 + 0.18 * R.r('contestedCatch');
  }

  if (diffHands > 0) pCatch = clamp(pCatch - diffHands * (1.3 - hands) * (1.15 - 0.55 * R.r('contestedCatch')), 0.05, 0.99);
  if (rng.chance(pCatch)) {
    if (!inBounds(R)) {
      sim.event('incomplete', R, null, 'out of bounds');
      sim.whistle('incomplete', { x: sim.los, y: sim.ballY });
      return;
    }
    if (CATCH_SECURE) {
      // In his hands, not yet a catch: the securing window. His touch is the
      // pass's first touch (legality, interference) whether or not he keeps it.
      if (!sim.touchPass(R)) return;
      const secureT = clamp((0.22 + 0.3 * Math.min(1, diff)) * (1.25 - 0.5 * hands), 0.12, 0.45);
      ball.securing = { receiver: R, start: sim.t, until: sim.t + secureT, tried: new Set() };
      // The ball's arrival at his hands (the catch event, if he keeps it, comes at the end of the window).
      sim.event('secure', R);
      pinToHands(sim, R);
      return;
    }
    sim.possess(R, 'catch');
    return;
  }
  if (ball.deflected) {
    R.noCatchUntil = sim.t + 1;
    return;
  }
  // Only catchable balls count as drops; the rest were off target.
  if (diff < 0.35) {
    sim.stats.dropped = true;
    sim.event('drop', R);
  } else sim.event('miss', R);
  R.noCatchUntil = sim.t + 0.6;
  if (DEFLECT_BALL) {
    // Where the ball was in his window decides whether his hands got to it.
    const pTouch = clamp(1 - 0.7 * stretch - 0.6 * Math.min(1, high) - 0.5 * Math.min(1, low), 0.15, 1);
    if (!rng.chance(pTouch)) return;
    // Squarely in his hands, a ball he does not hold pops up and dies (the
    // catchable bobble); at the edge of his reach a touch only redirects it.
    const solid = clamp(1 - stretch - 0.5 * Math.min(1, high) - 0.5 * Math.min(1, low), 0, 1);
    deflect(sim, 0.15 + 0.4 * (1 - solid), 'drop', R, solid);
    return;
  }
  deflect(sim, 0.2, 'drop', R);
}

/** CATCH_HANDS: every unengaged defender near the catch acts on it. Returns
 * 'over' when one of them ended or altered the flight, else the difficulty his
 * hands on the receiver's arms add to the catch (0 when nobody reaches them). */
function contestHands(sim: PlaySim, R: Agent, o: Opp, opps: Opp[], rng: ReturnType<PlaySim['dice']>, high: number): 'over' | number {
  const ball = sim.ball;
  if (ball.kind !== 'air') return 'over';
  const bv = ball.flight.vel, bp = o.b;
  let add = 0;
  const near = sim.defense
    .filter((d) => !d.isDown(sim.t) && !d.engagement && Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) <= 2.5)
    .sort((a, b) => Math.hypot(a.pos.x - bp.x, a.pos.y - bp.y) - Math.hypot(b.pos.x - bp.x, b.pos.y - bp.y));
  for (const D of near) {
    const sees = facingBall(D, bv, sim);
    const own = opps.find((p) => p.a === D);
    if (own && sees) {
      // Through the hands at the ball: his hands meet it where it is in his window.
      const window = D.profile.reach + 0.3;
      const stretch = Math.min(1, own.dh / window);
      const heightEdge = clamp(1 + (D.profile.maxCatchHeight - R.profile.maxCatchHeight) * (high > 0 ? 0.9 : 0.25), 0.5, 1.6);
      const pHand = clamp((0.55 + 0.35 * D.r('ballSkills')) * (1 - 0.7 * stretch * stretch) * heightEdge * (1.15 - 0.45 * R.r('contestedCatch')), 0, 0.9);
      const roll = rng.next();
      if (roll < pHand) {
        const secure = clamp(0.06 + 0.22 * D.r('ballSkills') + 0.06 * D.r('hands') - 0.3 * stretch, 0.02, 0.35);
        if (roll < pHand * secure && inBounds(D)) {
          sim.possess(D, 'interception');
          return 'over';
        }
        sim.stats.passDefendedBy = D.player.id;
        sim.event('pbu', D, R);
        D.noCatchUntil = touchedUntil(sim, 0.25);
        R.noCatchUntil = sim.t + 0.6;
        deflect(sim, 0.3, 'tip', D, 1 - stretch);
        return 'over';
      }
      continue;
    }
    // Playing the hands: his arms reach the receiver's hands (at the ball) now.
    // A rake or punch through the arms that gets there knocks the ball loose:
    // the chance grows with how deep into his reach the hands are and his
    // technique; the receiver's strength at the catch point resists it.
    // His reach to the receiver's arms: the segment from the receiver's
    // shoulders to his hands at the ball, not only the ball itself.
    const ax = bp.x - R.pos.x, ay = bp.y - R.pos.y, al2 = ax * ax + ay * ay;
    const ua = al2 > 0 ? clamp(((D.pos.x - R.pos.x) * ax + (D.pos.y - R.pos.y) * ay) / al2, 0.3, 1) : 1;
    const toHands = Math.hypot(D.pos.x - R.pos.x - ua * ax, D.pos.y - R.pos.y - ua * ay);
    const armLen = D.profile.reach + 0.15;
    if (toHands > armLen) continue;
    const depth = 1 - toHands / armLen;
    const technique = 0.45 + 0.35 * D.r('manCoverage') + 0.2 * D.r('strength');
    const pLoose = clamp(HANDS_SCALE * Math.pow(depth, 0.7) * technique * (1.15 - 0.55 * R.r('contestedCatch')), 0, 0.85);
    if (rng.next() < pLoose) {
      sim.stats.passDefendedBy = D.player.id;
      sim.event('pbu', D, R, 'through the hands');
      D.noCatchUntil = touchedUntil(sim, 0.25);
      R.noCatchUntil = sim.t + 0.6;
      deflect(sim, 0.2, 'drop', R, 0.5);
      return 'over';
    }
  }
  return add;
}

function pinToHands(sim: PlaySim, R: Agent): void {
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const f = shouldersOf(R.body); // the ball is caught against the chest
  ball.flight.pos = { x: R.pos.x + Math.cos(f) * 0.35, y: R.pos.y + Math.sin(f) * 0.35, z: 1.2 };
  ball.flight.vel = { x: R.vel.x, y: R.vel.y, z: 0 };
}

/** CATCH_SECURE: one tick of the securing window (called instead of the
 * flight step while the ball is in a receiver's hands). */
export function secureStep(sim: PlaySim): void {
  const ball = sim.ball;
  if (ball.kind !== 'air' || !ball.securing) return;
  const S = ball.securing, R = S.receiver;
  pinToHands(sim, R);
  if (!inBounds(R)) {
    ball.securing = undefined;
    sim.event('incomplete', R, null, 'out of bounds');
    sim.whistle('incomplete', { x: sim.los, y: sim.ballY });
    return;
  }
  const window = Math.max(1e-6, S.until - S.start);
  const progress = clamp((sim.t - S.start) / window, 0, 1);
  const bp = ball.flight.pos;
  const rng = sim.dice('secure', R);
  for (const D of sim.defense) {
    if (S.tried.has(D) || D.isDown(sim.t) || D.engagement) continue;
    const toBall = Math.hypot(D.pos.x - bp.x, D.pos.y - bp.y);
    const toBody = Math.hypot(D.pos.x - R.pos.x, D.pos.y - R.pos.y);
    const handReach = D.profile.reach + 0.15;
    const bodyTouch = D.profile.radius + R.profile.radius + 0.1;
    if (toBall > handReach && toBody > bodyTouch) continue;
    S.tried.add(D);
    // What he delivers: a hand to the ball, or his body into the receiver.
    const rel = toBody > 1e-6 ? { x: (R.pos.x - D.pos.x) / toBody, y: (R.pos.y - D.pos.y) / toBody } : { x: 1, y: 0 };
    const closing = Math.max(0, (D.vel.x - R.vel.x) * rel.x + (D.vel.y - R.vel.y) * rel.y);
    const hand = toBall <= handReach
      ? (0.25 + 0.35 * D.r('ballSkills') + 0.15 * D.r('manCoverage')) * (1 - 0.6 * toBall / handReach) * (facingBall(D, ball.flight.vel, sim) || D.tags.has('looking') ? 1 : 0.6)
      : 0;
    const hit = toBody <= bodyTouch ? clamp((closing - 1.5) / 6, 0, 0.8) * (0.6 + 0.4 * D.r('hitPower')) * D.profile.massKg / 90 : 0;
    const resist = (1.15 - 0.3 * R.r('hands') - 0.3 * R.r('contestedCatch')) * (1 - 0.7 * progress);
    const pLoose = clamp((1 - (1 - hand) * (1 - hit)) * resist, 0, 0.9);
    if (rng.next() < pLoose) {
      ball.securing = undefined;
      sim.stats.passDefendedBy = D.player.id;
      sim.event('pbu', D, R, hit > hand ? 'dislodged by the hit' : 'dislodged through the hands');
      D.noCatchUntil = touchedUntil(sim, 0.25);
      R.noCatchUntil = sim.t + 0.6;
      deflect(sim, 0.2, 'drop', R, 0.4);
      return;
    }
  }
  if (sim.t >= S.until) {
    ball.securing = undefined;
    sim.possess(R, 'catch');
  }
}

/** BAT_ONCE (default on; BAT_ONCE=0 restores the old law): a defender gets one try at batting a pass at the line,
 * the first tick its flight passes through his window, not one each tick it stays there. A plain defect fix (an
 * outcome that depended on the tick length): docs/reviews/2026-11-15-bat-at-the-line.md. The roll itself stays until
 * BAT_HANDS replaces it with his hands. */
const BAT_ONCE = process.env.BAT_ONCE !== '0';
/** BAT_ONCE: the defenders who have tried to bat this pass (keyed by its release time). */
const batTried = new WeakMap<PlaySim, { at: number; who: Set<Agent> }>();

/** PLAY_ONCE (default on; PLAY_ONCE=0 restores the old law): the same defect as BAT_ONCE's in a defender's play on a
 * ball he sees (defenderPlay's interception and breakup roll): one try per defender per pass, not one each tick the
 * ball is within his reach. A defect fix; the rolls themselves are Coverage's (in-phase work). */
const PLAY_ONCE = process.env.PLAY_ONCE !== '0';
/** PLAY_ONCE: the defenders who have played this pass (keyed by its release time). */
const playTried = new WeakMap<PlaySim, { at: number; who: Set<Agent> }>();

/** Returns true if the defender ended the flight (INT) or altered it. */
function defenderPlay(sim: PlaySim, o: Opp, tAir: number): boolean {
  const ball = sim.ball;
  if (ball.kind !== 'air') return true;
  const D = o.a;
  const rng = sim.dice('ball-play', D);
  const bv = ball.flight.vel;
  const sees = facingBall(D, bv, sim);
  const isBat = !!D.engagement || (tAir < 0.4 && D.pos.x < sim.los + 2);
  if (ball.deflected) {
    // A tipped ball is either caught or falls; no more volleyball.
    // A floating ball is reached for: his hands' envelope, not his torso.
    const window = D.profile.reach + 0.3;
    const inWindow = o.dh <= window && o.z >= 0.3 && o.z <= D.profile.reactReach;
    const pTip = DEFLECT_BALL
      ? (sees && inWindow ? clamp(0.2 + 0.3 * D.r('ballSkills'), 0, 0.5) * (1 - 0.6 * o.dh / window) : 0)
      : clamp(0.1 + 0.3 * D.r('ballSkills'), 0, 0.4) * (sees ? 1 : 0.3);
    if (rng.chance(pTip) && inBounds(D)) {
      sim.possess(D, 'interception');
      return true;
    }
    D.noCatchUntil = sim.t + 1;
    return false;
  }
  if (isBat && BAT_HANDS) {
    // BAT_HANDS: his hands, where they are. A ball through his raised hands is tipped; one below his shoulders on his
    // body comes off it; over or wide of them, nothing.
    const lvl = handsLevel(D);
    if (lvl > 0 && o.dh <= D.profile.radius + 0.25 && o.z <= handsTop(D) && o.z >= bodyHeight(D, SHOULDER) - 0.1) {
      sim.event('deflection', D, null, 'batted at the line');
      sim.stats.passDefendedBy = D.player.id;
      D.noCatchUntil = touchedUntil(sim, 0.3);
      tipOffHands(sim, D, o, lvl);
      return true;
    }
    if (o.z <= bodyHeight(D, SHOULDER) && o.dh <= D.profile.radius + BALL_HALF_WIDTH) {
      sim.event('deflection', D, ball.target, 'off his body');
      D.noCatchUntil = touchedUntil(sim, 0.25);
      deflect(sim, 0.3, 'tip', D);
      return true;
    }
    return false;
  }
  if (isBat) {
    // BAT_ONCE: one try per defender per pass. The ball stays in his window for several ticks; a roll each tick made his
    // chance per pass depend on the tick length (free defenders batted 29% of their chances against an 18% ceiling).
    if (BAT_ONCE) {
      const key = ball.releaseT, done = batTried.get(sim);
      if (done && done.at === key && done.who.has(D)) return false;
      if (!done || done.at !== key) batTried.set(sim, { at: key, who: new Set([D]) }); else done.who.add(D);
    }
    // Linemen only bat it if they read the release and get their hands up.
    const pBat = (D.engagement ? 0.04 : 0.12) * (sees ? 1 : 0.2) * (0.5 + D.r('playRecognition'));
    if (rng.chance(pBat)) {
      sim.event('deflection', D, null, 'batted at the line');
      sim.stats.passDefendedBy = D.player.id;
      D.noCatchUntil = touchedUntil(sim, 0.3);
      deflect(sim, 0.25, 'tip', D);
      return true;
    }
    return false;
  }
  if (!sees) {
    // A defender who does not see the ball cannot play it with his hands; it
    // can only hit him. If its path crosses his body (his radius plus the
    // ball's half-width, below his height) it comes off him: a deflection off
    // a body, not a play on the ball, and not a pass defensed. Before this, a
    // blind defender broke up 12% of balls that merely passed within his
    // arm's reach of his centre.
    if (o.dh <= D.profile.radius + BALL_HALF_WIDTH && o.z <= D.profile.heightYd) {
      sim.event('deflection', D, ball.target, 'off his body');
      D.noCatchUntil = touchedUntil(sim, 0.25);
      deflect(sim, 0.3, 'tip', D);
      return true;
    }
    return false;
  }
  // PLAY_ONCE: one try at the ball per defender per pass, the first tick it is within his reach and he sees it, not a
  // roll each tick it stays there (his chance of an interception or a breakup depended on the tick length and on how
  // long the ball stayed near him).
  if (PLAY_ONCE) {
    const key = ball.releaseT, done = playTried.get(sim);
    if (done && done.at === key && done.who.has(D)) return false;
    if (!done || done.at !== key) playTried.set(sim, { at: key, who: new Set([D]) }); else done.who.add(D);
  }
  const stretch = o.dh / (D.profile.reach + 0.3);
  const high = o.z > D.profile.heightYd * 1.1 ? 0.15 : 0;
  let pInt = clamp(0.03 + 0.3 * D.r('ballSkills') + 0.06 * D.r('hands') - 0.28 * stretch - high, 0.02, 0.45);
  if (ball.deflected) pInt *= 0.35;
  const pDefl = clamp(0.35 + 0.3 * D.r('ballSkills') - 0.2 * stretch, 0.15, 0.75);
  const roll = rng.next();
  if (roll < pInt && inBounds(D)) {
    sim.possess(D, 'interception');
    return true;
  }
  if (roll < pInt + pDefl * (1 - pInt)) {
    sim.stats.passDefendedBy = D.player.id;
    sim.event('pbu', D, ball.target);
    D.noCatchUntil = touchedUntil(sim, 0.25);
    deflect(sim, 0.3, 'tip', D);
    return true;
  }
  return false;
}

/** BAT_HANDS: a ball tipped off raised hands goes where the contact sends it: its speed cut to a quarter, the part of
 * its horizontal motion into his hands (toward his centre) reversed at a third, popping up by how high his hands
 * reached it (the hands meet it from below). Live, as any tipped ball. */
function tipOffHands(sim: PlaySim, D: Agent, o: Opp, lvl: number): void {
  if (!sim.touchPass(D)) return;
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const f = ball.flight, keep = 0.25;
  const nx = o.b.x - D.pos.x, ny = o.b.y - D.pos.y, nl = Math.hypot(nx, ny);
  let vx = f.vel.x, vy = f.vel.y;
  if (nl > 1e-6) {
    const ux = nx / nl, uy = ny / nl, into = vx * ux + vy * uy;
    if (into < 0) { vx -= (1 + 0.3) * into * ux; vy -= (1 + 0.3) * into * uy; }
  }
  f.vel = { x: vx * keep, y: vy * keep, z: 0.5 + 1.5 * lvl };
  f.drag = DRAG_TUMBLE;
  ball.deflected = true;
  ball.target = null;
  sim.computeBallPath();
}

function deflect(sim: PlaySim, keep: number, kind: 'drop' | 'tip' = 'tip', toucher?: Agent, solid?: number): void {
  if (toucher && !sim.touchPass(toucher)) return;
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const f = ball.flight;
  const dice = sim.dice('deflect');
  const ang = dice.range(-1.1, 1.1);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const vx = f.vel.x * keep;
  const vy = f.vel.y * keep;
  // Dropped balls fall; tipped balls pop up a little.
  const vz = solid !== undefined ? dice.normal(0.1 + 1.6 * solid * solid, 0.4) : kind === 'drop' ? dice.normal(0.3, 0.8) : dice.range(0.3, 2.2);
  f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: vz };
  f.drag = DRAG_TUMBLE;
  ball.deflected = true;
  ball.target = null;
  sim.computeBallPath();
}

function inBounds(a: Agent): boolean {
  return a.pos.y > 0 && a.pos.y < FIELD_WIDTH && a.pos.x < 120 && a.pos.x > 0;
}

