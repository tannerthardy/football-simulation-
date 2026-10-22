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

const INELIGIBLE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
/** Extra hand extension available while tracking a visible ball. */
export const TRACKING_REACH_BONUS = .3;
/** Experimental (TIP_AWAY=1, off): a defender who breaks up or bats a pass
 * has sent it away from his own hands. He cannot also catch that deflection;
 * teammates and the receiver still can. Without it he may play his own tip
 * a quarter second later, a second interception chance after the contest
 * already decided he could not catch it cleanly. */
const TIP_AWAY = process.env.TIP_AWAY === '1';
/** How long a defender who touched the ball stays out of its flight. */
const touchedUntil = (sim: PlaySim, beat: number) => sim.t + (TIP_AWAY ? 10 : beat);

interface Opp {
  a: Agent;
  s: number;
  dh: number;
  z: number;
}

/**
 * Can the player see the ball coming? Facing within ~110° of the incoming
 * ball (a look over the shoulder); trailing defenders with their back to the
 * ball are playing blind.
 */
function facingBall(a: Agent, ballVel: Vec3): boolean {
  if (a.tags.has('looking')) return true;
  const sp = Math.hypot(ballVel.x, ballVel.y) || 1;
  const c = Math.cos(a.body.facing) * (-ballVel.x / sp) + Math.sin(a.body.facing) * (-ballVel.y / sp);
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
    if (a.team === 'O' && !a.tags.has('onBall') && !sim.incidentalCatchReadiness.query(a, sim.t)) continue;
    const tracking = a === ball.target || a.tags.has('onBall');
    const reach = a.profile.reach + (tracking ? TRACKING_REACH_BONUS : 0);
    // Receivers tracking the ball time a full leap; defenders playing it get a
    // partial leap; everyone else only gets hands up.
    const p = a.profile;
    const top = a.team === 'O' && tracking ? p.maxCatchHeight : tracking ? p.reactReach + 0.5 * (p.maxCatchHeight - p.reactReach) : batWindow ? p.reactReach * 0.95 : p.reactReach;
    const body0 = bodyStarts ? bodyStarts[a.idx] : a.pos;
    if (!body0) continue; // An incomplete supplied interval cannot grant reach.
    const opportunity = closestCatchOpportunity(body0, a.pos, prev, cur, { reach, low: .1, top });
    if (opportunity) opps.push({ a, ...opportunity });
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
    if (off) {
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
  const rng = sim.rng;
  const bv = ball.flight.vel;
  const ballSpeed = Math.hypot(bv.x, bv.y, bv.z);
  const airTime = sim.t - ball.releaseT;

  const reach = R.profile.reach + 0.3;
  const stretch = (o.dh / reach) ** 2;
  const chest = R.profile.heightYd * 1.02;
  const high = o.z > chest ? (o.z - chest) / Math.max(0.2, R.profile.maxCatchHeight - chest) : 0;
  const low = o.z < 0.5 ? (0.5 - o.z) / 0.4 : 0;
  const trackPen = airTime > 1.4 ? (1 - R.r('ballTracking')) * 0.25 : 0;
  // Over-the-shoulder catches at speed (ball arriving from behind the receiver).
  const rs = R.speed;
  const fromBehind = rs > 1 ? (R.vel.x * bv.x + R.vel.y * bv.y) / (rs * (Math.hypot(bv.x, bv.y) || 1)) : 0;
  const shoulder = fromBehind > 0.3 && rs > 6.5 ? 0.12 + 0.12 * (1 - R.r('ballTracking')) : 0;
  const diff = 0.5 * stretch + 0.4 * high + 0.35 * low + (ballSpeed > 24 ? 0.08 : 0) + trackPen + shoulder;
  const hands = R.r('hands');
  let pCatch = clamp(0.985 - diff * (1.3 - hands) - 0.06 * (1 - hands), 0.2, 0.99);
  if (ball.deflected) pCatch *= 0.3;

  // Separation at the catch point (stat).
  let sep = Infinity;
  for (const d of sim.defense) sep = Math.min(sep, Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y));
  if (R === ball.target) sim.stats.separation = Math.round(sep * 10) / 10;

  // Contest from defenders near the catch point.
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
    const q = clamp(prox, 0, 1) * (facingBall(d, bv) ? 1 : 0.45);
    if (q > bestQ) {
      bestQ = q;
      bestD = d;
    }
  }
  if (bestD && bestQ > 0.05 && !ball.deflected) {
    const D = bestD;
    const heightEdge = clamp(1 + (D.profile.maxCatchHeight - R.profile.maxCatchHeight) * (high > 0 ? 0.9 : 0.25), 0.5, 1.6);
    const pbu = bestQ * (0.2 + 0.45 * D.r('ballSkills')) * (1.15 - 0.55 * R.r('contestedCatch')) * heightEdge;
    const pInt = pbu * (0.06 + 0.22 * D.r('ballSkills')) * (facingBall(D, bv) ? 1 : 0.2);
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

  if (rng.chance(pCatch)) {
    if (!inBounds(R)) {
      sim.event('incomplete', R, null, 'out of bounds');
      sim.whistle('incomplete', { x: sim.los, y: sim.ballY });
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
  }
  R.noCatchUntil = sim.t + 0.6;
  deflect(sim, 0.2, 'drop', R);
}

/** Returns true if the defender ended the flight (INT) or altered it. */
function defenderPlay(sim: PlaySim, o: Opp, tAir: number): boolean {
  const ball = sim.ball;
  if (ball.kind !== 'air') return true;
  const D = o.a;
  const rng = sim.rng;
  const bv = ball.flight.vel;
  const sees = facingBall(D, bv);
  const isBat = !!D.engagement || (tAir < 0.4 && D.pos.x < sim.los + 2);
  if (ball.deflected) {
    // A tipped ball is either caught or falls; no more volleyball.
    const pTip = clamp(0.1 + 0.3 * D.r('ballSkills'), 0, 0.4) * (sees ? 1 : 0.3);
    if (rng.chance(pTip) && inBounds(D)) {
      sim.possess(D, 'interception');
      return true;
    }
    D.noCatchUntil = sim.t + 1;
    return false;
  }
  if (isBat) {
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
  const stretch = o.dh / (D.profile.reach + 0.3);
  const high = o.z > D.profile.heightYd * 1.1 ? 0.15 : 0;
  let pInt = sees ? clamp(0.03 + 0.3 * D.r('ballSkills') + 0.06 * D.r('hands') - 0.28 * stretch - high, 0.02, 0.45) : 0;
  if (ball.deflected) pInt *= 0.35;
  const pDefl = sees ? clamp(0.35 + 0.3 * D.r('ballSkills') - 0.2 * stretch, 0.15, 0.75) : 0.12;
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

function deflect(sim: PlaySim, keep: number, kind: 'drop' | 'tip' = 'tip', toucher?: Agent): void {
  if (toucher && !sim.touchPass(toucher)) return;
  const ball = sim.ball;
  if (ball.kind !== 'air') return;
  const f = ball.flight;
  const ang = sim.rng.range(-1.1, 1.1);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const vx = f.vel.x * keep;
  const vy = f.vel.y * keep;
  // Dropped balls fall; tipped balls pop up a little.
  const vz = kind === 'drop' ? sim.rng.normal(0.3, 0.8) : sim.rng.range(0.3, 2.2);
  f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: vz };
  f.drag = DRAG_TUMBLE;
  ball.deflected = true;
  ball.target = null;
  sim.computeBallPath();
}

function inBounds(a: Agent): boolean {
  return a.pos.y > 0 && a.pos.y < FIELD_WIDTH && a.pos.x < 120 && a.pos.x > 0;
}
