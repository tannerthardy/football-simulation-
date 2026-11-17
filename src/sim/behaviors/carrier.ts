/**
 * Ball-carrier vision.
 *
 * On his finite, attention-dependent decision beat the carrier samples
 * candidate headings. For each heading he
 * projects his own sprint along it and asks, at each look-ahead step, whether
 * any defender he *perceives* (delayed, filtered by vision range) could get
 * there first (time-to-reach, with extra time for defenders tied up in
 * blocks). The heading that buys the most yards before contact — with a bonus
 * for clean open-field lanes and a cost for sharp cuts — wins. Vision rating
 * controls how far he sees, how much backside pursuit he notices, and how
 * noisy his evaluation is. Before the line, designed runs press the aiming
 * point for a patience-dependent window.
 */
import { FIELD_WIDTH, OPP_GOAL_X, OWN_GOAL_X } from '../../core/field.js';
import { angleDiff, angleOf, clamp, type Vec2 } from '../../core/vec.js';
import { DT } from '../../core/units.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { sprintTime, timeToReach } from '../../physics/reach.js';
import { squeezeForGap } from '../../physics/bodyshape.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { Gap, RunScheme } from '../../playbook/types.js';
import { liveGapY } from '../live-gaps.js';
import { RunBlocker } from './blocking.js';
import { contactCost } from '../contact-choice.js';
import type { Perceived } from '../perception.js';
import { READ_SCHEMES, RUN_READ, runRead } from '../run-read.js';
import { observeRunRead, runReadObservers } from '../run-read-observer.js';

/** The carrier reads other players only through his own picture (docs/reviews/2026-11-17-carrier-honest.md). A
 * defender's speed, acceleration, reach and recovery are judged from what he can see of the man -- his body size, with
 * the runner's own body as the yardstick -- not read from the hidden profile; nobody's fatigue (speedScale) is read; a
 * man is down when his picture shows him down; a scenario's scheduled parking (downUntil) is not read. */
type Profile = Agent['profile'];
/** What the carrier can judge of another man's capacities: his visible body size; the rest from his own body. */
function judged(a: Agent, o: Agent): Profile {
  return { ...a.profile, radius: o.profile.radius };
}
/** CARRIER_RECOG (off; attempt 1, miss; docs/reviews/2026-11-17-carrier-honest.md): where a defender IS stays on the
 * fast tracking picture (0.7 of his reaction time); how the man is MOVING is read from his recognition picture, one
 * full reaction time plus a vision term ((1 - vision) more). The counter holds to his next decision beat (nextEval). */
const CARRIER_RECOG = process.env.CARRIER_RECOG === '1';

export interface CarrierOptions {
  /** Designed aiming point (run concept) and how long to honor it. */
  aim?: Vec2;
  aimUntil?: number;
  /** QB scramble: may slide. */
  qb?: boolean;
  run?: { scheme:RunScheme; side:number; readKey?:Agent; kick?:Agent };
  /** The designed aim as a gap on the line (with the play's offset from that
   * gap's landmark), so it moves with the bodies that form it. */
  aimGap?: { gap: Gap; side: number; offset: number };
  /** RB_COMMIT: the entry (lateral) he chose on his last line read. */
  lastEntryY?: number;
  /** He caught a called screen (his own play call): he reads the open field
   * and his screen blockers, not the run game's crease. Other catches keep
   * the existing carrier until whole-game evidence supports extending it. */
  screenCatch?: boolean;
  /** CATCH_EYES: when he caught the ball (a catch, not a handoff). */
  catchAt?: number;
}

/** RB_COMMIT (default off): at the line the back's entry choice counts what
 * his momentum costs him (the turn from his current velocity to each route,
 * scaled by his speed: a cut at speed spends traction and time) and holds
 * the lane he chose unless another is clearly better. He flipped from the
 * outside lane to the inside one 1.5 yd from the line while running 3.6 yd/s
 * laterally and ran into the end he was bending around. */
export const RB_COMMIT = process.env.RB_COMMIT !== '0';
/** OZ_HIP_READ (default off): on outside and wide zone the back reads the
 * play-side end man (the first defender on the line outside his play-side
 * tackle, as he sees them) against the blocker nearest him. With his blocker
 * inside him (outside leverage: the edge is his) the back aims inside him;
 * reached or square, he favours neither side of him; an unblocked end leaves
 * the designed aim. The lane read still decides. Tracked 2022 outside zone,
 * same operator: with the end's blocker inside him the back crossed inside
 * him 78-81% (ours 40-48%), reached 60% (ours 43%), square 73-86%. */
export const OZ_HIP_READ = process.env.OZ_HIP_READ !== '0';
/** RB_HELD (default off): the back's read at the line gives a defender he
 * sees a blocker on the same held-up time as his open-field read does (0.7 s,
 * 0.25 s if the man is visibly coming at him through the block). The line
 * read treated every engaged lineman as free to run to any entry at full
 * speed, so with the line locked up every lane read closed and he took the
 * one nearest the call (s11-79: into the end; an early cut inside him gained
 * 4.7 yd on the same snap). */
export const RB_HELD = process.env.RB_HELD !== '0';
/** HELD_SIDE (default off; with RB_HELD): the held-up time counts only for
 * an entry his blocker stands between him and: a blocker on the man's inside
 * does not slow him to an entry outside him. The line read gave an end with
 * outside leverage on his blocker the full hold to the edge, so the edge read
 * open and the back bounced into him (tracked outside zone: backs crossed
 * inside such an end 78-81%, ours 41-56%). */
export const HELD_SIDE = process.env.HELD_SIDE !== '0';
/** RB_FLOW (default off): the back reads a moving line where it will be.
 * Bodies blocking a route were taken where they stand now, so on a flowing
 * zone line the straight lane behind blockers already stepping play side
 * looked shut and the read flattened him along the line (dog-leg on 39% of
 * inside-zone and 47% of outside-zone reads; his lateral speed rose after the
 * handoff where tracked backs' falls, 2.4 -> 2.8 vs 2.0 -> 1.5 yd/s on inside
 * zone). Each body he sees is carried along its seen velocity to when he
 * would pass it (at most 1 s ahead). */
export const RB_FLOW = process.env.RB_FLOW !== '0';
/** RB_TEMPO (default off): through traffic the back runs at the speed from
 * which he can still cut away from the nearest free defender in front of him,
 * not flat out. A side step of his body plus the man's reach (w) takes
 * sqrt(2w/a) at his lateral acceleration a (his cut skill on his lateral
 * capability); with that man d yards away (within 45 degrees of his path) he
 * keeps v <= d sqrt(a/2w) - c, c the man's seen speed toward him (a man he
 * could not sidestep even at half speed does not slow him: he finishes); a
 * defender he sees with a teammate's body on him counts 1.5 yd farther (he
 * has to come off the block).
 * Nobody in front within 8 yd: full speed. Tracked 2022 zone backs before
 * first contact run 4.9 / 6.2 yd/s at 0-3 / 3-6 yd past the line (inside
 * zone; outside 5.9 / 6.8); ours 6.7 / 7.8 (6.9 / 7.7), at the tracked p90,
 * and the open-field DB attempts we lose are against 7.5-7.7 yd/s backs (6.1
 * on the tackles that hold). */
export const RB_TEMPO = process.env.RB_TEMPO !== '0';
/** RB_GATHER (default off, with RB_TEMPO): a free man he can no longer
 * sidestep at half speed still slows him to that half speed: he gathers his
 * feet to keep a cut (or to take the hit balanced) rather than run flat out
 * into a squared tackler. A man he sees blocked still does not slow him.
 * Tracked 2022 zone backs ease off as the nearest free man in front closes
 * from 5 to 1 yd (inside 4.8 -> 4.0 yd/s, outside 5.5 -> 4.6); ours held
 * 5.1-5.4 and braked only inside 2.5 yd. */
export const RB_GATHER = process.env.RB_GATHER !== '0';

/** The designed aiming point as this runner sees the line now (LIVE_AIM=0: snap point). */
export function liveAim(a: Agent, sim: PlaySim, opts: CarrierOptions): Vec2 | undefined {
  if (!opts.aim || !opts.aimGap || process.env.LIVE_AIM === '0') return opts.aim;
  const g = opts.aimGap;
  return { x: opts.aim.x, y: liveGapY(sim, a, g.gap, g.side) + g.offset };
}

/** Coarse threat inference from the consumed image, not the opponent's true
 * recovery phase. A visible rise is treated as halfway through public get-up
 * capability. The positive tick floor keeps old off-feet pictures uncertain;
 * a fresh upright picture ends the allowance. This is not NFL calibration. */
export function observedRecoveryAllowance(seen: Pick<Perceived, 'pose' | 'age'>, getUp: number | undefined, dt: number): number {
  if (seen.pose !== 'down' && seen.pose !== 'rising') return 0;
  const recovery = Number.isFinite(getUp) ? clamp(getUp!, 0.2, 2) : 0.9;
  const tick = Number.isFinite(dt) && dt > 0 ? Math.min(dt, recovery) : Math.min(DT, recovery);
  const age = Number.isFinite(seen.age) ? Math.max(0, seen.age!) : seen.age === Infinity ? recovery : 0;
  return clamp((seen.pose === 'down' ? recovery : recovery / 2) - age, tick, recovery);
}

/** CATCH_EYES (on; CATCH_EYES=0 restores): a receiver's eyes are on the ball until it is in his
 * hands. For one reaction time after the catch he carries the line he caught
 * it on (upfield if he caught it nearly standing or coming back to the
 * ball) while he looks back up the field; his first lane read comes after that, from his own fresh picture.
 * Without it the carrier's first read came on the tick after the catch from a
 * full picture of the field: 0.1 s after the catch the request was 46 deg off
 * his travel (p50; p75 93), and over 0.5 s he turned 22 / 37 deg (p50 / p75;
 * tracked 2022 catchers 14 / 25), 8 games at develop f6fe9bf7. */
export const CATCH_EYES = process.env.CATCH_EYES !== '0';

/** CARRIER_BRACE (off): the carrier lowers his pads for a tackler he sees closing
 * head-on, and drives his body through the contact in the last stride. */
export const CARRIER_BRACE = process.env.CARRIER_BRACE === '1';
/** BRACE_EVIDENCE (off; needs CARRIER_BRACE): he braces and lunges only at a
 * man he sees free of blocks (no blocker he sees touching him) and squared up
 * to him (the man's seen facing within 45 deg of the line to the carrier).
 * Without it the trigger takes anyone within 3 yd in the cone his own speed
 * closes on: half its firings were at men engaged with a blocker and a third
 * met no contact (docs/reviews/2026-11-10-tackle-forms.md, brace trace). */
export const BRACE_EVIDENCE = process.env.BRACE_EVIDENCE === '1';

/** Read entries and routes from acquired bodies on both teams. A nominal
 * block is neither an empty lane nor guaranteed future protection. */
interface LineBody { pos: Vec2; radius: number; team: 'O' | 'D'; vel?: Vec2 }

export function runReadAim(a: Agent, sim: PlaySim, opts: CarrierOptions): Vec2 | null {
  if (!opts.run || !opts.aim) return null;
  const dir = sim.attackDir(a.team), run = opts.run;
  const depth = (p: Vec2) => (p.x - sim.los) * dir;
  let preferred = liveAim(a, sim, opts)!.y;
  if (run.scheme === 'duo' && run.readKey) {
    const key = sim.see(a, run.readKey);
    if (key.pos.x < sim.los + 2.5 && Math.abs(key.vel.y) > .7) preferred = sim.ballY - Math.sign(key.vel.y) * .8;
  }
  const kick = run.kick;
  const kickSeen = kick ? sim.see(a, kick) : null;
  // Everything below is the runner's own picture: perceived positions, motion
  // and pose, and public body size and reach. Neither the engagement record
  // nor a nearby teammate promises protection. Keep off-feet defenders in
  // the threat picture with their acquired recovery allowance.
  const pictures: Array<{ agent: Agent; seen: Perceived; team: 'O' | 'D' }> = [];
  for (const o of [...sim.offense, ...sim.defense]) {
    if (o === a || o === sim.qb) continue;
    const seen = sim.see(a, o);
    pictures.push({ agent: o, seen, team: o.team === a.team ? 'O' : 'D' });
  }
  if (kick && kickSeen && kickSeen.pos.x > sim.los - 1.5) {
    // Read the kick block as he sees it: the man on the puller's hands
    // outside him is kicked out (cut up inside the puller); one inside him
    // is logged or has crossed his face (bounce outside the puller). No man
    // on him yet: the design, inside the kick.
    const on = kickBlockMan(kick, kickSeen, pictures.filter((q) => q.team === 'D').map((q) => ({ agent: q.agent, seen: q.seen })));
    const logged = !!on && (on.y - kickSeen.pos.y) * run.side < 0;
    preferred = kickSeen.pos.y + (logged ? run.side * .85 : -run.side * .85);
  }
  if (OZ_HIP_READ && (run.scheme === 'outsideZone' || run.scheme === 'wideZone')) {
    // The play-side tackle (his own line, as he sees it) and the first man on
    // the line outside him; then the blocker nearest that man.
    const tackle = pictures.filter((q) => q.team === 'O' && (q.agent.slot === 'LT' || q.agent.slot === 'RT')
      && (q.seen.pos.y - sim.ballY) * run.side > 0)[0];
    const onLine = (q: { seen: Perceived }) => depth(q.seen.pos) <= 1.6 && depth(q.seen.pos) >= -1 && q.seen.pose !== 'down';
    const key = tackle && pictures.filter((q) => q.team === 'D' && onLine(q) && (q.seen.pos.y - tackle.seen.pos.y) * run.side > -.6)
      .sort((p, q) => (p.seen.pos.y - q.seen.pos.y) * run.side)[0];
    if (key) {
      const blocker = pictures.filter((q) => q.team === 'O' && q.agent !== a && q.seen.pose !== 'down')
        .sort((p, q) => Math.hypot(p.seen.pos.x - key.seen.pos.x, p.seen.pos.y - key.seen.pos.y) - Math.hypot(q.seen.pos.x - key.seen.pos.x, q.seen.pos.y - key.seen.pos.y))[0];
      const near = blocker && Math.hypot(blocker.seen.pos.x - key.seen.pos.x, blocker.seen.pos.y - key.seen.pos.y) <= 1.5;
      if (near) preferred = (blocker.seen.pos.y - key.seen.pos.y) * run.side < -.25
        ? key.seen.pos.y - run.side * (key.agent.profile.radius + a.profile.radius + .3)
        // Reached or square: either side of him may be the lane.
        : key.seen.pos.y;
    }
  }
  const bodies: LineBody[] = [];
  for (const { agent: o, seen: s, team } of pictures) {
    if (s.pose === 'down') continue;
    if (depth(s.pos) < -1.6 || depth(s.pos) > 1.6 || Math.abs(s.pos.y - a.pos.y) > 12) continue;
    bodies.push({ pos: s.pos, radius: o.profile.radius, team, ...(RB_FLOW ? { vel: s.vel } : {}) });
  }
  if (bodies.filter((b) => b.team === 'O').length < 3) return null;
  bodies.sort((p, q) => p.pos.y - q.pos.y);
  const candidates: Vec2[] = [];
  const squeeze = a.profile.radius * 1.4;
  for (let i = 1; i < bodies.length; i++) {
    const l = bodies[i - 1], r = bodies[i];
    if (r.pos.y - r.radius - (l.pos.y + l.radius) < squeeze) continue;
    const y = (l.pos.y + l.radius + r.pos.y - r.radius) / 2;
    candidates.push({ x: dir > 0 ? Math.max(sim.los + .5, Math.max(l.pos.x, r.pos.x) + .6) : Math.min(sim.los - .5, Math.min(l.pos.x, r.pos.x) - .6), y });
  }
  for (const [end, s] of [[bodies[0], -1], [bodies.at(-1)!, 1]] as const) {
    const y = end.pos.y + s * (end.radius + a.profile.radius + .4);
    candidates.push({ x: dir > 0 ? Math.max(sim.los + .5, end.pos.x + .5) : Math.min(sim.los - .5, end.pos.x - .5), y });
  }
  // Openings are read from a lateral projection, so a body a yard behind the
  // line can hide a real seam in front of him. Sample the line every yard as
  // well; the path, body and timing checks below judge them in two dimensions.
  for (let k = -8; k <= 8; k++) candidates.push({ x: sim.los + .5 * dir, y: clamp(sim.ballY + k, .5, FIELD_WIDTH - .5) });
  const me = { pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale };
  // Acquired motion already contains a block's observed slowdown. Nearby
  // bodies do not promise retention or a future pursuit delay. In particular,
  // a defender occupying the entry remains a threat, on either side of a block.
  const held = new Map<Agent, number>(), heldBy = new Map<Agent, Vec2[]>();
  if (RB_HELD) for (const { agent: d, seen: s, team } of pictures) {
    if (team !== 'D') continue;
    const on = pictures.filter((q) => q.team === 'O' && q.seen.pose !== 'down' && touching({ pos: q.seen.pos, radius: q.agent.profile.radius }, s.pos, d.profile.radius));
    if (!on.length) continue;
    const rx = a.pos.x - s.pos.x, ry = a.pos.y - s.pos.y;
    held.set(d, (s.vel.x * rx + s.vel.y * ry) / (Math.hypot(rx, ry) || 1) > 1 ? .25 : .7);
    heldBy.set(d, on.map((q) => q.seen.pos));
  }
  // HELD_SIDE: a blocker holds him up only toward entries the blocker is on
  // the way to (in the half-plane facing the entry from the man).
  const holdsToward = (d: Agent, s: Perceived, p: Vec2): boolean => !HELD_SIDE
    || (heldBy.get(d) ?? []).some((b) => (b.x - s.pos.x) * (p.x - s.pos.x) + (b.y - s.pos.y) * (p.y - s.pos.y) > 0);
  const threatTime = (d: Agent, s: Perceived, p: Vec2): number =>
    timeToReach({ ...s, profile: judged(a, d) }, p, d.profile.radius + a.profile.radius + judged(a, d).reach * .75)
      + observedRecoveryAllowance(s, judged(a, d).getUp, sim.dt) + (holdsToward(d, s, p) ? held.get(d) ?? 0 : 0);
  let best: Vec2 | null = null, cost = Infinity, bestY: number | undefined;
  const measurements: Array<{ entry: Vec2; risk: number; score: number }> = [];
  const cruise = Math.max(4, a.profile.vmax * .8), cruiseFor = () => cruise;
  // Bodies on a segment block the run along it.
  const blockedBy = (from: Vec2, to: Vec2, start = 0): number => {
    const sx = to.x - from.x, sy = to.y - from.y, l2 = sx * sx + sy * sy || 1;
    let r = 0;
    for (const b0 of bodies) {
      // RB_FLOW: where this body will be when he gets level with it.
      let b = b0;
      if (b0.vel) {
        const u0 = clamp(((b0.pos.x - from.x) * sx + (b0.pos.y - from.y) * sy) / l2, 0, 1);
        const tt = Math.min(1, start + u0 * Math.sqrt(l2) / Math.max(1, cruiseFor()));
        b = { ...b0, pos: { x: b0.pos.x + b0.vel.x * tt, y: b0.pos.y + b0.vel.y * tt } };
      }
      const u = clamp(((b.pos.x - from.x) * sx + (b.pos.y - from.y) * sy) / l2, 0, 1);
      // Include the endpoint: a route ending in a defender is still occupied.
      // At the start, only charge a body when the route approaches it; an
      // already touching runner must remain free to move away from that body.
      if (u <= 0 && (b.pos.x - from.x) * sx + (b.pos.y - from.y) * sy <= 0) continue;
      const miss = Math.hypot(from.x + u * sx - b.pos.x, from.y + u * sy - b.pos.y) - b.radius - a.profile.radius * .7;
      if (miss < 0) r += 1.5 + 4 * Math.min(1, -miss);
    }
    return r;
  };
  for (const p of candidates) {
    // Two ways to the entry: straight, or flatten behind the line first and
    // then turn up (the cutback's dog-leg). Each has its own arrival time.
    // Each route also carries points along its legs with his arrival there,
    // so the same who-is-there-first read covers the way to the entry.
    const along = (from: Vec2, to: Vec2, start: number | null): Array<{ q: Vec2; t: number }> => [.25, .5, .75, 1].map((k) => {
      const q = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      return { q, t: start === null ? timeToReach(me, q, 0) : start + Math.hypot(q.x - from.x, q.y - from.y) / cruise };
    });
    const routes: Array<{ obstruct: number; arrive: number; via: Vec2; path: Array<{ q: Vec2; t: number }> }> = [{ obstruct: blockedBy(a.pos, p), arrive: timeToReach(me, p, 0), via: p, path: along(a.pos, p, null).slice(0, 3) }];
    if (depth(a.pos) < -1.6) {
      const w = { x: sim.los - 1.2 * dir, y: p.y }, atW = timeToReach(me, w, 0);
      routes.push({ obstruct: blockedBy(a.pos, w) + blockedBy(w, p, atW), arrive: atW + Math.hypot(p.x - w.x, p.y - w.y) / cruise, via: w,
        path: [...along(a.pos, w, null), ...along(w, p, atW).slice(0, 3)] });
    }
    let risk = Infinity, via = p;
    const beyond = { x: p.x + 2 * dir, y: p.y };
    for (const route of routes) {
      const arrive = route.arrive, arrive2 = arrive + 2 / cruise;
      // Who is there first, at the entry and two yards beyond it: the
      // earliest defender decides, as in the open-field read.
      let m1 = Infinity, m2 = Infinity;
      for (const { agent: d, seen: s, team } of pictures) {
        if (team !== 'D' || Math.hypot(s.pos.x - p.x, s.pos.y - p.y) > 8) continue;
        m1 = Math.min(m1, threatTime(d, s, p) - arrive);
        m2 = Math.min(m2, threatTime(d, s, beyond) - arrive2);
        // A defender who reaches a point on the way there before he does
        // closes the route as surely as one standing in the entry.
        for (const { q, t } of route.path) m1 = Math.min(m1, threatTime(d, s, q) - t);
      }
      const r = route.obstruct + (m1 < 0 ? 4 + 4 * Math.min(1, -m1) : m1 < .3 ? (.3 - m1) * 6 : 0)
        + (m2 < 0 ? 1.5 + 2 * Math.min(1, -m2) : 0);
      if (r < risk) { risk = r; via = route.via; }
    }
    let commit = 0;
    if (RB_COMMIT) {
      const sp = Math.hypot(a.vel.x, a.vel.y);
      if (sp > 1) {
        const turn = Math.abs(angleDiff(angleOf(a.vel), angleOf({ x: via.x - a.pos.x, y: via.y - a.pos.y })));
        commit += turn * sp * .35;
      }
      if (opts.lastEntryY !== undefined && Math.abs(p.y - opts.lastEntryY) < .75) commit -= 1;
    }
    const score = Math.abs(p.y - preferred) * .45 + Math.abs(p.y - a.pos.y) * .12 + risk + commit;
    if (runReadObservers.has(sim)) measurements.push({ entry: p, risk, score });
    // Run the chosen route: its first leg is where he heads now.
    if (score < cost) { cost = score; best = via; bestY = p.y; }
  }
  if (RB_COMMIT && bestY !== undefined) opts.lastEntryY = bestY;
  if (runReadObservers.has(sim)) observeRunRead(sim, a, 'aim', { preferred, selected: best, candidates: measurements, surface: bodies.map((b) => b.pos) });
  return best;
}

const SAMPLES = [0.25, 0.5, 0.75, 1.0, 1.3, 1.6, 2.0];

export class BallCarrier implements Behavior {
  readonly kind = 'carrier';
  private heading: number | null = null;
  private nextEval = 0;
  private wasDesigned: boolean | null = null;
  private visionNoise: number;
  private plannedExit = false;
  private boundaryRecovery = false;
  private readDone = false;
  private pressEntry: Vec2 | null = null;
  private pressReadAt = 0;
  private followEnded = false;
  private catchLine: number | null = null;

  constructor(
    private readonly opts: CarrierOptions = {},
    a?: Agent,
  ) {
    this.visionNoise = a ? 1 - a.r('vision') : 0.5;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const dir = sim.attackDir(a.team);
    const cutSkill = 0.85 + 0.35 * a.r('elusiveness');
    const designed = !!this.opts.aim && this.opts.aimUntil !== undefined
      && sim.t < this.opts.aimUntil && (a.pos.x - sim.los) * dir < -0.8;
    if (runReadObservers.has(sim)) observeRunRead(sim, a, 'carrier-start', { designed, aim: this.opts.aim, aimUntil: this.opts.aimUntil });
    // Zone runs: press the track and read the key relationship; commit on
    // what it shows, at decision depth, or when pressing is unsafe.
    const zoneRead = RUN_READ && this.opts.run && READ_SCHEMES.has(this.opts.run.scheme) && this.opts.aim
      && !this.readDone && (a.pos.x - sim.los) * dir < .3;
    if (zoneRead) {
      const cmd = this.pressAndRead(a, sim, dir, cutSkill);
      if (cmd) return cmd;
    }
    // CATCH_EYES: eyes still coming off the ball; he carries his catch line.
    if (CATCH_EYES && this.opts.catchAt !== undefined && sim.t < this.opts.catchAt + a.profile.reactionTime) {
      if (this.catchLine === null) {
        const sp = Math.hypot(a.vel.x, a.vel.y);
        // A line coming back toward the passer is not one he carries: he plants
        // and turns upfield, the same first move as a man caught standing.
        const back = a.vel.x * dir < -0.5 * sp;
        this.catchLine = sp > 1.5 && !back ? Math.atan2(a.vel.y, a.vel.x) : (dir > 0 ? 0 : Math.PI);
      }
      this.heading = this.catchLine;
      this.nextEval = this.opts.catchAt + a.profile.reactionTime;
      return this.command(a, sim, this.catchLine, a.profile.vmax, cutSkill);
    }
    if (designed !== this.wasDesigned) {
      // The installed press phase ending is a different responsibility, not
      // a reason to carry its previous beat into open-lane selection. A fresh
      // carrier instance likewise starts with its first available observation.
      this.wasDesigned = designed;
      this.nextEval = sim.t;
    }

    // Designed phase: press the aiming point.
    if (designed) {
      let aim = liveAim(a, sim, this.opts)!;
      // Press the installed track, reading its occupied approach on the same
      // finite beat as other carrier decisions. Speed and movement stay ordinary.
      // Behind a kick-out and a lead puller (counter, power) the back follows
      // his pullers and reads the kick block about two yards off the line:
      // from deep in the backfield every defender beats him to every hole
      // before those blocks land, and the read cut him away from his own
      // pullers (counter: 54% crossed backside, tracked backs 10%). Zone, duo
      // and trap backs read as they press. designExit still abandons a
      // closed aim.
      // Two things he can see end the follow before then: the kick block
      // landing (he reads it as it happens, kicked out or logged, rather than
      // from a yard mark), or a free defender standing in the track itself.
      // From that beat he reads like any other back. A race to a hole he may
      // lose is not a body in his way.
      const follow = this.opts.run?.scheme === 'counter' || this.opts.run?.scheme === 'power';
      if (this.opts.run && ((a.pos.x - sim.los) * dir > (follow ? -2 : -4.5) || this.followEnded)) {
        if (sim.t >= this.pressReadAt) {
          this.pressReadAt = sim.t + a.mind.decisionInterval;
          this.pressEntry = runReadAim(a, sim, this.opts);
        }
        if (this.pressEntry) aim = this.pressEntry;
      }
      let h = angleOf({ x: aim.x - a.pos.x, y: aim.y - a.pos.y });
      this.heading = h;
      // Only abandon the design early if the aiming point is clearly closed.
      if (sim.t >= this.nextEval) {
        this.nextEval = sim.t + a.mind.decisionInterval;
        const best = this.evaluate(a, sim, dir, true, aim);
        const exit = designExit(best, a.r('patience'));
        sim.commandTraceFor?.(a)?.carrier({ kind: 'design-exit', t: sim.t, ...exit });
        if (exit.exit) this.opts.aimUntil = sim.t;
        if (follow && this.opts.run && (best?.trackBody || best?.kickLanded) && !this.followEnded) {
          this.followEnded = true;
          this.pressReadAt = sim.t + a.mind.decisionInterval;
          this.pressEntry = runReadAim(a, sim, this.opts);
          if (this.pressEntry) { aim = this.pressEntry; h = angleOf({ x: aim.x - a.pos.x, y: aim.y - a.pos.y }); this.heading = h; }
        }
      }
      // A lead or kick puller ahead of him is a moving wall to run behind,
      // not a man to wait for: tracked backs run 4.6-4.7 yd/s with a puller
      // 1.4-1.6 yd ahead (power/counter/trap, 2022 all-22). Spacing keeps
      // him off the puller's back; the press tempo below is his patience.
      // Press the hole under control (patient backs more so), then burst.
      const press = a.profile.vmax * (0.62 + 0.18 * (1 - a.r('patience')));
      return this.command(a, sim, h, press, cutSkill);
    }

    // QB slide: past the sticks (or any gain) with a hit coming.
    if (this.opts.qb && sim.isPass && (a.pos.x - sim.los) * dir > 1) {
      const threat = Math.min(...sim.opponents(a).map((d) => {
        const s = sim.see(a, d);
        return s.pose === 'down' ? 9 : timeToReach({ pos: s.pos, vel: s.vel, profile: judged(a, d), speedScale: 1 }, a.pos, 1.0);
      }));
      if (threat < 0.35 && !sim.bond) {
        sim.event('slide', a);
        sim.finishCarry('slide', a.pos);
        return { vel: { x: 0, y: 0 } };
      }
    }

    if (sim.t >= this.nextEval || this.heading === null) {
      // Reconsider the lane on the same finite beat as other football reads.
      // This holds a chosen action through one processing interval; movement,
      // real contact and boundary recovery still execute on every native tick.
      this.nextEval = sim.t + a.mind.decisionInterval;
      // The crease read is the run game's (gaps in the line on a handoff). A
      // man who caught a screen behind the line reads the open field and his
      // blockers instead: the crease read ran slip backs along the line to
      // the sideline, away from linemen leading up the field.
      const caught = !!this.opts.screenCatch;
      const entry = !caught && a.pos.x < sim.los+.3 && a.pos.x > sim.los-4 ? runReadAim(a,sim,this.opts) : null;
      const best = entry ? null : this.evaluate(a, sim, dir, false);
      if(entry) { this.heading=angleOf({x:entry.x-a.pos.x,y:entry.y-a.pos.y}); a.tags.add('run-crease-read'); }
      else if (best) { this.heading = best.heading; this.plannedExit = best.exits; }
      else if (this.heading === null) this.heading = dir > 0 ? 0 : Math.PI;
    }
    const h = this.heading!;
    return this.command(a, sim, h, RB_TEMPO ? this.trafficTempo(a, sim, dir, cutSkill) : a.profile.vmax, cutSkill);
  }

  /** RB_TEMPO: the speed he can still cut from, given the nearest free
   * defender in front of him in his own picture. */
  private trafficTempo(a: Agent, sim: PlaySim, dir: number, cutSkill: number): number {
    // The speed from which he can still sidestep the free man in front of
    // him before they meet: a side step of his body plus the man's reach (w)
    // takes sqrt(2w/a) at his lateral acceleration a; he has d/v.
    const h = this.heading ?? (dir > 0 ? 0 : Math.PI), hx = Math.cos(h), hy = Math.sin(h);
    const acc = a.profile.lateral * cutSkill;
    let cap = a.profile.vmax;
    for (const d of sim.opponents(a)) {
      const s = sim.see(a, d);
      if (s.pose === 'down') continue;
      const rx = s.pos.x - a.pos.x, ry = s.pos.y - a.pos.y, dist = Math.hypot(rx, ry);
      // In front of his path: within 45 degrees of his heading, 8 yd.
      if (dist > 8 || rx * hx + ry * hy < dist * Math.SQRT1_2) continue;
      const blocked = sim.offense.some((o) => { if (o === a) return false; const q = sim.see(a, o).pos;
        return Math.hypot(q.x - s.pos.x, q.y - s.pos.y) < o.profile.radius + d.profile.radius + .25; });
      const w = a.profile.radius + d.profile.radius + d.profile.reach * .5;
      const gap = Math.max(0.5, dist + (blocked ? 1.5 : 0) - w);
      // The time he has is the gap over how fast it closes: his own speed
      // plus the man's speed toward him (running with him or away gives
      // him time; coming at him takes it).
      const toward = blocked ? 0 : -(s.vel.x * rx + s.vel.y * ry) / dist;
      const v = gap * Math.sqrt(acc / (2 * w)) - toward;
      // A man he cannot sidestep even at half speed is not one to slow for:
      // he finishes through him.
      if (v >= 0.5 * a.profile.vmax) cap = Math.min(cap, v);
      else if (RB_GATHER && !blocked) cap = Math.min(cap, 0.5 * a.profile.vmax);
    }
    return clamp(cap, 0.5 * a.profile.vmax, a.profile.vmax);
  }


  /** Press the live track until the read commits, then attack the entry. */
  private pressAndRead(a: Agent, sim: PlaySim, dir: number, cutSkill: number): MoveCommand | null {
    const run = this.opts.run!, track = liveAim(a, sim, this.opts)!;
    const st = runRead(a, sim, run.scheme, run.side, track);
    if (!st.key && !st.answer) return null; // nothing to read: the ordinary design
    if (!st.answer) {
      const h = angleOf({ x: track.x - a.pos.x, y: track.y - a.pos.y });
      this.heading = h;
      return this.command(a, sim, h, a.profile.vmax * (0.62 + 0.18 * (1 - a.r('patience'))), cutSkill);
    }
    // Committed: the read's entry becomes his aiming point; the ordinary lane
    // planner gets him there around the bodies. The entry moves with the
    // block it is read from until he reaches the line.
    this.opts.aim = st.entry!;
    this.opts.aimGap = undefined;
    this.opts.aimUntil = sim.t;
    if (runReadObservers.has(sim)) observeRunRead(sim, a, 'press-handoff', { answer: st.answer, entry: st.entry, track });
    if ((a.pos.x - sim.los) * dir > -.3) { this.readDone = true; a.eyes = null; }
    return null;
  }

  private command(a: Agent, sim: PlaySim, h: number, speed: number, cutSkill: number): MoveCommand {
    const bodies = sim.agents.filter((o) => o !== a).map((o) => ({ s: sim.see(a, o), radius: o.profile.radius }))
      .filter((o) => o.s.pose !== 'down').map((o) => ({ pos: o.s.pos, radius: o.radius }));
    const squeeze = sim.bond ? 0 : squeezeForGap(a.pos, h, a.profile.radius, bodies) * (0.65 + 0.35 * a.r('elusiveness'));
    if (squeeze > 0.3 && !a.tags.has('squeezed')) {
      a.tags.add('squeezed');
      sim.event('squeeze', a, null, 'turn shoulders through a narrow opening');
    }
    const vel = { x: Math.cos(h) * speed, y: Math.sin(h) * speed };
    if (this.plannedExit) this.boundaryRecovery = false;
    else {
      const inward = a.pos.y < FIELD_WIDTH / 2 ? 1 : -1;
      const distance = Math.min(a.pos.y, FIELD_WIDTH - a.pos.y);
      const outward = Math.max(0, -a.vel.y * inward);
      const stopping = outward * outward / (2 * a.profile.lateral * cutSkill * 0.7) + outward * sim.dt;
      // Lane hysteresis must not drift across the boundary while intending
      // to stay in bounds. Recover before lateral momentum consumes the room;
      // the integrator still decides whether he can physically save it.
      if (a.vel.y * inward >= 0) this.boundaryRecovery = false;
      if (distance < stopping + 0.35 && vel.y * inward < 1) this.boundaryRecovery = true;
      if (this.boundaryRecovery) {
        // Finish cancelling outward momentum before choosing a new lane. A
        // shrinking stopping estimate must not alternate braking and another
        // sprint toward the boundary. Asking for more downfield acceleration
        // at the same time also spends traction needed for this redirect.
        vel.x = a.vel.x;
        vel.y = inward * Math.max(1, outward);
      }
    }
    if (runReadObservers.has(sim)) observeRunRead(sim, a, 'command', { heading: h, speed, vel, cutSkill, squeeze });
    // CARRIER_BRACE: a man he sees closing on him head-on (within 45 deg of
    // his path) gets lowered pads in time (the same slew law a lineman sinks
    // by), and in the last stride the body is driven ahead of the feet. A
    // lunge that meets nothing leaves him overextended (World's own cost).
    if (CARRIER_BRACE && !sim.bond) {
      // Slew from a running posture (0.3) to 0.75 at 2.5/s, plus a beat.
      const ux = Math.cos(h), uy = Math.sin(h), slew = (0.75 - 0.3) / 2.5 + 0.1;
      let brace = false, strike = false;
      for (const d of sim.opponents(a)) {
        const sd = sim.see(a, d);
        if (sd.pose === 'down') continue;
        const rx = sd.pos.x - a.pos.x, ry = sd.pos.y - a.pos.y, dist = Math.hypot(rx, ry);
        if (dist > 3 || dist < 1e-6 || (rx * ux + ry * uy) / dist < Math.SQRT1_2) continue;
        if (BRACE_EVIDENCE) {
          // Squared up: his body faces the carrier.
          const toward = Math.atan2(-ry, -rx), off = Math.abs(Math.atan2(Math.sin(sd.facing - toward), Math.cos(sd.facing - toward)));
          if (off > Math.PI / 4) continue;
          // Free: no blocker the carrier sees is on him.
          let blocked = false;
          for (const o of sim.teammates(a)) {
            if (o === a) continue;
            const so = sim.see(a, o);
            if (touching({ pos: so.pos, radius: o.profile.radius }, sd.pos, d.profile.radius)) { blocked = true; break; }
          }
          if (blocked) continue;
        }
        const closing = ((a.vel.x - sd.vel.x) * rx + (a.vel.y - sd.vel.y) * ry) / dist;
        // Timed to the tackler's arms, not his body: the grasp forms at reach.
        const gap = dist - a.profile.radius - d.profile.radius - d.profile.reach;
        if (closing > 0.5 && gap / closing < slew) brace = true;
        if (gap < 0.35) strike = true;
      }
      if (brace || strike) return { vel, cutSkill, squeeze, posture: 0.75, ...(strike ? { lunge: { x: ux * 0.8, y: uy * 0.8 } } : {}) } as MoveCommand;
    }
    return { vel, cutSkill, squeeze };
  }

  private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean, track?: Vec2): { heading: number; score: number; blocked: boolean; aimBlocked: boolean; aimScore: number; exits: boolean; trackBody: boolean; kickLanded: boolean } | null {
    const vision = a.r('vision');
    const range = 7 + 22 * vision;
    const p = a.pos;
    const speed = a.speed;
    const cur = speed > 0.8 ? angleOf(a.vel) : dir > 0 ? 0 : Math.PI;
    const base = dir > 0 ? 0 : Math.PI;
    const goalX = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X;
    const hurry = sim.hurry && a.team === 'O';

    const { blockers, threats } = arrivalEvidence(a, sim, dir, range, vision);
    // After a screen catch he reads his blocks by leverage: a block slows a man only
    // on the side the blocker's body covers. Toward a point the blocker is
    // not between them, the man is free (a flat allowance for being touched
    // sends the runner into the defender's free side). A blocker squarely in
    // a free man's path to the point is a block about to happen.
    const leverage = !!this.opts.screenCatch;
    const credit = (th: ArrivalEvidence, q: Vec2): number => {
      const vx = q.x - th.pos.x, vy = q.y - th.pos.y, L = Math.hypot(vx, vy);
      if (L < 0.5) return 0;
      const ux = vx / L, uy = vy / L;
      const man = { pos: th.pos, vel: th.vel, profile: judged(a, th.d), speedScale: 1 };
      for (const b of blockers) {
        if (b.pose === 'down') continue;
        // What he sees: a blocker touching this man is on him; one touching
        // another man is busy.
        const onHim = touching(b, th.pos, th.d.profile.radius);
        if (!onHim && threats.some(o => o !== th && touching(b, o.pos, o.d.profile.radius))) continue;
        if (onHim) {
          // Already on him: it slows him only if the blocker's body is
          // between him and the point.
          const rx = b.pos.x - th.pos.x, ry = b.pos.y - th.pos.y;
          const along = rx * ux + ry * uy, across = Math.abs(rx * uy - ry * ux);
          if (along > -0.3 && along < L - 0.5 && across < b.radius + th.d.profile.radius + 0.3) return 0.7;
          continue;
        }
        // Free blocker: he cuts the man off if he can get onto the man's run
        // to the point before the man gets there.
        const mover = { pos: b.pos, vel: b.vel, profile: b.agent.profile, speedScale: 1 };
        for (let k = 1; k <= 5; k++) {
          const m = { x: th.pos.x + ux * L * k / 6, y: th.pos.y + uy * L * k / 6 };
          if (timeToReach(mover, m, b.radius + th.d.profile.radius) + 0.1 < timeToReach(man, m)) return 0.7;
        }
      }
      return 0;
    };

    const cands: number[] = [];
    const spread = designed ? 0.9 : 1.55;
    for (let k = -8; k <= 8; k++) cands.push(base + (k / 8) * spread);
    cands.push(cur);
    const aimHeading = this.opts.aim ? angleOfPoint(p, this.opts.aim) : base;
    if (designed) cands.push(aimHeading);

    // Diagnostics only: the selected-player command trace, never consulted.
    const trace = sim.commandTraceFor?.(a);
    const routes: RouteAssessment[] | undefined = trace ? [] : undefined;
    let best: { heading: number; score: number; blocked: boolean; exits: boolean } | null = null;
    let curScore = -Infinity;
    let curBlocked = false;
    let curExits = false;
    let aimBlocked = false;
    let aimScore = -Infinity;
    const vmax = a.profile.vmax;
    const tau = a.profile.tau;
    for (const h of cands) {
      const turn = Math.abs(angleDiff(cur, h));
      const s0 = speed * Math.max(0.25, Math.cos(Math.min(turn, Math.PI / 2)));
      const hx = Math.cos(h);
      const hy = Math.sin(h);
      let safeGain = 0;
      let clean = true;
      let lastQ = p;
      let exits = false;
      let impactCost = 0;
      let contactGain: number | null = null;
      let stoppedBy: string | undefined;
      for (const t of SAMPLES) {
        const d = vmax * t - (vmax - s0) * tau * (1 - Math.exp(-t / tau));
        let q = { x: p.x + hx * d, y: p.y + hy * d };
        let arrival = t;
        const crosses = q.y < 0 || q.y > FIELD_WIDTH;
        if (crosses) {
          // An exit is a terminal option. Clip the forecast at the boundary
          // and still check whether a defender/blocker can stop him first.
          const edge = q.y < 0 ? 0 : FIELD_WIDTH;
          const distance = (edge - p.y) / hy;
          q = { x: p.x + hx * distance, y: edge };
          arrival = sprintTime(distance, s0, vmax, tau);
        }
        // A lane through our own blocker is not open. Allow the minimum
        // shoulder-turned footprint, then request posture on approach.
        const segment = { x: q.x - lastQ.x, y: q.y - lastQ.y };
        const segment2 = segment.x * segment.x + segment.y * segment.y;
        const obstructed = blockers.some((b) => {
          // After a screen catch, a teammate running away up this lane ahead of him
          // is a lead blocker to follow, not a wall: he will be on someone or
          // out of the way by the time the runner gets there.
          if (leverage && !threats.some(o => touching(b, o.pos, o.d.profile.radius)) && b.vel.x * hx + b.vel.y * hy > 2) return false;
          const horizon = Math.min(arrival, 0.6);
          const bx = b.pos.x + b.vel.x * horizon;
          const by = b.pos.y + b.vel.y * horizon;
          const u = clamp(((bx - lastQ.x) * segment.x + (by - lastQ.y) * segment.y) / Math.max(1e-6, segment2), 0, 1);
          return Math.hypot(bx - lastQ.x - u * segment.x, by - lastQ.y - u * segment.y) < b.radius + a.profile.radius * 0.70;
        });
        if (obstructed) {
          clean = false;
          break;
        }
        let minMargin = Infinity;
        let limiter: string | undefined;
        for (const th of threats) {
          // Respect the tackler's arms: his reach plus a lunge.
          const tt = timeToReach({ pos: th.pos, vel: th.vel, profile: judged(a, th.d), speedScale: 1 }, q, a.profile.radius + th.d.profile.radius + judged(a, th.d).reach * 0.75)
            + (leverage ? th.extra - th.blockerBonus + credit(th, q) : th.extra);
          const m = tt - arrival;
          if (m < minMargin) {
            minMargin = m;
            limiter = th.d.slot;
            if (m < 0) {
              const runnerSpeed = vmax - (vmax - s0) * Math.exp(-arrival / tau);
              impactCost = contactCost(a.profile.massKg, th.d.profile.massKg,
                Math.hypot(hx * runnerSpeed - th.vel.x, hy * runnerSpeed - th.vel.y), a.r('toughness'), a.r('ballSecurity'));
            }
          }
        }
        if (minMargin < 0) {
          clean = false;
          stoppedBy = limiter;
          contactGain = (q.x - p.x) * dir;
          break;
        }
        lastQ = q;
        safeGain = (q.x - p.x) * dir;
        if (crosses) { exits = true; break; }
        if ((q.x - goalX) * dir >= 0) break;
      }
      let score = safeGain;
      if (clean && !exits) score += 3 + 0.4 * safeGain;
      // Near the boundary, weigh a costly hit against the few extra yards it
      // buys. An unobstructed field lane still wins over giving up free yards.
      if (!designed && Math.min(p.y, FIELD_WIDTH - p.y) < 5 && !clean) score -= impactCost;
      if (!designed && a.team === 'O') {
        const needed = (sim.firstDownX - p.x) * dir;
        const payoff = sim.snapContext.down >= 3 ? 5 : 2;
        if (needed > 0 && safeGain >= needed) score += payoff;
        // At the sticks, a runner may fight through an imminent hit rather
        // than leave short. This is decision utility, not awarded yardage.
        else if (needed > 0 && contactGain !== null) score += payoff * clamp(1 - Math.abs(needed - contactGain), 0, 1);
      }
      const toGoal = (goalX - p.x) * dir;
      if (safeGain >= toGoal) score += 10;
      else if (contactGain !== null) score += 10 * clamp(1 - Math.abs(toGoal - contactGain), 0, 1);
      // Cutting costs speed; prefer smooth paths.
      score -= turn * 1.2;
      // Lateral movement without gain is worth little; going backwards is bad.
      const lat = Math.abs(lastQ.y - p.y);
      score -= (lastQ.x - p.x) * dir < 0 ? 2 + lat * 0.2 : 0;
      if (designed && this.opts.aim) score -= Math.abs(angleDiff(angleOf({ x: this.opts.aim.x - p.x, y: this.opts.aim.y - p.y }), h)) * 2.5;
      if (hurry) {
        const toSide = hy > 0 ? FIELD_WIDTH - p.y : p.y;
        if (Math.abs(hy) > 0.5 && toSide < 12) score += 2.5;
      }
      score += Math.sin(h - base) * a.mind.placementError * (0.15 + 1.4 * this.visionNoise);
      const blocked = !clean && safeGain < 1.5;
      if (h === aimHeading) { aimBlocked = blocked; aimScore = score; }
      if (h === cur) {
        curScore = score;
        curBlocked = blocked;
        curExits = exits;
      }
      routes?.push({ heading: h, score, blocked, clean, exits, safeGain, aim: h === aimHeading, current: h === cur, stoppedBy });
      if (!best || score > best.score) best = { heading: h, score, blocked, exits };
    }
    // Hysteresis: keep the current lane unless the new one is clearly better.
    const kept = !!best && best.heading !== cur && best.score - curScore < 0.4;
    if (best && kept) best = { heading: cur, score: curScore, blocked: curBlocked, exits: curExits };
    if (best?.exits) a.tags.add('chose-sideline');
    // A defender he sees standing in the track he is pressing (the point his
    // press command aims at, not the nominal aiming point the routes are
    // scored against): up, no blocker on him, ahead of him on that line within
    // a stride or two. Not a race to a hole; a body in the way.
    let trackBody = false;
    if (designed && track) {
      const th0 = angleOfPoint(p, track), ux = Math.cos(th0), uy = Math.sin(th0);
      const reach = Math.min(Math.hypot(track.x - p.x, track.y - p.y), 2.5);
      trackBody = threats.some((th) => {
        if (th.seen.pose === 'down' || th.parking !== null || th.recovery > 0 || th.blockerBonus > 0) return false;
        const rx = th.pos.x - p.x, ry = th.pos.y - p.y, along = rx * ux + ry * uy;
        return along > 0 && along < reach && Math.abs(rx * uy - ry * ux) < a.profile.radius + th.d.profile.radius + .25;
      });
    }
    // His kick puller, as he sees him, has reached the line with a man in
    // front of his chest and in his hands' range: the kick block is landing
    // and can be read, kicked out or logged.
    const kick = designed ? this.opts.run?.kick : undefined;
    const kickSeen = kick && blockers.find((b) => b.agent === kick);
    const kickLanded = !!kick && !!kickSeen && (kickSeen.pos.x - sim.los) * dir > -1.5
      && !!kickBlockMan(kick, kickSeen, threats.map((th) => ({ agent: th.d, seen: th.seen })));
    const result = best ? { heading: clampHeading(best.heading, dir), score: best.score, blocked: best.blocked, aimBlocked, aimScore, exits: best.exits, trackBody, kickLanded } : null;
    trace?.carrier({ kind: 'evaluate', t: sim.t, designed, arrival: threats.map(arrivalRecord), routes: routes!,
      selected: result && { heading: result.heading, score: result.score, blocked: result.blocked, exits: result.exits, keptCurrent: kept },
      aim: designed ? { heading: aimHeading, score: aimScore, blocked: aimBlocked } : null });
    return result;
  }
}

/** One defender as the runner has him, and each part of the time added to
 * his reach estimate. `extra` is what the route assessment consumes. */
export interface ArrivalEvidence {
  d: Agent;
  pos: Vec2;
  vel: Vec2;
  seen: Perceived;
  /** Explicit scenario parking (a scheduled absence), when one applies. */
  parking: number | null;
  /** Recovery inferred from his delayed pose; 0 when parking applies. */
  recovery: number;
  /** "Held up" credit for a perceived blocker within touching distance:
   * 0.25 s if he is visibly coming through, else 0.7 s. */
  blockerBonus: number;
  extra: number;
}

/** Perceived teammates near the runner, and defenders he can see within his
 * vision range, each from his own pictures. */
function arrivalEvidence(a: Agent, sim: PlaySim, dir: number, range: number, vision: number) {
  const p = a.pos;
  const blockers = sim.teammates(a).filter((b) => b !== a)
    .map((b) => ({ ...sim.see(a, b), radius: b.profile.radius, agent: b }))
    .filter((b) => b.pose !== 'down' && Math.hypot(b.pos.x - p.x, b.pos.y - p.y) < 12);
  const threats: ArrivalEvidence[] = [];
  for (const d of sim.opponents(a)) {
    const seen = sim.see(a, d, 0.7);
    const dd = Math.hypot(seen.pos.x - p.x, seen.pos.y - p.y);
    if (dd > range) continue;
    // Backside defenders behind the runner are easy to miss for poor-vision backs.
    const behind = (seen.pos.x - p.x) * dir < -1.5;
    if (behind && a.mind.focus < 0.35 + 0.5 * (1 - vision)) continue;
    // His recovery allowance comes only from the delayed pose he sees, never
    // a scenario's scheduled absence (downUntil), hidden support state or an
    // exact recovery deadline.
    const parking = null;
    const recovery = observedRecoveryAllowance(seen, judged(a, d).getUp, sim.dt);
    let extra = parking ?? recovery;
    // A defender he sees a blocker on is held up; one he sees coming at
    // him through it is getting off the block.
    let blockerBonus = 0;
    if (blockers.some((b) => touching(b, seen.pos, d.profile.radius))) {
      const rx = p.x - seen.pos.x, ry = p.y - seen.pos.y;
      blockerBonus = (seen.vel.x * rx + seen.vel.y * ry) / (Math.hypot(rx, ry) || 1) > 1 ? 0.25 : 0.7;
      extra += blockerBonus;
    }
    const vel = CARRIER_RECOG ? sim.see(a, d, 1 + (1 - vision)).vel : seen.vel;
    threats.push({ d, pos: seen.pos, vel, seen, parking, recovery, blockerBonus, extra });
  }
  return { blockers, threats };
}

/** The man a seen kick puller has in his hands' range, as the runner sees
 * both: the nearest defender seen upright, in front of the puller's seen
 * chest (the half-plane he faces) and within the two bodies and the puller's
 * arm. This is the block landing or about to land, a tick or two before the
 * bodies meet; a body beside or behind the puller is not on his hands. An
 * unknown or rising pose, of either man, is not a confirmed block. */
function kickBlockMan(kick: Agent, seen: Perceived, defenders: Array<{ agent: Agent; seen: Perceived }>): Vec2 | null {
  if (seen.pose !== 'up') return null;
  const arm = kick.player.measurables.armIn / 36, fx = Math.cos(seen.facing), fy = Math.sin(seen.facing);
  let best: Vec2 | null = null, bd = Infinity;
  for (const { agent: d, seen: s } of defenders) {
    if (s.pose !== 'up') continue;
    const rx = s.pos.x - seen.pos.x, ry = s.pos.y - seen.pos.y, dd = Math.hypot(rx, ry);
    if (rx * fx + ry * fy <= 0) continue;
    if (dd < kick.profile.radius + d.profile.radius + arm && dd < bd) { bd = dd; best = s.pos; }
  }
  return best;
}

/** The runner's visible-block test: a perceived teammate within touching
 * distance of a perceived defender. */
function touching(b: { pos: Vec2; radius: number }, d: Vec2, dRadius: number): boolean {
  return Math.hypot(b.pos.x - d.x, b.pos.y - d.y) < b.radius + dRadius + 0.35;
}

/** Seen down or getting up: off his feet, as far as the runner can tell. */
function offFeet(seen: Perceived): boolean {
  return seen.pose === 'down' || seen.pose === 'rising';
}

/** One candidate heading as the evaluator scored it. */
export interface RouteAssessment { heading: number; score: number; blocked: boolean; clean: boolean; exits: boolean; safeGain: number; aim: boolean; current: boolean;
  /** Diagnostics: the defender whose arrival ended this lane, if one did. */
  stoppedBy?: string }

/** Leave the designed track only when its aiming point is blocked and the
 * best lane beats it by a patience margin, on the evaluator's own score. */
export function designExit(best: { score: number; aimBlocked: boolean; aimScore: number } | null, patience: number) {
  const threshold = best ? best.aimScore + 0.5 + 0.5 * patience : null;
  return { exit: !!best && best.aimBlocked && best.score > threshold!, aimBlocked: best?.aimBlocked ?? null,
    bestScore: best?.score ?? null, aimScore: best?.aimScore ?? null, margin: 0.5 + 0.5 * patience, threshold };
}

function arrivalRecord(th: ArrivalEvidence) {
  return { defender: { playerId: th.d.player.id, slot: th.d.slot, index: th.d.idx },
    seen: { pos: { ...th.pos }, vel: { ...th.vel }, pose: th.seen.pose ?? null, age: th.seen.age ?? null },
    parking: th.parking, recovery: th.recovery, blockerBonus: th.blockerBonus, extra: th.extra };
}
export type CarrierArrivalRecord = ReturnType<typeof arrivalRecord>;

/** What the command trace keeps of the runner's decision, for Play Lab. */
export type CarrierDecisionRecord =
  | { kind: 'evaluate'; t: number; designed: boolean; arrival: CarrierArrivalRecord[]; routes: RouteAssessment[];
      selected: { heading: number; score: number; blocked: boolean; exits: boolean; keptCurrent: boolean } | null;
      aim: { heading: number; score: number; blocked: boolean } | null }
  | ({ kind: 'design-exit'; t: number } & ReturnType<typeof designExit>);

function angleOfPoint(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function clampHeading(h: number, dir: number): number {
  // Never run straight backwards; allow up to ~100° off the attack direction.
  const base = dir > 0 ? 0 : Math.PI;
  const off = angleDiff(base, h);
  return base + clamp(off, -1.75, 1.75);
}
