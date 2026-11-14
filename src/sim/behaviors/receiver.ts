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
import type { RouteDef, RouteEnd, RoutePoint } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, goTo, runThrough, stand } from './common.js';
import { HANDS_CUE, noteHands } from '../hands-cue.js';
import { CATCH_CHOICE, chooseCatchPoint, type CatchChoice } from '../catch-choice.js';
import { BALL_EST, LOOK_NECK, PRE_LOOK_LATE, bodyTurnLead } from '../ball-estimate.js';

import { firstBreakDepth, getOffDrive, getOffLoss, inGetOff, LINE_START, routeEffort, routePath, steerRoute, type PathPoint } from '../route-motion.js';
import { installedRead, readRoute, type RouteChoice, type RouteKeyPicture } from '../route-read.js';

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

/** ROUTE_CRAFT (off; ROUTE_CRAFT=1 turns it on; estimated, C14): a receiver on
 * his route who sees a defender in his lane ahead works to a shoulder instead
 * of running through him. The coached rule is the intent (stem to a shoulder,
 * attack leverage, avoid a body in the lane); his route running decides how
 * early he sees it (0.25-0.45 s ahead at his pace), how wide he goes and how
 * much speed he keeps. Side: toward his next break if one is coming, else the
 * defender's open shoulder (away from where the defender sits off his line).
 * The bend costs path length and a little speed (he eases 2-6% through it, NFL
 * receivers 6.7 -> 6.3 yd/s passing a defender); the waypoint and its timing are
 * kept. Nothing forbids contact: a defender who mirrors the step can still get a
 * body on him, and a receiver whose line is clear does not bend. Off, receivers
 * held their line: with a defender 1.5-4 yd ahead on it, 23% went around (NFL
 * 53%) and their bodies touched 40% of the time within 5 yd of the line (NFL
 * 11%) (lane.py, engine-31 vs BDB 2025 weeks 1-3). */
const ROUTE_CRAFT = process.env.ROUTE_CRAFT !== '0';

/** ROUTE_CRAFT: the route command, bent around a defender seen in the lane. */
export function routeCraft(a: Agent, sim: Pick<PlaySim, 'defense' | 'see' | 't'>, cmd: MoveCommand, rr: number, breakSide: number): MoveCommand {
  const speed = Math.hypot(cmd.vel.x, cmd.vel.y);
  if (speed < 1) return cmd;
  const u = { x: cmd.vel.x / speed, y: cmd.vel.y / speed }, n = { x: -u.y, y: u.x };
  const pace = Math.max(1, (Math.hypot(a.vel.x, a.vel.y) + speed) / 2);
  const look = pace * (0.25 + 0.2 * rr) + 1.2;
  let block: { p: Vec2; ahead: number; off: number; clear: number } | null = null;
  for (const d of sim.defense) {
    if (d.isDown(sim.t)) continue;
    const seen = sim.see(a, d);
    const rel = { x: seen.pos.x - a.pos.x, y: seen.pos.y - a.pos.y };
    const closing = Math.max(0.5, pace - (seen.vel.x * u.x + seen.vel.y * u.y));
    const ahead0 = rel.x * u.x + rel.y * u.y;
    if (ahead0 <= 0) continue;
    // Where he will be when the receiver gets there, on the receiver's line.
    const tReach = ahead0 / closing;
    const p = { x: seen.pos.x + seen.vel.x * tReach, y: seen.pos.y + seen.vel.y * tReach };
    const ahead = (p.x - a.pos.x) * u.x + (p.y - a.pos.y) * u.y, off = (p.x - a.pos.x) * n.x + (p.y - a.pos.y) * n.y;
    const clear = a.profile.radius + d.profile.radius + 0.15 + 0.25 * rr;
    if (ahead <= 0 || ahead > look || Math.abs(off) >= clear) continue;
    if (!block || ahead < block.ahead) block = { p, ahead, off, clear };
  }
  if (!block) return cmd;
  const side = breakSide !== 0 ? breakSide : (block.off >= 0 ? -1 : 1);
  const around = { x: block.p.x + n.x * side * block.clear, y: block.p.y + n.y * side * block.clear };
  const dx = around.x - a.pos.x, dy = around.y - a.pos.y, l = Math.hypot(dx, dy) || 1;
  const ease = 0.94 + 0.04 * rr;
  a.tags.add('route-craft');
  return { ...cmd, vel: { x: dx / l * speed * ease, y: dy / l * speed * ease } };
}

/** PRESS_MIRROR (off; see behaviors/defense.ts): a receiver with a pressing
 * corner square in front of him releases around him, not up through him. */
const PRESS_MIRROR = process.env.PRESS_MIRROR !== '0';
/** PRESS_RELEASE (off; with PRESS_MIRROR): a pressed receiver works around
 * the corner from the snap, clear of his body and reach, on his route's side
 * (outside on a vertical) and away from the corner's shade. Tracked pressed
 * gos release outside 84% of the time, 3.5 yd wide by 5 yd; posts, slants and
 * ins release inside (BDB 2025). */
const PRESS_RELEASE = process.env.PRESS_RELEASE !== '0';
/** RELEASE_SEEN (off; RELEASE_SEEN=1 turns it on): a receiver releases around any defender he saw tight over him at
 * the snap (within RELEASE_TIGHT_DEPTH ahead and RELEASE_TIGHT_WIDTH either side, as he saw them), not only the one
 * the defence's call made his press-man corner, an assignment he cannot know. The release side and how cleanly he
 * clears are the existing PRESS_RELEASE technique, on the defender's position as he sees it. */
export const RELEASE_SEEN = process.env.RELEASE_SEEN !== '0';
/** RELEASE_SEEN: "tight over him" at the snap; the NFL press population's 2.5 yd, and over him rather than beside. */
const RELEASE_TIGHT_DEPTH = 2.5, RELEASE_TIGHT_WIDTH = 1.5;
/** RELEASE_THROUGH (off; RELEASE_THROUGH=1 turns it on; estimated, C14): the
 * release is a way to his stem, not a place to stay. Once he has made a press
 * release, stem points just ahead of him (under 1.5 yd) or already level with
 * him that lie back across his release side are behind the release: he runs on
 * from where it put him toward the route's next landmark. The release side is
 * the one he released to (a later jam does not change it). The later landmarks
 * and their timing are unchanged, so a go released wide works back toward its
 * installed line over the next 5 yd and a seam keeps its landmark. Off, a go released 1-3.5 yd outside its 4 yd stem point was
 * steered back to it: once the release let go at 1.6-1.8 s his request pointed
 * back and inside, across the corner on his inside (requests like (-2.9, -5.5)
 * yd/s at 5 yd deep), the mirroring corner slowed with him, and pressed outside
 * gos vs man stood 6.8-7.0 yd deep at 3.0 s (NFL 11.6); 8.2 yd on the
 * four_verts/cover1 fixture. The release itself (its step, width and clearance
 * at the line) is unchanged. */
const RELEASE_THROUGH = process.env.RELEASE_THROUGH !== '0';
/** LINE_START (off; LINE_START=1 turns it on; estimated, C14 release): a receiver's first steps are a get-off, not a
 * sprint start. Out of a two-point stance, eyes on the defender over him and his release plan in mind, he does not
 * push off with his full start force: until he has declared his stem (out of his stance, his first step, and with time
 * to have seen the defender's leverage: his own observation delay) he drives at a share of it, sharper for a better
 * route runner. Estimated: that share (0.5 + 0.2 x route running), standing in for stance mechanics and a release
 * read the engine does not model step by step. The body is unchanged (MoveCommand.drive). The quarterback's forecast
 * of him and his expected break time use the same get-off (route-motion.ts), so his timing moves with the receiver's. Off, every receiver left
 * the line at a full start: 2.2-2.5 yd/s at 0.5 s on every route against the NFL's 1.3-2.0 (1.7 on an off-coverage
 * go), 0.3-0.5 s acceleration about 7.5 yd/s^2 against 4.5, and level with a press corner at 1.5 s against 2.2. */

export class RouteRunner implements Behavior {
  readonly kind = 'route';
  readonly passOption = true;
  path: PathPoint[];
  idx = 0;
  settled = false;
  private pressContact: PressContact | null = null;
  private readonly releasedCorners = new Set<Agent>();
  /** RELEASE_THROUGH: the side of his press release (0 if he had none); kept for the rest of the route. */
  private releaseSide = 0;
  private converted = false;
  private readonly keyMemory = new Map<string, { at: number; picture: RouteKeyPicture }>();
  private routeEnd: RouteEnd;
  /** Passive diagnostic state; never shared with the quarterback's forecast. */
  routeDecision: { at: number; choice: RouteChoice; pictures: readonly RouteKeyPicture[] } | null = null;
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
    this.bornAt = sim.t;
    if (!routeOfAgent.has(a)) routeOfAgent.set(a, `${route.family}:${route.id}`);
    this.fromBackfield = sim.los - a.pos.x > 2;
    this.effort = route.pace !== undefined ? route.pace + 0.04 * (a.r('routeRunning') - 0.5) : routeEffort(route.family, a.r('routeRunning'));
    this.routeEnd = route.end;
    this.path = this.buildPath(a.pos, route.points, route.end === 'continue');
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
    this.breakTime = startDelay + 0.25 + breakDist / (0.85 * this.effort * a.profile.vmax)
      + (LINE_START ? getOffLoss(a.profile, a.r('routeRunning'), this.effort, a.profile.reactionTime, Math.min(breakDist, 8),
        firstBreakDepth(this.start, sim.los, this.path), nearestDefender(a, sim)) : 0);
  }

  private buildPath(start: Vec2, pts: readonly RoutePoint[], extend: boolean): PathPoint[] {
    return routePath(start, this.sim.los, this.outside, pts, extend, this.route.family);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const cmd = this.routeCommand(a, sim);
    const out = LINE_START ? this.getOff(a, sim, cmd) : cmd;
    return BALL_EST ? this.preLook(a, sim, out) : out;
  }

  /** When this route was installed (the snap, or his release on a delayed route): breakTime counts from here. */
  private readonly bornAt: number;
  /** BALL_EST design 4: out of his break, before the throw, he gets his head round to the QB (and his shoulders as
   * far as his head cannot reach him), so he is already looking when the ball leaves. A better route runner leaves
   * it later. Not on a deep route, which does not expect the ball at its stem's break. */
  private preLook(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
    if (sim.ball.kind !== 'held' || sim.ball.carrier !== sim.qb || this.route.family === 'deep') return cmd;
    if (sim.t - this.bornAt < this.breakTime + PRE_LOOK_LATE * a.r('routeRunning')) return cmd;
    sim.ballEstimates.lookAtQB(a, sim);
    const qb = sim.see(a, sim.qb).pos, sp = Math.hypot(cmd.vel.x, cmd.vel.y);
    const heading = sp > 0.4 ? Math.atan2(cmd.vel.y, cmd.vel.x) : (cmd.facing ?? a.facing);
    let d = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x) - heading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const over = Math.abs(d) - LOOK_NECK;
    return over > 0 ? { ...cmd, facing: heading + Math.sign(d) * over } : cmd;
  }

  /** RELEASE_SEEN: the defenders he saw tight over him at the snap (null until his first release check). */
  private tightAtSnap: Agent[] | null = null;
  /** LINE_START: whether he has declared his stem yet. */
  private stemDeclared = false;
  /** LINE_START: how deep his route first breaks. */
  private get breakDepth(): number { return firstBreakDepth(this.start, this.sim.los, this.path); }

  /** LINE_START: how far off him the nearest defender he sees in front of him is (yd). */
  private defenderAhead(a: Agent, sim: PlaySim): number {
    let best = 12;
    for (const d of sim.defense) {
      const seen = sim.see(a, d).pos, ahead = (seen.x - a.pos.x) * sim.attackDir(a.team);
      if (ahead < -0.5) continue;
      best = Math.min(best, Math.hypot(seen.x - a.pos.x, seen.y - a.pos.y));
    }
    return best;
  }

  /** LINE_START: until he has declared his stem, he pushes with a share of his start force. */
  private getOff(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
    if (this.stemDeclared) return cmd;
    if (!inGetOff(Math.hypot(a.pos.x - this.start.x, a.pos.y - this.start.y), sim.t - this.startDelay,
      a.mind.observationDelay(a.profile.reactionTime))) { this.stemDeclared = true; return cmd; }
    return { ...cmd, drive: getOffDrive(a.r('routeRunning'), this.breakDepth, this.defenderAhead(a, sim)) };
  }

  private routeCommand(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.startDelay) return stand(0);
    const rr = a.r('routeRunning');
    const cutSkill = 0.8 + 0.4 * rr;

    const release = this.handleRelease(a, sim);
    if (release) return release;
    if (RELEASE_THROUGH && this.releaseSide !== 0) this.skipReleasedStem(a, this.releaseSide);
    if (sim.scrambleDrill) return this.scrambleDrill(a, sim);
    // Keep the installed route's pace and progress. Private throw attribution
    // does not tell this receiver that his responsibility has ended; the
    // existing catch/assignment transition owns the change to blocking.

    // The installed landmark permits a read, not knowledge of the defensive
    // call. Awareness already affects the acquired picture's processing lag.
    const read = installedRead(this.route);
    const routePictures = !this.converted && read ? this.readKeys(a, sim) : [];
    if (!this.converted && read && a.pos.x >= sim.los + read.depth) {
      this.converted = true;
      const pictures = routePictures;
      const choice = readRoute(read, { start: this.start, pos: a.pos, los: sim.los,
        middleY: FIELD_WIDTH / 2, outside: this.outside }, pictures);
      this.routeDecision = { at: sim.t, choice, pictures };
      const answer = read.answers.find(p => p.id === choice.answer);
      if (answer) {
        this.routeEnd = answer.end;
        this.path = this.buildPath(this.start, answer.points, answer.end === 'continue');
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
      this.settled = this.routeEnd !== 'continue';
      return this.settle(a, sim);
    }
    if (ROUTE_CLEAR && this.fromBackfield) return clearLane(a, sim, cmd);
    if (ROUTE_CRAFT) return routeCraft(a, sim, cmd, rr, this.breakSide(a));
    return cmd;
  }

  /** ROUTE_CRAFT: which way his next break turns relative to his current
   * heading (+1 left, -1 right, 0 none within the next two waypoints). */
  private breakSide(a: Agent): number {
    const sp = Math.hypot(a.vel.x, a.vel.y);
    if (sp < 0.5) return 0;
    const ux = a.vel.x / sp, uy = a.vel.y / sp;
    for (let k = this.idx; k < Math.min(this.path.length, this.idx + 2); k++) {
      const p = this.path[k].p, lat = -(p.x - a.pos.x) * uy + (p.y - a.pos.y) * ux, along = (p.x - a.pos.x) * ux + (p.y - a.pos.y) * uy;
      if (Math.abs(lat) > 1.5 && Math.abs(lat) > 0.4 * Math.abs(along)) return Math.sign(lat);
    }
    return 0;
  }

  /** The same waypoint controller is used by the explicitly seeded QB forecast. */
  private steer(body: Body, st: { idx: number }, rr: number, cutSkill: number): MoveCommand | null {
    return steerRoute(body, st, this.path, this.routeEnd, this.effort, rr, cutSkill);
  }

  /** A route-key look down the stem and across nearby underneath leverage.
   * This models attention, not head anatomy. Sector membership uses the same
   * delayed picture as the read, never the target's hidden current position. */
  private readKeys(a: Agent, sim: PlaySim): RouteKeyPicture[] {
    for (const d of sim.defense) {
      const p = sim.see(a, d), dx = p.pos.x - a.pos.x, dy = p.pos.y - a.pos.y;
      const near = Math.hypot(dx, dy) <= 3;
      if (!near && (dx <= 0 || Math.abs(dy) > dx * 2)) continue;
      this.keyMemory.set(d.player.id, { at: sim.t,
        picture: { id: d.player.id, pos: { ...p.pos }, vel: { ...p.vel }, age: p.age ?? 0 } });
    }
    const pictures: RouteKeyPicture[] = [];
    for (const [id, { at, picture }] of this.keyMemory) {
      const elapsed = Math.max(0, sim.t - at), age = picture.age + elapsed;
      if (age > .5) { this.keyMemory.delete(id); continue; }
      pictures.push({ ...picture, age, pos: { x: picture.pos.x + picture.vel.x * elapsed,
        y: picture.pos.y + picture.vel.y * elapsed } });
    }
    return pictures;
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

  /** RELEASE_THROUGH: the press release carried him wide of his stem. Stem points just ahead of him (under
   * 1.5 yd) that lie back across his release side are behind the release, not still to be run. */
  private skipReleasedStem(a: Agent, side: number): void {
    while (this.idx < this.path.length - 1 && this.path[this.idx].p.x - a.pos.x < 1.5
      && (this.path[this.idx].p.y - a.pos.y) * side < -0.5) this.idx++;
  }

  private skipPassed(a: Agent): void {
    while (this.idx < this.path.length - 1 && this.path[this.idx].p.x < a.pos.x - 0.5) this.idx++;
  }

  private settle(a: Agent, sim: PlaySim): MoveCommand {
    const last = this.path[this.path.length - 1]?.p ?? a.pos;
    if (this.routeEnd === 'continue') {
      // Ran off the end of the route: keep working toward open grass near the sideline.
      return goTo(a, { x: a.pos.x + 3, y: a.pos.y }, { speed: 0.5 });
    }
    // Sit in the window: drift away from the nearest underneath defender.
    let spot = last;
    if (this.routeEnd === 'sitVsZone') {
      let best: RouteKeyPicture | null = null;
      let bd = Infinity;
      for (const d of this.readKeys(a, sim).filter(p => p.age <= .5)) {
        const dd = Math.hypot(d.pos.x - last.x, d.pos.y - last.y);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      if (best && bd < 4) spot = { x: last.x, y: clamp(last.y + Math.sign(last.y - best.pos.y || 1) * (4 - bd) * 0.5, 1.5, FIELD_WIDTH - 1.5) };
    }
    return goTo(a, spot, { speed: 0.6, facing: angleTo(a.pos, sim.see(a, sim.qb).pos) });
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
    if (!p) {
      // PRESS_MIRROR: a pressing corner square in front of him at the line is
      // in his way: he releases around the corner on his route's side
      // before the hands meet, not up through him.
      if (!PRESS_MIRROR) return null;
      // RELEASE_SEEN: the defenders he releases around are the ones he saw tight over him at the snap, whoever
      // they are and whatever they were called to do; their positions are as he sees them.
      if (RELEASE_SEEN && this.tightAtSnap === null) {
        this.tightAtSnap = sim.defense.filter((d) => {
          const s = sim.see(a, d).pos, ahead = s.x - a.pos.x;
          return ahead >= 0 && ahead <= RELEASE_TIGHT_DEPTH && Math.abs(s.y - a.pos.y) <= RELEASE_TIGHT_WIDTH;
        });
      }
      const candidates = RELEASE_SEEN ? this.tightAtSnap ?? [] : sim.defense;
      for (const d of candidates) {
        if (!RELEASE_SEEN) {
          const spot = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots];
          if (!spot?.press || spot.manTarget !== a.slot) continue;
        }
        if (this.releasedCorners.has(d) || usable(d) === 0) continue;
        const dp = RELEASE_SEEN ? sim.see(a, d).pos : d.pos;
        const ahead = dp.x - a.pos.x, lateral = dp.y - a.pos.y;
        // PRESS_RELEASE: from the snap he works around the corner's body and
        // reach, on the side his route goes (outside on a vertical) and away
        // from the corner's shade; the release costs what its width costs.
        const reach = d.player.measurables.armIn / 36 * 0.7;
        const clearance = a.profile.radius + d.profile.radius + 0.2 + (PRESS_RELEASE ? reach : 0);
        if (ahead < 0 || ahead > (PRESS_RELEASE ? 5 : 2.5) || Math.abs(lateral) > clearance + 0.1) continue;
        let side: number;
        if (PRESS_RELEASE) {
          // The side his route breaks to (its first real lateral move); a
          // straight vertical releases outside.
          const turn = this.path.find((pt) => Math.abs(pt.p.y - a.pos.y) > 0.75)?.p.y;
          side = turn !== undefined ? Math.sign(turn - a.pos.y) : this.outside;
          if (Math.sign(-lateral) !== side && Math.abs(lateral) > 0.3) side = Math.sign(-lateral);
        } else {
          const desired = this.path[this.idx]?.p.y ?? a.pos.y;
          side = Math.sign(desired - dp.y) || -Math.sign(lateral) || this.outside;
        }
        this.releaseSide = side;
        return runThrough(a, { x: dp.x, y: dp.y + side * clearance },
          { speed: this.effort, cutSkill: 0.8 + 0.4 * a.r('releaseVsPress') });
      }
      return null;
    }
    const d = p.corner;
    const arm = supportParams(d.profile).armForce * usable(d);
    const overlap = clamp(1 - p.slide / (a.profile.radius + 0.08), 0, 1);
    p.hands.push = arm * (0.35 + 0.65 * d.r('press')) * overlap;
    // A legal palm jam pushes and steers. It cannot tether the receiver by
    // the jersey when he has escaped: no tensile cloth hold is created.
    p.hands.hold = 0;
    p.hands.steer = arm * (0.15 + 0.45 * d.r('press')) * overlap;
    const clearance = a.profile.radius + d.profile.radius + 0.2;
    // The jam's side is toward his path; a release he already made keeps its own side.
    if (this.releaseSide === 0) this.releaseSide = p.side;
    return runThrough(a, { x: d.pos.x + a.profile.radius, y: d.pos.y + p.side * clearance },
      { speed: this.effort, cutSkill: 0.8 + 0.4 * a.r('releaseVsPress') });
  }

}

/** LINE_START: the nearest defender to him at installation (yd), for his expected get-off. */
function nearestDefender(a: Agent, sim: PlaySim): number {
  return sim.defense.reduce((m, d) => Math.min(m, Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y)), 12);
}

/** Each agent's first installed route on this play (family:id), for replay labels only; no behavior reads it. */
export const routeOfAgent = new WeakMap<Agent, string>();

/** Rescued from 83e514a. Coverage/scoring controls are required for promotion. */

/**
 * Track the ball in flight: run to the earliest point on its path that can be
 * reached in time (ball tracking adds delay and error).
 */
export class TrackBall implements Behavior {
  readonly kind = 'track';
  private readonly reactAt: number;
  private readonly err: Vec2;
  /** CATCH_CHOICE: his read of the margins over the defender (s), one error per throw; and his current choice. */
  private readonly judge: number = 0;
  private choice: CatchChoice | null = null;
  private choseAt = -1;
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly fallback: Behavior,
  ) {
    const tr = a.r('ballTracking');
    this.reactAt = sim.t + 0.08 + 0.25 * (1 - tr);
    const dice = sim.dice('track', a);
    this.err = { x: dice.normal(0, 0.5 * (1 - tr)), y: dice.normal(0, 0.5 * (1 - tr)) };
    if (CATCH_CHOICE) this.judge = sim.dice('catch-choice', a).normal(0, 0.1 + 0.2 * (1 - tr));
    a.tags.add('onBall');
  }

  clearPressContact(sim: PlaySim): void {
    const fallback = this.fallback as Behavior & { clearPressContact?: (sim: PlaySim) => void };
    fallback.clearPressContact?.(sim);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind !== 'air') return this.fallback.update(a, sim);
    // BALL_EST design 3: his own perception replaces the legacy reaction gate (in series with it, it delayed him
    // twice). He attends from the release; his head still has to come round at its own rate before he samples.
    if (!BALL_EST && sim.t < this.reactAt) return this.fallback.update(a, sim);
    let spot: { p: Vec2; t: number } | null = null;
    // BALL_EST: his own estimate from the ball he has seen; until he has one he runs his route and looks for it.
    const path = BALL_EST ? sim.ballEstimates.estimate(a, sim) : sim.ballPath;
    if (BALL_EST && !path.length) return lookFor(a, sim, this.fallback.update(a, sim));
    // Design 3 attempt 2: he runs his route until he has found the ball himself (his first sample); his prior and the
    // QB's shoulder line shape his estimate and his head, but his route is the better plan until he has seen it.
    if (BALL_EST && !sim.ballEstimates.lastSeen(a)) {
      // Still on his route; late in the flight (by his estimate) he turns his body to find a ball behind him.
      const due = catchSpot(a, { t: sim.t, ballPath: path });
      const route = this.fallback.update(a, sim);
      return due && due.t - sim.t <= bodyTurnLead(a) ? lookFor(a, sim, route) : route;
    }
    if (CATCH_CHOICE) {
      // Re-read every 0.1 s until the last 0.3 s, then he is committed to the point he chose.
      if (!this.choice || (sim.t - this.choseAt >= 0.1 - 1e-9 && this.choice.t - sim.t > 0.3)) {
        this.choice = chooseCatchPoint(a, sim, this.judge, path) ?? this.choice; this.choseAt = sim.t;
      }
      spot = this.choice;
    }
    spot ??= catchSpot(a, { t: sim.t, ballPath: path });
    if (!spot) return BALL_EST ? lookFor(a, sim, this.fallback.update(a, sim)) : this.fallback.update(a, sim);
    // Under BALL_EST his error is his estimate's; no separate offset.
    const target = BALL_EST ? { ...spot.p } : { x: spot.p.x + this.err.x, y: spot.p.y + this.err.y };
    if (HANDS_CUE) noteHands(a, sim.t, spot.t);
    const dtArr = Math.max(0.05, spot.t - sim.t);
    const dist = Math.hypot(target.x - a.pos.x, target.y - a.pos.y);
    // Arrive on time, keep running through if the ball is leading him.
    const need = dist / dtArr;
    // BALL_EST: he faces where he believes the ball is, not where it is.
    const facing = BALL_EST ? angleTo(a.pos, path[0]) : angleTo(a.pos, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y });
    if (dist < 0.5) return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing };
    const run = { ...runThrough(a, target, { speed: clamp(need / a.profile.vmax, 0.35, 1) }), facing: dist < 3 ? facing : undefined };
    // BALL_EST attempt 3: his head finds the ball for free; his body turns to it only late (route-timed, by skill).
    return BALL_EST && dist >= 3 && spot.t - sim.t <= bodyTurnLead(a) ? lookFor(a, sim, run) : run;
  }
}

/** BALL_EST: to keep sampling the ball he turns his shoulders off his running line only as far as his head cannot
 * point at it (LOOK_NECK; his eyes' range is the slack for his error and his turn lag): a ball behind him costs a
 * turned body, which the facing speed cap prices. */
function lookFor(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  const est = sim.ballEstimates.estimate(a, sim);
  const at = est.length ? est[0] : sim.see(a, sim.qb).pos;
  const sp = Math.hypot(cmd.vel.x, cmd.vel.y);
  const heading = sp > 0.4 ? Math.atan2(cmd.vel.y, cmd.vel.x) : (cmd.facing ?? a.facing);
  const toward = Math.atan2(at.y - a.pos.y, at.x - a.pos.x);
  let d = toward - heading;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const over = Math.abs(d) - LOOK_NECK;
  return over > 0 ? { ...cmd, facing: heading + Math.sign(d) * over } : cmd;
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
