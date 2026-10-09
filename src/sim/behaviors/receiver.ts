/**
 * Receivers: route running (release vs. press, stems, breaks governed by
 * route-running skill and the traction ellipse, option routes that convert
 * vs. man/zone), tracking the ball in flight, and blocking after the catch.
 */
import { FIELD_WIDTH, OPP_GOAL_X } from '../../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, stepBody, type Body, type MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import type { RouteDef, RoutePoint } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, goTo, runThrough, stand } from './common.js';

interface PathPoint {
  p: Vec2;
  s: number;
}

export class RouteRunner implements Behavior {
  readonly kind = 'route';
  path: PathPoint[];
  idx = 0;
  settled = false;
  private jamResolved = false;
  private converted = false;
  private readAt: number;
  private readonly start: Vec2;
  /** Time at which the route's final break is expected (for QB timing). */
  readonly breakTime: number;
  /** Fraction of top speed the route is run at: quick game is rhythm, verticals are races. */
  private readonly effort: number;

  constructor(
    a: Agent,
    private readonly sim: PlaySim,
    readonly route: RouteDef,
    /** +1 if "outside" (toward his sideline) is +y. */
    private readonly outside: number,
    private readonly startDelay = 0,
  ) {
    this.start = { ...a.pos };
    const base: Record<string, number> = { quick: 0.78, flat: 0.8, back: 0.8, cross: 0.84, intermediate: 0.86, deep: 0.94 };
    this.effort = clamp((base[route.family] ?? 0.85) + 0.04 * (a.r('routeRunning') - 0.5), 0.7, 0.98);
    this.path = this.buildPath(a.pos, route.points, route.end === 'continue');
    this.readAt = 0.55 + 0.6 * (1 - a.r('awareness'));
    // Break time ≈ distance to the last speed-controlled point at ~85% speed.
    let dist = 0;
    let prev = a.pos;
    let breakDist = 0;
    for (let i = 0; i < route.points.length; i++) {
      const pp = this.path[i].p;
      dist += Math.hypot(pp.x - prev.x, pp.y - prev.y);
      prev = pp;
      if (route.points[i].s !== undefined) breakDist = dist;
    }
    if (breakDist === 0) breakDist = Math.min(dist, 8);
    this.breakTime = startDelay + 0.25 + breakDist / (0.85 * this.effort * a.profile.vmax);
  }

  private buildPath(start: Vec2, pts: RoutePoint[], extend: boolean): PathPoint[] {
    const sim = this.sim;
    // Nothing runs out the back of the end zone.
    const endX = OPP_GOAL_X + 8.5;
    const out: PathPoint[] = pts.map((rp) => ({
      p: { x: Math.min(endX, sim.los + rp.d), y: clamp(start.y + rp.l * this.outside, 1.2, FIELD_WIDTH - 1.2) },
      s: rp.s ?? 1,
    }));
    if (extend && out.length >= 1) {
      const last = out[out.length - 1].p;
      const prev = out.length >= 2 ? out[out.length - 2].p : start;
      const d = norm(sub(last, prev));
      // Receivers working toward the sideline turn upfield a few yards inside
      // it, leaving room to round the corner at speed and stay inbounds.
      const lo = 5;
      const hi = FIELD_WIDTH - 5;
      // Extend along the final leg; if that runs into the sideline, turn upfield there.
      let k = 40;
      if (d.y < -1e-6) k = Math.min(k, (last.y - lo) / -d.y);
      if (d.y > 1e-6) k = Math.min(k, (hi - last.y) / d.y);
      const edge = { x: Math.min(endX, last.x + d.x * k), y: last.y + d.y * k };
      if (k < 39) {
        // Flat routes turn up a few yards and then work back to the QB; other
        // routes turn upfield and keep running.
        const up = this.route.family === 'flat' ? 5 : 40;
        out.push({ p: edge, s: 0.75 });
        out.push({ p: { x: Math.min(endX, edge.x + up), y: edge.y }, s: this.route.family === 'flat' ? 0.6 : 1 });
      } else out.push({ p: edge, s: 1 });
    }
    return out;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.startDelay) return stand(0);
    const rr = a.r('routeRunning');
    const cutSkill = 0.8 + 0.4 * rr;

    this.handleRelease(a, sim);
    if (sim.scrambleDrill) return this.scrambleDrill(a, sim);
    // Ball thrown to someone else: finish the route at a jog and find someone to block.
    if (sim.ball.kind === 'air' && sim.ball.target !== a) {
      const cmd = this.steer(a.body, { idx: this.idx }, a.r('routeRunning'), 1);
      if (cmd) return { ...cmd, effort: 0.55 };
    }

    // Option routes read the coverage once.
    if (!this.converted && sim.t >= this.readAt && this.route.end === 'sitVsZone') {
      this.converted = true;
      const misread = sim.rng.chance(0.15 * (1 - a.r('awareness')));
      const isMan = sim.defAlign.coverage.man !== misread;
      if (isMan && this.route.vsMan) {
        this.path = this.buildPath(this.start, this.route.vsMan, true);
        this.idx = 0;
        this.skipPassed(a);
      }
    }

    if (this.settled || this.idx >= this.path.length) {
      this.settled = true;
      return this.settle(a, sim);
    }
    // Sideline awareness.
    if ((a.pos.y < 1.2 && a.vel.y < 0) || (a.pos.y > FIELD_WIDTH - 1.2 && a.vel.y > 0)) {
      const inward = a.pos.y < 1.2 ? 1 : -1;
      return { vel: { x: Math.max(a.vel.x, 3), y: inward * 2 }, cutSkill };
    }
    const st = { idx: this.idx };
    const cmd = this.steer(a.body, st, rr, cutSkill);
    this.idx = st.idx;
    if (!cmd) {
      this.settled = this.route.end !== 'continue';
      return this.settle(a, sim);
    }
    return cmd;
  }

  /** Waypoint following for a body (the real receiver or a ghost used for prediction). */
  private steer(body: Body, st: { idx: number }, rr: number, cutSkill: number): MoveCommand | null {
    for (let guard = 0; guard < 6; guard++) {
      if (st.idx >= this.path.length) return null;
      const tgt = this.path[st.idx];
      const next = this.path[st.idx + 1];
      const d = Math.hypot(tgt.p.x - body.pos.x, tgt.p.y - body.pos.y);
      if (d < 0.6 || (next && passed(body.pos, tgt.p, next.p))) {
        st.idx++;
        continue;
      }
      const isLast = st.idx === this.path.length - 1;
      const vtop = body.profile.vmax * this.effort;
      let through = isLast && this.route.end !== 'continue' ? 0 : tgt.s * vtop * clamp(0.82 + 0.3 * rr, 0, 1);
      if (next) {
        // Physically sensible speed for the upcoming turn.
        const ax = tgt.p.x - body.pos.x;
        const ay = tgt.p.y - body.pos.y;
        const bx = next.p.x - tgt.p.x;
        const by = next.p.y - tgt.p.y;
        const cosT = (ax * bx + ay * by) / ((Math.hypot(ax, ay) || 1) * (Math.hypot(bx, by) || 1));
        through = Math.min(through, Math.sqrt((body.profile.lateral * cutSkill * 1.3) / Math.max(0.04, 1 - cosT)));
      }
      return { vel: arriveVelocity(body, tgt.p, vtop, through), cutSkill };
    }
    return null;
  }

  private drill: { at: number; spot: Vec2 } | null = null;

  /**
   * Scramble drill: the play has broken down. Deep receivers come back toward
   * the QB, short ones work across to his side, and everyone keeps moving
   * toward grass away from the nearest defender, every half second.
   */
  private scrambleDrill(a: Agent, sim: PlaySim): MoveCommand {
    const qb = sim.qb;
    if (!this.drill || sim.t >= this.drill.at) {
      const depth = a.pos.x - sim.los;
      const baseX = sim.los + (depth > 14 ? Math.max(10, depth - 9) : clamp(depth + 2, 4, 12));
      const baseY = a.pos.y + (qb.pos.y - a.pos.y) * (depth > 14 ? 0.15 : 0.35);
      let best: Vec2 = { x: baseX, y: baseY };
      let bestScore = -Infinity;
      for (const [dx, dy] of [[0, 0], [0, 4], [0, -4], [3, 0], [-3, 0], [2, 3], [2, -3]]) {
        const p = { x: Math.min(OPP_GOAL_X + 8, baseX + dx), y: clamp(baseY + dy, 2, FIELD_WIDTH - 2) };
        let near = Infinity;
        for (const d of sim.defense) near = Math.min(near, Math.hypot(d.pos.x - p.x, d.pos.y - p.y));
        const score = Math.min(near, 6) - 0.15 * Math.hypot(p.x - a.pos.x, p.y - a.pos.y);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      this.drill = { at: sim.t + 0.5, spot: best };
    }
    return goTo(a, this.drill.spot, { speed: 0.85, facing: angleTo(a.pos, qb.pos) });
  }

  private skipPassed(a: Agent): void {
    while (this.idx < this.path.length - 1 && this.path[this.idx].p.x < a.pos.x - 0.5) this.idx++;
  }

  private settle(a: Agent, sim: PlaySim): MoveCommand {
    const last = this.path[this.path.length - 1]?.p ?? a.pos;
    if (this.route.end === 'continue') {
      // Ran off the end of the route: keep working toward open grass near the sideline.
      return goTo(a, { x: a.pos.x + 3, y: a.pos.y }, { speed: 0.5 });
    }
    // Sit in the window: drift away from the nearest underneath defender.
    let spot = last;
    if (this.route.end === 'sitVsZone') {
      let best: Agent | null = null;
      let bd = Infinity;
      for (const d of sim.defense) {
        const dd = Math.hypot(d.pos.x - last.x, d.pos.y - last.y);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      if (best && bd < 4) spot = { x: last.x, y: clamp(last.y + Math.sign(last.y - best.pos.y || 1) * (4 - bd) * 0.5, 1.5, FIELD_WIDTH - 1.5) };
    }
    return goTo(a, spot, { speed: 0.6, facing: angleTo(a.pos, sim.qb.pos) });
  }

  private handleRelease(a: Agent, sim: PlaySim): void {
    if (this.jamResolved || sim.t > 0.9) return;
    for (const d of sim.defense) {
      const sp = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots];
      if (!sp?.press || sp.manTarget !== a.slot) continue;
      const dd = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
      if (dd > 1.3) continue;
      this.jamResolved = true;
      const agiR = clamp((7.3 - a.player.measurables.threeCone) / 0.8, 0, 1);
      const agiD = clamp((7.3 - d.player.measurables.threeCone) / 0.8, 0, 1);
      const score =
        0.55 * a.r('releaseVsPress') + 0.25 * agiR + 0.2 * a.r('strength') - (0.55 * d.r('press') + 0.25 * d.r('strength') + 0.2 * agiD) + sim.rng.normal(0, 0.22);
      // The jam is a strike, not a timer: a landed two-hand punch knocks the
      // receiver off his stem and his balance; a punch at air leaves the
      // corner leaning on nothing.
      const ux = (a.pos.x - d.pos.x) / (dd || 1), uy = (a.pos.y - d.pos.y) / (dd || 1);
      if (score < -0.08) {
        const j = a.profile.massKg * (0.9 + 1.6 * Math.min(0.6, -score));
        sim.world.strike(d.body, a.body, { x: ux * j, y: uy * j });
        sim.event('jam', d, a);
      } else if (score > 0.22) {
        const sup = d.body.support;
        if (sup) {
          const lean = d.profile.massKg * 9 * (0.6 + Math.min(0.6, score));
          sup.lean = { x: sup.lean.x + ux * lean, y: sup.lean.y + uy * lean };
        }
        d.tags.add('whiffed-jam');
      } else {
        // Hands fight to a draw: both are knocked back a little.
        const j = Math.min(a.profile.massKg, d.profile.massKg) * 0.35;
        sim.world.strike(d.body, a.body, { x: ux * j, y: uy * j });
      }
      return;
    }
  }

  private ghost: { t: number; pts: Vec2[] } | null = null;

  /**
   * Where the receiver will be `tAhead` seconds from now if he stays on his
   * route: a ghost copy of his body runs the route through the same physics.
   */
  predict(a: Agent, tAhead: number): Vec2 {
    const sim = this.sim;
    if (!this.ghost || this.ghost.t !== sim.t) {
      const body: Body = { pos: { ...a.pos }, vel: { ...a.vel }, facing: a.body.facing, energy: a.body.energy, profile: a.profile, sprintLoad: a.body.sprintLoad };
      const st = { idx: this.idx };
      const rr = a.r('routeRunning');
      const cutSkill = 0.8 + 0.4 * rr;
      const pts: Vec2[] = [{ ...body.pos }];
      const settledSpot = this.path[this.path.length - 1]?.p ?? a.pos;
      let done = this.settled;
      const delay = Math.max(0, this.startDelay - sim.t);
      for (let i = 0; i < 70; i++) {
        const tt = i * sim.dt;
        let cmd: MoveCommand | null;
        if (tt < delay) cmd = { vel: { x: 0, y: 0 } };
        else if (done) cmd = this.route.end === 'continue' ? { vel: body.vel } : { vel: arriveVelocity(body, settledSpot, body.profile.vmax * 0.6, 0) };
        else {
          cmd = this.steer(body, st, rr, cutSkill);
          if (!cmd) {
            done = true;
            cmd = this.route.end === 'continue' ? { vel: body.vel } : { vel: { x: 0, y: 0 } };
          }
        }
        stepBody(body, cmd, sim.dt);
        pts.push({ ...body.pos });
      }
      this.ghost = { t: sim.t, pts };
    }
    const pts = this.ghost.pts;
    const f = Math.max(0, tAhead) / sim.dt;
    const i = Math.min(pts.length - 2, Math.floor(f));
    const w = Math.min(1, f - i);
    return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * w, y: pts[i].y + (pts[i + 1].y - pts[i].y) * w };
  }
}

function passed(pos: Vec2, wp: Vec2, next: Vec2): boolean {
  // Past the waypoint along the segment toward the next one.
  const sx = next.x - wp.x;
  const sy = next.y - wp.y;
  return (pos.x - wp.x) * sx + (pos.y - wp.y) * sy > 0 && Math.hypot(pos.x - wp.x, pos.y - wp.y) < 2;
}

/**
 * Track the ball in flight: run to the earliest point on its path that can be
 * reached in time (ball tracking adds delay and error).
 */
export class TrackBall implements Behavior {
  readonly kind = 'track';
  private readonly reactAt: number;
  private readonly err: Vec2;
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly fallback: Behavior,
  ) {
    const tr = a.r('ballTracking');
    this.reactAt = sim.t + 0.08 + 0.25 * (1 - tr);
    this.err = { x: sim.rng.normal(0, 0.5 * (1 - tr)), y: sim.rng.normal(0, 0.5 * (1 - tr)) };
    a.tags.add('onBall');
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind !== 'air') return this.fallback.update(a, sim);
    if (sim.t < this.reactAt) return this.fallback.update(a, sim);
    const spot = catchSpot(a, sim);
    if (!spot) return this.fallback.update(a, sim);
    const target = { x: spot.p.x + this.err.x, y: spot.p.y + this.err.y };
    const dtArr = Math.max(0.05, spot.t - sim.t);
    const dist = Math.hypot(target.x - a.pos.x, target.y - a.pos.y);
    // Arrive on time, keep running through if the ball is leading him.
    const need = dist / dtArr;
    const facing = angleTo(a.pos, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y });
    if (dist < 0.5) return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing };
    return { ...runThrough(a, target, { speed: clamp(need / a.profile.vmax, 0.35, 1) }), facing: dist < 3 ? facing : undefined };
  }
}

/** Earliest reachable point on the ball's remaining flight path for agent `a`. */
export function catchSpot(a: Agent, sim: PlaySim): { p: Vec2; t: number; z: number } | null {
  const path = sim.ballPath;
  if (path.length === 0) return null;
  let last: { p: Vec2; t: number; z: number } | null = null;
  for (const s of path) {
    if (s.t < sim.t) continue;
    if (s.z > a.profile.maxCatchHeight * 0.92) continue;
    if (s.z < 0.25) {
      last = last ?? { p: { x: s.x, y: s.y }, t: s.t, z: s.z };
      break;
    }
    const p = { x: s.x, y: s.y };
    last = { p, t: s.t, z: s.z };
    const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, p, a.profile.reach * 0.8);
    if (tt <= s.t - sim.t) return { p, t: s.t, z: s.z };
  }
  return last;
}

/** After the catch (or on runs): block the most dangerous unblocked defender. */
export class DownfieldBlocker implements Behavior {
  readonly kind = 'downfield-block';
  private target: Agent | null = null;
  private retargetAt = 0;

  update(a: Agent, sim: PlaySim): MoveCommand {
    const c = sim.carrier;
    if (!c || c.team !== a.team || c === a) return stand();
    if (a.engagement) return stand();
    if (sim.t >= this.retargetAt || !this.target || this.target.engagement || this.target.isDown(sim.t)) {
      this.retargetAt = sim.t + 0.3;
      this.target = pickBlockTarget(a, sim, c);
    }
    const d = this.target;
    if (!d) return goTo(a, { x: c.pos.x + 4 * sim.attackDir(a.team), y: c.pos.y }, { speed: 0.8 });
    // Fit between the defender and the carrier.
    const toC = norm(sub(c.pos, d.pos));
    const fit = { x: d.pos.x + toC.x * 0.8, y: d.pos.y + toC.y * 0.8 };
    const dd = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
    if (dd < a.profile.radius + d.profile.radius + 0.25) {
      const drive = norm(sub(d.pos, c.pos));
      sim.engage(a, d, 'run', drive);
      return stand();
    }
    // Jog until the block is close; then close hard.
    return runThrough(a, fit, { speed: dd > 5 ? 0.7 : 0.95 });
  }
}

export function pickBlockTarget(a: Agent, sim: PlaySim, c: Agent): Agent | null {
  let best: Agent | null = null;
  let bestScore = Infinity;
  const claimed = new Set<Agent>();
  for (const o of sim.teammates(a)) {
    if (o === a) continue;
    const b = o.behavior as { target?: Agent | null };
    if (b && 'target' in b && b.target) claimed.add(b.target);
  }
  for (const d of sim.opponents(a)) {
    if (d.engagement || d.isDown(sim.t) || claimed.has(d)) continue;
    const toCarrier = timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, c.pos, 1);
    const toMe = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) / a.profile.vmax;
    if (toMe > toCarrier + 0.6) continue; // can't get there in time
    const score = toCarrier + 0.6 * toMe;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
