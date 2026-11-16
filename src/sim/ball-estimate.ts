/**
 * BALL_EST (experimental, off; BALL_EST=1 turns it on): each player's own estimate of a ball in flight, built only
 * from the ball positions he has seen (docs/reviews/2026-11-14-ball-in-air-spec.md, stage 1).
 *
 * Replaces the two flight oracles: the defender's copy of the true path at recognition (`acquireFlight`) and the
 * receiver's per-tick read of the true path (`TrackBall` / `catchSpot` / `chooseCatchPoint`). The QB reads no
 * flight after the release; after a tip or a disturbed release he is an observer like anyone (no consumer reads it).
 *
 * A player who attends to the ball (a consumer asked for his estimate on the last tick) turns his head toward where
 * he believes the ball is, at the GAZE head rate within his neck range. While the ball is within his eye range of
 * where his head points he takes one sample per fixation: the ball as it was one perception delay ago, its bearing
 * and elevation with a small angular error and its range with a larger proportional error (depth is judged from
 * optical size, poorly). His estimate is the launch state that best fits his samples (generalized least squares,
 * each sample weighted by its own covariance), with gravity and the ball's drag as known physics. Two samples pin
 * it. Not looking: the estimate stays at its last fit. A new flight (a tip) is a new thing to see.
 *
 * Constants were fixed from perception evidence before each exam (the spec's table): attempt 2 samples on every
 * perception step while the ball is in eye range (eyes on the ball 95% of frames, Postma 2014) with a serially
 * correlated error (0.25 s, choice); bearing 0.5-1.0 deg and range
 * 5-10 % (choice, from psychophysics orders of magnitude); eye range 30 deg (choice); head 6 rad/s within 90 deg
 * (GAZE). Ratings: ballTracking for offense, ballSkills for defense, between best and worst.
 */
import { HEAD as SHARED_HEAD, neckRange, want as headWant } from './head.js';
import { INCIDENTAL_FLIGHT_MAX_AGE } from './catch-readiness.js';
import { G } from '../core/units.js';
import { clamp } from '../core/vec.js';
import type { Vec3 } from '../core/vec.js';
import { qbArmSpeed, stepFlight, type BallFlight } from '../physics/ball.js';
import { shouldersOf, TRUNK_RANGE, TRUNK_TWIST, type MoveCommand } from '../physics/kinematics.js';
import { naturalFlightFor } from './behaviors/qb.js';
import type { Agent } from './agent.js';
import { ReceiverForecast, type InstalledReceiverRoute } from './receiver-forecast.js';
import type { PlaySim } from './playsim.js';

/** BALL_EST is a bitmask (0 off): 1 the estimator; 4 a committed catch point moves with his estimate; 8 looming; 2 removes catching.ts's tracking penalty (ballTracking acts through
 * the estimator; charging it again at the catch double-counts). */
const BALL_EST_RAW = Number(process.env.BALL_EST ?? 6145);
/** Bit 1024 is the receiver's one meaning for a card: the receiver on his own sight of the ball. It carries the receiver
 * bits it was built on (2 no tracking penalty, 4 moving choice, 16 deep look, 64 trunk look), so 1025 = 1111; the
 * single bits stay for the parked designs' reads only. */
const BALL_EST_BITS = BALL_EST_RAW & (1024 | 2048) ? BALL_EST_RAW | 2 | 4 | 16 | 64 : BALL_EST_RAW;
export const BALL_EST = (BALL_EST_BITS & 1) !== 0;
export const BALL_EST_NO_TRACKPEN = (BALL_EST_BITS & 2) !== 0;
/** Design 5 (b): a committed catch point moves with his estimate (bit 4). */
export const BALL_EST_MOVING_CHOICE = (BALL_EST_BITS & 4) !== 0;
/** Design 5 (a): looming, a time-to-contact observation while his head is on the ball (bit 8). */
export const BALL_EST_LOOMING = (BALL_EST_BITS & 8) !== 0;
/** Bit 16 (design 6): on a deep route he gets his head round to the passer at his landmark depth, for his count. */
export const BALL_EST_DEEP_LOOK = (BALL_EST_BITS & 16) !== 0;
/** Bit 32: an offensive player who is not tracking the throw can catch it only on his own sample of this flight (one
 * perception per player), not on catch-readiness's separate facing cone. */
export const BALL_EST_INCIDENTAL = (BALL_EST_BITS & 32) !== 0;
/** Bit 64 (design 7, with TRUNK_TWIST): he keeps his estimated ball in view through his trunk before his hips. A look
 * is his eyes and neck first (neckOf), then his shoulders twisted off his hips for what the neck cannot reach (up to
 * TRUNK_RANGE), and only the remainder past both turns his hips, which the facing speed cap prices. What he looks at is
 * his own: his estimate's first point, or the QB he sees before he has one; never the ball's true position. */
export const BALL_EST_TRUNK = (BALL_EST_BITS & 64) !== 0;
/** Bit 128 (defense only, 2026-11-14): the estimator is on for the defense alone. Defenders play the ball from their own
 * estimate (`acquireFlight`) and, with bit 32, play it only on their own sight; receivers keep today's tracking and the
 * incidental-catch gate (the receiver bits 2 / 4 / 8 / 16 / 64 do not apply). For carding the defense first: 129, 161. */
export const BALL_EST_DEF_ONLY = (BALL_EST_BITS & 128) !== 0;
/** Bit 256 (the man defender's look, 2026-11-14): a man defender who believes the ball is out from his man's eyes or
 * hands (Defense's readsHandsAt) and has not seen it judges his phase from his own picture of the man. In phase (on his
 * hip: even or on top) he turns and finds the ball; trailing, he stays on the man and plays the hands at the catch.
 * His judgment of phase errs by his manCoverage, and his discipline sets how often he looks back anyway when he judges
 * himself trailing: an out-of-phase look happens at the rate his ratings give, and costs what his body pays. */
export const BALL_EST_MAN_LOOK = (BALL_EST_BITS & 256) !== 0;
/** Bit 256: "on his hip" (yd): no more than PHASE_BEHIND behind him along his line and within PHASE_SIDE of it. Choices
 * (coached as a concept, not a distance), to be read against the NFL phase split (nfl_man_phase.py) before moving. */
export const PHASE_BEHIND = 1.0, PHASE_SIDE = 1.5;
/** Gaze search (s): with no sample yet, his look moves from the passer to where his prior puts the ball now over this
 * long (choice: about two fixations at the visuomotor loop's pace; a receiver 'looks it in from the hand'). */
export const GAZE_SEARCH = 0.4;
/** Bit 256: his error judging how far behind he is (yd, one draw a flight): 0.2 at the best man coverage, 0.8 at the
 * worst (choice). */
export const phaseJudgeSd = (a: Agent): number => 0.2 + 0.6 * (1 - clamp(a.r('manCoverage'), 0, 1));
/** Bit 256: the chance he looks back anyway when he judges himself trailing (one draw a flight): 0.5 at no discipline,
 * none at full (choice). */
export const lookAnyway = (a: Agent): number => 0.5 * (1 - clamp(a.r('discipline'), 0, 1));
/** The joints a look uses, for a target `d` rad off his running `heading`: head and neck (neckOf), then, with `trunk`
 * (TRUNK_TWIST), the shoulders off the hips for what the neck cannot reach (to TRUNK_RANGE; the target is absolute,
 * the trunk clamps it), then the hips only for what is left. Without `trunk`: head and neck, then the hips. */
export function lookJoints(a: Agent, cmd: MoveCommand, heading: number, d: number, trunk: boolean): MoveCommand {
  const over = Math.abs(d) - neckOf(a);
  if (over <= 0) return cmd;
  if (!(trunk && TRUNK_TWIST)) return { ...cmd, facing: heading + Math.sign(d) * over };
  const hips = Math.max(0, over - TRUNK_RANGE);
  const look = heading + Math.sign(d) * over;
  return hips > 0 ? { ...cmd, look, facing: heading + Math.sign(d) * hips } : { ...cmd, look };
}
/** Bit 1024 (the feet servo, 2026-11-15, attempt 1): a player tracking the ball runs on what he sees of it (ball-servo.ts:
 * optical acceleration cancellation along his line, constant bearing across it), not to a fitted landing point. */
export const BALL_EST_SERVO = (BALL_EST_BITS & 1024) !== 0 && (BALL_EST_BITS & 2048) === 0;
/** Bit 2048 (the glance rule, 2026-11-15; the simple honest version, the user's direction via Integration): a player who
 * has had the ball in his eyes for a short dwell knows its trajectory with an error, in place of the slow fit for "where
 * it comes down". It needs the look (his own head, the sight gate) and a dwell; it is wrong by an amount set by what he
 * misjudges: depth along his line of sight more than across it, in proportion to his range, shrinking the longer he has
 * held it and growing again once he looks away. One correlated error per look (no fresh noise each tick). His skill
 * scales the error and the dwell, never the catch. With no look, nothing. Carries the receiver bits 2/4/16/64; the
 * servo (1024) is off under it. Card: 2049. The fit and the servo stay on the branch as the deeper version. */
export const BALL_EST_GLANCE = (BALL_EST_BITS & 2048) !== 0;
/** Glance constants (all choices, stated; read at two or three values, never fitted to completion):
 * dwell before he knows it: the intended target, who expects it on his route's timing, 0.10 s; anyone else 0.15 s
 * (about one and a half fixation-to-pursuit latencies); both x (1.5 - skill).
 * error sd at a look's start: along his line of sight (depth, the hard axis) GLANCE_DEPTH of his range (percent, flag
 * BALL_GLANCE_DEPTH, 10; read at 5 / 20), across it 2% (about a degree of direction plus its drift); x (1.5 - skill);
 * shrinking with the time he has held it as sqrt(0.3 / (0.3 + held)); growing with the time since he last had it as
 * (1 + age / 0.5). */
export const GLANCE_DWELL_TARGET = 0.10, GLANCE_DWELL_OTHER = 0.15;
export const GLANCE_DEPTH = Number(process.env.BALL_GLANCE_DEPTH ?? 10) / 100, GLANCE_ACROSS = 0.02;
export const GLANCE_HOLD_REF = 0.3, GLANCE_AGE_TAU = 0.5;
/** The glance error's sd (yd) along and across his line of sight, for his range, skill, time held and time since. */
export function glanceSd(range: number, skillV: number, held: number, age: number): { depth: number; across: number } {
  const k = (1.5 - clamp(skillV, 0, 1)) * Math.sqrt(GLANCE_HOLD_REF / (GLANCE_HOLD_REF + Math.max(0, held))) * (1 + Math.max(0, age) / GLANCE_AGE_TAU);
  return { depth: GLANCE_DEPTH * range * k, across: GLANCE_ACROSS * range * k };
}
/** The estimator replaces the true flight for the receivers (off under bit 128). */
/** Bit 4096 (receivers only, 2026-11-15): the estimator for the offense alone; defenders keep today's read of the
 * flight. The mirror of bit 128, so the receiver's side can be carded without changing the defense's. */
export const BALL_EST_RCV_ONLY = (BALL_EST_BITS & 4096) !== 0 && !BALL_EST_DEF_ONLY;
export const BALL_EST_RCV = BALL_EST && !BALL_EST_DEF_ONLY;
/** Is the estimator on for this player (his own estimate in place of the true flight)? */
export const estimatesFor = (a: { team: string }): boolean => BALL_EST && (BALL_EST_DEF_ONLY ? a.team === 'D' : BALL_EST_RCV_ONLY ? a.team === 'O' : true);
/** Design 6: landmark depth past the line (yd; measured, the NFL deep receiver's turn depth, GO/POST median 12.3/12.2). */
export const DEEP_LOOK_DEPTH = 12;
/** Design 6: how long he holds the look without a throw (s; choice, a coached count). */
export const DEEP_LOOK_HOLD = 1.5;
/** Design 4: the pre-release look starts this long after his route's break per unit of routeRunning (choice). */
export const PRE_LOOK_LATE = 0.15;
/** Design 4 attempt 2: his eyes come round this long before his route's break (choice). */
export const PRE_LOOK_EARLY = 0.1;

/** Attempt 2: continuous pursuit (a sample every perception step while in eye range), the error a first-order
 * process with this time constant (choice); each sample is weighted as dt / ERR_TAU of an independent one. */
const ERR_TAU = 0.25;
/** Latency of continuous visual pursuit (Brenner and Smeets 1997/98: hand corrections about 110 ms behind the
 * target's perceived position; measured outside football). Bug fix: attempts 1-3 used his decision reaction time. */
const PURSUIT_DELAY = 0.11;
/** Compute only: he refits at most this often (the samples between are all used). */
const REFIT_EVERY = 0.1;
const HEAD_RATE = 6;
const NECK = Math.PI / 2;
const EYE = (30 * Math.PI) / 180;
const BEARING_BEST = (0.5 * Math.PI) / 180, BEARING_WORST = (1.0 * Math.PI) / 180;
const RANGE_BEST = 0.05, RANGE_WORST = 0.1;
/** Design 5 (a): time-to-contact precision, sigma_tau / tau (choice; TTC discrimination thresholds run about 5-15%). */
// Percent (an integer default, as the provenance reader requires): sigma_tau / tau = BALL_EST_TAU_SD / 100.
const TAU_SD = Number(process.env.BALL_EST_TAU_SD ?? 7) / 100;
/** Attempt 3 (spec table): the receiver's route prior, and the first estimate from the QB's release. */
const PRIOR_ALONG = 0.12, PRIOR_ACROSS = 1.0, PRIOR_HEIGHT = 1.0, PRIOR_BROKEN = 3, PRIOR_ORIGIN = 1.0, PRIOR_TIME = 0.3;
const RELEASE_SD = 0.5, SHOULDER_SD = (5 * Math.PI) / 180, SHOULDER_ALONG = 15, SHOULDER_UP = 15;
/** The ball's time to a point d yd from the passer: his QB's own natural flight for his arm (the QB lane's measured fit,
 * one function shared with the QB's lead). */
const expectedFlight = (sim: PlaySim, d: number): number => naturalFlightFor(qbArmSpeed(sim.qb.player.ratings.throwPower), d);
/** Each receiver's own installed route (his assignment, set at the call): his prior's source. */
export const ownRoutes = new WeakMap<object, InstalledReceiverRoute>();
/** When the receiver may turn his body to the ball: within this long of his estimated arrival (0.4-0.8 s by tracking). */
export const bodyTurnLead = (a: Agent): number => 0.4 + 0.4 * (1 - skill(a));

/** How far off his body facing his head can point: beyond it, watching the ball costs a turned body. */
export const LOOK_NECK = NECK;
/** Design 6 attempt 2 (bit 16): his neck's useful range narrows with his running speed; at a sprint a look back takes
 * his shoulders (choice, anatomy beside it in the spec; BALL_EST_NECK_SPRINT in degrees, sensitivity read at 60). */
const NECK_SPRINT = (Number(process.env.BALL_EST_NECK_SPRINT ?? 45) * Math.PI) / 180;
export function neckOf(a: Agent): number {
  // HEAD on: one head and one neck range per player (head.ts), whoever asks for the look.
  if (SHARED_HEAD) return neckRange(a);
  if (!BALL_EST_DEEP_LOOK) return NECK;
  const share = Math.min(1, Math.hypot(a.vel.x, a.vel.y) / Math.max(1e-6, a.profile.vmax));
  return NECK - (NECK - NECK_SPRINT) * share;
}

type Sample = { t: number; p: Vec3; along: Vec3; sr: number; sa: number; sv?: number;
  /** Where his eyes were when he took it (sim time `at`): the servo reads the ball's angles from here. */
  eye?: Vec3; at?: number;
  /** Design 5 (a) looming: his time-to-contact reading as an observation of the ball's velocity along his line of
   * sight (u, negative while it closes), and its sigma. */
  vlos?: number; svlos?: number;
  /** Bit 1024: his closing speed on the ball read from its looming (his range / its optical time to contact, relative
   * to his own eyes; TAU_SD on the time to contact), for the feet servo's lateral law. */
  closing?: number };
export type PathSample = { t: number; x: number; y: number; z: number };

interface Track {
  flight: unknown;
  head: number;
  headT: number;
  attendT: number;
  lastSampleT: number;
  /** His current error state (range, two bearings), standard-normal units, carried between samples. */
  err: [number, number, number] | null;
  samples: Sample[];
  /** When he began looking for this flight without a sample of it (his gaze search from the passer's end). */
  searchAt?: number;
  /** When he saw the passer's arm come through (sample time, his own picture): his belief of the release. */
  armSeenAt?: number;
  /** Bit 2048: the current look (seen-time it began, last seen-time in his eyes, its error draw), and time held. */
  lookStart?: number; lookLast?: number; lookZ?: [number, number]; held?: number; looks?: number; gPath?: PathSample[]; gPathT?: number;
  /** His eye's place and his head over the last few ticks: a sample is what his eye took in when the ball was there. */
  eyeHist?: Array<{ t: number; x: number; y: number; head: number }>;
  /** Attempt 3: observations he did not sample (his route prior, the release and the shoulder line). */
  pseudo: Sample[];
  fit: { t0: number; p: Vec3; v: Vec3 } | null;
  fitT: number;
  seeded?: boolean;
  /** Design 4: when he last looked for the QB before the throw. */
  preLookT?: number;
  priorT?: number;
  path: PathSample[] | null;
  pathT: number;
  /** Aim-point jumps over 1 yd after his third sample (continuity budget). */
  jumps: number;
  /** Bit 32: he attended to this flight on purpose (tracking it, playing it, or looking for it before the throw). */
  deliberate?: boolean;
  /** Bit 32: when the ball caught his eye without his looking for it (his hands are ready a reaction time later). */
  passiveAt?: number;
}

const skill = (a: Agent): number => clamp(a.r(a.team === 'O' ? 'ballTracking' : 'ballSkills'), 0, 1);

export class BallEstimates {
  private readonly tracks = new Map<Agent, Track>();
  private readonly history: { t: number; p: Vec3 }[] = [];
  private flight: unknown = null;
  private lastSenseAt = -Infinity;

  /** Once per tick: record the ball, turn the heads of the players attending to it, take their samples. */
  sense(sim: PlaySim): void {
    if (!BALL_EST || sim.t <= this.lastSenseAt) return;
    this.lastSenseAt = sim.t;
    // His own release belief: the passer's arm coming through, as he sees it while he is looking at him.
    for (const [a, tr] of this.tracks) {
      if (tr.armSeenAt !== undefined || a.isDown(sim.t)) continue;
      const head = SHARED_HEAD ? (a.head ?? a.facing) : tr.head, q = sim.see(a, sim.qb);
      if (q.arm !== 'deliver' || Math.abs(angDiff(Math.atan2(q.pos.y - a.pos.y, q.pos.x - a.pos.x), head)) > EYE) continue;
      tr.armSeenAt = sim.t - (q.age ?? 0);
    }
    const ball = sim.ball;
    // Design 4: before the throw, a receiver looking for the QB turns his head to him (the head he will start the
    // flight with). No ball, no samples.
    if (ball.kind !== 'air') {
      for (const [a, tr] of this.tracks) {
        if (tr.preLookT === undefined || sim.t - tr.preLookT > sim.dt + 1e-9 || a.isDown(sim.t)) continue;
        // HEAD on: the look is his technique's want on the shared head (head.ts turns it); BALL_EST reads it.
        if (SHARED_HEAD) { headWant(sim, a, sim.qb, 'qb'); tr.head = a.head ?? a.facing; tr.headT = sim.t; continue; }
        const qb = sim.see(a, sim.qb).pos, toward = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x);
        const base = shouldersOf(a.body); // the neck sits on the shoulders (the trunk), not the hips
        const lim = base + clamp(sideOf(angDiff(toward, base), angDiff(tr.head, base)), -neckOf(a), neckOf(a));
        const step = HEAD_RATE * Math.max(0, sim.t - tr.headT);
        tr.head = base + clamp(angDiff(tr.head + clamp(angDiff(lim, tr.head), -step, step), base), -neckOf(a), neckOf(a));
        tr.headT = sim.t;
      }
      return;
    }
    // A ball being secured is in someone's hands (catching.ts carries it with him): no longer a flight to fit.
    if (ball.kind !== 'air' || ball.securing) return;
    if (ball.flight !== this.flight) { this.flight = ball.flight; this.history.length = 0; }
    this.history.push({ t: sim.t, p: { ...ball.flight.pos } });
    // Bit 32: passive sight. A teammate who is not looking for the ball still sees it when it is in his eyes' range of
    // where his head points (his facing, if nothing has turned it); seeing it catches his attention, as it would.
    if (BALL_EST_INCIDENTAL) {
      const b = ball.flight.pos;
      for (const a of sim.agents) {
        if (a === ball.thrower || a.isDown(sim.t) || !estimatesFor(a)) continue;
        let tr0 = this.tracks.get(a);
        if (tr0 && tr0.flight !== this.flight && tr0.preLookT === undefined) { this.reset(tr0); tr0.flight = this.flight; }
        if (tr0 && sim.t - tr0.attendT <= sim.dt + 1e-9 && tr0.flight === this.flight) continue;
        const head = SHARED_HEAD ? (a.head ?? a.facing) : tr0 && tr0.flight === this.flight ? tr0.head : a.facing;
        if (Math.abs(angDiff(Math.atan2(b.y - a.pos.y, b.x - a.pos.x), head)) > EYE) continue;
        if (!tr0) { tr0 = { flight: this.flight, head: a.facing, headT: sim.t, attendT: sim.t, lastSampleT: -Infinity, err: null, samples: [], pseudo: [], fit: null, fitT: -1, path: null, pathT: -1, jumps: 0 }; this.tracks.set(a, tr0); }
        else tr0.attendT = sim.t;
        if (!tr0.deliberate && tr0.passiveAt === undefined) tr0.passiveAt = sim.t;
      }
    }
    for (const [a, tr] of this.tracks) {
      if (tr.flight !== this.flight) { this.reset(tr); tr.flight = this.flight; }
      if (sim.t - tr.attendT > sim.dt + 1e-9 || a.isDown(sim.t)) continue;
      // The head turns toward where he believes the ball is (his estimate, else where it comes from).
      const want = this.believedAt(a, sim, tr);
      if (SHARED_HEAD) {
        // HEAD on: he asks to look where he believes the ball is; the shared head turns at its own rate and range.
        headWant(sim, a, { x: want.x, y: want.y }, 'ball');
        tr.head = a.head ?? a.facing; tr.headT = sim.t;
      } else {
        const toward = Math.atan2(want.y - a.pos.y, want.x - a.pos.x);
        const base = shouldersOf(a.body); // the neck sits on the shoulders (the trunk), not the hips
        const lim = base + clamp(sideOf(angDiff(toward, base), angDiff(tr.head, base)), -neckOf(a), neckOf(a));
        const step = HEAD_RATE * Math.max(0, sim.t - tr.headT);
        tr.head = base + clamp(angDiff(tr.head + clamp(angDiff(lim, tr.head), -step, step), base), -neckOf(a), neckOf(a));
        tr.headT = sim.t;
      }
      // Pursuit runs on the visuomotor loop (about 110 ms), not on a decision's reaction time; his attention scales it.
      const delay = a.mind.observationDelay(PURSUIT_DELAY);
      (tr.eyeHist ??= []).push({ t: sim.t, x: a.pos.x, y: a.pos.y, head: tr.head });
      if (tr.eyeHist.length > 16) tr.eyeHist.shift();
      const seen = this.ballAt(sim.t - delay);
      if (!seen) continue;
      // What his eye took in at the moment the ball was there (light is instant; the processing is the delay): the
      // ball's bearing from where his eye was then, against where his head pointed then. Judged against his eye and
      // head now, a close ball (15 yd/s at 2-3 yd moves 30+ deg in the delay) fell out of his eye range although he
      // was looking right at it.
      const then = [...tr.eyeHist].reverse().find((q) => q.t <= seen.t + 1e-9) ?? tr.eyeHist[0];
      const bearing = Math.atan2(seen.p.y - then.y, seen.p.x - then.x);
      if (Math.abs(angDiff(bearing, then.head)) > EYE) continue;
      // The error carries over from his last sample, decaying with ERR_TAU; a fresh look starts a fresh error.
      const gap = sim.t - tr.lastSampleT, rho = Number.isFinite(gap) ? Math.exp(-gap / ERR_TAU) : 0;
      tr.lastSampleT = sim.t;
      const s = skill(a), sa = BEARING_WORST + (BEARING_BEST - BEARING_WORST) * s, sr = RANGE_WORST + (RANGE_BEST - RANGE_WORST) * s;
      const eye: Vec3 = { x: then.x, y: then.y, z: a.profile.heightYd * 0.93 };
      const d: Vec3 = { x: seen.p.x - eye.x, y: seen.p.y - eye.y, z: seen.p.z - eye.z };
      const r = Math.max(0.5, Math.hypot(d.x, d.y, d.z)), u: Vec3 = { x: d.x / r, y: d.y / r, z: d.z / r };
      const dice = sim.dice(`ball-est:${tr.samples.length}`, a);
      const k = Math.sqrt(1 - rho * rho), prev = tr.err ?? [0, 0, 0];
      tr.err = [rho * prev[0] + k * dice.normal(0, 1), rho * prev[1] + k * dice.normal(0, 1), rho * prev[2] + k * dice.normal(0, 1)];
      // Range error along the line of sight; bearing error across it (two perpendicular directions).
      const e1 = perp(u), e2 = cross(u, e1);
      const er = tr.err[0] * sr * r, ea = tr.err[1] * sa * r, eb = tr.err[2] * sa * r;
      const p: Vec3 = { x: seen.p.x + u.x * er + e1.x * ea + e2.x * eb, y: seen.p.y + u.y * er + e1.y * ea + e2.y * eb, z: seen.p.z + u.z * er + e1.z * ea + e2.z * eb };
      const inflate = Math.sqrt(Math.max(1, ERR_TAU / sim.dt));
      const smp: Sample = { t: seen.t, p, along: u, sr: sr * r * inflate, sa: sa * r * inflate, eye, at: sim.t };
      // Design 5 (a): a ball closing on his eyes looms; its time to contact r / closing speed reads the velocity along
      // his line of sight. Its weight falls continuously as the ball's motion turns across his line (closing share^2).
      if (BALL_EST_LOOMING) {
        const prev = this.ballAt(seen.t - sim.dt + 1e-9 - 1e-6);
        if (prev && prev.t < seen.t) {
          const k2 = 1 / (seen.t - prev.t), bv = { x: (seen.p.x - prev.p.x) * k2, y: (seen.p.y - prev.p.y) * k2, z: (seen.p.z - prev.p.z) * k2 };
          const vl = bv.x * u.x + bv.y * u.y + bv.z * u.z, spd = Math.hypot(bv.x, bv.y, bv.z), share = spd > 1e-6 ? -vl / spd : 0;
          if (share > 0.05) {
            const tauObs = (r / -vl) * (1 + dice.normal(0, TAU_SD)), vObs = -r / Math.max(0.05, tauObs);
            const sv = (Math.max(0.2, Math.abs(vObs) * TAU_SD) / (share * share)) * inflate;
            if (Number.isFinite(vObs) && Number.isFinite(sv) && tauObs > 0) { smp.vlos = vObs; smp.svlos = sv; }
          }
        }
      }
      if (BALL_EST_SERVO) {
        const prev = this.ballAt(seen.t - sim.dt + 1e-9 - 1e-6);
        if (prev && prev.t < seen.t) {
          const k2 = 1 / (seen.t - prev.t);
          const rel = { x: (seen.p.x - prev.p.x) * k2 - a.vel.x, y: (seen.p.y - prev.p.y) * k2 - a.vel.y, z: (seen.p.z - prev.p.z) * k2 };
          const cl = -(rel.x * u.x + rel.y * u.y + rel.z * u.z);
          if (cl > 0.5) {
            const tau = (r / cl) * (1 + sim.dice(`ball-servo:${tr.samples.length}`, a).normal(0, TAU_SD));
            const rHis = Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z);
            if (tau > 0.05) smp.closing = rHis / tau;
          }
        }
      }
      if (BALL_EST_GLANCE) {
        // A gap of more than a tick ends the look; the next one starts with a fresh error draw.
        if (tr.lookLast === undefined || seen.t - tr.lookLast > sim.dt * 1.5 + 1e-9) {
          tr.looks = (tr.looks ?? 0) + 1;
          const dz = sim.dice(`ball-glance:${tr.looks}`, a);
          tr.lookStart = seen.t; tr.lookZ = [dz.normal(0, 1), dz.normal(0, 1)];
        } else tr.held = (tr.held ?? 0) + (seen.t - tr.lookLast);
        tr.lookLast = seen.t;
      }
      tr.samples.push(smp);
      if (tr.samples.length + tr.pseudo.length >= 2 && (!tr.fit || sim.t - tr.fitT >= REFIT_EVERY - 1e-9)) {
        tr.fitT = sim.t;
        const before = tr.path ? landing(tr.path) : null;
        const nf = fitFlight([...tr.pseudo, ...tr.samples], (ball.flight as BallFlight).drag);
        // A degenerate fit (a singular or non-finite solve) keeps the last good one.
        if (finiteFit(nf)) tr.fit = nf;
        tr.path = null;
        const after = tr.fit ? landing(this.pathOf(sim, tr)) : null;
        if (before && after && tr.samples.length > 3 && Math.hypot(after.x - before.x, after.y - before.y) > 1) tr.jumps++;
      }
    }
  }

  /** His estimated remaining flight (the `ballPath` shape), or an empty path while he has fewer than two samples.
   * Asking marks him as attending to the ball this tick. */
  estimate(a: Agent, sim: PlaySim): PathSample[] {
    let tr = this.tracks.get(a);
    if (!tr) {
      tr = { flight: this.flight, head: a.facing, headT: sim.t, attendT: sim.t, lastSampleT: -Infinity, err: null, samples: [], pseudo: [], fit: null, fitT: -1, path: null, pathT: -1, jumps: 0 };
      this.tracks.set(a, tr);
    }
    if (tr.flight !== this.flight && sim.ball.kind === 'air' && sim.ball.flight === this.flight) { this.reset(tr); tr.flight = this.flight; }
    tr.attendT = sim.t; tr.deliberate = true;
    if (!tr.seeded && sim.ball.kind === 'air' && sim.ball.flight === this.flight) {
      tr.seeded = true;
      this.seed(a, sim, tr);
      if (tr.samples.length + tr.pseudo.length >= 2) { const nf = fitFlight([...tr.pseudo, ...tr.samples], sim.ball.flight.drag); if (finiteFit(nf)) { tr.fit = nf; tr.fitT = sim.t; tr.path = null; } }
    }
    return this.glancePath(a, sim, tr) ?? (tr.fit ? this.pathOf(sim, tr) : []);
  }

  /** Design 4: before the throw he is looking for the QB this tick (his head turns to him in sense()). */
  lookAtQB(a: Agent, sim: PlaySim): void {
    let tr = this.tracks.get(a);
    if (!tr) {
      tr = { flight: null, head: a.facing, headT: sim.t, attendT: -Infinity, lastSampleT: -Infinity, err: null, samples: [], pseudo: [], fit: null, fitT: -1, path: null, pathT: -1, jumps: 0 };
      this.tracks.set(a, tr);
    }
    tr.preLookT = sim.t;
    // Pre-release attention carries into the flight's first tick.
    tr.attendT = sim.t; tr.deliberate = true;
  }

  /** Design 4: did he see the passer's arm come through (his own release belief)? */
  lookedAtRelease(a: Agent, sim: PlaySim): boolean {
    const tr = this.tracks.get(a);
    return tr?.armSeenAt !== undefined;
  }

  /** Read-only: his last fitted path (the `ballPath` shape) as of now, without attending, turning his head or
   * sampling; empty if he never had an estimate of this flight. For beliefs that must not move his gaze. */
  peek(a: Agent, sim: PlaySim): PathSample[] {
    const tr = this.tracks.get(a);
    if (!tr || tr.flight !== this.flight) return [];
    return this.glancePath(a, sim, tr) ?? (tr.fit ? this.pathOf(sim, tr) : []);
  }

  /** Where his look aims now (his gaze target): the passer before he has the ball, then the ball's seen motion. */
  gazeAt(a: Agent, sim: PlaySim): { x: number; y: number } {
    const tr = this.tracks.get(a);
    return tr ? this.believedAt(a, sim, tr) : sim.see(a, sim.qb).pos;
  }

  /** His own samples of this flight as angles from his eyes (sim time of each look, azimuth, elevation): what the feet
   * servo reads, with his ground range and his looming closing speed. Angles carry only his bearing error. */
  anglesOf(a: Agent): Array<{ t: number; az: number; el: number; rg: number; closing?: number }> {
    const tr = this.tracks.get(a);
    if (!tr || tr.flight !== this.flight) return [];
    const out: Array<{ t: number; az: number; el: number; rg: number; closing?: number }> = [];
    for (const q of tr.samples) {
      if (!q.eye || q.at === undefined) continue;
      const dx = q.p.x - q.eye.x, dy = q.p.y - q.eye.y, dz = q.p.z - q.eye.z, rg = Math.hypot(dx, dy);
      out.push({ t: q.at, az: Math.atan2(dy, dx), el: Math.atan2(dz, Math.max(0.3, rg)), rg, closing: q.closing });
    }
    return out;
  }

  /** Read-only: when (sim time) he first sampled this flight himself, or undefined. One perception: under BALL_EST his
   * sight of the ball is his own sample (release-belief.ts reads it as his ball cue). */
  firstSeenAt(a: Agent): number | undefined {
    const tr = this.tracks.get(a);
    return tr && tr.flight === this.flight && tr.samples.length ? tr.samples[0].t : undefined;
  }

  /** Read-only: his newest sample of this flight, `{ t, pos }` (t the ball's time, the position as he saw it), or null. */
  lastSeen(a: Agent): { t: number; pos: Vec3 } | null {
    const tr = this.tracks.get(a), s = tr && tr.flight === this.flight ? tr.samples.at(-1) : undefined;
    return s ? { t: s.t, pos: { ...s.p } } : null;
  }

  /** Bit 32: has he seen this flight himself recently enough to play it (his newest sample within catch-readiness's
   * age bound), with his hands ready (a ball that caught his eye unlooked-for needs his reaction time first)? */
  seenReady(a: Agent, sim: PlaySim): boolean {
    const tr = this.tracks.get(a), s = this.lastSeen(a);
    if (!tr || !s || sim.t - s.t > INCIDENTAL_FLIGHT_MAX_AGE + 1e-9) return false;
    return tr.deliberate || tr.passiveAt === undefined || sim.t - tr.passiveAt >= a.profile.reactionTime - 1e-9;
  }

  /** Where his head points, if he is attending to the ball. */
  headOf(a: Agent): number | undefined { return SHARED_HEAD ? (this.tracks.has(a) ? (a.head ?? undefined) : undefined) : this.tracks.get(a)?.head; }
  samplesOf(a: Agent): number { return this.tracks.get(a)?.samples.length ?? 0; }
  jumpsOf(a: Agent): number { return this.tracks.get(a)?.jumps ?? 0; }

  /** Attempt 3. Whoever had the QB in view at the release: the ball at his seen hand, and its direction from his
   * seen shoulder line. A receiver also seeds his own route's expected catch point (the QB's model of him, run on his
   * own installed route from his exact state). A defender has nothing more. */
  private seed(a: Agent, sim: PlaySim, tr: Track): void {
    // When the ball left, as he knows it: the throw he saw, else his first sample, else now (no true release time).
    const rel = tr.armSeenAt ?? tr.samples[0]?.t ?? sim.t, qb = sim.see(a, sim.qb);
    const toQb = Math.atan2(qb.pos.y - a.pos.y, qb.pos.x - a.pos.x);
    const qbInView = Math.abs(angDiff(toQb, a.facing)) <= neckOf(a) + EYE;
    const hand: Vec3 = { x: qb.pos.x, y: qb.pos.y, z: 2.0 };
    if (qbInView) {
      tr.pseudo.push({ t: rel, p: hand, along: { x: 1, y: 0, z: 0 }, sr: RELEASE_SD, sa: RELEASE_SD, sv: RELEASE_SD });
      const az = qb.facing + sim.dice('ball-est:shoulder', a).normal(0, SHOULDER_SD * (1.5 - skill(a)));
      const u: Vec3 = { x: Math.cos(az), y: Math.sin(az), z: 0 };
      // One second out along his shoulder line: across it tight, along it and in height almost free.
      tr.pseudo.push({ t: rel + 1, p: { x: hand.x + u.x * 15, y: hand.y + u.y * 15, z: hand.z }, along: u, sr: SHOULDER_ALONG, sa: 15 * SHOULDER_SD, sv: SHOULDER_UP });
    }
    const own = a.team === 'O' ? ownRoutes.get(a) : undefined;
    if (!own) return;
    // His prior assumes a ball from his QB: the QB's spot as he last had him, whether or not he saw the release.
    if (!qbInView) tr.pseudo.push({ t: rel, p: hand, along: { x: 1, y: 0, z: 0 }, sr: PRIOR_ORIGIN, sa: PRIOR_ORIGIN, sv: PRIOR_ORIGIN });
    const fc = new ReceiverForecast(a, own, sim.dt);
    fc.acquire({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing, sampledAt: sim.t, acquiredAt: sim.t });
    // In a scramble drill he is no longer running his installed route (his own state, not hidden information).
    const broken = fc.estimate?.motion !== 'installed-route' || sim.scrambleDrill;
    for (let T = 0.3; T <= 4.5; T += 0.05) {
      const at = rel + T, P = fc.predict(sim.t, Math.max(0, at - sim.t));
      if (!P) return;
      const d = Math.hypot(P.x - hand.x, P.y - hand.y);
      if (expectedFlight(sim, d) > T) continue;
      // The QB's lead time is uncertain (PRIOR_TIME): "ball at P at T" errs along the ball's own path at the ball's
      // speed, and where he is at that time errs by his own speed. Axes: the ball's horizontal direction, across it.
      const k = broken ? PRIOR_BROKEN : 1, h = Math.max(1e-3, d), u: Vec3 = { x: (P.x - hand.x) / h, y: (P.y - hand.y) / h, z: 0 };
      const sAlong = Math.hypot(PRIOR_ALONG * d, (d / T) * PRIOR_TIME), sAcross = Math.hypot(PRIOR_ACROSS, Math.hypot(a.vel.x, a.vel.y) * PRIOR_TIME);
      tr.pseudo.push({ t: at, p: { x: P.x, y: P.y, z: 1.5 }, along: u, sr: sAlong * k, sa: sAcross * k, sv: PRIOR_HEIGHT * k });
      tr.priorT = at;
      return;
    }
  }

  /** His prior's expected arrival time, if he has one. */
  priorAt(a: Agent): number | undefined { return this.tracks.get(a)?.priorT; }

  private reset(tr: Track): void {
    tr.searchAt = undefined; // armSeenAt is his belief of this play's release: a tip is a new flight of the same throw.
    tr.lookStart = undefined; tr.lookLast = undefined; tr.lookZ = undefined; tr.held = undefined; tr.looks = undefined; tr.gPath = undefined; tr.eyeHist = undefined;
    tr.samples = []; tr.pseudo = []; tr.seeded = false; tr.priorT = undefined; tr.fit = null; tr.path = null; tr.lastSampleT = -Infinity; tr.err = null; tr.jumps = 0;
    tr.deliberate = false; tr.passiveAt = undefined;
  }

  /** Bit 2048: has he held this flight in his eyes for his dwell (this look, or an earlier one of the same flight)? */
  glanceKnows(a: Agent, sim: PlaySim): boolean {
    const tr = this.tracks.get(a);
    if (!BALL_EST_GLANCE || !tr || tr.flight !== this.flight || tr.lookStart === undefined || tr.lookLast === undefined) return false;
    const dwell = (sim.ball.kind === 'air' && sim.ball.target === a ? GLANCE_DWELL_TARGET : GLANCE_DWELL_OTHER) * (1.5 - skill(a));
    return (tr.held ?? 0) + 1e-9 >= dwell;
  }

  /** Bit 2048: his believed flight once he knows it: the flight from now, displaced by his look's error along and
   * across his line of sight to the ball as he last had it. Null until his dwell (no knowledge without looking). */
  private glancePath(a: Agent, sim: PlaySim, tr: Track): PathSample[] | null {
    if (!this.glanceKnows(a, sim) || sim.ball.kind !== 'air' || sim.ball.flight !== this.flight) return null;
    if (tr.gPath && tr.gPathT === sim.t) return tr.gPath;
    const b: BallFlight = { pos: { ...sim.ball.flight.pos }, vel: { ...sim.ball.flight.vel }, drag: sim.ball.flight.drag };
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, g = Math.max(0.5, Math.hypot(dx, dy)), range = Math.hypot(dx, dy, b.pos.z - a.profile.heightYd * 0.93);
    const sd = glanceSd(range, skill(a), tr.held ?? 0, sim.t - (tr.lookLast ?? sim.t));
    const z = tr.lookZ ?? [0, 0], ux = dx / g, uy = dy / g;
    const ox = z[0] * sd.depth * ux - z[1] * sd.across * uy, oy = z[0] * sd.depth * uy + z[1] * sd.across * ux;
    const out: PathSample[] = [];
    let t = sim.t;
    for (let k = 0; k < 120 && b.pos.z > 0; k++) {
      out.push({ t: Math.round(t * 100) / 100, x: b.pos.x + ox, y: b.pos.y + oy, z: b.pos.z });
      stepFlight(b, 0.05); t += 0.05;
    }
    out.push({ t: Math.round(t * 100) / 100, x: b.pos.x + ox, y: b.pos.y + oy, z: Math.max(0, b.pos.z) });
    tr.gPath = out.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)) ? out : []; tr.gPathT = sim.t;
    return tr.gPath;
  }

  private pathOf(sim: PlaySim, tr: Track): PathSample[] {
    if (tr.path && tr.pathT === sim.t) return tr.path;
    const f = tr.fit!, b: BallFlight = { pos: { ...f.p }, vel: { ...f.v }, drag: (sim.ball.kind === 'air' ? sim.ball.flight.drag : 0.003) };
    const out: PathSample[] = [];
    let t = f.t0;
    // Advance to now, then sample the rest of the flight at 0.05 s until it reaches the ground (or 6 s).
    if (sim.t > t) { stepFlight(b, sim.t - t); t = sim.t; }
    for (let k = 0; k < 120 && b.pos.z > 0; k++) {
      out.push({ t: Math.round(t * 100) / 100, x: b.pos.x, y: b.pos.y, z: b.pos.z });
      stepFlight(b, 0.05); t += 0.05;
    }
    out.push({ t: Math.round(t * 100) / 100, x: b.pos.x, y: b.pos.y, z: Math.max(0, b.pos.z) });
    // Never hand a consumer a non-finite path.
    tr.path = out.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z)) ? out : []; tr.pathT = sim.t;
    return out;
  }

  private believedAt(a: Agent, sim: PlaySim, tr: Track): { x: number; y: number } {
    // His gaze follows the ball, not where he thinks it will land. Once he has sampled it, the ball's seen motion. Before his first sample he looks where the ball comes from (the passer as he sees him), and if it is not
    // there he searches along his believed flight from the passer's end toward where his prior puts it now, over
    // GAZE_SEARCH seconds. A prior (route, release, shoulder line) aims his feet, never his eyes past the ball.
    const qb = sim.see(a, sim.qb).pos;
    // Pursuit: once he has the ball, his eyes follow its seen motion (the last two samples, extrapolated to now), not
    // the fit's prediction, which off two early samples can sit yards off the ball and lose it.
    const n = tr.samples.length;
    // Bit 2048: once he knows the flight, his eyes follow the ball where he believes it is now, not the last two
    // samples differenced. Differenced, each sample's 5-10% range error is several yd/s of velocity noise, harmless at
    // 15-20 yd but tens of degrees at 2-4 yd: his gaze swung 50-150 deg off the ball in the last 0.3 s and he lost it.
    if (BALL_EST_GLANCE && this.glanceKnows(a, sim)) { const g = this.glancePath(a, sim, tr); if (g && g.length) return { x: g[0].x, y: g[0].y }; }
    if (n >= 2) {
      const b = tr.samples[n - 1], c = tr.samples[n - 2], dt = b.t - c.t;
      if (dt > 1e-6) { const k = sim.t - b.t; return { x: b.p.x + (b.p.x - c.p.x) / dt * k, y: b.p.y + (b.p.y - c.p.y) / dt * k }; }
    }
    if (n === 1) { if (tr.fit) { const p = this.pathOf(sim, tr); if (p.length) return p[0]; } return { x: tr.samples[0].p.x, y: tr.samples[0].p.y }; }
    tr.searchAt ??= sim.t;
    const now = tr.fit ? this.pathOf(sim, tr)[0] : undefined;
    if (!now) return qb;
    const k = clamp((sim.t - tr.searchAt) / GAZE_SEARCH, 0, 1);
    return { x: qb.x + (now.x - qb.x) * k, y: qb.y + (now.y - qb.y) * k };
  }

  private ballAt(t: number): { t: number; p: Vec3 } | null {
    const h = this.history;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t + 1e-9) return h[i];
    return null;
  }
}

/** A target almost directly behind him is reached over the shoulder his head is already turned to; the head cannot
 * pass through the back of his neck, and the shortest-angle side flips arbitrarily near 180 deg. */
export function sideOf(rel: number, headRel: number): number {
  if (Math.abs(rel) <= BEHIND || Math.abs(headRel) < 0.2) return rel;
  const side = Math.sign(headRel);
  return Math.sign(rel) === side ? rel : side * (2 * Math.PI - Math.abs(rel));
}
const BEHIND = (150 * Math.PI) / 180;

/** A fit he can believe: finite, and no faster than a thrown football can be (50 yd/s; the hardest throws are about 30). */
const finiteFit = (f: { p: Vec3; v: Vec3 }): boolean => [f.p.x, f.p.y, f.p.z, f.v.x, f.v.y, f.v.z].every(Number.isFinite) && Math.hypot(f.v.x, f.v.y, f.v.z) <= 50;

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
function perp(u: Vec3): Vec3 {
  const h = Math.hypot(u.x, u.y);
  return h > 1e-6 ? { x: -u.y / h, y: u.x / h, z: 0 } : { x: 1, y: 0, z: 0 };
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function landing(path: PathSample[]): { x: number; y: number } | null {
  return path.length ? path[path.length - 1] : null;
}

/** Launch state (at the first sample's time) that best fits his samples: generalized least squares on the linear
 * drag-free model, with the drag's displacement from the current fit iterated in. Each sample's covariance is range
 * variance along his line of sight and bearing variance across it. */
export function fitFlight(input: Sample[], drag: number): { t0: number; p: Vec3; v: Vec3 } {
  const samples = [...input].sort((a, b) => a.t - b.t);
  const t0 = samples[0].t;
  let p: Vec3 = { ...samples[0].p }, v: Vec3 = { x: 0, y: 0, z: 0 };
  for (let iter = 0; iter < 3; iter++) {
    const A = Array.from({ length: 6 }, () => new Array(6).fill(0)), bvec = new Array(6).fill(0);
    // One flight from the current fit, read at each sample's time (samples are in time order).
    const b: BallFlight = { pos: { ...p }, vel: { ...v }, drag };
    let bt = 0;
    for (const s of samples) {
      const tau = s.t - t0;
      // The drag's displacement relative to the drag-free arc, from the current fit.
      let dd: Vec3 = { x: 0, y: 0, z: 0 };
      if (iter > 0 && tau > 0) {
        if (tau > bt) { stepFlight(b, tau - bt); bt = tau; }
        dd = { x: b.pos.x - (p.x + v.x * tau), y: b.pos.y - (p.y + v.y * tau), z: b.pos.z - (p.z + v.z * tau - 0.5 * G * tau * tau) };
      }
      const y: Vec3 = { x: s.p.x - dd.x, y: s.p.y - dd.y, z: s.p.z - dd.z + 0.5 * G * tau * tau };
      // Information matrix W = C^-1 = u u^T / sr^2 + (I - u u^T) / sa^2.
      // W = u u^T / sr^2 + e1 e1^T / sa^2 + e2 e2^T / sv^2 (e1 horizontal across, e2 the third axis).
      const u = s.along, e1 = perp(u), e2 = cross(u, e1), sv = s.sv ?? s.sa;
      const ax = [[u.x, u.y, u.z, 1 / (s.sr * s.sr)], [e1.x, e1.y, e1.z, 1 / (s.sa * s.sa)], [e2.x, e2.y, e2.z, 1 / (sv * sv)]];
      const W = [0, 1, 2].map((i) => [0, 1, 2].map((j) => ax.reduce((acc, e) => acc + e[i] * e[j] * e[3], 0)));
      // H = [I, tau I] (3 x 6); A += H^T W H; b += H^T W y.
      const yy = [y.x, y.y, y.z];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const w = W[i][j];
        A[i][j] += w; A[i][j + 3] += w * tau; A[i + 3][j] += w * tau; A[i + 3][j + 3] += w * tau * tau;
      }
      for (let i = 0; i < 3; i++) { let wy = 0; for (let j = 0; j < 3; j++) wy += W[i][j] * yy[j]; bvec[i] += wy; bvec[i + 3] += wy * tau; }
      // Looming row: u . v(t) = vlos, with v(t) = v0 - g t z (+ the drag's change from the current fit).
      if (s.vlos !== undefined && s.svlos) {
        const dv: Vec3 = iter > 0 && tau > 0 ? { x: b.vel.x - v.x, y: b.vel.y - v.y, z: b.vel.z - (v.z - G * tau) } : { x: 0, y: 0, z: 0 };
        const uu = [u.x, u.y, u.z], w = 1 / (s.svlos * s.svlos);
        const yv = s.vlos - (u.x * dv.x + u.y * dv.y + u.z * dv.z) + G * tau * u.z;
        for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i + 3][j + 3] += w * uu[i] * uu[j]; bvec[i + 3] += w * uu[i] * yv; }
      }
    }
    const th = solve(A, bvec);
    if (!th) break;
    p = { x: th[0], y: th[1], z: th[2] }; v = { x: th[3], y: th[4], z: th[5] };
  }
  return { t0, p, v };
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
