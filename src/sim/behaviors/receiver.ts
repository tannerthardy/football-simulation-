/**
 * Receivers: route running (release vs. press, stems, breaks governed by
 * route-running skill and the traction ellipse, option routes that convert
 * vs. man/zone), tracking the ball in flight, and blocking after the catch.
 */
import { FIELD_WIDTH, OPP_GOAL_X } from '../../core/field.js';
import { neckRange } from '../head.js';
import { servoCommand, servoEngaged } from '../ball-servo.js';
import { angleDiff, clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, fatigueFactor, TRUNK_RANGE, TRUNK_TWIST, type Body, type MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { availability, supportParams } from '../../physics/support.js';
import type { HandJoint } from '../../physics/world.js';
import type { RouteDef, RouteEnd, RoutePoint } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, goTo, runThrough, stand } from './common.js';
import { seenDown, seenTaken } from '../seen-contact.js';
import { HANDS_CUE, noteHands } from '../hands-cue.js';
import { CATCH_CHOICE, chooseCatchPoint, type CatchChoice } from '../catch-choice.js';
import { BALL_EST_RCV as BALL_EST, BALL_EST_GLANCE, SEEN_EMPTY, BALL_EST_DEEP_LOOK, BALL_EST_SERVO, BALL_EST_TRUNK, lookJoints, BALL_EST_MOVING_CHOICE, DEEP_LOOK_DEPTH, DEEP_LOOK_HOLD, LOOK_NECK, neckOf, PRE_LOOK_EARLY, PRE_LOOK_LATE, bodyTurnLead, sideOf } from '../ball-estimate.js';

import { firstBreakDepth, getOffDrive, getOffLoss, inGetOff, LINE_START, routeEffort, routePath, steerRoute, type PathPoint, type RouteCursor, type FilletTurn, type FilletPlan, ROUTE_LANDMARK, breaksInside } from '../route-motion.js';
import { installedRead, readRoute, type RouteChoice, type RouteKeyPicture } from '../route-read.js';
import { BREAK_DECL } from '../../playbook/route-breaks.js';

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
/** RCV_SEEN (experimental, off; intended on once measured; the user's information rule): receivers' and downfield
 * blockers' reads of opponents come from what they see (`seen-contact.ts`): a defender is down when his picture shows
 * him down, and taken when it shows him in contact with one of the observer's teammates, not from his true support
 * state or engagement record; the convoy's target choice, its fit and its timing use the seen defender, and a teammate
 * turns to the convoy when his picture shows the catcher with the ball (`ConvoyCue`), not at the true catch. Contact
 * itself stays physics. Off: the true reads (docs/reviews/2026-11-13-information-leak-sweep.md, Rules + Coaching). */
export const RCV_SEEN = process.env.RCV_SEEN !== '0';
const isDownFor = (a: Agent, sim: PlaySim, o: Agent): boolean => RCV_SEEN ? seenDown(sim, a, o) : o.isDown(sim.t);
const isTakenFor = (a: Agent, sim: PlaySim, d: Agent): boolean => RCV_SEEN ? seenTaken(sim, a, d, 'my-team') : !!d.engagement;

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
    if (o === a || (o.team === a.team ? o.isDown(sim.t) : isDownFor(a, sim as PlaySim, o))) continue;
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
/** STEM_WORK (default on, engine-91; STEM_WORK=0 turns it off): the stem is worked against the leverage of the defender over him, as taught ("attack
 * the defender's leverage": stem at his leverage shoulder to make him open, then break; on a vertical, get on top of him,
 * stacking him). Off, stems are straight lines: NFL stems near the underneath men move 1.40 yd/s laterally 0.5 s before
 * the release, ours 0.22 (sitting routes); verticals 1.05 vs 0.36 (scripts/diag/routes/flow_mix.py, BDB 2025).
 * - The stem is his route's first leg, past 1.5 yd and short of his first point (a vertical's: to 12 yd), on a stem of
 *   5 yd or more: a slant's two or three steps or a quick out is won at the release and the break, and runs straight.
 * - Decided once, from his own picture (the route-key look): the nearest defender in front of him within 10 yd deep and
 *   4 yd across. Leverage 0.75 yd or more off his line: he works toward that shoulder, by up to 1.5 yd and a fifth of the
 *   stem's length. Head-up or no
 *   one over him: he runs straight. The decision holds (no re-aim each tick).
 * - Bounded: the offset is gone 1 yd before the break, faded gently over the 1.5-4 yd before that so the return is not
 *   itself a turn (on a leaning break, the post's or the corner's, it is
 *   back on his line 2 yd before the break, so the return is not run as the lean), so his break point and landmark are unchanged (the QB's
 *   forecast holds). His speed is unchanged: a stem that is not straight is longer, so the break arrives as late as his
 *   body makes it. */
const STEM_WORK = process.env.STEM_WORK !== '0';
const STEM_MIN = 5;

/** ROUTE_END (experimental, off; docs/reviews/2026-11-14-route-end.md): the route's end as coached.
 * - The settle stays alive (hitch, curl, comeback, any `settle` or `sitVsZone` end). After the break he keeps working
 *   from his own picture of the defenders (seen within the last 0.5 s), every tick. Against man (a defender within 2.5 yd
 *   of him) he settles and shields: he slides off the man's side, at his settle depth, then holds with the man on his
 *   back (separating is what a route that keeps running does, not a hitch). Against zone he works his window: between
 *   the nearest underneath defenders either side of him at his depth, or 4 yd off the one who is there, facing the QB, so
 *   the squared-up shuffle's pace is his body's (the facing speed caps), not a pace number. Both goals are placed from
 *   his settle point, not from where he stands (fix 2026-11-14: a goal moved with him each tick, so he never arrived and
 *   ran 3.3-3.6 yd/s after the settle against the NFL's 1.6-2.0). How far he may slide is a choice, not a measurement:
 *   it is how far a settled receiver can move before he is no longer where the quarterback expects him, SETTLE_SHIELD
 *   against man (a body width and a step) and SETTLE_WINDOW in zone (within that, the window he sees decides). No move toward the line or the QB
 *   until the ball is thrown: that is the catch's. Off, a `settle` route stands on its last point; `sitVsZone` drifts once.
 *   NFL WR hitch (not the target, BDB 2025 weeks 1-6): 3.4 / 2.0 / 1.6 yd/s at 2.0 / 2.5 / 3.0 s, no return toward the line
 *   by 3.0 s; ours 2.9 / 0.9 / 0.8.
 * - The flat gears down: past his route's declared points, unthrown, he runs on turned to the QB (the body pays: the
 *   facing caps) and stops in an athletic position 2 yd from the sideline ("If a receiver is 2 yards from the sideline and
 *   the quarterback still hasn't thrown the ball, the receiver should stop running", fourvertsfootball). NFL WR flats:
 *   5.5 -> 4.1 yd/s from 2.0 to 3.0 s, 9.3 yd from the sideline at 3.0 s; ours accelerate to 6.8. */
const ROUTE_END = process.env.ROUTE_END !== '0';
/** ROUTE_END: how far a settled receiver slides from his settle point, against man and in a zone window (yd; a choice). */
const SETTLE_SHIELD = 1.5, SETTLE_WINDOW = 3;


/** BREAK_LOOK (experimental, off; BREAK_LOOK=1; with BALL_EST): a deep-family route the plan throws on its break (its
 * declared throw family, route-breaks.ts `onBreak`: the corner, the post, the seam read) gets the break-timed pre-look as
 * well as design 6's depth look, whichever comes first. Design 6's premise (a deep route does not expect the ball at its
 * stem's break) is true of a go, a fade and a seam (`seenOpen`) and false of a corner or post, which are coached to get the
 * eyes round coming out of the break. Without it a corner broken short of DEEP_LOOK_DEPTH and thrown on the break never
 * looked: under the glance (bit 2048) he had no sample of the ball until his body-turn window, with the ball 150-175 deg
 * behind his hips. The cue is his own route and break, which he knows. A declared clear-out is not looking for the ball,
 * but every declared clear-out (compile.ts CLEAR_OUTS) is a go (`seenOpen`), so none is affected; a concept that declares
 * a corner or post as a clear-out should be read from the installed plan here. */
const BREAK_LOOK = process.env.BREAK_LOOK !== '0';
/** CRAFT_HOLD (experimental, off; with ROUTE_CRAFT): the craft commits to the side it chose round a man in his lane and
 * keeps it until he is clear. Off, the side and the block are recomputed on each tick's picture, and the side comes from
 * a break side re-derived each tick from his velocity, so a wing pressed against an end flips his request +-7 yd/s across
 * nearly every tick (gun_wing_12 cover6, 1.0-1.7 s; Flex): re-aiming and taking it back. With the flag: the side is his
 * route's from the snap when it is clear (the declared break's leg, routeSide, with DECLARED_BREAK), else the side he
 * already holds; held for the episode as a field direction, across whichever man is in the lane, until he has been clear
 * of them for 0.2 s (the bend he committed to runs out that 0.2 s); the bend never takes him back down his route (at least
 * 0.3 of his pace along it) or across to the other side of the man. */
const CRAFT_HOLD = process.env.CRAFT_HOLD !== '0';
/** CRAFT_EXIT (experimental, off; with CRAFT_HOLD): the held side is a commitment about one man and ends with him. It ends
 * when he is past that man in his picture (level or behind, or stepped across his line onto the held side and out of his
 * lane, unless that side is his route's declared one), with no run-out, and at his route's declared break, which the craft
 * never alters; and a declared leg that comes back toward the line (a settle) names no side to hold. Coverage's paired throws (scripts/diag/catch/paired-throws.ts, 289 pairs): with the hold alone a
 * seam held a 73-degree bend round a nickel already level with him and carried it into the ball's flight, and a stick ran
 * straight up its stem through its own break. */
const CRAFT_EXIT = process.env.CRAFT_EXIT !== '0';
const craftHeld = new WeakMap<Agent, { d: Agent; across: Vec2; clear: number; at: number; out?: Vec2; declared?: boolean; seeded?: boolean }>();
/** RELEASE_COMMIT (experimental, off; RELEASE_COMMIT=1; with ROUTE_CRAFT; #35): the release's side seeds the craft's held
 * side for the same man. When he releases round a man (the press release, RELEASE_SEEN's man tight over him at the snap,
 * or a jam he worked off), that side (a field side) is written as the craft's held side for that man, ahead of the
 * route's declared leg, so when the release lets go and the craft finds the same man in his lane it goes round him on
 * the side he already took. One held side, one owner (the craft's hold and its exits, CRAFT_HOLD / CRAFT_EXIT); with
 * CRAFT_HOLD off the seeded side is held for that man alone. When his line runs mostly across the field the field side
 * names no side of the man: he keeps the side of the man he is already on. Off (and with CRAFT_HOLD + CRAFT_EXIT alone),
 * an attached end released round the end over him and, once that end was no longer ahead of him, the craft took him back
 * across the same man's body: staged double_outs, his lateral request reversed within 0.6 s of contact on 58 of 96
 * touched ends (54 with CRAFT_HOLD + CRAFT_EXIT), the craft's man the rusher who hit him on 60 of 62
 * (scripts/diag/pass-operators/attached-release.mts, attached-craft-who.mts). */
const RELEASE_COMMIT = process.env.RELEASE_COMMIT !== '0';
/** RELEASE_COMMIT: his release round `d` on field side `side` (+1 / -1 in y) seeds the craft's held side for that man. */
function seedCraftSide(a: Agent, d: Agent, side: number, rr: number, t: number): void {
  if (!RELEASE_COMMIT || side === 0 || craftHeld.get(a)?.d === d) return;
  craftHeld.set(a, { d, across: { x: 0, y: side }, clear: a.profile.radius + d.profile.radius + 0.15 + 0.25 * rr, at: t, seeded: true });
}

/** ROUTE_CRAFT: the route command, bent around a defender seen in the lane. */
export function routeCraft(a: Agent, sim: Pick<PlaySim, 'defense' | 'see' | 't'>, cmd: MoveCommand, rr: number, breakSide: number, routeDir: Vec2 | null = null, pastBreak = false): MoveCommand {
  // CRAFT_EXIT: at his declared break the hold is over; the break and the leg after it are the route's, crafted per tick.
  // RELEASE_COMMIT: a side seeded by his release is held for its man even without CRAFT_HOLD (its exits are the hold's).
  const SEEDED = RELEASE_COMMIT && !!craftHeld.get(a)?.seeded && !(CRAFT_EXIT && pastBreak);
  const HOLD = (CRAFT_HOLD || SEEDED) && !(CRAFT_EXIT && pastBreak);
  if ((CRAFT_HOLD || RELEASE_COMMIT) && !HOLD) craftHeld.delete(a);
  const speed = Math.hypot(cmd.vel.x, cmd.vel.y);
  if (speed < 1) return cmd;
  const u = { x: cmd.vel.x / speed, y: cmd.vel.y / speed }, n = { x: -u.y, y: u.x };
  const pace = Math.max(1, (Math.hypot(a.vel.x, a.vel.y) + speed) / 2);
  const look = pace * (0.25 + 0.2 * rr) + 1.2;
  let block: { p: Vec2; ahead: number; off: number; clear: number; d?: Agent } | null = null;
  for (const d of sim.defense) {
    if (isDownFor(a, sim as PlaySim, d)) continue;
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
    if (!(ahead <= 0 || ahead > look || Math.abs(off) >= clear)) { if (!block || ahead < block.ahead) block = { p, ahead, off, clear, d }; continue; }
  }
  // CRAFT_HOLD: the side he chose is kept for the whole episode, round whichever man is in his lane, until he has been
  // clear of all of them for 0.2 s (in his picture); re-aiming on the same picture every tick is a dither, not a move.
  const held = HOLD ? craftHeld.get(a) : undefined;
  if (held && !block) {
    const seen = sim.see(a, held.d), rel = { x: seen.pos.x - a.pos.x, y: seen.pos.y - a.pos.y };
    const ahead = rel.x * u.x + rel.y * u.y, off = rel.x * n.x + rel.y * n.y;
    // CRAFT_EXIT: past him (level or behind, in his picture), the commitment is done and his route takes back over at once: a
    // man behind him is not in his lane, and bending round him swings the route off its stem. And a man who has stepped
    // across his line onto the side he held, out of his lane, is passed cleanly on his line: going round him on that side
    // means crossing his face (the mesh crosser's nickel, 1.3 yd onto his held side: the held bend sent the shallow 73
    // degrees upfield). A man beside him on the far side is the commitment working, and it holds;
    // unless the side is his route's declared one (RELEASE_SIDE: the wing's slant goes under the end he lines up behind,
    // whichever way the end moves), which is the route's, not a choice about the man.
    const heldSide = held.across.x * n.x + held.across.y * n.y >= 0 ? 1 : -1;
    if (CRAFT_EXIT && (ahead <= 0 || (!held.declared && off * heldSide > 0 && Math.abs(off) >= held.clear))) craftHeld.delete(a);
    else if (ahead > -0.2 && Math.abs(off) < held.clear + 0.5) block = { p: seen.pos, ahead: Math.max(ahead, 0.1), off, clear: held.clear, d: held.d };
    // Just clear of him: the bend he committed to runs out its 0.2 s before his route takes back over.
    else if (sim.t - held.at <= 0.2 && held.out) return { ...cmd, vel: { x: held.out.x * speed, y: held.out.y * speed } };
    else craftHeld.delete(a);
  }
  if (!block) return cmd;
  const keep0 = HOLD ? craftHeld.get(a) : undefined;
  // RELEASE_COMMIT without CRAFT_HOLD: the hold covers the seeded man alone; any other man is crafted per tick as before.
  const H = HOLD && (CRAFT_HOLD || keep0?.d === block.d);
  const keep = H ? keep0 : undefined;
  // CRAFT_HOLD: the route's side from the snap (its declared break's leg) when it is clear against his line, else the
  // side he holds (a direction on the field: his route command turns under him), else the per-tick break side.
  // CRAFT_EXIT: a leg that comes back toward the line (a stick, hook, curl or comeback settling: its downfield part at least
  // 0.3 of it backward) names no side round a man in his stem: its lateral part is a few tenths of a yard, and read as a
  // side it sent the stick inside the nickel over him. An out's leg (10 yd, then 9.5 yd 12 yd across: 0.04 backward) is
  // a break toward the sideline, and names its side.
  const sideLeg = routeDir && (!CRAFT_EXIT || routeDir.x * u.x + routeDir.y * u.y > -0.3) ? routeDir : null;
  // RELEASE_COMMIT: the side his release seeded for this man comes first, kept as the field side it was seeded as.
  const seed = keep?.seeded && keep.d === block.d ? keep.across.x * n.x + keep.across.y * n.y : null;
  const seedSign = seed === null ? 0 : Math.abs(seed) >= 0.5 ? Math.sign(seed) : 0;
  // A man who has stepped across his line fully onto the release side (out of his lane there) is passed on the side of
  // him he is already on, as when his line runs across the field: going round him on the seeded side crosses his face
  // (Rules' guard, CRAFT_EXIT's stepped-across case).
  const seededSide = seed === null ? 0 : seedSign !== 0 && !(block.off * seedSign > 0 && Math.abs(block.off) >= block.clear) ? seedSign
    : block.off >= 0 ? -1 : 1;
  const declared = H && sideLeg && !seededSide ? sideLeg.x * n.x + sideLeg.y * n.y : 0;
  const side = seededSide ? seededSide : Math.abs(declared) > 0.2 ? Math.sign(declared) : keep ? (keep.across.x * n.x + keep.across.y * n.y >= 0 ? 1 : -1)
    : breakSide !== 0 ? breakSide : (block.off >= 0 ? -1 : 1);
  if (H && block.d) craftHeld.set(a, { d: block.d, across: seededSide ? keep!.across : Math.abs(declared) > 0.2 || !keep ? { x: n.x * side, y: n.y * side } : keep.across, clear: block.clear, at: sim.t, out: keep?.out,
    declared: Math.abs(declared) > 0.2 || (!!keep?.declared && keep.d === block.d), seeded: !!seededSide });
  const around = { x: block.p.x + n.x * side * block.clear, y: block.p.y + n.y * side * block.clear };
  const dx = around.x - a.pos.x, dy = around.y - a.pos.y, l = Math.hypot(dx, dy) || 1;
  const ease = 0.94 + 0.04 * rr;
  a.tags.add('route-craft');
  let ox = dx / l, oy = dy / l;
  // CRAFT_HOLD: the bend goes round the man, never back down his route: at least 0.3 of his pace along it, the rest
  // across on the chosen side (a point beside a man already level with him lies behind him).
  if (H && ox * u.x + oy * u.y < 0.3) {
    const across = Math.sqrt(1 - 0.09);
    ox = 0.3 * u.x + across * n.x * side; oy = 0.3 * u.y + across * n.y * side;
  }
  // CRAFT_HOLD: and never across to the other side of the man than the one he chose: a bend the wrong way is taken back
  // to his line with a lean to his side.
  if (H && (ox * n.x + oy * n.y) * side < 0) {
    const f = Math.max(0.3, ox * u.x + oy * u.y), lean = 0.2, m = Math.hypot(f, lean);
    ox = (f * u.x + lean * n.x * side) / m; oy = (f * u.y + lean * n.y * side) / m;
  }
  if (H) { const h = craftHeld.get(a); if (h) h.out = { x: ox * ease, y: oy * ease }; }
  return { ...cmd, vel: { x: ox * speed * ease, y: oy * speed * ease } };
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
  /** ROUTE_FILLET: the corner turn he has begun, carried to its exit point. */
  turn: FilletTurn | null = null;
  plan: FilletPlan | null = null;
  settled = false;
  private pressContact: PressContact | null = null;
  private readonly releasedCorners = new Set<Agent>();
  /** RELEASE_THROUGH: the side of his press release (0 if he had none); kept for the rest of the route. */
  private releaseSide = 0;
  private converted = false;
  /** STEM_WORK: his stem's decision (null undecided; 0 straight; otherwise the lateral offset he works to, yd). */
  private stemWork: number | null = null;
  private readonly keyMemory = new Map<string, { at: number; picture: RouteKeyPicture }>();
  private routeEnd: RouteEnd;
  /** Passive diagnostic state; never shared with the quarterback's forecast. */
  routeDecision: { at: number; choice: RouteChoice; pictures: readonly RouteKeyPicture[] } | null = null;
  private readonly start: Vec2;
  /** Released from the backfield (2+ yd behind the line), not the line. */
  private readonly fromBackfield: boolean;
  /** Time at which the route's final break is expected (for QB timing). */
  readonly breakTime: number;
  /** DECLARED_BREAK (read by RELEASE_SIDE and CRAFT_HOLD): the direction his route goes from its declared vertex, until
   * he reaches it (the leg leaving it, unit). Spacing passes a teammate on this side instead of the side the geometry
   * leaves him: a wing's slant goes under the end it lines up behind, as taught, not round his outside. */
  routeSide(): { x: number; y: number } | null {
    if (!(process.env.DECLARED_BREAK !== '0')) return null;
    const at = BREAK_DECL[this.route.id]?.at;
    if (typeof at !== 'number' || this.idx > at || !this.path[at + 1]) return null;
    const v = this.path[at].p, n = this.path[at + 1].p, l = Math.hypot(n.x - v.x, n.y - v.y);
    return l > 1e-6 ? { x: (n.x - v.x) / l, y: (n.y - v.y) / l } : null;
  }
  /** CRAFT_EXIT: he has reached his route's declared break (his path cursor is past its vertex). False for a route timed
   * by a declare rule rather than a vertex, or with DECLARED_BREAK off. */
  pastDeclaredBreak(): boolean {
    if (!(process.env.DECLARED_BREAK !== '0')) return false;
    const at = BREAK_DECL[this.route.id]?.at;
    return typeof at === 'number' && this.idx > at;
  }
  /** DECLARED_BREAK (src/playbook/route-breaks.ts): the point on his installed path that is his route's declared break
   * (null with the flag off, or for a route timed by a declare rule rather than a vertex). Exposed for the receiver's look
   * timing to key on; this build does not change when he looks (Coverage's rebuild of the receiver's look owns that). */
  get declaredBreak(): { x: number; y: number } | null {
    if (!(process.env.DECLARED_BREAK !== '0')) return null;
    const at = BREAK_DECL[this.route.id]?.at;
    return typeof at === 'number' && this.path[at] ? { ...this.path[at].p } : null;
  }
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
  /** Design 6: when he reached his deep landmark (his look starts there and lasts his count). */
  private deepLookAt: number | undefined;
  /** BALL_EST design 4: out of his break, before the throw, he gets his head round to the QB (and his shoulders as
   * far as his head cannot reach him), so he is already looking when the ball leaves. A better route runner leaves
   * it later. Not on a deep route, which does not expect the ball at its stem's break; design 6 (bit 16) gives the
   * deep route its own look: from his landmark depth, for his count, once. */
  private preLook(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
    // His own picture, not the true ball state: he looks for the QB until he has seen the ball in the air (his own
    // sample) or sees the QB without it.
    // A sim without the estimator's store (partial fixtures) has no picture to look for: his route as it was.
    // SEEN_EMPTY: the empty hand ends the look only once he has seen it in his eyes, not through the field-wide
    // picture with his head elsewhere (the arm coming through keeps him looking: the ball is about to leave).
    if (!sim.ballEstimates || sim.ballEstimates.lastSeen(a) || (SEEN_EMPTY ? sim.ballEstimates.sawEmpty(a) : sim.see(a, sim.qb).carrying === false)) return cmd;
    const pastBreak = sim.t - this.bornAt >= this.breakTime - PRE_LOOK_EARLY + PRE_LOOK_LATE * a.r('routeRunning');
    if (this.route.family === 'deep') {
      // BREAK_LOOK: a deep route thrown on its break (the corner, the post) also looks out of the break.
      const onBreak = BREAK_LOOK && BREAK_DECL[this.route.id]?.throwFamily === 'onBreak' && pastBreak;
      if (!BALL_EST_DEEP_LOOK && !onBreak) return cmd;
      // His own depth past the line is his cue; the release is not.
      if (BALL_EST_DEEP_LOOK && this.deepLookAt === undefined && (a.pos.x - sim.los) * sim.attackDir(a.team) >= DEEP_LOOK_DEPTH) this.deepLookAt = sim.t;
      const deepNow = BALL_EST_DEEP_LOOK && this.deepLookAt !== undefined && sim.t - this.deepLookAt <= DEEP_LOOK_HOLD;
      if (!deepNow && !onBreak) return cmd;
    } else if (!pastBreak) return cmd;
    sim.ballEstimates.lookAtQB(a, sim);
    const qb = sim.see(a, sim.qb).pos, sp = Math.hypot(cmd.vel.x, cmd.vel.y);
    const heading = sp > 0.4 ? Math.atan2(cmd.vel.y, cmd.vel.x) : (cmd.facing ?? a.facing);
    let d = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x) - heading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    d = turnSide(a, sim, d, heading);
    return lookJoints(a, cmd, heading, d, BALL_EST_TRUNK);
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
        this.idx = 0; this.turn = null; this.plan = null;
        this.skipPassed(a);
      }
    }

    // ROUTE_END (attempt 2): on his final leg within a yard or so of a settle point, he is at his route's end: a man on
    // him otherwise keeps him creeping at the last point's zero speed and he never settles (staged Cover 1: 8 of 48
    // hitches settled by 3.5 s).
    if (ROUTE_END && !this.settled && this.routeEnd !== 'continue' && this.idx === this.path.length - 1) {
      const end = this.path[this.idx].p;
      if (Math.hypot(end.x - a.pos.x, end.y - a.pos.y) < 1.2) this.settled = true;
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
    const st: RouteCursor = { idx: this.idx, from: this.start, turn: this.turn, plan: this.plan };
    let cmd = this.steer(a.body, st, rr, cutSkill);
    this.idx = st.idx; this.turn = st.turn ?? null; this.plan = st.plan ?? null;
    // ROUTE_END: a flat past his declared points runs on turned to the QB, and stops 2 yd from the sideline.
    if (ROUTE_END && cmd && this.route.family === 'flat' && this.path[this.idx]?.ext) {
      const room = Math.min(a.pos.y, FIELD_WIDTH - a.pos.y);
      const facing = angleTo(a.pos, sim.see(a, sim.qb).pos);
      cmd = room <= 2 ? { ...stand(0), facing } : { ...cmd, facing };
    }
    if (!cmd) {
      this.settled = this.routeEnd !== 'continue';
      return this.settle(a, sim);
    }
    if (STEM_WORK) cmd = this.workStem(a, sim, cmd);
    if (ROUTE_CLEAR && this.fromBackfield) return clearLane(a, sim, cmd);
    if (ROUTE_CRAFT) return routeCraft(a, sim, cmd, rr, this.breakSide(a), CRAFT_HOLD ? this.routeSide() : null, this.pastDeclaredBreak());
    return cmd;
  }

  /** STEM_WORK: bend the stem toward the leverage of the defender over him (see STEM_WORK). */
  private workStem(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
    if (this.idx !== 0 && !(BREAK_DECL[this.route.id]?.at === 'vertical' && this.idx <= 1)) return cmd;
    const dirn = Math.sign(this.path[this.path.length - 1].p.x - this.start.x) || 1;
    const depth = (a.pos.x - sim.los) * dirn;
    const vertical = BREAK_DECL[this.route.id]?.at === 'vertical';
    const stemEnd = vertical ? 12 : (this.path[0].p.x - sim.los) * dirn;
    // A stem under STEM_MIN (the slant's two or three steps, a quick out) is won at the release and the break, not in
    // the stem: it runs straight.
    if (stemEnd < STEM_MIN) return cmd;
    // A break that is a lean, not a plant (the post, the corner: break speed .6 and up), keeps its last 2 yd of stem on
    // his line, so the return to the line is not run as the lean and the break stays where it is drawn.
    const lean = !vertical && (this.route.points[0]?.s ?? 1) >= 0.6;
    const end = stemEnd - (lean ? 2 : 1);
    if (depth < 1.5 || depth > end) return cmd;
    if (this.stemWork === null) {
      let best: RouteKeyPicture | null = null, bd = Infinity;
      for (const d of this.readKeys(a, sim)) {
        if (d.age > 0.5) continue;
        const ahead = (d.pos.x - a.pos.x) * dirn, across = d.pos.y - a.pos.y;
        if (ahead <= 0 || ahead > 10 || Math.abs(across) > 4) continue;
        if (ahead < bd) { bd = ahead; best = d; }
      }
      const off = best ? best.pos.y - a.pos.y : 0;
      // Up to 1.5 yd, and no more than a fifth of the stem's length, so a short stem's return stays gentle.
      this.stemWork = Math.abs(off) >= 0.75 ? Math.sign(off) * Math.min(1.5, 0.2 * stemEnd, Math.abs(off)) : 0;
    }
    if (!this.stemWork) return cmd;
    // The route line's lateral spot at his depth (start -> first point), plus the offset, faded over the last 2 yd.
    const a0 = this.start, b0 = this.path[0].p, span = (b0.x - a0.x) || 1e-6;
    const lineY = a0.y + (b0.y - a0.y) * clamp((a.pos.x - a0.x) / span, 0, 1);
    // The return is gentle (over up to 4 yd, about 20 deg): a 1.5 yd return in 2 yd is itself a 37 deg turn, a break.
    const fade = clamp((end - depth) / Math.min(4, Math.max(1.5, (end - 1.5) / 2)), 0, 1);
    const goalY = lineY + this.stemWork * fade;
    const sp = Math.hypot(cmd.vel.x, cmd.vel.y);
    if (sp < 0.5) return cmd;
    const vy = cmd.vel.y + clamp((goalY - a.pos.y) * 3, -2.5, 2.5);
    const n = Math.hypot(cmd.vel.x, vy) || 1;
    return { ...cmd, vel: { x: cmd.vel.x / n * sp, y: vy / n * sp } };
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
  private steer(body: Body, st: RouteCursor, rr: number, cutSkill: number): MoveCommand | null {
    // ROUTE_LANDMARK: an in-breaking route is run from where he is; an out-breaker, a settle and a vertical keep their drawn spot.
    const at = BREAK_DECL[this.route.id]?.at;
    return steerRoute(body, st, this.path, this.routeEnd, this.effort, rr, cutSkill, ROUTE_LANDMARK && breaksInside(this.path, typeof at === 'number' ? at : undefined, this.outside));
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
    // ROUTE_FINISH: an outward route that finished at the margin holds there, facing the quarterback.
    if (this.routeEnd === 'continue' && last && this.path[this.path.length - 1]?.finish) {
      return goTo(a, last, { speed: 0.6, facing: angleTo(a.pos, sim.see(a, sim.qb).pos) });
    }
    if (ROUTE_END && this.routeEnd !== 'continue') return this.workWindow(a, sim, last);
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

  /** ROUTE_END: the settled receiver works his window from his own picture, every tick (see ROUTE_END). */
  private workWindow(a: Agent, sim: PlaySim, last: Vec2): MoveCommand {
    const qb = sim.see(a, sim.qb).pos, facing = angleTo(a.pos, qb);
    const seen = this.readKeys(a, sim).filter((p) => p.age <= 0.5);
    let near: RouteKeyPicture | null = null, nd = Infinity;
    for (const d of seen) { const dd = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y); if (dd < nd) { nd = dd; near = d; } }
    // Both goals are placed from his settle point `last`, never from where he stands, so he arrives and sits.
    // Man: a defender on him. He settles and shields: he slides off the man's side at his settle depth, at most
    // SETTLE_SHIELD from the point, then holds there with the man on his back.
    if (near && nd < 2.5) {
      const side = Math.sign(last.y - near.pos.y) || 1;
      return goTo(a, { x: last.x, y: clamp(last.y + side * SETTLE_SHIELD, 1.5, FIELD_WIDTH - 1.5) }, { speed: 0.8, facing });
    }
    // Zone: the window between the underneath defenders either side of him, near his depth.
    const under = seen.filter((d) => Math.abs(d.pos.x - last.x) < 4 && Math.abs(d.pos.y - a.pos.y) < 8);
    const left = under.filter((d) => d.pos.y > a.pos.y).sort((p, q) => p.pos.y - q.pos.y)[0];
    const right = under.filter((d) => d.pos.y <= a.pos.y).sort((p, q) => q.pos.y - p.pos.y)[0];
    // Zone: the window as he sees it (midway between them, or 4 yd off the one who is there), no farther than
    // SETTLE_WINDOW from the settle point.
    let y = last.y;
    if (left && right) y = (left.pos.y + right.pos.y) / 2;
    else if (left) y = Math.min(last.y, left.pos.y - 4);
    else if (right) y = Math.max(last.y, right.pos.y + 4);
    y = clamp(y, last.y - SETTLE_WINDOW, last.y + SETTLE_WINDOW);
    return goTo(a, { x: last.x, y: clamp(y, 1.5, FIELD_WIDTH - 1.5) }, { speed: 0.8, facing });
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
        seedCraftSide(a, d, side, a.r('routeRunning'), sim.t);
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
    seedCraftSide(a, d, this.releaseSide, a.r('routeRunning'), sim.t);
    return runThrough(a, { x: d.pos.x + a.profile.radius, y: d.pos.y + p.side * clearance },
      { speed: this.effort, cutSkill: 0.8 + 0.4 * a.r('releaseVsPress') });
  }

}

/** LINE_START: the nearest defender to him at installation (yd), for his expected get-off. */
/** The nearest defender as the receiver sees him at the install (his own picture: pre-snap he is looking right at him),
 * for his get-off loss; not the defender's true position. */
function nearestDefender(a: Agent, sim: PlaySim): number {
  return sim.defense.reduce((m, d) => { const p = sim.see(a, d).pos; return Math.min(m, Math.hypot(p.x - a.pos.x, p.y - a.pos.y)); }, 12);
}

/** Each agent's first installed route on this play (family:id), for replay labels only; no behavior reads it. */
export const routeOfAgent = new WeakMap<Agent, string>();

/** Rescued from 83e514a. Coverage/scoring controls are required for promotion. */

/**
 * Track the ball in flight: run to the earliest point on its path that can be
 * reached in time (ball tracking adds delay and error).
 */
/** RCV_KNOWS (on since 2026-11-18; `=0` restores): see TrackBall.update. */
export const RCV_KNOWS = process.env.RCV_KNOWS !== '0';
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
    // A sim without the estimator's store (partial fixtures): no picture of the ball, so he runs his route.
    if (BALL_EST && !sim.ballEstimates) return this.fallback.update(a, sim);
    let spot: { p: Vec2; t: number } | null = null;
    // BALL_EST: his own estimate from the ball he has seen; until he has one he runs his route and looks for it.
    const path = BALL_EST ? sim.ballEstimates.estimate(a, sim) : sim.ballPath;
    if (BALL_EST && !path.length) return lookFor(a, sim, this.fallback.update(a, sim));
    // Design 3 attempt 2: he runs his route until he has found the ball himself (his first sample); his prior and the
    // QB's shoulder line shape his estimate and his head, but his route is the better plan until he has seen it.
    // RCV_KNOWS (on; `=0` restores): under the glance rule he knows the flight only once he has held it for his dwell.
    // A first glimpse (one tick in his eyes) gives no knowledge, only a fit of a sample or two on his route prior, yards
    // off: leaving the route for it braked him to a spot the ball was never coming to, and turned his body so the ball
    // went behind his shoulders and out of his neck's reach (a rounded out: first glimpse 0.25 s after the release,
    // estimate 5 yd short, unsampled for 1.2 s). Until he knows it, he runs his route and keeps looking.
    if (BALL_EST && (!sim.ballEstimates.lastSeen(a) || (RCV_KNOWS && BALL_EST_GLANCE && !sim.ballEstimates.glanceKnows(a, sim)))) {
      // Still on his route; late in the flight (by his estimate) he turns his body to find a ball behind him.
      const due = catchSpot(a, { t: sim.t, ballPath: path });
      const route = this.fallback.update(a, sim);
      // Design 4: if he was already looking for the ball when it left, he keeps looking until he finds it.
      // RCV_KNOWS: once he has had it in his eyes he keeps it there (his look and its body cost) until he knows it.
      return (due && due.t - sim.t <= bodyTurnLead(a)) || sim.ballEstimates.lookedAtRelease(a, sim) || sim.ballEstimates.lastSeen(a) ? lookFor(a, sim, route) : route;
    }
    if (CATCH_CHOICE) {
      // Re-read every 0.1 s until the last 0.3 s, then he is committed to the point he chose.
      if (!this.choice || (sim.t - this.choseAt >= 0.1 - 1e-9 && this.choice.t - sim.t > 0.3)) {
        this.choice = chooseCatchPoint(a, sim, this.judge, path) ?? this.choice; this.choseAt = sim.t;
      }
      spot = this.choice;
      // BALL_EST bit 4 (design 5 b): the moment he chose to meet it stays his; where the ball is at that moment is
      // re-read from his current estimate every tick, not frozen from the picture he chose it on.
      if (BALL_EST_MOVING_CHOICE && spot && path.length) {
        const at = path.find((p) => p.t >= spot!.t - 1e-6) ?? path[path.length - 1];
        spot = { p: { x: at.x, y: at.y }, t: spot.t };
      }
    }
    spot ??= catchSpot(a, { t: sim.t, ballPath: path });
    if (!spot) return BALL_EST ? lookFor(a, sim, this.fallback.update(a, sim)) : this.fallback.update(a, sim);
    // Under BALL_EST his error is his estimate's; no separate offset.
    const target = BALL_EST ? { ...spot.p } : { x: spot.p.x + this.err.x, y: spot.p.y + this.err.y };
    if (HANDS_CUE) noteHands(a, sim.t, spot.t);
    // BALL_EST bit 1024: once the servo has enough of the ball, his feet run on what he sees of it (ball-servo.ts), not
    // to the fitted point; once it has steered him, the handover holds his running and his hands do the rest. Until then
    // (and on a flight too short for it ever to) he runs his route, through the last 0.35 s too: holding his running
    // there when the servo never steered froze him through his break (seed 23, open 3+ yd 0-0.6 s 87 vs 97%). His
    // look tracks the ball throughout.
    if (BALL_EST && BALL_EST_SERVO && sim.ballEstimates.lastSeen(a)) {
      const left = spot.t - sim.t;
      const route = this.fallback.update(a, sim);
      const servo = servoCommand(a, sim.ballEstimates.anglesOf(a), sim.t, left, route, this);
      if (servo) { a.tags.add('ball-servo'); return lookFor(a, sim, { ...servo, facing: undefined }); }
      return lookFor(a, sim, { ...(servoEngaged(a, this) ? { vel: { ...a.vel } } : route), facing: undefined });
    }
    const dtArr = Math.max(0.05, spot.t - sim.t);
    const dist = Math.hypot(target.x - a.pos.x, target.y - a.pos.y);
    // Arrive on time, keep running through if the ball is leading him.
    const need = dist / dtArr;
    // BALL_EST: he faces where he believes the ball is, not where it is.
    const facing = BALL_EST ? angleTo(a.pos, path[0]) : angleTo(a.pos, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y });
    if (dist < 0.5) return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing };
    const run0 = runThrough(a, target, { speed: clamp(need / a.profile.vmax, 0.35, 1) });
    // TRUNK_TWIST: within 3 yd he turns his shoulders to the ball and keeps the gait on his path, so a receiver looking
    // the ball in at 6-8 yd/s is not slowed by his hips turning (the cap reads the hips). Off: the old hips request.
    // (With BALL_EST also on, the trunk branch is taken; joining the two is Coverage's design 7.)
    // BALL_EST bit 64 (design 7): out past 3 yd his look is BALL_EST's own (the body-turn window), through the trunk;
    // inside 3 yd the trunk branch below, on his estimate (`facing` is his estimate's bearing under BALL_EST).
    if (TRUNK_TWIST && BALL_EST_TRUNK && BALL_EST && dist >= 3) return sim.ballEstimates.lastSeen(a) || spot.t - sim.t <= bodyTurnLead(a) ? lookFor(a, sim, run0) : run0;
    if (TRUNK_TWIST) {
      if (dist >= 3) return run0;
      // His look reaches the trunk's range plus the neck's (HEAD's neckRange: 90 deg standing, 45 at top speed). A ball beyond it is
      // a body turn: the hips turn just enough to bring it to the limit, and the cap prices that turn as it does now.
      const reach = TRUNK_RANGE + neckRange(a);
      const off = angleDiff(a.body.facing, facing);
      return Math.abs(off) <= reach ? { ...run0, look: facing } : { ...run0, look: facing, facing: facing - Math.sign(off) * reach };
    }
    const run = { ...run0, facing: dist < 3 ? facing : undefined };
    // BALL_EST attempt 3: his head finds the ball for free; his body turns to it only late (route-timed, by skill).
    // Once he has the ball he keeps tracking it the whole way (the look and its body cost), not only in the late window.
    return BALL_EST && dist >= 3 && (sim.ballEstimates.lastSeen(a) || spot.t - sim.t <= bodyTurnLead(a)) ? lookFor(a, sim, run) : run;
  }
}

/** BALL_EST: a turn toward something almost behind him goes over the shoulder his head is already turned to. */
function turnSide(a: Agent, sim: PlaySim, d: number, heading: number): number {
  const head = sim.ballEstimates.headOf(a);
  if (head === undefined) return d;
  let h = head - heading;
  while (h > Math.PI) h -= 2 * Math.PI;
  while (h < -Math.PI) h += 2 * Math.PI;
  return sideOf(d, h);
}

/** BALL_EST: to keep sampling the ball he turns his shoulders off his running line only as far as his head cannot
 * point at it (LOOK_NECK; his eyes' range is the slack for his error and his turn lag): a ball behind him costs a
 * turned body, which the facing speed cap prices. */
function lookFor(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  // His look aims where his eyes are pursuing (the passer before he has the ball, then the ball's seen motion).
  sim.ballEstimates.estimate(a, sim);
  const at = sim.ballEstimates.gazeAt(a, sim);
  const sp = Math.hypot(cmd.vel.x, cmd.vel.y);
  const heading = sp > 0.4 ? Math.atan2(cmd.vel.y, cmd.vel.x) : (cmd.facing ?? a.facing);
  const toward = Math.atan2(at.y - a.pos.y, at.x - a.pos.x);
  let d = toward - heading;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  d = turnSide(a, sim, d, heading);
  return lookJoints(a, cmd, heading, d, BALL_EST_TRUNK);
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

/** RCV_SEEN: a teammate keeps his job after a catch until his own picture shows the catcher with the ball (the catch is
 * a discrete event: recognition, on his reaction time and focus), then turns to the convoy. Off: everyone turns at
 * the true catch. */
export class ConvoyCue implements Behavior {
  constructor(private readonly prev: Behavior, private readonly catcher: Agent) {}
  get kind(): Behavior['kind'] { return this.prev.kind; }
  update(a: Agent, sim: PlaySim): MoveCommand {
    const seen = sim.perception.perceive(this.catcher.idx, a.mind.observationDelay(a.profile.reactionTime));
    if (seen.carrying === true) { a.behavior = new DownfieldBlocker(); return a.behavior.update(a, sim); }
    return this.prev.update(a, sim);
  }
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
    if (sim.t >= this.retargetAt || !this.target || isTakenFor(a, sim, this.target) || isDownFor(a, sim, this.target)) {
      this.retargetAt = sim.t + 0.3;
      this.target = pickBlockTarget(a, sim, c);
    }
    const d = this.target;
    if (!d) return goTo(a, { x: c.pos.x + 4 * sim.attackDir(a.team), y: c.pos.y }, { speed: 0.8 });
    // Fit between the defender (as he sees him) and the carrier.
    const dp = RCV_SEEN ? sim.see(a, d).pos : d.pos;
    const toC = norm(sub(c.pos, dp));
    const fit = { x: dp.x + toC.x * 0.8, y: dp.y + toC.y * 0.8 };
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
    if (isTakenFor(a, sim, d) || isDownFor(a, sim, d) || claimed.has(d)) continue;
    const seen = RCV_SEEN ? sim.see(a, d) : d;
    const toCarrier = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, c.pos, 1);
    const toMe = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) / a.profile.vmax;
    if (toMe > toCarrier + 0.6) continue; // can't get there in time
    const score = toCarrier + 0.6 * toMe;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
