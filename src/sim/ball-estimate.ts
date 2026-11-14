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
import { G } from '../core/units.js';
import { clamp } from '../core/vec.js';
import type { Vec3 } from '../core/vec.js';
import { qbArmSpeed, stepFlight, type BallFlight } from '../physics/ball.js';
import { naturalFlightFor } from './behaviors/qb.js';
import type { Agent } from './agent.js';
import { ReceiverForecast, type InstalledReceiverRoute } from './receiver-forecast.js';
import type { PlaySim } from './playsim.js';

export const BALL_EST = process.env.BALL_EST === '1';

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

type Sample = { t: number; p: Vec3; along: Vec3; sr: number; sa: number; sv?: number };
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
  /** Attempt 3: observations he did not sample (his route prior, the release and the shoulder line). */
  pseudo: Sample[];
  fit: { t0: number; p: Vec3; v: Vec3 } | null;
  fitT: number;
  seeded?: boolean;
  priorT?: number;
  path: PathSample[] | null;
  pathT: number;
  /** Aim-point jumps over 1 yd after his third sample (continuity budget). */
  jumps: number;
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
    const ball = sim.ball;
    // A ball being secured is in someone's hands (catching.ts carries it with him): no longer a flight to fit.
    if (ball.kind !== 'air' || ball.securing) return;
    if (ball.flight !== this.flight) { this.flight = ball.flight; this.history.length = 0; }
    this.history.push({ t: sim.t, p: { ...ball.flight.pos } });
    for (const [a, tr] of this.tracks) {
      if (tr.flight !== this.flight) { this.reset(tr); tr.flight = this.flight; }
      if (sim.t - tr.attendT > sim.dt + 1e-9 || a.isDown(sim.t)) continue;
      // The head turns toward where he believes the ball is (his estimate, else where it comes from).
      const want = this.believedAt(a, sim, tr);
      const toward = Math.atan2(want.y - a.pos.y, want.x - a.pos.x);
      const lim = a.facing + clamp(angDiff(toward, a.facing), -NECK, NECK);
      const step = HEAD_RATE * Math.max(0, sim.t - tr.headT);
      tr.head = a.facing + clamp(angDiff(tr.head + clamp(angDiff(lim, tr.head), -step, step), a.facing), -NECK, NECK);
      tr.headT = sim.t;
      // Pursuit runs on the visuomotor loop (about 110 ms), not on a decision's reaction time; his attention scales it.
      const delay = a.mind.observationDelay(PURSUIT_DELAY);
      const seen = this.ballAt(sim.t - delay);
      if (!seen) continue;
      const bearing = Math.atan2(seen.p.y - a.pos.y, seen.p.x - a.pos.x);
      if (Math.abs(angDiff(bearing, tr.head)) > EYE) continue;
      // The error carries over from his last sample, decaying with ERR_TAU; a fresh look starts a fresh error.
      const gap = sim.t - tr.lastSampleT, rho = Number.isFinite(gap) ? Math.exp(-gap / ERR_TAU) : 0;
      tr.lastSampleT = sim.t;
      const s = skill(a), sa = BEARING_WORST + (BEARING_BEST - BEARING_WORST) * s, sr = RANGE_WORST + (RANGE_BEST - RANGE_WORST) * s;
      const eye: Vec3 = { x: a.pos.x, y: a.pos.y, z: a.profile.heightYd * 0.93 };
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
      tr.samples.push({ t: seen.t, p, along: u, sr: sr * r * inflate, sa: sa * r * inflate });
      if (tr.samples.length + tr.pseudo.length >= 2 && (!tr.fit || sim.t - tr.fitT >= REFIT_EVERY - 1e-9)) {
        tr.fitT = sim.t;
        const before = tr.path ? landing(tr.path) : null;
        tr.fit = fitFlight([...tr.pseudo, ...tr.samples], (ball.flight as BallFlight).drag);
        tr.path = null;
        const after = landing(this.pathOf(sim, tr));
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
    tr.attendT = sim.t;
    if (!tr.seeded && sim.ball.kind === 'air' && sim.ball.flight === this.flight) {
      tr.seeded = true;
      this.seed(a, sim, tr);
      if (tr.samples.length + tr.pseudo.length >= 2) { tr.fit = fitFlight([...tr.pseudo, ...tr.samples], sim.ball.flight.drag); tr.fitT = sim.t; tr.path = null; }
    }
    return tr.fit ? this.pathOf(sim, tr) : [];
  }

  /** Read-only: his last fitted path (the `ballPath` shape) as of now, without attending, turning his head or
   * sampling; empty if he never had an estimate of this flight. For beliefs that must not move his gaze. */
  peek(a: Agent, sim: PlaySim): PathSample[] {
    const tr = this.tracks.get(a);
    return tr?.fit && tr.flight === this.flight ? this.pathOf(sim, tr) : [];
  }

  /** Read-only: his newest sample of this flight, `{ t, pos }` (t the ball's time, the position as he saw it), or null. */
  lastSeen(a: Agent): { t: number; pos: Vec3 } | null {
    const tr = this.tracks.get(a), s = tr && tr.flight === this.flight ? tr.samples.at(-1) : undefined;
    return s ? { t: s.t, pos: { ...s.p } } : null;
  }

  /** Where his head points, if he is attending to the ball. */
  headOf(a: Agent): number | undefined { return this.tracks.get(a)?.head; }
  samplesOf(a: Agent): number { return this.tracks.get(a)?.samples.length ?? 0; }
  jumpsOf(a: Agent): number { return this.tracks.get(a)?.jumps ?? 0; }

  /** Attempt 3. Whoever had the QB in view at the release: the ball at his seen hand, and its direction from his
   * seen shoulder line. A receiver also seeds his own route's expected catch point (the QB's model of him, run on his
   * own installed route from his exact state). A defender has nothing more. */
  private seed(a: Agent, sim: PlaySim, tr: Track): void {
    if (sim.ball.kind !== 'air') return;
    const rel = sim.ball.releaseT, qb = sim.see(a, sim.qb);
    const toQb = Math.atan2(qb.pos.y - a.pos.y, qb.pos.x - a.pos.x);
    const qbInView = Math.abs(angDiff(toQb, a.facing)) <= NECK + EYE;
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
    const broken = fc.estimate?.motion !== 'installed-route';
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
    tr.samples = []; tr.pseudo = []; tr.seeded = false; tr.priorT = undefined; tr.fit = null; tr.path = null; tr.lastSampleT = -Infinity; tr.err = null; tr.jumps = 0;
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
    tr.path = out; tr.pathT = sim.t;
    return out;
  }

  private believedAt(a: Agent, sim: PlaySim, tr: Track): { x: number; y: number } {
    if (tr.fit) { const p = this.pathOf(sim, tr); if (p.length) return p[0]; }
    // No estimate yet: the ball comes from the quarterback, as he last saw him.
    return sim.see(a, sim.qb).pos;
  }

  private ballAt(t: number): { t: number; p: Vec3 } | null {
    const h = this.history;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t + 1e-9) return h[i];
    return null;
  }
}

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
