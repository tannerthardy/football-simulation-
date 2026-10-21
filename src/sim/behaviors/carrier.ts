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

export interface CarrierOptions {
  /** Designed aiming point (run concept) and how long to honor it. */
  aim?: Vec2;
  aimUntil?: number;
  /** QB scramble: may slide. */
  qb?: boolean;
  /** Known lead/pull responsibilities on a designed run. */
  follow?: Agent[];
  run?: { scheme:RunScheme; side:number; readKey?:Agent; kick?:Agent };
  /** The designed aim as a gap on the line (with the play's offset from that
   * gap's landmark), so it moves with the bodies that form it. */
  aimGap?: { gap: Gap; side: number; offset: number };
}

/** STRETCH_AIM=1 (default off; on in this branch's pinned profile): on
 * outside and wide zone the back presses the snap landmark; the live gap
 * does not follow the end. The live C/D gap is bounded by the inline end, so
 * an end who drives the tight end wide while penetrating drags the back's
 * landmark outward onto himself: sim backs ran at the play-side end on 19-29%
 * of stretch runs, losing yards on 36-54% of those (tracking: 13%, 22%), and
 * cut inside him on 28-53% (tracking 65%). Where the line's flow opens a lane
 * is the read's job. */
const STRETCH_AIM = process.env.STRETCH_AIM === '1';

/** The designed aiming point as this runner sees the line now (LIVE_AIM=0: snap point). */
export function liveAim(a: Agent, sim: PlaySim, opts: CarrierOptions): Vec2 | undefined {
  if (!opts.aim || !opts.aimGap || process.env.LIVE_AIM === '0') return opts.aim;
  if (STRETCH_AIM && (opts.run?.scheme === 'outsideZone' || opts.run?.scheme === 'wideZone')) return opts.aim;
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

/** Read entries and routes from acquired bodies on both teams. A nominal
 * block is neither an empty lane nor guaranteed future protection. */
interface LineBody { pos: Vec2; radius: number; team: 'O' | 'D'; reach?: number; vel?: Vec2 }

/** RUN_REACH=1 (default off; on in this branch's pinned profile): the
 * runner's path check gives a defender's body part of his arm's reach (0.4),
 * not only his torso. A route that passes a defender's chest just outside his
 * torso is not open: he reaches out and takes the runner. Most zone stuffs
 * end "reached from the block" (docs/reviews/run-game-v3.md, Part 15). */
const RUN_REACH = process.env.RUN_REACH === '1';
/** RUN_ARMS=1 (default off): a block holds a defender's feet, not his arms.
 * The lane forecast gives an engaged defender his release allowance only for
 * ground beyond his reach, regained over one arm's length of travel. A lane
 * brushing past a blocked defender is not open: he reaches out from the
 * block (most stuffs with the gait, docs/reviews/run-offense.md). */
const RUN_ARMS = process.env.RUN_ARMS === '1';
/** RUN_PROJECT=1 (default off): the entry route check meets each body where
 * his seen motion puts him when the runner gets there (at most 0.6 s ahead,
 * the lane forecast's blocker horizon), not where he stands now. A spilled
 * end driving into the backfield closes the route behind the line that was
 * clear when chosen (counter log plays, docs/reviews/run-offense.md). */
const RUN_PROJECT = process.env.RUN_PROJECT === '1';
/** LOG_READ=1 (default off): the back reads kick or log from where he sees
 * the kicker against the end he was installed to kick, not from the kicker's
 * own decision. An end who crosses the kicker's face after contact has been
 * logged whatever the kicker planned; the run goes outside the kicker. */
const LOG_READ = process.env.LOG_READ === '1';
/** LANE_DEPTH=1 (default off): when the first defender reaches an entry
 * before the runner, the lane also costs the yards behind the line where he
 * meets the runner on the way. Being met going north at the line beats being
 * met running sideways in the backfield; every lane closed in traffic left
 * the far-outside dog-leg the least bad (docs/reviews/run-offense.md). */
const LANE_DEPTH = process.env.LANE_DEPTH === '1';

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
  if (kick) {
    const s = sim.see(a, kick);
    const end = LOG_READ && kick.behavior instanceof RunBlocker ? kick.behavior.plan.target : null;
    const log = end ? (s.pos.y - sim.see(a, end).pos.y) * run.side > 0 : kick.tags.has('block-log');
    if (s.pos.x > sim.los - 1.5) preferred = s.pos.y + (log ? run.side * .85 : -run.side * .85);
  }
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
  const bodies: LineBody[] = [];
  for (const { agent: o, seen: s, team } of pictures) {
    if (s.pose === 'down') continue;
    if (depth(s.pos) < -1.6 || depth(s.pos) > 1.6 || Math.abs(s.pos.y - a.pos.y) > 12) continue;
    bodies.push({ pos: s.pos, radius: o.profile.radius, team, reach: team === 'D' && RUN_REACH ? o.profile.reach * .4 : 0, vel: s.vel });
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
  const threatTime = (d: Agent, s: Perceived, p: Vec2): number =>
    timeToReach({ ...s, profile: d.profile }, p, d.profile.radius + a.profile.radius + d.profile.reach * .75)
      + observedRecoveryAllowance(s, d.profile.getUp, sim.dt);
  let best: Vec2 | null = null, cost = Infinity;
  const measurements: Array<{ entry: Vec2; risk: number; score: number }> = [];
  const cruise = Math.max(4, a.profile.vmax * .8);
  // Bodies on a segment block the run along it. `t0`: when the runner starts it.
  const blockedBy = (from: Vec2, to: Vec2, t0 = 0): number => {
    const sx = to.x - from.x, sy = to.y - from.y, l2 = sx * sx + sy * sy || 1;
    let r = 0;
    for (const b of bodies) {
      let bp = b.pos;
      if (RUN_PROJECT && b.vel) {
        const along = clamp(((b.pos.x - from.x) * sx + (b.pos.y - from.y) * sy) / l2, 0, 1);
        const t = Math.min(.6, t0 + along * Math.sqrt(l2) / cruise);
        bp = { x: b.pos.x + b.vel.x * t, y: b.pos.y + b.vel.y * t };
      }
      const u = clamp(((bp.x - from.x) * sx + (bp.y - from.y) * sy) / l2, 0, 1);
      // Include the endpoint: a route ending in a defender is still occupied.
      // At the start, only charge a body when the route approaches it; an
      // already touching runner must remain free to move away from that body.
      if (u <= 0 && (bp.x - from.x) * sx + (bp.y - from.y) * sy <= 0) continue;
      const miss = Math.hypot(from.x + u * sx - bp.x, from.y + u * sy - bp.y) - b.radius - (b.reach ?? 0) - a.profile.radius * .7;
      if (miss < 0) r += 1.5 + 4 * Math.min(1, -miss);
    }
    return r;
  };
  for (const p of candidates) {
    // Two ways to the entry: straight, or flatten behind the line first and
    // then turn up (the cutback's dog-leg). Each has its own arrival time.
    const routes: Array<{ obstruct: number; arrive: number; via: Vec2; atW?: number }> = [{ obstruct: blockedBy(a.pos, p), arrive: timeToReach(me, p, 0), via: p }];
    if (depth(a.pos) < -1.6) {
      const w = { x: sim.los - 1.2 * dir, y: p.y };
      const atW = timeToReach(me, w, 0);
      routes.push({ obstruct: blockedBy(a.pos, w) + blockedBy(w, p, atW), arrive: atW + Math.hypot(p.x - w.x, p.y - w.y) / cruise, via: w, atW });
    }
    // Depth along a route at time t (straight, or flat to the turn then up).
    const depthAt = (route: { arrive: number; via: Vec2; atW?: number }, t: number): number => {
      if (route.atW === undefined) return depth(a.pos) + (depth(p) - depth(a.pos)) * clamp(t / Math.max(route.arrive, 1e-6), 0, 1);
      if (t < route.atW) return depth(a.pos) + (depth(route.via) - depth(a.pos)) * t / Math.max(route.atW, 1e-6);
      return depth(route.via) + (depth(p) - depth(route.via)) * clamp((t - route.atW) / Math.max(route.arrive - route.atW, 1e-6), 0, 1);
    };
    let risk = Infinity, via = p;
    const beyond = { x: p.x + 2 * dir, y: p.y };
    for (const route of routes) {
      const arrive = route.arrive, arrive2 = arrive + 2 / cruise;
      // Who is there first, at the entry and two yards beyond it: the
      // earliest defender decides, as in the open-field read.
      let m1 = Infinity, m2 = Infinity, first: { agent: Agent; seen: Perceived } | null = null;
      for (const { agent: d, seen: s, team } of pictures) {
        if (team !== 'D' || Math.hypot(s.pos.x - p.x, s.pos.y - p.y) > 8) continue;
        const t1 = threatTime(d, s, p) - arrive;
        if (t1 < m1) { m1 = t1; first = { agent: d, seen: s }; }
        m2 = Math.min(m2, threatTime(d, s, beyond) - arrive2);
      }
      // Where the runner meets the first defender: a free one closes from
      // the entry toward him while he keeps coming; one he sees body to body
      // with a blocker meets him at the entry.
      const locked = !!first && pictures.some(({ agent: o, seen: s, team }) => team === 'O'
        && Math.hypot(s.pos.x - first!.seen.pos.x, s.pos.y - first!.seen.pos.y) < o.profile.radius + first!.agent.profile.radius + .15);
      const closing = first && !locked ? first.agent.profile.vmax * .8 : 0;
      const meet = route.arrive + m1 * closing / (closing + cruise);
      const r = route.obstruct + (m1 < 0 ? 4 + 4 * Math.min(1, -m1) : m1 < .3 ? (.3 - m1) * 6 : 0)
        + (m2 < 0 ? 1.5 + 2 * Math.min(1, -m2) : 0)
        + (LANE_DEPTH && m1 < 0 ? Math.max(0, -depthAt(route, Math.max(0, meet))) : 0);
      if (r < risk) { risk = r; via = route.via; }
    }
    const score = Math.abs(p.y - preferred) * .45 + Math.abs(p.y - a.pos.y) * .12 + risk;
    if (runReadObservers.has(sim)) measurements.push({ entry: p, risk, score });
    // Run the chosen route: its first leg is where he heads now.
    if (score < cost) { cost = score; best = via; }
  }
  if (runReadObservers.has(sim)) observeRunRead(sim, a, 'aim', { preferred, selected: best, candidates: measurements, surface: bodies.map((b) => b.pos) });
  return best;
}

const SAMPLES = [0.25, 0.5, 0.75, 1.0, 1.3, 1.6, 2.0];

/** Experimental (PACE_LEAD=1, off): following a lead blocker through the
 * hole sets the back's pace from the lead's observed motion instead of a
 * fixed 28-40% of top speed. A lead crossing the back's track who will be out
 * of it by the time the back gets there costs nothing; one the back is
 * actually following is closed on no faster than the back could still brake
 * to the lead's own speed at body contact (the same arrival law as track()).
 * Pullers on counter/power cross the track at about 2-3 yd/s and only ~1 yd/s
 * along it; the fixed pace held the back near 2.5 yd/s for most of a second
 * after the handoff, where tracked backs stay at about 5 yd/s, 2-3 yd behind
 * the puller (2022 tracking, power/counter, handoff +0.5 to +1.0 s). */
const PACE_LEAD = process.env.PACE_LEAD === '1';

/** PACE_LEAD's pace behind a lead `ahead` yd up the back's track and
 * `across` yd off it, moving `alongV` / `acrossV` yd/s in that frame. */
export function leadPace(press: number, ahead: number, across: number, alongV: number, acrossV: number, contact: number, brake: number): number {
  const room = Math.max(0, ahead - contact), closing = press - Math.max(0, alongV);
  // Out of the track when the back would reach him: no wait.
  if (closing <= 0 || Math.abs(across + acrossV * room / closing) > contact) return press;
  return Math.min(press, Math.max(0, alongV) + Math.sqrt(2 * brake * .5 * room));
}

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
      if (this.opts.run && (a.pos.x - sim.los) * dir > -4.5) {
        if (sim.t >= this.pressReadAt) {
          this.pressReadAt = sim.t + a.mind.decisionInterval;
          this.pressEntry = runReadAim(a, sim, this.opts);
        }
        if (this.pressEntry) aim = this.pressEntry;
      }
      const h = angleOf({ x: aim.x - a.pos.x, y: aim.y - a.pos.y });
      this.heading = h;
      // Only abandon the design early if the aiming point is clearly closed.
      if (sim.t >= this.nextEval) {
        this.nextEval = sim.t + a.mind.decisionInterval;
        const best = this.evaluate(a, sim, dir, true);
        if (best && best.aimBlocked && best.score > best.aimScore + 0.5 + 0.5 * a.r('patience')) this.opts.aimUntil = sim.t;
      }
      const lead = this.opts.follow?.filter((b) => !b.isDown(sim.t) && !b.engagement)
        .sort((p, q) => Math.hypot(p.pos.x - aim.x, p.pos.y - aim.y) - Math.hypot(q.pos.x - aim.x, q.pos.y - aim.y))[0];
      if (lead) {
        const seen = sim.see(a, lead);
        const dx = seen.pos.x - a.pos.x;
        const dy = seen.pos.y - a.pos.y;
        const ahead = dx * Math.cos(h) + dy * Math.sin(h);
        const across = -dx * Math.sin(h) + dy * Math.cos(h);
        const entering = seen.pos.x < sim.los && ahead > 0 && ahead < 2.5 && Math.abs(across) < 2.2;
        // Patience ends when an unblocked defender can close before the next
        // two reads. Waiting for a late puller must not become a mandatory stop.
        const closing = entering && sim.opponents(a).some((d) => {
          if (d.isDown(sim.t) || d.engagement) return false;
          const threat = sim.see(a, d);
          return timeToReach({ ...threat, profile: d.profile, speedScale: d.speedScale }, a.pos,
            a.profile.radius + d.profile.radius + d.profile.reach * 0.75) < 2 * a.mind.decisionInterval;
        });
        if (entering && !closing && sim.t < this.opts.aimUntil!) {
          // Pace the lead block instead of outrunning a guard who is still
          // turning up through the hole. This only lasts through the read phase.
          a.tags.add('paced-lead');
          // Keep pressing the designed side. Following the guard's current
          // lateral position while he is flat-pulling sends the back into
          // the vacated backside gap.
          if (PACE_LEAD) {
            const press = a.profile.vmax * (0.62 + 0.18 * (1 - a.r('patience')));
            const alongV = seen.vel.x * Math.cos(h) + seen.vel.y * Math.sin(h);
            const acrossV = -seen.vel.x * Math.sin(h) + seen.vel.y * Math.cos(h);
            const pace = leadPace(press, ahead, across, alongV, acrossV, a.profile.radius + lead.profile.radius, a.profile.brake);
            return this.command(a, sim, h, pace, cutSkill);
          }
          return this.command(a, sim, h, a.profile.vmax * (0.28 + 0.12 * (1 - a.r('patience'))), cutSkill);
        }
      }
      // Press the hole under control (patient backs more so), then burst.
      const press = a.profile.vmax * (0.62 + 0.18 * (1 - a.r('patience')));
      return this.command(a, sim, h, press, cutSkill);
    }

    // QB slide: past the sticks (or any gain) with a hit coming.
    if (this.opts.qb && sim.isPass && (a.pos.x - sim.los) * dir > 1) {
      const threat = Math.min(...sim.opponents(a).map((d) => (d.isDown(sim.t) ? 9 : timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 1.0))));
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
      const entry = a.pos.x < sim.los+.3 && a.pos.x > sim.los-4 ? runReadAim(a,sim,this.opts) : null;
      const best = entry ? null : this.evaluate(a, sim, dir, false);
      if(entry) { this.heading=angleOf({x:entry.x-a.pos.x,y:entry.y-a.pos.y}); a.tags.add('run-crease-read'); }
      else if (best) { this.heading = best.heading; this.plannedExit = best.exits; }
      else if (this.heading === null) this.heading = dir > 0 ? 0 : Math.PI;
    }
    const h = this.heading!;
    return this.command(a, sim, h, a.profile.vmax, cutSkill);
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
    const bodies = sim.agents.filter((o) => o !== a && !o.isDown(sim.t)).map((o) => ({ pos: sim.see(a, o).pos, radius: o.profile.radius }));
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
    return { vel, cutSkill, squeeze };
  }

  private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): { heading: number; score: number; blocked: boolean; aimBlocked: boolean; aimScore: number; exits: boolean } | null {
    const vision = a.r('vision');
    const range = 7 + 22 * vision;
    const p = a.pos;
    const speed = a.speed;
    const cur = speed > 0.8 ? angleOf(a.vel) : dir > 0 ? 0 : Math.PI;
    const base = dir > 0 ? 0 : Math.PI;
    const goalX = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X;
    const hurry = sim.hurry && a.team === 'O';

    // Perceived defenders (vision-filtered).
    const threats: Array<{ pos: Vec2; vel: Vec2; d: Agent; extra: number; block: number }> = [];
    const blockers = sim.teammates(a).filter((b) => b !== a && !b.isDown(sim.t) && Math.hypot(b.pos.x - p.x, b.pos.y - p.y) < 12).map((b) => ({ ...sim.see(a, b), radius: b.profile.radius }));
    for (const d of sim.opponents(a)) {
      const dd = Math.hypot(d.pos.x - p.x, d.pos.y - p.y);
      if (dd > range) continue;
      // Backside defenders behind the runner are easy to miss for poor-vision backs.
      const behind = (d.pos.x - p.x) * dir < -1.5;
      if (behind && a.mind.focus < 0.35 + 0.5 * (1 - vision)) continue;
      const seen = sim.see(a, d, 0.7);
      // Explicit scenario parking keeps its scheduled absence. Physical falls
      // leave downUntil=-1; infer their allowance only from the delayed pose,
      // never hidden support state/since or an exact recovery deadline.
      let extra = d.downUntil > sim.t ? d.downUntil - sim.t + 0.2
        : observedRecoveryAllowance(seen, d.profile.getUp, sim.dt);
      const block = d.engagement ? d.engagement.win > 0.6 ? 0.25 : 0.7 : 0;
      threats.push({ pos: seen.pos, vel: seen.vel, d, extra: RUN_ARMS ? extra : extra + block, block: RUN_ARMS ? block : 0 });
    }

    const cands: number[] = [];
    const spread = designed ? 0.9 : 1.55;
    for (let k = -8; k <= 8; k++) cands.push(base + (k / 8) * spread);
    cands.push(cur);
    const aimHeading = this.opts.aim ? angleOfPoint(p, this.opts.aim) : base;
    if (designed) cands.push(aimHeading);

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
        for (const th of threats) {
          // Respect the tackler's arms: his reach plus a lunge.
          const arms = a.profile.radius + th.d.profile.radius + th.d.profile.reach * 0.75;
          let tt = timeToReach({ pos: th.pos, vel: th.vel, profile: th.d.profile, speedScale: th.d.speedScale }, q, arms) + th.extra;
          if (th.block) tt += th.block * Math.min(1, Math.max(0, Math.hypot(q.x - th.pos.x, q.y - th.pos.y) - arms) / th.d.profile.reach);
          const m = tt - arrival;
          if (m < minMargin) {
            minMargin = m;
            if (m < 0) {
              const runnerSpeed = vmax - (vmax - s0) * Math.exp(-arrival / tau);
              impactCost = contactCost(a.profile.massKg, th.d.profile.massKg,
                Math.hypot(hx * runnerSpeed - th.vel.x, hy * runnerSpeed - th.vel.y), a.r('toughness'), a.r('ballSecurity'));
            }
          }
        }
        if (minMargin < 0) {
          clean = false;
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
      if (!best || score > best.score) best = { heading: h, score, blocked, exits };
    }
    // Hysteresis: keep the current lane unless the new one is clearly better.
    if (best && best.heading !== cur && best.score - curScore < 0.4) best = { heading: cur, score: curScore, blocked: curBlocked, exits: curExits };
    if (best?.exits) a.tags.add('chose-sideline');
    return best ? { heading: clampHeading(best.heading, dir), score: best.score, blocked: best.blocked, aimBlocked, aimScore, exits: best.exits } : null;
  }
}

function angleOfPoint(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function clampHeading(h: number, dir: number): number {
  // Never run straight backwards; allow up to ~100° off the attack direction.
  const base = dir > 0 ? 0 : Math.PI;
  const off = angleDiff(base, h);
  return base + clamp(off, -1.75, 1.75);
}
