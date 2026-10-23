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
/**
 * HARD_COUNT_LAPSE (on; =0 restores the separate defensive bite): an extra
 * sound draws a man only when he loses the count, the same lapse on both
 * lines. A defender who times the count anticipates the ball, which moves a
 * beat after the extra sound; the lineman is the one conditioned to go on a
 * sound. Tracked defensive linemen time the snap at least as early as ours
 * (start relative to their offensive line), yet the NFL's most effective
 * hard-count offenses draw a defensive pre-snap foul on about 1.1-1.3% of
 * snaps; with the separate bite the average sim offense drew 1.7%.
 */
export const HARD_COUNT_LAPSE = process.env.HARD_COUNT_LAPSE !== '0';

/** A man who times the count goes on an extra sound: he lost the count. */
export function losesCount(discipline: number): number {
  return 0.005 + 0.03 * (1 - discipline);
}

/** Spacing of the QB's cadence sounds (s). */
export const BEAT = 0.55;
/** An abrupt start is visible this long before the snap (judgement). */
export const VISIBLE = 0.05;
/** Extra time to register that an expected event (the ball moving) did not happen. */
const ABSENCE = 0.08;

const LINE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

/** Simple visual response to an expected single cue: seen motion to own movement. */
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
  for (const a of agents) {
    const discipline = a.r('discipline'), anticipation = a.r('anticipation');
    // Going early costs a flag and going late costs a step, so a man who
    // times the count aims behind it by a margin his discipline sets.
    const margin = 0.5 + 1.5 * discipline;
    if (a.team === 'O') {
      if (!LINE.has(a.slot)) { plans.set(a, { go: a.mind.snapDelay, timed: false }); continue; }
      // On a hard count a lineman can lose the count and go on the extra sound.
      if (hard && rng.chance(losesCount(discipline))) { plans.set(a, { go: -BEAT + a.mind.snapDelay, timed: false }); continue; }
      // A lineman who wants a head start (most of all a tackle on a passing
      // down) goes on his own timing of the count, not after hearing it.
      const tackle = a.slot === 'LT' || a.slot === 'RT';
      const times = rng.chance(0.04 + (passDown && tackle ? 0.12 : 0.02));
      const sd = 0.015 + 0.02 * (1 - discipline);
      const go = times ? Math.min(a.mind.snapDelay, rng.normal(margin * sd, sd)) : a.mind.snapDelay;
      plans.set(a, { go, timed: times });
      continue;
    }
    const react = a.mind.snapDelay + snapResponse(a);
    const onLine = s.offBall(a) < 2;
    const times = onLine && rng.chance(clamp(0.55 + 0.5 * anticipation + (passDown ? 0.15 : 0), 0, 0.95));
    if (!times) { plans.set(a, { go: react, timed: false }); continue; }
    const sd = 0.03 + 0.05 * (1 - anticipation);
    const error = rng.normal(margin * sd, sd);
    if (hard) {
      // He hears the extra sound; nearly everyone waits for the ball.
      if (!rng.chance(HARD_COUNT_LAPSE ? losesCount(discipline) : 0.02 + 0.1 * (1 - discipline))) { plans.set(a, { go: react, timed: false }); continue; }
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
