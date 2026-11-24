/** Shared route geometry/control. No agent, perception or live route state. */
import { FIELD_WIDTH, OPP_GOAL_X } from '../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../core/vec.js';
import { arriveVelocity, lateralEnvelope, stepBody, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { RouteDef, RouteEnd, RoutePoint } from '../playbook/types.js';

/** LINE_START (off; LINE_START=1; see behaviors/receiver.ts): the get-off, shared by the receiver, the quarterback's
 * forecast of him and his expected break time, so all three move together; and his approach into a break on his
 * cutting ability. */
export const LINE_START = process.env.LINE_START !== '0';

/** `ext`: a point the path's continuation added past the installed route (to the sideline margin, then up). */
export interface PathPoint { readonly p: Readonly<Vec2>; readonly s: number; readonly ext?: boolean; readonly cut?: boolean; readonly finish?: boolean }

/** ROUTE_FINISH (experimental, off): how an unthrown outward route finishes at the sideline. Off, every `continue` route
 * that runs out of field turns up 40 yd at full speed at 5 yd from the sideline (the flat family 5 yd at .6); at full
 * pace the out, quick out and the back's flat are on that climb by the time a late throw comes, and the quarterback's
 * forecast leads them upfield into the deep defender (route-card staged pairing: 19 of the 47 interceptions ROUTE_EFFORT
 * added had the target on his extension; the verticals' late check-down to the back). As taught, a receiver near the
 * sideline with no throw stops in an athletic position, in bounds, eyes on the quarterback ("If a receiver is 2 yards
 * from the sideline and the quarterback still hasn't thrown the ball, the receiver should stop running and get into an
 * athletic position", fourvertsfootball, the flat route; the out is thrown "as the wide receiver reaches the sideline",
 * fourvertsfootball, the out route); the back on his flat "throttles his route down once he reaches the numbers" and
 * waits there as the check-down (CoachTube, Winning Running Back Drills: the flat route; fourvertsfootball, the check
 * down). Crossers, ins and the flat family keep their extensions (their finish is a separate item, and ROUTE_END's flat
 * rule covers the flat family); what any route does when the quarterback breaks the pocket is the scramble rule's. */
export const ROUTE_FINISH = process.env.ROUTE_FINISH !== '0';
/** ROUTE_LANDMARK (experimental, off): a receiver off the drawn line runs the rest of a breaking route from where he is.
 * On a route with a declared vertex (a cut or a break; not a vertical), the landmark is the break's depth: knocked or bent
 * off his stem, he runs on parallel to it and breaks at the vertex's depth from where he is, the legs after it parallel
 * to the drawn ones, instead of steering back across to the drawn line ("get back vertical into your route and run it
 * correctly at the right depth", a receiver-lecture outline, unverified; "win back the route space", USA Football,
 * checked). A vertical's landmark is lateral (its hash or numbers: "outside receivers working to their hash landmark",
 * USA Football, checked), so a go, seam or fade is unchanged. The quarterback's forecast steers the same rule from his
 * own picture (receiver-forecast.ts). Witness: concept-menu's hitch_post #2 post, bent 2.5 yd inside his stem by
 * CRAFT_HOLD round the safety, steered back out across to the drawn line from 2.55 s. */
export const ROUTE_LANDMARK = process.env.ROUTE_LANDMARK !== '0';

/** ROUTE_LANDMARK (attempt 2): whether a route is run from where he is: only a route whose leg leaving its declared vertex
 * breaks inside (toward the ball, by more than a yard). A route breaking toward the sideline keeps its lateral landmark,
 * the break spot toward the numbers. Attempt 1 shifted every route with a declared vertex, the quick out's out-leg among
 * them: on read-plan's press-man quick outs #1, climbing out of his cut more than 1.6 yd off the drawn leg, became
 * 'on his route' to the forecast and was thrown 0.25-0.35 s early, running to the boundary (2 of 6 caught). A settle
 * (hitch, stick) and a vertical keep their spots. */
export function breaksInside(path: readonly PathPoint[], at: number | undefined, outside: number): boolean {
  if (typeof at !== 'number') return false;
  const v = path[at]?.p, w = path[at + 1]?.p;
  return !!v && !!w && (w.y - v.y) * outside < -1;
}

/** ROUTE_LANDMARK: the path as he runs the rest of it from where he is: every point moved by his offset across the leg he
 * is on (the drawn leg into his next point). */
export function landmarkView(path: readonly PathPoint[], idx: number, from: Vec2 | undefined, pos: Vec2): readonly PathPoint[] {
  const tgt = path[idx], prev = idx > 0 ? path[idx - 1].p : from;
  if (!tgt || !prev) return path;
  const lx = tgt.p.x - prev.x, ly = tgt.p.y - prev.y, l2 = lx * lx + ly * ly;
  if (l2 < 1e-9) return path;
  const rx = pos.x - prev.x, ry = pos.y - prev.y, along = (rx * lx + ry * ly) / l2;
  const ox = rx - along * lx, oy = ry - along * ly;
  if (Math.hypot(ox, oy) < 0.05) return path;
  return path.map((q) => ({ ...q, p: { x: q.p.x + ox, y: q.p.y + oy } }));
}

export function routePath(start: Vec2, los: number, outside: number, pts: readonly RoutePoint[],
  extend: boolean, family: RouteDef['family']): PathPoint[] {
  const endX = OPP_GOAL_X + 8.5;
  // SEAM_LANDMARK (routes.ts): a point's `room` is a field landmark (room to his sideline), never inside his alignment.
  const sideline = outside > 0 ? FIELD_WIDTH : 0;
  const lateral = (rp: RoutePoint): number => {
    if (rp.room === undefined) return start.y + rp.l * outside;
    const y = sideline - outside * rp.room;
    return (y - start.y) * outside > 0 ? y : start.y;
  };
  const out: PathPoint[] = pts.map(rp => ({
    p: { x: Math.min(endX, los + rp.d), y: clamp(lateral(rp), 1.2, FIELD_WIDTH - 1.2) }, s: rp.s ?? 1, ...(rp.cut ? { cut: true } : {}),
  }));
  // ROUTE_EFFORT: the through speed at a declared break by its type, from the route's own geometry.
  if (extend && out.length >= 1) {
    const last = out[out.length - 1].p;
    const prev = out.length >= 2 ? out[out.length - 2].p : start;
    const d = norm(sub(last, prev));
    const lo = 5, hi = FIELD_WIDTH - 5;
    let k = 40;
    if (d.y < -1e-6) k = Math.min(k, (last.y - lo) / -d.y);
    if (d.y > 1e-6) k = Math.min(k, (hi - last.y) / d.y);
    // The called route may already end outside this continuation margin.
    // Turn up from there; a negative extension retraces the completed route.
    k = Math.max(0, k);
    const edge = { x: Math.min(endX, last.x + d.x * k), y: last.y + d.y * k };
    // ROUTE_FINISH: an outward route that runs out of field (the out, quick out, deep out; the back's flat, out and swing)
    // finishes at the margin: he stops there, in bounds and facing his quarterback, instead of turning up 40 yd.
    if (ROUTE_FINISH && k < 39 && d.y * outside > 1e-6 && (family === 'quick' || family === 'intermediate' || family === 'back')) {
      if (k > 0) out.push({ p: edge, s: 0, ext: true, finish: true });
      else out[out.length - 1] = { ...out[out.length - 1], s: 0, finish: true };
      return out;
    }
    if (k < 39) {
      const up = family === 'flat' ? 5 : 40;
      if (k > 0) out.push({ p: edge, s: 0.75, ext: true });
      out.push({ p: { x: Math.min(endX, edge.x + up), y: edge.y }, s: family === 'flat' ? 0.6 : 1, ext: true });
    } else out.push({ p: edge, s: 1, ext: true });
  }
  return out;
}

/** ROUTE_EFFORT (experimental, off): every route family is run at full speed, as coached ("routes must be ran at full
 * speed"; the stem is sold at full speed so the defender must respect the vertical, and the receiver separates at the
 * break: "the brake is the move and the throttle is the finish"). The coached reasons to slow are already their own
 * mechanisms here: the deceleration into a break (the route law's through-speed at a corner), the settle or sit at a
 * route's end (`settle`, `sitVsZone`), and the timing with the drop (route depth and the break). Off, each family carries
 * a constant under 1 (quick .78, flat .80, back .80, cross .84, intermediate .86, deep .94, plus 0.04 x (route running -
 * 0.5)), from the 2026-10-08 movement calibration against tracking (df08fff7), with no coached reason of its own: it
 * caps a TE's over at 7.2 yd/s against the NFL TE crosser's 7.4 at 3.0 s (Tools, docs/reviews/2026-11-14-route-speed.md).
 * A route's own tracked `pace` (the back's check-release flat) is unchanged. */
const ROUTE_EFFORT = process.env.ROUTE_EFFORT === '1';
/** ROUTE_EFFORT: the pace of the stem only. What he brings through each break (s) and whether a break is a cut or a roll
 * are declared per route point in the route table (src/playbook/routes.ts, ROUTE_EFFORT), each with its coaching source. */
export function routeEffort(family: RouteDef['family'], rr: number): number {
  if (ROUTE_EFFORT) return 1;
  const base = { quick: 0.78, flat: 0.8, back: 0.8, cross: 0.84, intermediate: 0.86, deep: 0.94 };
  return clamp(base[family] + 0.04 * (rr - 0.5), 0.7, 0.98);
}

/** ROUTE_FILLET (experimental, off; ROUTE_FILLET=1 turns it on): a corner is led, not point-turned. The follower used to steer
 * at each vertex with a speed cap that assumes a 1.3 yd corner, so a rolled bend was taken slowly and the body then swung
 * about 2 yd outside the next leg; an NFL receiver starts the turn before the vertex and passes inside it
 * (docs/reviews/2026-11-14-route-speed.md: cut 0.5-0.8 yd, radius 6-10 yd on a rolled bend, about 3 yd on a 90 degree plant).
 * With the flag the declared through speed `s` still says what the route asks (a speed cut s .4, a rolled bend s .85-.9), and
 * the corner is a fillet: on his usable lateral acceleration aLat = lateral * cutSkill the radius at that speed is v^2 / aLat, he
 * starts the turn T = R tan(theta / 2) before the vertex (never more than LEAD of an adjacent leg shared with a neighbouring corner; the first leg is his alone), at the speed he can have at the vertex (his speed along the leg under his own acceleration over the distance to it, up to the declared through speed), planned once per corner, and if the legs do
 * not leave room for that radius the speed through it is sqrt(aLat * R) on the radius that does fit. Once begun, the turn
 * is carried to its exit point (a goal that persists), then the next leg is followed. Cut skill acts through aLat only. */
export const ROUTE_FILLET = process.env.ROUTE_FILLET !== '0';
/** PLANT_REACH (experimental, off): a planted break is reached before the route follower moves past it (see `steerRoute`). */
const PLANT_REACH = process.env.PLANT_REACH !== '0';
/** CRAFT_HOLD (off; see behaviors/receiver.ts): rejoining the route ahead after a bend round a man. */
const CRAFT_HOLD = process.env.CRAFT_HOLD !== '0';
/** The share of the shorter adjacent leg a corner may use to lead its turn (two neighbouring corners then never overlap). */
const FILLET_LEAD = 0.6;
/** A turn this small is followed straight; there is nothing to lead. */
const FILLET_MIN_TURN = 12 * Math.PI / 180;
export interface FilletTurn { readonly idx: number; readonly exit: Readonly<Vec2>; readonly speed: number }
/** The corner he has planned (made once, when he first heads for it): the lead and the speed he plans to carry into the turn. */
export interface FilletPlan { readonly idx: number; readonly lead: number; readonly speed: number }
export interface RouteCursor { idx: number; from?: Vec2; turn?: FilletTurn | null; plan?: FilletPlan | null }

export function steerRoute(body: Body, st: RouteCursor, installed: readonly PathPoint[], end: RouteEnd,
  effort: number, rr: number, cutSkill: number, landmark = false): MoveCommand | null {
  if (ROUTE_FILLET && st.idx === 0 && !st.from) st.from = { x: body.pos.x, y: body.pos.y };
  if (st.turn && st.turn.idx !== st.idx) st.turn = null; // something else moved his place on the route: that turn is over
  if (st.plan && st.plan.idx !== st.idx) st.plan = null;
  for (let guard = 0; guard < 6; guard++) {
    // ROUTE_LANDMARK: the rest of a breaking route from where he is.
    const path = ROUTE_LANDMARK && landmark ? landmarkView(installed, st.idx, st.from, body.pos) : installed;
    const tgt = path[st.idx], next = path[st.idx + 1];
    if (!tgt) return null;
    const vtop = body.profile.vmax * effort;
    if (ROUTE_FILLET && st.turn && st.turn.idx === st.idx && next) {
      // Carry the turn he began to its exit point on the next leg.
      const E = st.turn.exit, dE = Math.hypot(E.x - body.pos.x, E.y - body.pos.y);
      const bx = next.p.x - tgt.p.x, by = next.p.y - tgt.p.y, bl = Math.hypot(bx, by) || 1;
      const beyond = (body.pos.x - E.x) * bx / bl + (body.pos.y - E.y) * by / bl > 0;
      if (dE < 0.6 || (beyond && dE < 2)) { st.idx++; st.turn = null; continue; }
      return { vel: { x: (E.x - body.pos.x) / dE * st.turn.speed, y: (E.y - body.pos.y) / dE * st.turn.speed }, cutSkill };
    }
    const d = Math.hypot(tgt.p.x - body.pos.x, tgt.p.y - body.pos.y);
    // PLANT_REACH: a planted break (a declared cut) is passed only once he has reached it along the leg he is on.
    // `passed` asks only that he be within 2 yd and ahead of it along the NEXT leg; an exit leg that comes back toward the
    // line (out 10 -> 9.5 yd, deep out, comeback, curl) puts every point short of the vertex ahead of it, so the cursor left
    // the out's plant 1.7 yd early and he asked for 8.9 yd/s into the cut (staged double_outs: arrives 4.7 yd/s, the dig 3.75).
    // Only where the exit leg comes back (its direction against the leg in): a cut whose exit goes on (the slant) is
    // still passed by `passed`, so a release that already carried him onto the next leg is not taken back to the plant.
    const reached = !(PLANT_REACH && tgt.cut && next) || (() => {
      const prev = st.idx > 0 ? path[st.idx - 1].p : st.from;
      if (!prev) return true;
      const returns = (next.p.x - tgt.p.x) * (tgt.p.x - prev.x) + (next.p.y - tgt.p.y) * (tgt.p.y - prev.y) < 0;
      return !returns || (body.pos.x - tgt.p.x) * (tgt.p.x - prev.x) + (body.pos.y - tgt.p.y) * (tgt.p.y - prev.y) > 0;
    })();
    if (d < 0.6 || (next && reached && passed(body.pos, tgt.p, next.p))) { st.idx++; st.turn = null; continue; }
    // CRAFT_HOLD: a receiver bent off his stem round a man rejoins his route on the leg ahead. He is past a point he is
    // beyond along both its legs, however far to the side, and a point the route runs straight through (a turn too small
    // to lead) is only a marker on his stem once he is a yard off it: he runs for the next point, not flat back to the
    // marker (gun_wing_12 cover6 seam, released 2.9 yd outside the end: cut back flat to his 4-yd point at 2.9 yd/s,
    // then ran back down his route to it at 2.8 s).
    if (CRAFT_HOLD && next && !tgt.cut) {
      const prev = st.idx > 0 ? path[st.idx - 1].p : st.from;
      if (prev) {
        const lx = tgt.p.x - prev.x, ly = tgt.p.y - prev.y, l1 = Math.hypot(lx, ly), bx = next.p.x - tgt.p.x, by = next.p.y - tgt.p.y;
        const straight = l1 > 1e-6 && Math.acos(clamp((lx * bx + ly * by) / (l1 * (Math.hypot(bx, by) || 1)), -1, 1)) < FILLET_MIN_TURN;
        const offLeg = l1 > 1e-6 ? Math.abs((body.pos.x - prev.x) * ly - (body.pos.y - prev.y) * lx) / l1 : 0;
        if ((beyond(body.pos, tgt.p, prev, tgt.p) && beyond(body.pos, tgt.p, tgt.p, next.p)) || (straight && offLeg > 1)) {
          st.idx++; st.turn = null; continue;
        }
      }
    }
    const isLast = st.idx === path.length - 1;
    let through = isLast && end !== 'continue' ? 0 : tgt.s * vtop * clamp(0.82 + 0.3 * rr, 0, 1);
    // LINE_START: into a break he slows on what he can cut on (his lateral control, by technique), not on his
    // full braking, so he carries only the speed his cutting ability lets him take through it.
    const decel = LINE_START && next ? Math.min(body.profile.brake, body.profile.lateral * cutSkill) * 0.8 : undefined;
    // A point declared a cut keeps the vertex law (a plant, no lead); every other corner is led.
    if (ROUTE_FILLET && next && !tgt.cut) {
      const ax = (tgt.p.x - body.pos.x) / d, ay = (tgt.p.y - body.pos.y) / d;
      const bx = next.p.x - tgt.p.x, by = next.p.y - tgt.p.y, bl = Math.hypot(bx, by) || 1;
      const prev = st.idx > 0 ? path[st.idx - 1].p : st.from ?? body.pos;
      const l1 = Math.hypot(tgt.p.x - prev.x, tgt.p.y - prev.y);
      // The turn is the route's, from its own legs, not from where his body happens to be pointing.
      const lx = l1 > 1e-6 ? (tgt.p.x - prev.x) / l1 : ax, ly = l1 > 1e-6 ? (tgt.p.y - prev.y) / l1 : ay;
      const theta = Math.acos(clamp(lx * bx / bl + ly * by / bl, -1, 1));
      if (theta > FILLET_MIN_TURN && bl > 1) {
        const tn = Math.tan(theta / 2);
        if (!st.plan) {
          // The speed he will carry into the corner is the speed he can have there: his speed along the leg now, built under his own
          // acceleration over the distance to the vertex, never above the declared through speed. A corner near the line is
          // small because he is slow.
          const v0 = Math.max(0, body.vel.x * lx + body.vel.y * ly);
          const reach = speedAfter(v0, vtop, body.profile.tau, d);
          const carry = Math.min(through, reach);
          // What the legs will give him at that speed (the body's own envelope: the high-speed derate and fatigue included), so the
          // plan never asks for more turn than he has.
          const aLat = Math.max(0.5, lateralEnvelope(body, carry, cutSkill));
          // The leg he leaves the line on has no corner behind it to share it with, so he may use all of it.
          const lead = Math.min(carry * carry / aLat * tn, st.idx === 0 ? l1 : FILLET_LEAD * l1, FILLET_LEAD * bl);
          st.plan = { idx: st.idx, lead, speed: Math.min(carry, Math.sqrt(aLat * lead / tn)) };
        }
        const { lead, speed } = st.plan;
        if (d <= lead) { st.turn = { idx: st.idx, exit: { x: tgt.p.x + bx / bl * lead, y: tgt.p.y + by / bl * lead }, speed }; continue; }
        const entry = { x: body.pos.x + ax * (d - lead), y: body.pos.y + ay * (d - lead) };
        return { vel: arriveVelocity(body, entry, vtop, speed, decel), cutSkill };
      }
    }
    if (next) {
      const ax = tgt.p.x - body.pos.x, ay = tgt.p.y - body.pos.y;
      const bx = next.p.x - tgt.p.x, by = next.p.y - tgt.p.y;
      const cosT = (ax * bx + ay * by) / ((Math.hypot(ax, ay) || 1) * (Math.hypot(bx, by) || 1));
      through = Math.min(through, Math.sqrt((body.profile.lateral * cutSkill * 1.3) / Math.max(0.04, 1 - cosT)));
    }
    // ROUTE_FILLET: he is taken to be at a vertex at 0.6 yd, where nothing brakes him for it any more, but the arrive law reaches its through
    // speed 0.15 yd short of the point it is given, so it let him cross the switch 0.45 yd of braking early (a cut planned at 3.1 yd/s was crossed
    // at 4.1). Aim it at the switch, so the through speed is the speed at which the corner is taken.
    if (ROUTE_FILLET && next && d > 0.6) {
      const pull = Math.min(0.45, d - 0.15), ux = (tgt.p.x - body.pos.x) / d, uy = (tgt.p.y - body.pos.y) / d;
      return { vel: arriveVelocity(body, { x: tgt.p.x - ux * pull, y: tgt.p.y - uy * pull }, vtop, through, decel), cutSkill };
    }
    return { vel: arriveVelocity(body, tgt.p, vtop, through, decel), cutSkill };
  }
  return null;
}

/** His speed after covering `d` yd from speed v0 under the body's own drive law (a = (V - v) / tau, which `stepBody`'s sprint
 * is built on): v(t) = V - (V - v0) e^(-t/tau), distance V t - (V - v0) tau (1 - e^(-t/tau)); the t that covers d, found by bisection. */
export function speedAfter(v0: number, V: number, tau: number, d: number): number {
  if (V <= v0 || d <= 0) return v0;
  const dist = (t: number) => V * t - (V - v0) * tau * (1 - Math.exp(-t / tau));
  let lo = 0, hi = 1;
  while (dist(hi) < d && hi < 60) hi *= 2;
  for (let i = 0; i < 40; i++) { const mid = 0.5 * (lo + hi); if (dist(mid) < d) lo = mid; else hi = mid; }
  return V - (V - v0) * Math.exp(-0.5 * (lo + hi) / tau);
}

/** He is past `wp` along the direction from `a` to `b`. */
function beyond(pos: Vec2, wp: Vec2, a: Vec2, b: Vec2): boolean {
  return (pos.x - wp.x) * (b.x - a.x) + (pos.y - wp.y) * (b.y - a.y) > 0;
}

function passed(pos: Vec2, wp: Vec2, next: Vec2): boolean {
  const sx = next.x - wp.x, sy = next.y - wp.y;
  return (pos.x - wp.x) * sx + (pos.y - wp.y) * sy > 0 && Math.hypot(pos.x - wp.x, pos.y - wp.y) < 2;
}

/** LINE_START: his first step out of the stance (yd). */
export const GETOFF_STEP = 0.5;
/** LINE_START: the share of his start force he chooses to push with until he declares his stem (estimated). Out of
 * the stance he is reading the defender and keeping himself able to react: the deeper his first break, the harder
 * he can drive (a go with a free release nearly full; a slant or flat that cuts within two or three steps less);
 * a defender in his face lowers it (the release comes first), one well off raises it; route running sharpens it.
 * Range about 0.3-0.85: even a free go is not driven at a full start. The cost it stands in for: in our body a full forward push spends the whole friction ellipse,
 * leaving no lateral authority for those steps, but nothing in the receiver's controller yet values keeping that
 * authority while he reads; this share is that value. */
export function getOffDrive(routeRunning: number, breakDepth: number, defenderAhead: number): number {
  const route = 0.4 + 0.03 * clamp(breakDepth, 0, 10);
  const defender = 0.05 * clamp((defenderAhead - 4.5) / 2.5, -1, 1);
  return clamp(route + defender + 0.15 * (routeRunning - 0.5), 0.3, 1);
}

/** LINE_START: how deep (yd past the line) his route first turns by 35 degrees or more from its stem; 10 if not within 10. */
export function firstBreakDepth(start: Vec2, los: number, path: readonly PathPoint[]): number {
  let prev = start, dir: Vec2 | null = null;
  for (const pt of path) {
    const seg = { x: pt.p.x - prev.x, y: pt.p.y - prev.y }, l = Math.hypot(seg.x, seg.y);
    if (l < 1e-6) continue;
    const u = { x: seg.x / l, y: seg.y / l };
    if (dir && u.x * dir.x + u.y * dir.y < Math.cos(35 * Math.PI / 180)) return clamp(Math.abs(prev.x - los), 0, 10);
    dir = dir ?? u; prev = pt.p;
  }
  return 10;
}
/** LINE_START: still getting off the line: inside his first step, or before he has had time to read the defender. */
export function inGetOff(fromStart: number, sinceStart: number, readTime: number): boolean {
  return fromStart < GETOFF_STEP || sinceStart < readTime;
}
/** LINE_START: the time the get-off costs him to reach `depth` yd from a standstill, against a full start, from the
 * same body law (a straight run at route effort). Used for his expected break time. */
export function getOffLoss(profile: Readonly<PhysicalProfile>, routeRunning: number, effort: number, readTime: number,
  depth: number, breakDepth: number, defenderAhead: number): number {
  const dt = 0.02;
  const run = (getoff: boolean): number => {
    const body: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, sprintLoad: 0, profile: profile as PhysicalProfile };
    for (let t = 0; t < 4; t += dt) {
      const cmd: MoveCommand = { vel: { x: profile.vmax * effort, y: 0 } };
      if (getoff && inGetOff(body.pos.x, t, readTime)) cmd.drive = getOffDrive(routeRunning, breakDepth, defenderAhead);
      stepBody(body, cmd, dt);
      if (body.pos.x >= depth) return t + dt;
    }
    return 4;
  };
  return Math.max(0, run(true) - run(false));
}
