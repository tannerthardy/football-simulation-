/**
 * SNAP_REACT (on; =0 turns it off): the start of a scrimmage down as
 * perception and timing rather than one fixed defensive latency.
 *
 * The offense knows its count; each man goes on it after his readiness lag
 * (SnapMind.snapDelay). A lineman who times the count to beat a rusher goes
 * on his own estimate of it instead, with a timing error, and can move
 * before the snap.
 *
 * A defender sees the ball (or the man in front of him) move and responds
 * after a simple visual response time. A defender who times the cadence goes
 * on his own estimate of the snap instead, whichever comes first. A hard
 * count (an extra sound a beat before the snap) can draw a timer early; he
 * stops once he registers that the ball did not move. What his body did by
 * then (neutral zone, contact, a lineman's flinch) is the represented act
 * the rules classify: offside, encroachment, neutral zone infraction or
 * false start. No flag is rolled.
 *
 * Constants are assumptions with stated sources, not fits to penalty rates:
 * simple visual response of athletes to an expected single cue is about
 * 0.13-0.23 s; rhythmic timing error is a few hundredths of a second. The
 * defensive timing share and spread are the free mechanism parameters; they
 * are compared with tracked line get-off relative to the offensive line on
 * the same play (scripts/diag/align/getoff-rel.py), never with fouls.
 */
import { clamp } from '../core/vec.js';
import type { Rng } from '../core/rng.js';
import type { Agent } from './agent.js';

export const SNAP_REACT = process.env.SNAP_REACT !== '0';
/** DL_SNAP_TIME (experimental, off): see planSnap; on-line defenders time the count more often and more tightly. */
export const DL_SNAP_TIME = process.env.DL_SNAP_TIME === '1';

/** Spacing of the QB's cadence sounds (s). */
export const BEAT = 0.55;
/** An abrupt start is visible this long before the snap (judgement). */
export const VISIBLE = 0.05;
/** Extra time to register that an expected event (the ball moving) did not happen. */
const ABSENCE = 0.08;

const LINE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
/** OFFBALL_TIMING (on by default; OFFBALL_TIMING=0 turns it off): see planSnap; chance an off-ball defender times the count (avg about 0.55). */
export const OFFBALL_TIMING = process.env.OFFBALL_TIMING !== '0';
const OFFBALL_BASE = 0.3, OFFBALL_ANTICIPATION = 0.5;
/** OL_ON_COUNT (off): the tracked snap is the ball moving, which is the
 * centre's own start on the count. The centre goes with the ball and every
 * other lineman at his readiness lag less the centre's (never before the
 * ball unless he times the count); the readiness lag itself is unchanged.
 * Before, every lineman started his full lag after the ball, so 93% asked for
 * nothing on the snap tick and OZ OL were 0.06 / 0.15 / 0.46 yd lateral at
 * 0.2 / 0.3 / 0.5 s against NFL 0.14 / 0.25 / 0.59 (Flex ol-first-step.mts). */
export const OL_ON_COUNT = process.env.OL_ON_COUNT === '1';

/** Simple visual response to an expected single cue: seen motion to own movement. */
/** WR_SNAP (on by default; WR_SNAP=0 turns it off): a wide receiver more than
 * WR_SNAP_SPLIT yd from the ball laterally keys the ball's movement for his
 * start (snapResponse, as a defender off the ball does) instead of going on
 * the cadence with the line. Tracked receivers on dropbacks first reach
 * 0.5 / 1.0 / 2.0 yd/s at 0.40 / 0.50 / 0.70 s after the snap tag, ours at
 * 0.15 / 0.20 / 0.35: a near-constant delay, not a weaker first step
 * (BDB 2025 weeks 1-3). */
const WR_SNAP = process.env.WR_SNAP !== '0';
const WR_SNAP_SPLIT = 4;

export function snapResponse(a: Agent): number {
  return 0.10 + 0.3 * a.profile.reactionTime * (1 - 0.3 * a.r('anticipation'));
}

export interface StartPlan {
  /** Movement start relative to the snap (s); negative is before it. */
  go: number;
  /** Before the snap he registers that the ball has not moved and stops. */
  stop?: number;
  /** Start after he stopped: his response to the real snap. */
  restart?: number;
  timed: boolean;
}

export interface SnapSituation {
  down: number;
  distance: number;
  /** Distance of each defender's body front from the line (yd). */
  offBall: (a: Agent) => number;
  /** WR_SNAP: the ball's lateral spot. */
  ballY?: number;
}

export interface SnapCount {
  hard: boolean;
  plans: Map<Agent, StartPlan>;
}

/** Start plans for one snap, from one play-local stream. */
export function planSnap(agents: readonly Agent[], s: SnapSituation, rng: Rng): SnapCount {
  const passDown = s.down >= 3 && s.distance >= 7;
  const short = s.down >= 3 && s.distance <= 2;
  // Assumption: the offense varies its count mostly when a jump is worth
  // most to it (third or fourth and short).
  const hard = rng.chance(short ? 0.3 : 0.1);
  const plans = new Map<Agent, StartPlan>();
  // OL_ON_COUNT: the snap is the centre's own start on the count, so another
  // lineman's lag behind the ball is his readiness lag less the centre's.
  const centre = OL_ON_COUNT ? agents.find((x) => x.team === 'O' && x.slot === 'C') : undefined;
  const lineLag = (a: Agent) => centre ? (a === centre ? 0 : Math.max(0, a.mind.snapDelay - centre.mind.snapDelay)) : a.mind.snapDelay;
  for (const a of agents) {
    const discipline = a.r('discipline'), anticipation = a.r('anticipation');
    // Going early costs a flag and going late costs a step, so a man who
    // times the count aims behind it by a margin his discipline sets.
    const margin = 0.5 + 1.5 * discipline;
    if (a.team === 'O') {
      // WR_SNAP: a wide receiver split away from the ball starts on the ball
      // he sees move, at the same visual response a defender gets off with,
      // not on the cadence with the line beside the ball.
      if (WR_SNAP && s.ballY !== undefined && a.player.position === 'WR' && Math.abs(a.pos.y - s.ballY) > WR_SNAP_SPLIT) {
        plans.set(a, { go: a.mind.snapDelay + snapResponse(a), timed: false }); continue;
      }
      if (!LINE.has(a.slot)) { plans.set(a, { go: a.mind.snapDelay, timed: false }); continue; }
      // On a hard count a lineman can lose the count and go on the extra sound.
      if (hard && rng.chance(0.005 + 0.03 * (1 - discipline))) { plans.set(a, { go: -BEAT + a.mind.snapDelay, timed: false }); continue; }
      // A lineman who wants a head start (most of all a tackle on a passing
      // down) goes on his own timing of the count, not after hearing it.
      const tackle = a.slot === 'LT' || a.slot === 'RT';
      const times = rng.chance(0.04 + (passDown && tackle ? 0.12 : 0.02));
      const sd = 0.015 + 0.02 * (1 - discipline);
      const go = times ? Math.min(lineLag(a), rng.normal(margin * sd, sd)) : lineLag(a);
      plans.set(a, { go, timed: times });
      continue;
    }
    const react = a.mind.snapDelay + snapResponse(a);
    const onLine = s.offBall(a) < 2;
    // OFFBALL_TIMING (on by default; OFFBALL_TIMING=0 turns it off): an off-ball defender can time the
    // cadence too. He does not go before the ball (nothing to win and a step
    // given if the count is hard), but a backer who has timed it starts with
    // the snap instead of after seeing the ball move. NFL box backers are
    // already moving 0.8 yd/s (p50) 0.2 s after the snap; ours were still.
    if (!onLine && OFFBALL_TIMING) {
      const timesOff = !hard && rng.chance(clamp(OFFBALL_BASE + OFFBALL_ANTICIPATION * anticipation, 0, 0.95));
      if (timesOff) {
        const sd = 0.03 + 0.05 * (1 - anticipation);
        plans.set(a, { go: Math.min(react, Math.max(0, rng.normal(margin * sd, sd))), timed: true });
        continue;
      }
    }
    // DL_SNAP_TIME (experimental, off): a man on the line makes timing the
    // count his get-off, not an exception to it. His cue is the cadence he
    // hears and the centre's hands in his vision; his error is a rhythmic
    // timing error of a few hundredths of a second, tighter the better he
    // anticipates; going early stays his cost (the early() path and the
    // rules). Tracked NFL defensive linemen are past 0.3 yd/s by the first
    // 0.1 s after the tag (p50), faster than any visual response to the ball;
    // ours took 0.3 s, timing on fewer than half the snaps with a 0.07 s
    // spread.
    const share = DL_SNAP_TIME ? 0.7 + 0.3 * anticipation + (passDown ? 0.1 : 0) : 0.55 + 0.5 * anticipation + (passDown ? 0.15 : 0);
    const times = onLine && rng.chance(clamp(share, 0, DL_SNAP_TIME ? 0.97 : 0.95));
    if (!times) { plans.set(a, { go: react, timed: false }); continue; }
    const sd = DL_SNAP_TIME ? 0.015 + 0.03 * (1 - anticipation) : 0.03 + 0.05 * (1 - anticipation);
    const error = rng.normal(margin * sd, sd);
    if (hard) {
      // He hears the extra sound; nearly everyone waits for the ball.
      if (!rng.chance(0.02 + 0.1 * (1 - discipline))) { plans.set(a, { go: react, timed: false }); continue; }
      plans.set(a, early(-BEAT + error, a, react));
      continue;
    }
    plans.set(a, error < 0 ? early(error, a, react) : { go: Math.min(error, react), timed: true });
  }
  return { hard, plans };
}

function early(go: number, a: Agent, react: number): StartPlan {
  const stop = go + snapResponse(a) + ABSENCE;
  return stop < 0 ? { go, stop, restart: react, timed: true } : { go, timed: true };
}
