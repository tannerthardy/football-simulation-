/** QB-local receiver estimate. Installed expectation is not measured progress. */
import { clamp, type Vec2 } from '../core/vec.js';
import { BREAK_DECL } from '../playbook/route-breaks.js';
import { FIELD_WIDTH } from '../core/field.js';
import { arriveVelocity, stepBody, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { RouteDef, RouteEnd, RouteRead } from '../playbook/types.js';
import { firstBreakDepth, getOffDrive, inGetOff, LINE_START, routeEffort, routePath, steerRoute, type PathPoint, type RouteCursor } from './route-motion.js';
import { installedRead, readRoute, type RouteChoice, type RouteKeyPicture } from './route-read.js';

interface InstalledAnswer { readonly id: RouteChoice['answer']; readonly path: readonly PathPoint[]; readonly end: RouteEnd }

export interface InstalledReceiverRoute {
  readonly start: Readonly<Vec2>;
  readonly path: readonly PathPoint[];
  readonly end: RouteEnd;
  /** Null: protection/fake must release first; activation is not known. */
  readonly startDelay: number | null;
  readonly profile: Readonly<PhysicalProfile>;
  readonly routeRunning: number;
  readonly effort: number;
  /** DECLARED_BREAK: the route's declared break vertex (an index into `path`), when it has one. */
  readonly breakIdx?: number;
  /** DECLARED_BREAK: a route with no vertex (thrown seen open) declares on its rule instead: 5 yd moved with the line
   * crossed (a back from the backfield needs no line), 12 yd of vertical, or the snap. `declLos` is the line it is
   * timed against. */
  readonly declRule?: 'moved' | 'vertical' | 'now';
  readonly declLos?: number;
  readonly read?: RouteRead;
  readonly readContext?: { readonly los: number; readonly outside: number };
  readonly answers?: readonly InstalledAnswer[];
}

/** Called at installation from the call and snap alignment, never RouteRunner. */
export function installReceiverRoute(start: Vec2, los: number, outside: number, route: RouteDef,
  startDelay: number | null, profile: PhysicalProfile, routeRunning: number): InstalledReceiverRoute {
  const path = routePath(start, los, outside, route.points, route.end === 'continue', route.family);
  const read = installedRead(route);
  const freezePath = (p: readonly PathPoint[]) => Object.freeze(p.map(p => Object.freeze({ p: Object.freeze({ ...p.p }), s: p.s, ...(p.ext ? { ext: true } : {}), ...(p.cut ? { cut: true } : {}), ...(p.finish ? { finish: true } : {}) })));
  const copiedRead = read ? Object.freeze({ ...read, answers: Object.freeze(read.answers.map(a => Object.freeze({ ...a,
    points: Object.freeze(a.points.map(p => Object.freeze({ ...p }))) }))) }) : undefined;
  return Object.freeze({ start: Object.freeze({ ...start }),
    path: freezePath(path),
    end: route.end, startDelay, profile: Object.freeze({ ...profile }), routeRunning,
    effort: routeEffort(route.family, routeRunning),
    ...(DECLARED_BREAK && typeof BREAK_DECL[route.id]?.at === 'number' ? { breakIdx: BREAK_DECL[route.id].at as number } : {}),
    ...(DECLARED_BREAK && BREAK_DECL[route.id] && typeof BREAK_DECL[route.id].at !== 'number'
      ? { declRule: BREAK_DECL[route.id].at as 'moved' | 'vertical' | 'now', declLos: los } : {}),
    ...(copiedRead ? { read: copiedRead, readContext: Object.freeze({ los, outside }),
      answers: Object.freeze(copiedRead.answers.map(a => Object.freeze({ id: a.id, end: a.end,
        path: freezePath(routePath(start, los, outside, a.points, a.end === 'continue', route.family)) }))) } : {}) });
}

export interface ReceiverPicture {
  /** Raw sampled position, not the buffer's dead-reckoned position. */
  readonly pos: Readonly<Vec2>;
  readonly vel: Readonly<Vec2>;
  readonly facing: number;
  readonly sampledAt: number;
  readonly acquiredAt: number;
}

export interface ReceiverEstimate {
  readonly source: 'installed' | 'acquired';
  readonly sampledAt: number;
  readonly acquiredAt: number | null;
  /** Inferred target waypoint; null means progress cannot be identified. */
  readonly progress: number | null;
  readonly motion: 'installed-route' | 'observed-motion';
  readonly routeAnswer?: RouteChoice['answer'];
  readonly answerSource?: 'own-key-picture' | 'receiver-motion' | 'installed-default';
}

/** FORECAST_BREAK (experimental, off; FORECAST_BREAK=1 turns it on): the break the quarterback expects is on
 * the installed route, not on the continuation the path adds past it. Off, a flat, arrow, swing or back's flat
 * (their installed cut s 0.9) takes its break from the continuation's turn at the sideline margin (s 0.75 or
 * 0.6), so the QB expects it about 6 s after the snap and treats the receiver as not ready (a flat open at
 * 0.77 completion was never thrown: docs/reviews/2026-11-11-forecast-break.md). */
const FORECAST_BREAK = process.env.FORECAST_BREAK !== '0';
/** FORECAST_HOLD (experimental, off; FORECAST_HOLD=1 turns it on): a receiver a little off his drawn line is still
 * running his route. Off, a picture is placed on the installed route only within his body radius (about 0.3 yd) of
 * it; anything farther makes the whole forecast a straight line of his current velocity, which ignores the coming
 * break. On the forced-concept panel, 26% of pictures of receivers moving along their routes were thrown out that
 * way (32% at 2-3 s, the throwing time), and in league games that flip between the decision and the plant's re-check
 * caused 18 of 30 traced pumps (docs/reviews/2026-11-12-window-defenders.md). On: placed within HOLD_TOL of the
 * route while moving along it (about the 90th percentile of observed drift); moving against it, or farther off, is
 * still a contradiction and falls back to his observed motion. */
const FORECAST_HOLD = process.env.FORECAST_HOLD !== '0';
/** FORECAST_HOLD: how far off its drawn line a run route still reads as that route, by route phase: the 90th
 * percentile of receivers' drift while moving along the route (engine-42 forced-concept panel,
 * scripts/diag/read-plan/forecast-drift.ts): on the stem 1.19 yd, after the break 1.63 (the cut is rounded), on a
 * route with no break 1.46. His belief: the QB's forecast carries it (`holdTol`), so his knowledge of a receiver could
 * hold it tighter later. */
export interface HoldTolerance { stem: number; afterBreak: number; noBreak: number }
export const HOLD_TOL: Readonly<HoldTolerance> = Object.freeze({ stem: 1.2, afterBreak: 1.6, noBreak: 1.5 });

/** Where the receiver cuts on an installed path: the waypoint the route slows
 * him most for (first on ties), not counting a final settle spot. Null for a
 * path with no slowed waypoint (a go or seam). */
/** DECLARED_BREAK (experimental, off; src/playbook/route-breaks.ts): the break the quarterback expects on an installed
 * route is its declared vertex, the same one the read plan times; off, the waypoint that slows him most. */
const DECLARED_BREAK = process.env.DECLARED_BREAK !== '0';
/** DECLARED_BREAK: whether a body at `pos` has met a seen-open route's declare rule (the read compiler's own rule,
 * features.ts: 5 yd from his start with the line crossed by 0.5 yd, a back excepted; 12 yd of vertical; the snap). */
function ruleMet(prior: InstalledReceiverRoute, pos: Readonly<Vec2>): boolean {
  const los = prior.declLos ?? prior.start.x, depth = pos.x - los;
  if (prior.declRule === 'now') return true;
  if (prior.declRule === 'vertical') return depth >= 12;
  const back = prior.start.x <= los - 2;
  return Math.hypot(pos.x - prior.start.x, pos.y - prior.start.y) >= 5 && (back || depth >= 0.5);
}
function priorBreak(prior: InstalledReceiverRoute): number | null {
  return prior.breakIdx !== undefined ? prior.breakIdx : pathBreak(prior.path, prior.end);
}

export function pathBreak(path: readonly PathPoint[], end: RouteEnd): number | null {
  let b: number | null = null;
  const last = end === 'settle' ? path.length - 1 : path.length;
  for (let i = 0; i < last; i++) {
    if (FORECAST_BREAK && path[i].ext) continue;
    if (path[i].s < 1 && (b === null || path[i].s < path[b].s)) b = i;
  }
  return b;
}

/** Each instance belongs to one observer/receiver pair. No shared tick cache. */
export class ReceiverForecast {
  private picture: ReceiverPicture | null = null;
  private choice: RouteChoice | null = null;
  private inferredCommitment = false;
  private cache: { observer: object; picture: ReceiverPicture | null; pts: Vec2[]; estimate: ReceiverEstimate;
    route: InstalledAnswer; breakStep: number | null } | null = null;

  /** FORECAST_HOLD: his belief of how far off its line this receiver's route still reads as that route. */
  holdTol: Readonly<HoldTolerance> = HOLD_TOL;
  constructor(readonly observer: object, readonly prior: InstalledReceiverRoute, private readonly dt: number) {}

  /** The last acquired picture of the receiver (sample time and speed), or null if never seen. */
  lastPicture(): { sampledAt: number; speed: number } | null {
    return this.picture ? { sampledAt: this.picture.sampledAt, speed: Math.hypot(this.picture.vel.x, this.picture.vel.y) } : null;
  }

  acquire(p: ReceiverPicture): void {
    if (this.picture && p.sampledAt < this.picture.sampledAt) return;
    this.picture = Object.freeze({ ...p, pos: Object.freeze({ ...p.pos }), vel: Object.freeze({ ...p.vel }) });
  }

  /** Reuse the quarterback's already acquired defensive memory. Never ask a
   * receiver for his chosen answer. A rotation can fool these two observers
   * differently, and observed receiver motion can later correct this prior. */
  readKeys(pictures: readonly RouteKeyPicture[]): void {
    const prior = this.prior;
    if (!prior.read || !prior.readContext || this.inferredCommitment) return;
    const choice = readRoute(prior.read, { ...prior.readContext, start: prior.start,
      pos: this.picture?.pos ?? prior.start, middleY: FIELD_WIDTH / 2 }, pictures);
    // Losing a look does not mean the receiver changed his route. Keep the
    // installed expectation; only a new relevant key can revise it before the
    // read, and only observed route motion can correct it after commitment.
    if (choice.reason !== 'no-fresh-key' || !this.choice) {
      if (choice.answer !== this.choice?.answer) this.cache = null;
      this.choice = choice;
    }
    this.inferredCommitment = !!this.picture && this.picture.pos.x >= prior.readContext.los + prior.read.depth;
  }

  get estimate(): ReceiverEstimate | null { return this.build()?.estimate ?? null; }

  /** Whether the route he expects (the installed route, or the answer he has
   * inferred for an option route) has a break. */
  get hasBreak(): boolean {
    const c = this.build();
    if (!c?.route || c.route.path === this.prior.path) return this.prior.declRule !== undefined || priorBreak(this.prior) !== null;
    return pathBreak(c.route.path, c.route.end) !== null;
  }

  /** When he expects the receiver to make his break: the expected route run
   * from the picture he holds, through the shared stem until the read
   * landmark and then the answer he expects (not the receiver's own choice).
   * Null once it is past, for a route without a break, or when his progress
   * cannot be identified. */
  breakAt(): number | null {
    const c = this.build();
    if (!c || c.estimate.motion !== 'installed-route') return null;
    this.extend(c, Math.ceil(8 / this.dt)); // far enough to reach any installed break
    return c.breakStep === null ? null : c.estimate.sampledAt + c.breakStep * this.dt;
  }

  /** Forecast at absolute time. A held picture ages; it never refreshes itself. */
  predict(now: number, ahead: number): Vec2 | null {
    const c = this.build();
    if (!c) return null;
    const f = Math.max(0, now + Math.max(0, ahead) - c.estimate.sampledAt) / this.dt;
    this.extend(c, Math.ceil(f));
    const i = Math.min(c.pts.length - 2, Math.floor(f)), w = Math.min(1, f - i);
    return { x: c.pts[i].x + (c.pts[i + 1].x - c.pts[i].x) * w,
      y: c.pts[i].y + (c.pts[i + 1].y - c.pts[i].y) * w };
  }

  private build(): NonNullable<ReceiverForecast['cache']> | null {
    if (this.cache?.observer === this.observer && this.cache.picture === this.picture) return this.cache;
    const p = this.picture, prior = this.prior;
    if (!p && prior.startDelay === null) return null; // Unknown release is not stationary motion.
    const routes: InstalledAnswer[] = [{ id: 'base', path: prior.path, end: prior.end }, ...(prior.answers ?? [])];
    const matches = p ? routes.map(route => ({ route, progress: inferProgress(p, { ...prior, ...route }, this.holdTol) }))
      .filter(m => m.progress !== null) : [];
    // First-stem geometry alone cannot reveal a later option. Require visible
    // motion on a uniquely matching post-break segment before overriding the
    // quarterback's independently inferred answer.
    const observed = prior.read && matches.length === 1 && matches[0].progress! > 0 ? matches[0] : null;
    const route = observed?.route ?? routes.find(r => r.id === this.choice?.answer) ?? routes[0];
    const beforeRead = prior.read && prior.readContext && p && p.pos.x < prior.readContext.los + prior.read.depth;
    const progress = p ? inferProgress(p, beforeRead ? prior : { ...prior, ...route }, this.holdTol) : null;
    const estimate: ReceiverEstimate = Object.freeze({ source: p ? 'acquired' : 'installed',
      sampledAt: p?.sampledAt ?? 0, acquiredAt: p?.acquiredAt ?? null, progress,
      motion: !p || progress !== null ? 'installed-route' : 'observed-motion',
      ...(prior.read ? { routeAnswer: route.id, answerSource: observed ? 'receiver-motion' as const
        : this.choice ? 'own-key-picture' as const : 'installed-default' as const } : {}) });
    this.cache = { observer: this.observer, picture: p, pts: [], estimate, route, breakStep: null };
    return this.cache;
  }

  private extend(c: NonNullable<ReceiverForecast['cache']>, steps: number): void {
    if (c.pts.length > steps) return;
    const p = c.picture, prior = this.prior;
    // Nominal fresh capacity is a model prior, not unseen current fatigue/support.
    const body: Body = { pos: { ...(p?.pos ?? prior.start) }, vel: { ...(p?.vel ?? { x: 0, y: 0 }) },
      facing: p?.facing ?? 0, energy: 1, sprintLoad: 0, profile: prior.profile };
    const st: RouteCursor = { idx: c.estimate.progress ?? 0, from: prior.start };
    const cutSkill = 0.8 + 0.4 * prior.routeRunning;
    const pts: Vec2[] = [{ ...body.pos }];
    let done = false;
    let selected = !prior.read || !prior.readContext || body.pos.x >= prior.readContext.los + prior.read.depth;
    c.breakStep = null;
    // The break that counts is the expected route's: before the read only the
    // shared stem is run, so a break is looked for once the answer is active.
    const brk = (on: boolean) => on ? (c.route.path === prior.path ? priorBreak(prior) : pathBreak(c.route.path, c.route.end)) : prior.read ? null : priorBreak(prior);
    // DECLARED_BREAK: a seen-open route on its installed path breaks when the body he forecasts meets its rule.
    const rule = (on: boolean) => prior.declRule !== undefined && (!on || c.route.path === prior.path);
    let past = rule(selected) ? ruleMet(prior, body.pos) : brk(selected) !== null && st.idx > brk(selected)!;
    // Rebuild only when a longer horizon is requested, preserving exact prefixes.
    for (let i = 0; i < Math.max(70, steps + 1); i++) {
      // Anticipation selects a future answer, not permission to execute its
      // easier/faster stem before the receiver's installed decision landmark.
      if (!selected && body.pos.x >= prior.readContext!.los + prior.read!.depth) {
        selected = true; st.idx = 0; st.turn = null; st.plan = null;
        while (st.idx < c.route.path.length - 1 && c.route.path[st.idx].p.x < body.pos.x - .5) st.idx++;
      }
      const active = selected ? c.route : prior;
      let cmd: MoveCommand | null;
      if (c.estimate.motion === 'observed-motion') cmd = { vel: { ...p!.vel }, cutSkill };
      else if (c.estimate.sampledAt + i * this.dt < (prior.startDelay ?? 0)
        && (!p || (Math.hypot(p.vel.x, p.vel.y) < 1e-6 && st.idx === 0))) cmd = { vel: { x: 0, y: 0 } };
      else if (done) cmd = active.end === 'continue' ? { vel: body.vel }
        : { vel: arriveVelocity(body, active.path[active.path.length - 1]?.p ?? body.pos, body.profile.vmax * 0.6, 0) };
      else {
        cmd = steerRoute(body, st, active.path, active.end, prior.effort, prior.routeRunning, cutSkill);
        if (!cmd) { done = true; cmd = { vel: active.end === 'continue' ? body.vel : { x: 0, y: 0 } }; }
        // LINE_START: the same get-off the receiver runs, read time from his profile (his mind is not visible).
        else if (LINE_START && inGetOff(Math.hypot(body.pos.x - prior.start.x, body.pos.y - prior.start.y),
          c.estimate.sampledAt + i * this.dt - (prior.startDelay ?? 0), prior.profile.reactionTime))
          cmd = { ...cmd, drive: getOffDrive(prior.routeRunning, firstBreakDepth(prior.start, prior.readContext?.los ?? prior.start.x, prior.path), 4.5) };
      }
      stepBody(body, cmd, this.dt);
      pts.push({ ...body.pos });
      if (rule(selected)) {
        if (c.breakStep === null && !past && ruleMet(prior, body.pos)) { c.breakStep = i + 1; past = true; }
        continue;
      }
      const b = brk(selected);
      if (c.breakStep === null && b !== null && !past && st.idx > b) c.breakStep = i + 1;
      if (b !== null && st.idx > b) past = true;
    }
    c.pts = pts;
  }
}

/** Geometric inference from the sampled picture; never the runner's private idx.
 * Ambiguous/contradicted progress falls back to the measured motion. The body
 * radius supplies a route-centre tolerance, not a collision-clearance promise. */
function inferProgress(p: ReceiverPicture, prior: InstalledReceiverRoute, hold: Readonly<HoldTolerance> = HOLD_TOL): number | null {
  const brk = FORECAST_HOLD ? priorBreak(prior) : null;
  // Seeing a back at his installed starting spot does not reveal a private
  // protection/fake release. A departure can later supply progress evidence.
  if (prior.startDelay === null && Math.hypot(p.pos.x - prior.start.x, p.pos.y - prior.start.y) <= prior.profile.radius) return null;
  let prev = prior.start;
  const candidates: { idx: number; error: number }[] = [];
  for (let idx = 0; idx < prior.path.length; idx++) {
    const next = prior.path[idx].p;
    const dx = next.x - prev.x, dy = next.y - prev.y, len2 = dx * dx + dy * dy;
    const u = len2 ? clamp(((p.pos.x - prev.x) * dx + (p.pos.y - prev.y) * dy) / len2, 0, 1) : 0;
    const error = Math.hypot(p.pos.x - prev.x - u * dx, p.pos.y - prev.y - u * dy);
    // Motion perpendicular/opposed to this segment is evidence of a different action.
    // FORECAST_HOLD: off his line he is still on the route only while running along it (heading within about 53 deg
    // of the segment); stopped (fallen, jammed) or cutting across it, only the body radius places him.
    const speed = Math.hypot(p.vel.x, p.vel.y), len = Math.sqrt(len2);
    const runningAlong = speed >= 1 && len > 1e-6 && (p.vel.x * dx + p.vel.y * dy) / (speed * len) >= 0.6;
    const tol = FORECAST_HOLD && runningAlong ? Math.max(prior.profile.radius, brk === null ? hold.noBreak : idx <= brk ? hold.stem : hold.afterBreak) : prior.profile.radius;
    if (error <= tol && (speed < 1e-6 || p.vel.x * dx + p.vel.y * dy > 0)) {
      candidates.push({ idx, error });
    }
    prev = next;
  }
  candidates.sort((a, b) => a.error - b.error);
  if (!candidates.length || (candidates.length > 1 && Math.abs(candidates[0].error - candidates[1].error) < 1e-6)) return null;
  return candidates[0].idx;
}
