/** QB-local receiver estimate. Installed expectation is not measured progress. */
import { clamp, type Vec2 } from '../core/vec.js';
import { arriveVelocity, stepBody, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { RouteDef, RouteEnd } from '../playbook/types.js';
import { routeEffort, routePath, steerRoute, type PathPoint } from './route-motion.js';

export interface InstalledReceiverRoute {
  readonly start: Readonly<Vec2>;
  readonly path: readonly PathPoint[];
  readonly end: RouteEnd;
  /** Null: protection/fake must release first; activation is not known. */
  readonly startDelay: number | null;
  readonly profile: Readonly<PhysicalProfile>;
  readonly routeRunning: number;
  readonly effort: number;
}

/** Called at installation from the call and snap alignment, never RouteRunner. */
export function installReceiverRoute(start: Vec2, los: number, outside: number, route: RouteDef,
  startDelay: number | null, profile: PhysicalProfile, routeRunning: number): InstalledReceiverRoute {
  const path = routePath(start, los, outside, route.points, route.end === 'continue', route.family);
  return Object.freeze({ start: Object.freeze({ ...start }),
    path: Object.freeze(path.map(p => Object.freeze({ p: Object.freeze({ ...p.p }), s: p.s }))),
    end: route.end, startDelay, profile: Object.freeze({ ...profile }), routeRunning,
    effort: routeEffort(route.family, routeRunning) });
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
}

/** Each instance belongs to one observer/receiver pair. No shared tick cache. */
export class ReceiverForecast {
  private picture: ReceiverPicture | null = null;
  private cache: { observer: object; picture: ReceiverPicture | null; pts: Vec2[]; estimate: ReceiverEstimate } | null = null;

  constructor(readonly observer: object, readonly prior: InstalledReceiverRoute, private readonly dt: number) {}

  acquire(p: ReceiverPicture): void {
    if (this.picture && p.sampledAt < this.picture.sampledAt) return;
    this.picture = Object.freeze({ ...p, pos: Object.freeze({ ...p.pos }), vel: Object.freeze({ ...p.vel }) });
  }

  get estimate(): ReceiverEstimate | null { return this.build()?.estimate ?? null; }

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
    const progress = p ? inferProgress(p, prior) : null;
    const estimate: ReceiverEstimate = Object.freeze({ source: p ? 'acquired' : 'installed',
      sampledAt: p?.sampledAt ?? 0, acquiredAt: p?.acquiredAt ?? null, progress,
      motion: !p || progress !== null ? 'installed-route' : 'observed-motion' });
    this.cache = { observer: this.observer, picture: p, pts: [], estimate };
    return this.cache;
  }

  private extend(c: NonNullable<ReceiverForecast['cache']>, steps: number): void {
    if (c.pts.length > steps) return;
    const p = c.picture, prior = this.prior;
    // Nominal fresh capacity is a model prior, not unseen current fatigue/support.
    const body: Body = { pos: { ...(p?.pos ?? prior.start) }, vel: { ...(p?.vel ?? { x: 0, y: 0 }) },
      facing: p?.facing ?? 0, energy: 1, sprintLoad: 0, profile: prior.profile };
    const st = { idx: c.estimate.progress ?? 0 };
    const cutSkill = 0.8 + 0.4 * prior.routeRunning;
    const pts: Vec2[] = [{ ...body.pos }];
    let done = false;
    // Rebuild only when a longer horizon is requested, preserving exact prefixes.
    for (let i = 0; i < Math.max(70, steps + 1); i++) {
      let cmd: MoveCommand | null;
      if (c.estimate.motion === 'observed-motion') cmd = { vel: { ...p!.vel }, cutSkill };
      else if (c.estimate.sampledAt + i * this.dt < (prior.startDelay ?? 0)
        && (!p || (Math.hypot(p.vel.x, p.vel.y) < 1e-6 && st.idx === 0))) cmd = { vel: { x: 0, y: 0 } };
      else if (done) cmd = prior.end === 'continue' ? { vel: body.vel }
        : { vel: arriveVelocity(body, prior.path[prior.path.length - 1]?.p ?? body.pos, body.profile.vmax * 0.6, 0) };
      else {
        cmd = steerRoute(body, st, prior.path, prior.end, prior.effort, prior.routeRunning, cutSkill);
        if (!cmd) { done = true; cmd = { vel: prior.end === 'continue' ? body.vel : { x: 0, y: 0 } }; }
      }
      stepBody(body, cmd, this.dt);
      pts.push({ ...body.pos });
    }
    c.pts = pts;
  }
}

/** Geometric inference from the sampled picture; never the runner's private idx.
 * Ambiguous/contradicted progress falls back to the measured motion. The body
 * radius supplies a route-centre tolerance, not a collision-clearance promise. */
function inferProgress(p: ReceiverPicture, prior: InstalledReceiverRoute): number | null {
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
    if (error <= prior.profile.radius && (Math.hypot(p.vel.x, p.vel.y) < 1e-6 || p.vel.x * dx + p.vel.y * dy > 0)) {
      candidates.push({ idx, error });
    }
    prev = next;
  }
  candidates.sort((a, b) => a.error - b.error);
  if (!candidates.length || (candidates.length > 1 && Math.abs(candidates[0].error - candidates[1].error) < 1e-6)) return null;
  return candidates[0].idx;
}
