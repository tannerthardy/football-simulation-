/**
 * The feet of a player running under a ball he is tracking (BALL_EST bit 1024; design note
 * docs/reviews/2026-11-15-receiver-feet-servo.md). People do not compute a landing point and run to it: they run so as
 * to hold properties of the ball's image (Chapman 1968, optical acceleration cancellation; McBeath, Shaffer & Kaiser
 * 1995; Fink, Foo & Warren 2009, J. Vis. 9(13):14, whose VR test favours OAC over the linear optical trajectory and
 * over trajectory prediction; Fajen & Warren, constant-bearing interception on foot). This law reads only his own
 * samples' angles from his eyes (bearing and elevation, to under a degree), at his own visuomotor delay:
 *  - along his line: his speed changes with the optical acceleration of tan(elevation) (OAC): positive (the image
 *    speeding up) means the ball will carry past him, so he speeds up; negative, he throttles;
 *  - across: he accelerates perpendicular to his line of sight in proportion to the drift of the ball's bearing times
 *    his closing speed on it (constant bearing as proportional navigation, N = 3; Zarchan, Tactical and Strategic
 *    Missile Guidance: N > 2 to converge, 3-5 in use). A heading-rate form of the same law has the wrong sign when the
 *    ball comes from behind him (attempt 1 fault 4, 2026-11-15).
 * No change in the image means no change in his running: an on-target ball leaves him on his line. The filter is a
 * least-squares fit over his last SERVO_WINDOW of samples (smooth pursuit), never a deadband step. Too few samples, or
 * too little time left for a reaction and a step, and the servo hands over: he holds his running and his hands do the
 * rest. Not receiver-specific: any player tracking a ball he has decided to play can run on it.
 */
import { clamp } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Agent } from './agent.js';

/** Pursuit filter window (s). The optical acceleration is a second derivative of an angle he reads to about a degree:
 * over 0.35 s its noise (about +-2 / s^2 at tan(e) near 0.2) is ten times the signal early in a deep flight (0.1-0.2);
 * over about 1 s it falls to about +-0.05 (est-bound geometry). So the filter integrates about a second, as smooth
 * pursuit does, and the servo waits until it has half that (choices, stated against that noise). */
export const SERVO_WINDOW = 1.0;
/** Fewest samples, and the shortest span, the filter will run on: below this the rates are noise and he keeps his line. */
export const SERVO_MIN_SAMPLES = 8, SERVO_MIN_SPAN = 0.5;
/** Looming average (s): his closing speed is the mean of his looming reads over this (choice; one reaction time). */
export const SERVO_LOOM_WINDOW = 0.25;
/** Handover (s): with less than a reaction and a step left there is nothing to servo (choice). */
export const SERVO_HANDOVER = 0.35;
/** Gains (stated choices; no published gain maps to yd and s; sensitivity read at half and double).
 * Depth: yd of acceleration per unit of optical acceleration of tan(elevation) (1/s^2). Lateral: the navigation
 * constant N in tenths (30 = 3, sourced above; read at 2 and 4). */
export const SERVO_K_DEPTH = Number(process.env.BALL_SERVO_KD ?? 15);
export const SERVO_K_LAT = Number(process.env.BALL_SERVO_KB ?? 30) / 10;

type Angle = { t: number; az: number; el: number; rg?: number; closing?: number };
const wrap = (d: number) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/** Least-squares polynomial (degree 1 or 2) of y(t) about the last time; returns coefficients [c0, c1, c2]. */
function fit(ts: number[], ys: number[], degree: 1 | 2): number[] {
  const t0 = ts[ts.length - 1], n = degree + 1, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
  for (let i = 0; i < ts.length; i++) {
    const x = ts[i] - t0, pw = [1, x, x * x];
    for (let r = 0; r < n; r++) { b[r] += pw[r] * ys[i]; for (let c = 0; c < n; c++) A[r][c] += pw[r] * pw[c]; }
  }
  for (let r = 0; r < n; r++) A[r][r] += 1e-9;
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let v = b[r]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / A[r][r]; }
  return [x[0] ?? 0, x[1] ?? 0, x[2] ?? 0];
}

/** What the servo reads from his recent samples: the optical acceleration of tan(elevation) and the bearing rate. */
export function imageRates(angles: Angle[], now: number): { optAcc: number; bearingRate: number; bearing: number; closing: number } | null {
  const w = angles.filter((q) => q.t >= now - SERVO_WINDOW - 1e-9);
  if (w.length < SERVO_MIN_SAMPLES || w[w.length - 1].t - w[0].t < SERVO_MIN_SPAN) return null;
  const ts = w.map((q) => q.t), tan = w.map((q) => Math.tan(clamp(q.el, -1.4, 1.4)));
  const az: number[] = [w[0].az];
  for (let i = 1; i < w.length; i++) az.push(az[i - 1] + wrap(w[i].az - w[i - 1].az));
  // Closing speed from looming (range / optical time to contact) over his last SERVO_LOOM_WINDOW, not from differencing
  // his range, his worst measurement (5-10%): differenced, a low-skill receiver's misses grow (toy: max 1.6 -> 2.75 yd).
  // Looming reads his 3-D closing; the law runs on the ground bearing and needs the ground closing. Projected with what
  // he sees: c_ground = c_3D cos(el) + range_ground tan(el) d(el)/dt (exact for a straight line of sight; the elevation
  // rate from his own samples' quadratic fit at the latest look). Uncorrected, it ran ~10% low early and high late.
  const elRate = fit(ts, w.map((q) => q.el), 2)[1];
  const azFit = fit(ts, az, 1), cls = w.filter((q) => q.t >= now - SERVO_LOOM_WINDOW && q.closing !== undefined && q.rg !== undefined)
    .map((q) => (q.closing as number) * Math.cos(q.el) + (q.rg as number) * Math.tan(clamp(q.el, -1.4, 1.4)) * elRate);
  const closing = cls.length ? cls.reduce((x, y) => x + y, 0) / cls.length : 0;
  return { optAcc: 2 * fit(ts, tan, 2)[2], bearingRate: azFit[1], bearing: azFit[0], closing };
}

/** The servo's own commanded running (speed, heading), held between ticks: "no correction" keeps what he intended,
 * not what his body achieved (a speed lost to a turned hip must not lower the next command, or every loss compounds). */
const held = new WeakMap<Agent, { vx: number; vy: number; t: number; flight: unknown }>();
/** Has the servo steered him on this flight? Before it has, his feet stay with what he had (his own estimate's point). */
export const servoEngaged = (a: Agent, flight: unknown): boolean => held.get(a)?.flight === flight;

/** His running command under the ball. While the image is not yet readable (too few samples) or within the handover,
 * null: the caller keeps his route / holds his running. Otherwise his commanded running, seeded from `base` (his route
 * command) when the servo engages and changed as a rate by the image: dv/dt = SERVO_K_DEPTH x optical acceleration,
 * a_across = N x closing x bearing rate. Each is capped at what his legs can do (lateral, brake, vmax / tau), so the
 * command never winds up past his body; his legs (and the facing cap) bound what he gets. */
export function servoCommand(a: Agent, angles: Angle[], now: number, left: number, base: MoveCommand, flight: unknown): MoveCommand | null {
  if (left < SERVO_HANDOVER) return null;
  const r = imageRates(angles, now);
  if (!r) return null;
  let st = held.get(a);
  if (!st || st.flight !== flight) {
    const v = Math.hypot(base.vel.x, base.vel.y) > 1 ? base.vel : a.vel;
    st = { vx: v.x, vy: v.y, t: now, flight };
    held.set(a, st);
  }
  const dt = clamp(now - st.t, 0, 0.1);
  st.t = now;
  const sp = Math.hypot(st.vx, st.vy), ux = sp > 0.1 ? st.vx / sp : Math.cos(r.bearing), uy = sp > 0.1 ? st.vy / sp : Math.sin(r.bearing);
  // Across: proportional navigation, perpendicular to his line of sight in the world (sign-correct with the ball behind
  // him, where a heading-rate law turns him away). Along: OAC. Each bounded by what his legs can do (no wind-up).
  const nx = -Math.sin(r.bearing), ny = Math.cos(r.bearing);
  const aLat = clamp(SERVO_K_LAT * Math.max(0, r.closing) * r.bearingRate, -a.profile.lateral, a.profile.lateral);
  const aDep = clamp(SERVO_K_DEPTH * r.optAcc, -a.profile.brake, a.profile.vmax / a.profile.tau);
  let vx = st.vx + (aLat * nx + aDep * ux) * dt, vy = st.vy + (aLat * ny + aDep * uy) * dt;
  const s2 = Math.hypot(vx, vy);
  if (s2 > a.profile.vmax) { vx *= a.profile.vmax / s2; vy *= a.profile.vmax / s2; }
  st.vx = vx; st.vy = vy;
  return { vel: { x: vx, y: vy } };
}
