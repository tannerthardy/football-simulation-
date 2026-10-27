/**
 * Receivers: route running (release vs. press, stems, breaks governed by
 * route-running skill and the traction ellipse, option routes that convert
 * vs. man/zone), tracking the ball in flight, and blocking after the catch.
 */
import { FIELD_WIDTH, OPP_GOAL_X } from '../../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, fatigueFactor, type Body, type MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { availability, supportParams } from '../../physics/support.js';
import type { HandJoint } from '../../physics/world.js';
import type { RouteDef, RoutePoint } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, goTo, runThrough, stand } from './common.js';

import { routeEffort, routePath, steerRoute, type PathPoint } from '../route-motion.js';

/** A palm contact, not an outcome of a once-per-snap skill contest. The
 * torso is still a compact body: the small hand slide below is the part of
 * hand placement we retain without simulating individual arm bones. */
interface PressContact {
  corner: Agent;
  hands: HandJoint;
  side: number;
  tangent: Vec2;
  relative: Vec2;
  slide: number;
  loaded: boolean;
  at: number;
}

/** ROUTE_CLEAR (G5, default on; ROUTE_CLEAR=0 turns it off): a back
 * releasing from the backfield who sees a body in his lane (a teammate, or a
 * defender coming at the backfield) bends around it, instead of steering
 * straight at his waypoint and running into it. A back's flat release ran
 * into a tackle setting deep (3.5 to 1.9 yd/s at 0.9 s, KNOWN_PROBLEMS
 * PRO-1). Receivers at the line keep their release and press contact. */
const ROUTE_CLEAR = process.env.ROUTE_CLEAR !== '0';

/** Bend a route request around the nearest body seen in the lane ahead
 * (where it will be when the runner gets there), passing it at bodies' width
 * plus a quarter yard on the side he is already on, unless another body
 * closes that side (a blocker and his man): then around the other side. */
function clearLane(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  const speed = Math.hypot(cmd.vel.x, cmd.vel.y);
  if (speed < 0.5) return cmd;
  const u = { x: cmd.vel.x / speed, y: cmd.vel.y / speed };
  const n = { x: -u.y, y: u.x };
  // He gets there at about the mean of his present and requested speeds.
  const pace = Math.max(1, (Math.hypot(a.vel.x, a.vel.y) + speed) / 2);
  const look = 0.8 * pace + 1;
  if (a.pos.x >= sim.los) return cmd;
  const bodies: Array<{ p: Vec2; clear: number; ahead: number; off: number }> = [];
  for (const o of sim.agents) {
    if (o === a || o.isDown(sim.t)) continue;
    const seen = sim.see(a, o);
    if (o.team !== a.team && seen.vel.x > -1) continue;
    const reach = Math.max(0, (seen.pos.x - a.pos.x) * u.x + (seen.pos.y - a.pos.y) * u.y) / pace;
    const p = { x: seen.pos.x + seen.vel.x * reach, y: seen.pos.y + seen.vel.y * reach };
    const ahead = (p.x - a.pos.x) * u.x + (p.y - a.pos.y) * u.y;
    if (ahead <= 0 || ahead >= look + 2) continue;
    bodies.push({ p, ahead, off: (p.x - a.pos.x) * n.x + (p.y - a.pos.y) * n.y,
      clear: a.profile.radius + o.profile.radius + 0.25 });
  }
  let block: (typeof bodies)[number] | null = null;
  for (const o of bodies) if (o.ahead < look && Math.abs(o.off) < o.clear && (!block || o.ahead < block.ahead)) block = o;
  if (!block) return cmd;
  const around = (side: number): Vec2 => ({ x: block!.p.x + n.x * side * block!.clear, y: block!.p.y + n.y * side * block!.clear });
  const open = (q: Vec2): boolean => bodies.every(o => o === block || Math.hypot(o.p.x - q.x, o.p.y - q.y) >= o.clear);
  let side = block.off >= 0 ? -1 : 1;
  if (!open(around(side)) && open(around(-side))) side = -side;
  const go = norm(sub(around(side), a.pos));
  return { ...cmd, vel: { x: go.x * speed, y: go.y * speed } };
}

export class RouteRunner implements Behavior {
  readonly kind = 'route';
  readonly passOption = true;
  path: PathPoint[];
  idx = 0;
  settled = false;
  private pressContact: PressContact | null = null;
  private readonly releasedCorners = new Set<Agent>();
  private converted = false;
  private readAt: number;
  private readonly start: Vec2;
  /** Released from the backfield (2+ yd behind the line), not the line. */
  private readonly fromBackfield: boolean;
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
    this.fromBackfield = sim.los - a.pos.x > 2;
    this.effort = routeEffort(route.family, a.r('routeRunning'));
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
    return routePath(start, this.sim.los, this.outside, pts, extend, this.route.family);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.startDelay) return stand(0);
    const rr = a.r('routeRunning');
    const cutSkill = 0.8 + 0.4 * rr;

    const release = this.handleRelease(a, sim);
    if (release) return release;
    if (sim.scrambleDrill) return this.scrambleDrill(a, sim);
    // Keep the installed route's pace and progress. Private throw attribution
    // does not tell this receiver that his responsibility has ended; the
    // existing catch/assignment transition owns the change to blocking.

    // Option routes read the coverage once.
    if (!this.converted && sim.t >= this.readAt && this.route.end === 'sitVsZone') {
      this.converted = true;
      const misread = sim.dice('route', a).chance(0.15 * (1 - a.r('awareness')));
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
    return ROUTE_CLEAR && this.fromBackfield ? clearLane(a, sim, cmd) : cmd;
  }

  /** The same waypoint controller is used by the explicitly seeded QB forecast. */
  private steer(body: Body, st: { idx: number }, rr: number, cutSkill: number): MoveCommand | null {
    return steerRoute(body, st, this.path, this.route.end, this.effort, rr, cutSkill);
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

  /** Remove this technique's constraint before a ball event replaces its
   * controller. Other blocks/grasp joints remain owned by their techniques. */
  clearPressContact(sim: PlaySim): void {
    const p = this.pressContact;
    if (!p) return;
    this.recordJam(sim, p);
    sim.world.joints = sim.world.joints.filter((j) => j !== p.hands);
    this.releasedCorners.add(p.corner);
    this.pressContact = null;
  }

  private recordJam(sim: PlaySim, p: PressContact): void {
    // Record the force that was actually applied even when the next visible
    // state already escaped the hand. A one-frame jam is still contact.
    if (!p.loaded && Math.abs(p.hands.normalForce ?? 0) + Math.abs(p.hands.tangentForce ?? 0) > 1e-6) {
      p.loaded = true;
      const receiver = sim.offense.find((a) => a.body === p.hands.b);
      if (receiver) sim.event('jam', p.corner, receiver);
    }
  }

  private handleRelease(a: Agent, sim: PlaySim): MoveCommand | null {
    const usable = (p: Agent): number => p.isDown(sim.t) ? 0 : p.body.support
      ? availability(p.body.support, supportParams(p.profile), fatigueFactor(p.body.energy)) : 1;
    const reach = (d: Agent): number => d.profile.radius + a.profile.radius + d.player.measurables.armIn / 36 * 0.7;
    const facingReceiver = (d: Agent, relative: Vec2): boolean => {
      const dist = Math.hypot(relative.x, relative.y) || 1;
      return (Math.cos(d.facing) * relative.x + Math.sin(d.facing) * relative.y) / dist > 0.3;
    };
    const stop = () => this.clearPressContact(sim);

    // Beyond five yards the defender must cover rather than initiate or
    // sustain a release jam. A thrown ball also changes the players' task.
    if (a.pos.x > sim.los + 5 || sim.ball.kind !== 'held' || sim.scrambleDrill || usable(a) === 0) {
      if (this.pressContact) stop();
      return null;
    }
    if (this.pressContact) {
      const p = this.pressContact, d = p.corner;
      this.recordJam(sim, p);
      const relative = sub(a.pos, d.pos), dist = Math.hypot(relative.x, relative.y);
      if (!sim.world.joints.includes(p.hands) || dist > reach(d) || usable(d) === 0 || !facingReceiver(d, relative)
        || d.engagement || a.engagement) {
        stop();
        return null;
      }
      // A palm follows the chest at a finite rate. Motion across the hand
      // faster than that, plus a receiver's finite swipe against the
      // corner's re-grip, moves it toward the shoulder and off the body.
      // Technique determines hand speed; the world determines whether the
      // feet/body can actually travel against the contact force.
      const travel = Math.abs((relative.x - p.relative.x) * p.tangent.x + (relative.y - p.relative.y) * p.tangent.y);
      const follow = (0.25 + 0.65 * d.r('press')) * usable(d);
      const swipe = (0.15 + 0.9 * a.r('releaseVsPress')) * usable(a);
      const dt = Math.max(0, sim.t - p.at);
      p.slide += Math.max(0, travel - follow * dt) + Math.max(0, swipe - follow) * dt;
      p.relative = relative;
      p.at = sim.t;
      if (p.slide >= a.profile.radius + 0.08) {
        stop();
        return null;
      }
    } else {
      for (const d of sim.defense) {
        const spot = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots];
        if (!spot?.press || spot.manTarget !== a.slot || this.releasedCorners.has(d) || d.engagement || a.engagement || usable(d) === 0) continue;
        const relative = sub(a.pos, d.pos), dist = Math.hypot(relative.x, relative.y);
        if (dist > reach(d) || a.pos.x > d.pos.x + a.profile.radius || !facingReceiver(d, relative)) continue;
        // Two hands cannot simultaneously jam one player and grasp/block
        // another. Contacts owned by another technique have priority.
        if (sim.world.joints.some((j) => j.a === d.body || j.b === d.body || j.a === a.body || j.b === a.body)) continue;
        const desired = this.path[this.idx]?.p.y ?? a.pos.y;
        const side = Math.sign(desired - a.pos.y) || Math.sign(a.pos.y - d.pos.y) || this.outside;
        const hands: HandJoint = { kind: 'hands', a: d.body, b: a.body,
          extension: d.profile.radius + a.profile.radius + d.player.measurables.armIn / 36 * 0.45, push: 0, hold: 0, steer: 0 };
        this.pressContact = { corner: d, hands, side, tangent: { x: -relative.y / (dist || 1), y: relative.x / (dist || 1) },
          relative, slide: 0, loaded: false, at: sim.t };
        sim.world.joints.push(hands);
        break;
      }
    }
    const p = this.pressContact;
    if (!p) return null;
    const d = p.corner;
    const arm = supportParams(d.profile).armForce * usable(d);
    const overlap = clamp(1 - p.slide / (a.profile.radius + 0.08), 0, 1);
    p.hands.push = arm * (0.35 + 0.65 * d.r('press')) * overlap;
    // A legal palm jam pushes and steers. It cannot tether the receiver by
    // the jersey when he has escaped: no tensile cloth hold is created.
    p.hands.hold = 0;
    p.hands.steer = arm * (0.15 + 0.45 * d.r('press')) * overlap;
    const clearance = a.profile.radius + d.profile.radius + 0.2;
    return runThrough(a, { x: d.pos.x + a.profile.radius, y: d.pos.y + p.side * clearance },
      { speed: this.effort, cutSkill: 0.8 + 0.4 * a.r('releaseVsPress') });
  }

}

/** Rescued from 83e514a. Coverage/scoring controls are required for promotion. */
const IN_STRIDE_CATCH = process.env.IN_STRIDE_CATCH === '1';

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
    const dice = sim.dice('track', a);
    this.err = { x: dice.normal(0, 0.5 * (1 - tr)), y: dice.normal(0, 0.5 * (1 - tr)) };
    a.tags.add('onBall');
  }

  clearPressContact(sim: PlaySim): void {
    const fallback = this.fallback as Behavior & { clearPressContact?: (sim: PlaySim) => void };
    fallback.clearPressContact?.(sim);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind !== 'air') return this.fallback.update(a, sim);
    if (sim.t < this.reactAt) return this.fallback.update(a, sim);
    if (IN_STRIDE_CATCH) {
      const spot = strideCatchSpot(a, sim) ?? catchSpot(a, sim);
      if (!spot) return this.fallback.update(a, sim);
      const tx = spot.p.x + this.err.x, ty = spot.p.y + this.err.y;
      const left = Math.max(.15, spot.t - sim.t);
      let vx = a.vel.x + (tx - a.pos.x - a.vel.x * left) / left;
      let vy = a.vel.y + (ty - a.pos.y - a.vel.y * left) / left;
      const v = Math.hypot(vx, vy);
      if (v > a.profile.vmax) { vx *= a.profile.vmax / v; vy *= a.profile.vmax / v; }
      const near = Math.hypot(tx - a.pos.x, ty - a.pos.y) < 3;
      return { vel: { x: vx, y: vy }, facing: near
        ? angleTo(a.pos, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y }) : undefined };
    }
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

/** The reachable catchable point nearest the current running line. This
 * requests movement only; ordinary physical catch resolution is unchanged. */
function strideCatchSpot(a: Agent, sim: PlaySim): { p: Vec2; t: number } | null {
  let best: { p: Vec2; t: number; dev: number } | null = null;
  for (const s of sim.ballPath) {
    const left = s.t - sim.t;
    if (left < 0 || s.z > a.profile.maxCatchHeight * .92) continue;
    if (s.z < .25) break;
    const p = { x: s.x, y: s.y };
    const dev = Math.hypot(p.x - a.pos.x - a.vel.x * left, p.y - a.pos.y - a.vel.y * left);
    if (best && dev >= best.dev) continue;
    const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, p, a.profile.reach * .8);
    if (tt <= left) best = { p, t: s.t, dev };
  }
  return best;
}

/** Earliest reachable point on the ball's remaining flight path for agent `a`. */
export function catchSpot(a: Agent, sim: Pick<PlaySim, 'ballPath' | 't'>): { p: Vec2; t: number; z: number } | null {
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
      if (sim.engage(a, d, 'run', drive)) return stand();
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
