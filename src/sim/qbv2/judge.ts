/**
 * QB_V2 module D: the judgment (QB lane, 2026-11-24; docs/reviews/2026-11-24-qb-v2-design.md §2, §7, §8). For one
 * candidate throw, his belief that it is caught (P) and that it is intercepted (risk), from the defenders in his picture
 * in three roles, each with one physical model:
 * - the coverer (the man his picture shows moving with the receiver): carried with the receiver to the break, then his
 *   reaction by the technique he is seen playing, then the body law to the catch point;
 * - drivers (off the receiver, in range): start at the passer's delivery if he sees them facing him (the arm cue), at
 *   the ball otherwise, then the body law;
 * - lane men (anyone in his picture under the ball's path): the ball's height against their reach as it passes.
 * Pure: it reads only what the caller passes (his picture, the receiver's forecast, the scouting report). No defender
 * he does not have in his picture is judged; that is where the unpriced interception comes from.
 */

export interface V2 { x: number; y: number }

/** A defender as he has him. */
export interface SeenDefender {
  id: number;
  pos: V2;
  vel: V2;
  facing: number;
  /** His picture's spread on this man (yd), from the cones and age. */
  spread: number;
  /** How old his picture of this man is (s): what the man did since is unknown to him, within what a body can do. */
  age?: number;
  /** Whether the passer sees him facing the passer (eyes on him), so he can take the arm cue. */
  facesPasser: boolean;
  /** Scouting report: top speed (yd/s), acceleration (yd/s^2), reach (yd) and leap height (yd), ball skills (0-1). */
  vmax: number;
  accel: number;
  reach: number;
  leap: number;
  ballSkills: number;
}

export interface ThrowQuestion {
  /** Seconds from now to the release (his windup) and the ball's flight time. */
  windup: number;
  flight: number;
  /** Where the ball is caught, and the receiver's position at a time from now (his forecast). */
  catchAt: V2;
  receiverAt(t: number): V2;
  /** When the receiver breaks (seconds from now), null if no break before the catch (a settle, a seen-open read). */
  breakIn: number | null;
  /** The ball's height (yd) at a field point on its path (null where the ball is not over it). */
  ballHeightAt(p: V2): number | null;
  /** The ball's path from release to catch, sampled (for the lane). */
  path: V2[];
  /** The line of scrimmage (x; downfield is +x): a rusher within RUSH_LINE of it gets his hands up, he does not drop. */
  los: number;
  /** The receiver's catch belief with no defender near (from the catch model, not a fitted drop rate). */
  catchClean: number;
  /** How resolved his look at the receiver is (0-1) and his picture spread on the receiver (yd). */
  res: number;
  receiverSpread: number;
  /** The coverer he held for this receiver last time (kept unless another is nearer by COVER_SWAP), and the defenders his
   * picture had within the coverage radius of this receiver 0.2 s ago too (only they can be the coverer: a relation held
   * over his picture's own history, not one sample; Coverage's review). Absent: no history yet (no restriction). */
  heldCoverer?: number | null;
  coverEligible?: ReadonlySet<number>;
}

export type Role = 'coverer' | 'driver' | 'lane';
export interface RoleJudged { id: number; role: Role; margin: number; sigma: number; pArrive: number; pPlay: number; pPick: number }
export interface Judgment { P: number; risk: number; roles: RoleJudged[] }

/** Stated choices (labelled; not fitted). */
/** A defender within this of the receiver's path, moving with him, is the coverer (yd). */
export const COVER_RADIUS = 6;
/** A settled receiver's coverer sits on him within this (yd); a dropper farther off holding his zone is a driver
 * (Coverage's note: underneath droppers answer the throw, not the break). */
export const SETTLE_COVER = 2.5;
/** A defender this close to the receiver in his picture is on him whatever his speed so far: a press or tight man (yd;
 * Coverage's note: man cushion about 1.3 yd at the break). A rusher driving at the passer is not. Chosen. */
export const TIGHT_COVER = 3;
/** A new coverer replaces the held one only when nearer the receiver by this (yd): no swap tick to tick (chosen). */
export const COVER_SWAP = 1;
/** Arrival within his reach plus this of the catch point plays the ball (yd): his hand reaches the ball off the
 * receiver's frame (chosen; Coverage's note: the man coverer about 1.7 yd from the receiver at the catch holds completion
 * to .54). The calibration contract checks it by role. */
export const PLAY_CLEAR = 0.5;
/** A driver starting farther than this from the catch point is not judged (yd; Coverage: 6+ yd arrive about never). */
export const DRIVE_RANGE = 9;
/** The arm cue's lead over the ball cue (s; Coverage's note: 0.25 s). */
export const ARM_LEAD = 0.25;
/** Reaction at the break by what the coverer is seen doing (s; Coverage's note §1, typical by technique). */
export const REACT_WITH_MAN = 0.3;
export const REACT_DEEP_CARRY = 0.3;
export const REACT_MATCH_FLAT = 0.75;
/** The base spread of an arrival time (s) with a resolved look and an exact picture (chosen). */
export const ARRIVE_SIGMA0 = 0.12;
/** An unresolved look's extra spread on where the receiver is (yd at res 0; the step clock's LOOK_SEP). */
export const LOOK_SEP = 0.5;
/** Of a defender who plays the ball, the share who break it up (rather than miss it) and, in front of the hands on the
 * throw side, who catch it (scaled by ball skills). Stated choices pending the calibration contract. */
export const PLAY_BREAKUP = 0.6;
/** Calibrated on the staged cells (2026-11-24): our engine's defenders who arrive at the catch point pick it about 0.06 of
 * the time (5 picks in 110 arrivals: drivers 0.065, lane 0.04, coverers 0 of 14), against the 0.35 first stated. Scaled by
 * ball skills about the typical (0.5 + skills). The calibration contract keeps checking it. */
export const PICK_IN_FRONT = 0.06; // superseded by PICK_OF_PLAY; kept for reference in the probes
/** The share of a defender's plays on the ball that he catches, the same for every role and scaled by his ball skills
 * about the typical (0.5 + skills). Measured on the staged cells (cal12 + cal14, 2026-11-24): 18 picks in 103 plays on the
 * ball, 0.17; arrival at the point was the wrong base (most plays come from 1.5-5 yd off it). */
export const PICK_OF_PLAY = 0.18;
/** A rusher this close to the line (yd) is a lane man by his hands, not by getting there (chosen). */
export const RUSH_LINE = 1.5;
/** A rusher's hands in the ball's low path: the batted ball, typical by role (the engine's batting: 0.04 engaged, 0.12
 * free, scaled by whether he sees the throw; the passer does not know which, so the middle), and the share of those
 * that are caught (a tip to himself or a teammate). Stated choices pending the calibration contract. */
/** Measured on the staged cells (cal12, 2026-11-24): 7 throws batted by rushers in 377 rusher-in-the-lane cases, 0.019 each
 * (believed 0.063 of throws at 0.08, actual 0.015; the NFL's is 1-2%). */
export const RUSH_BAT = 0.02;
export const BAT_PICK = 0.15;
/** The ball's first yards out of his hand are climbing: no lane before this far from the passer (yd; chosen). */
export const LANE_CLEAR = 3;
/** A dropper who gets under the ball's path plays it by our engine's batting rule, not as a man at the catch point: 0.12
 * for a free defender who sees the throw, 0.2 of that if he does not (catching.ts defenderPlay, typical recognition), once
 * per throw; LANE_PICK of those plays are caught. The belief matches our world (Integration, 2026-11-24). Stated, checked
 * by the calibration contract. A coverer undercutting his receiver keeps the catch-point model. */
export const LANE_PLAY = 0.12;
export const LANE_PLAY_BLIND = 0.2;
export const LANE_PICK = 0.3;
/** The part of the path within this of the catch point (yd) is in front of the receiver: a dropper who gets there is at
 * the catch point and plays it as a coverer would (staged V2, 2026-11-24: every stick interception was 1.3-2.3 yd from
 * the point, at 0.75-1.0 of the flight). Farther back, under a rising ball, he can only bat it (LANE_PLAY). Chosen. */
export const LANE_NEAR = 3;

const hyp = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
/** His spread on a man's arrival (s): the picture's own spread, plus what the man may have done since he was last seen
 * (an aged picture: he can have changed his velocity by up to his acceleration times the age, and that carries to the
 * point over the time it takes), plus the receiver's spread; over the man's speed. Information-honest: a man last seen
 * widening 0.6 s ago is a wide belief, not a certain one (staged V2, 2026-11-24, the field nickel). */
/** How fast an unseen man's velocity typically changes (yd/s^2): not his top acceleration, which assumes he spent the
 * whole unseen time accelerating at the point (chosen; staged V2: top acceleration made every belief too wide). */
export const UNSEEN_DRIFT = 2.5;
function arriveSigma(d: SeenDefender, recvSig: number, horizon: number): number {
  const age = d.age ?? 0, unknown = 0.5 * UNSEEN_DRIFT * age * age + UNSEEN_DRIFT * age * Math.max(0, horizon);
  return Math.hypot(ARRIVE_SIGMA0, Math.hypot(d.spread + unknown, recvSig) / Math.max(d.vmax, 1e-3));
}
const phi = (z: number) => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z)));

/** Body law: time for a man at `pos` moving `vel`, facing `facing`, to get within `r` of `to`, starting after `delay`:
 * he turns toward it (a quarter turn costs `turnQ` s), keeps his speed along the new line, and accelerates to vmax. */
export function arriveTime(d: Pick<SeenDefender, 'pos' | 'vel' | 'facing' | 'vmax' | 'accel'>, to: V2, r: number, delay: number, turnQ = 0.15): number {
  // Until he reacts he keeps going as he is going (his seen velocity): a man drifting into the window is there sooner, one
  // drifting out pays for it. (Staged V2, 2026-11-24: holding him still put a robber 0.8 s and a man corner 0.4 s late.)
  let at = d.pos;
  for (let s = 0; s < delay; s += 0.05) {
    if (Math.hypot(to.x - at.x, to.y - at.y) <= r) return s;
    at = { x: at.x + d.vel.x * Math.min(0.05, delay - s), y: at.y + d.vel.y * Math.min(0.05, delay - s) };
  }
  const dx = to.x - at.x, dy = to.y - at.y, L0 = Math.hypot(dx, dy) - r;
  if (L0 <= 0) return delay;
  const ux = dx / (L0 + r), uy = dy / (L0 + r), vu = d.vel.x * ux + d.vel.y * uy, along = Math.max(0, vu);
  // A man running away from the point first has to stop: his speed away from it takes away/accel to kill, and he covers
  // away^2/(2 accel) more ground the wrong way while he does (staged V2, 2026-11-24: a safety widening to the flat at 4
  // yd/s was judged to turn back onto the slant from a standing start, at no cost, and the slant was never thrown).
  const away = Math.max(0, -vu), stopT = away / Math.max(d.accel, 1e-3), L = L0 + away * stopT / 2;
  const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(uy, ux) - d.facing), Math.cos(Math.atan2(uy, ux) - d.facing)));
  const turn = turnQ * (ang / (Math.PI / 2)) * (1 - along / Math.max(d.vmax, 1e-3));
  const v0 = along, a = Math.max(d.accel, 1e-3), vmax = Math.max(d.vmax, v0);
  const tAcc = (vmax - v0) / a, dAcc = v0 * tAcc + 0.5 * a * tAcc * tAcc;
  const run = L <= dAcc ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * L)) / a : tAcc + (L - dAcc) / vmax;
  return delay + stopT + turn + run;
}

/** Which defender, if any, his picture shows covering the receiver: within COVER_RADIUS of where the receiver is now, the
 * nearest whose seen velocity runs with the receiver's (a man or a carry); a zone dropper holding is not a coverer. */
export function findCoverer(q: ThrowQuestion, defs: SeenDefender[]): SeenDefender | null {
  const atLine = (d: SeenDefender) => d.pos.x - q.los <= RUSH_LINE;
  const r0 = q.receiverAt(0), r1 = q.receiverAt(0.2), rv = { x: (r1.x - r0.x) / 0.2, y: (r1.y - r0.y) / 0.2 }, rs = Math.hypot(rv.x, rv.y);
  const onHim = (d: SeenDefender): boolean => {
    const dist = hyp(d.pos, r0);
    if (dist > COVER_RADIUS || d.vel.x < -3 || atLine(d)) return false; // a rusher driving at the passer, or at the line
    if (q.coverEligible && !q.coverEligible.has(d.id)) return false;
    // Beyond tight, "with him" is a relation that holds: his velocity along the receiver's and his speed relative to him
    // small (staged V2, 2026-11-24: a nickel 5 yd inside sinking with the slot passed a projection-only test as the far
    // out's coverer, 12 yd from the catch).
    const relV = Math.hypot(d.vel.x - rv.x, d.vel.y - rv.y);
    return dist <= TIGHT_COVER || (rs < 1 ? dist <= SETTLE_COVER && Math.hypot(d.vel.x, d.vel.y) < 2 : (d.vel.x * rv.x + d.vel.y * rv.y) / rs > 0.5 * rs && relV <= 1 + 0.4 * rs);
  };
  let best: SeenDefender | null = null;
  for (const d of defs) if (onHim(d) && (!best || hyp(d.pos, r0) < hyp(best.pos, r0))) best = d;
  const held = q.heldCoverer != null ? defs.find((d) => d.id === q.heldCoverer) : undefined;
  if (held && onHim(held) && (!best || hyp(best.pos, r0) > hyp(held.pos, r0) - COVER_SWAP)) return held;
  return best;
}

/** The coverer's reaction by what he is seen doing: deep (cushion over 4 yd) carrying, a flat seat (under the receiver,
 * level or in front), or running with his man. */
function coverReact(q: ThrowQuestion, d: SeenDefender): number {
  const r0 = q.receiverAt(0), cushion = hyp(d.pos, r0);
  if (cushion >= 4) return REACT_DEEP_CARRY;
  const r1 = q.receiverAt(0.2), up = { x: r1.x - r0.x, y: r1.y - r0.y }, ahead = (d.pos.x - r0.x) * up.x + (d.pos.y - r0.y) * up.y;
  return ahead < 0 ? REACT_MATCH_FLAT : REACT_WITH_MAN;
}

/** Judge one candidate throw on his picture. */
export function judge(q: ThrowQuestion, defs: SeenDefender[]): Judgment {
  const tBall = q.windup + q.flight, roles: RoleJudged[] = [];
  const recvSig = Math.hypot(q.receiverSpread, LOOK_SEP * (1 - q.res));
  const cov = findCoverer(q, defs);
  const add = (d: SeenDefender, role: Role, tArr: number) => {
    const sigma = arriveSigma(d, recvSig, tArr);
    const margin = tBall - tArr, pArrive = phi(margin / sigma);
    roles.push({ id: d.id, role, margin, sigma, pArrive, pPlay: pArrive * PLAY_BREAKUP, pPick: pArrive * PLAY_BREAKUP * PICK_OF_PLAY * (0.5 + d.ballSkills) });
  };
  if (cov) {
    // Two phases (Coverage's review): he knows the receiver's line, which he sees, not the catch point, until the ball is
    // out. Until the break he is carried with the receiver (his seen offset kept); for his reaction after it he keeps his
    // pre-break line; then he tracks the receiver's new line, offset kept. Only from his release cue (the arm if he faces
    // the passer, the ball otherwise) does he run to the catch point, by the body law from where that puts him.
    const r0 = q.receiverAt(0), off = { x: cov.pos.x - r0.x, y: cov.pos.y - r0.y };
    const cue = q.windup + (cov.facesPasser ? 0 : ARM_LEAD);
    const tb = q.breakIn !== null && q.breakIn > 0 && q.breakIn < cue ? q.breakIn : null;
    const recvVel = (t: number) => { const a = q.receiverAt(Math.max(0, t - 0.1)), b = q.receiverAt(t + 0.1); return { x: (b.x - a.x) / 0.2, y: (b.y - a.y) / 0.2 }; };
    let at: V2, vel: V2;
    if (tb === null) {
      // No break before his cue: carried with the receiver, his seen offset kept; if the break is already behind them, he
      // is chasing, and closes the offset at his speed over the receiver's.
      const rc = q.receiverAt(cue), rv = recvVel(cue), broke = q.breakIn !== null && q.breakIn <= 0, L0 = Math.hypot(off.x, off.y);
      const k = broke && L0 > 1e-6 ? Math.max(0, L0 - Math.max(0, cov.vmax - Math.hypot(rv.x, rv.y)) * cue) / L0 : 1;
      at = { x: rc.x + off.x * k, y: rc.y + off.y * k }; vel = rv;
    }
    else {
      const react = coverReact(q, cov), rb = q.receiverAt(tb), v0 = recvVel(Math.max(0, tb - 0.15));
      const tr = Math.min(cue, tb + react);
      const straight = { x: rb.x + off.x + v0.x * (tr - tb), y: rb.y + off.y + v0.y * (tr - tb) };
      if (cue <= tr) { at = straight; vel = v0; }
      else {
        // Chasing the receiver's new line, he closes the gap the break opened at his speed over the receiver's (a man
        // defender trails, then runs him down), down to nothing (staged V2: holding the gap put him 0.3-0.4 s late).
        const rr = q.receiverAt(tr), rc = q.receiverAt(cue), lag0 = { x: straight.x - rr.x, y: straight.y - rr.y }, L0 = Math.hypot(lag0.x, lag0.y);
        const rv = recvVel(cue), close = Math.max(0, cov.vmax - Math.hypot(rv.x, rv.y)) * (cue - tr), k = L0 > 1e-6 ? Math.max(0, L0 - close) / L0 : 0;
        at = { x: rc.x + lag0.x * k, y: rc.y + lag0.y * k }; vel = rv;
      }
    }
    const tArr = cue + arriveTime({ ...cov, pos: at, vel }, q.catchAt, cov.reach + PLAY_CLEAR, 0);
    add(cov, 'coverer', tArr);
  }
  const laneOf = (d: SeenDefender): { margin: number; sigma: number; pArrive: number; rusher: boolean; pNear?: number } | null => {
    const origin = q.path[0], n = q.path.length - 1;
    if ((d.pos.x - q.los) <= RUSH_LINE) {
      const inLane = q.path.some((p, i) => i > 0 && origin && hyp(p, origin) >= LANE_CLEAR && (q.ballHeightAt(p) ?? Infinity) <= d.leap && hyp(d.pos, p) <= d.reach + 0.5);
      return inLane ? { margin: 0, sigma: ARRIVE_SIGMA0, pArrive: 1, rusher: true } : null;
    }
    let best: number | null = null, near: number | null = null;
    q.path.forEach((p, i) => {
      if (i === 0 || !origin || hyp(p, origin) < LANE_CLEAR || (q.ballHeightAt(p) ?? Infinity) > d.leap || hyp(d.pos, p) > DRIVE_RANGE) return;
      const tPass = q.windup + q.flight * (i / Math.max(n, 1)), tArr = arriveTime(d, p, d.reach, q.windup + (d.facesPasser ? 0 : ARM_LEAD)), m = tPass - tArr;
      if (best === null || m > best) best = m;
      if (hyp(p, q.catchAt) <= LANE_NEAR && (near === null || m > near)) near = m;
    });
    if (best === null || best <= -0.3) return null;
    const sigma = arriveSigma(d, 0, q.windup + q.flight);
    return { margin: best, sigma, pArrive: phi(best / sigma), rusher: false, pNear: near === null ? 0 : phi(near / sigma) };
  };
  // The coverer can also undercut the route and take the ball on its line, short of the catch point: the higher of the two.
  if (cov) {
    const lc = laneOf(cov), cr = roles[0];
    if (lc && !lc.rusher && cr && lc.pArrive > cr.pArrive) roles[0] = { ...cr, margin: lc.margin, sigma: lc.sigma, pArrive: lc.pArrive, pPlay: lc.pArrive * PLAY_BREAKUP, pPick: lc.pArrive * PLAY_BREAKUP * PICK_OF_PLAY * (0.5 + cov.ballSkills) };
  }
  for (const d of defs) {
    if (d === cov) continue;
    // Lane: under the ball's path where it passes low enough for his leap. A rusher at the line by his hands (the batted
    // ball); a dropper only if he gets there before the ball passes (the body law).
    const lane = laneOf(d);
    if (lane?.rusher) { roles.push({ id: d.id, role: 'lane', margin: 0, sigma: ARRIVE_SIGMA0, pArrive: 1, pPlay: RUSH_BAT, pPick: RUSH_BAT * PICK_OF_PLAY * (0.5 + d.ballSkills) }); continue; }
    if (lane) {
      // In front of the receiver near the catch: the catch-point model; farther back, our batting rule. The larger.
      const bat = lane.pArrive * LANE_PLAY * (d.facesPasser ? 1 : LANE_PLAY_BLIND) * (0.5 + d.ballSkills), pn = lane.pNear ?? 0;
      const front = { play: pn * PLAY_BREAKUP, pick: pn * PLAY_BREAKUP * PICK_OF_PLAY * (0.5 + d.ballSkills) }, useFront = front.play > bat;
      roles.push({ id: d.id, role: 'lane', margin: lane.margin, sigma: lane.sigma, pArrive: lane.pArrive, pPlay: useFront ? front.play : bat, pPick: (useFront ? front.play : bat) * PICK_OF_PLAY * (0.5 + d.ballSkills) });
      continue;
    }
    if (hyp(d.pos, q.catchAt) > DRIVE_RANGE) continue;
    const start = q.windup + (d.facesPasser ? 0 : ARM_LEAD);
    const tArr = arriveTime(d, q.catchAt, d.reach + PLAY_CLEAR, start);
    add(d, 'driver', tArr);
  }
  const notPlayed = roles.reduce((p, r) => p * (1 - r.pPlay), 1), notPicked = roles.reduce((p, r) => p * (1 - r.pPick), 1);
  return { P: q.catchClean * notPlayed, risk: 1 - notPicked, roles };
}
