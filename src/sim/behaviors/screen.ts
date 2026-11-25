/**
 * Screen blocking (docs/football-handbook/screens.md).
 *
 * A released lineman works "out, up, in": the first takes the outermost threat
 * to the catch point, the next the alley in front of it, the next anyone
 * chasing from inside. A perimeter receiver stalks the defender over him or
 * cracks the next one inside. Every target is chosen from what the blocker
 * sees (delayed, perceived positions), re-read on a short decision beat, and
 * the block itself is the ordinary run engagement: the hands and bodies decide
 * it. Nothing here wins a block or awards a result.
 *
 * Before the ball is thrown a released lineman keeps his whole body within a
 * yard of the line (NFL 8-3-1: on any play with a legal forward pass, an
 * ineligible player more than a yard downfield before the throw is a foul,
 * wherever the pass is caught; contact begun within a yard and kept is the
 * exception). He slides toward his landmark beside the catch point and takes
 * a man sitting there; once the ball is out he attacks his man. A receiver
 * blocks from the snap: he is eligible.
 */
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { FIELD_WIDTH } from '../../core/field.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { ScreenJob } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { goTo, runThrough, stand, track } from './common.js';
import { bodyRadius } from '../../physics/bodyshape.js';
import { LATE, carrierLane, fitOn, meetOnTrack, matchThreats, threatOf, type Candidate, type Lane, type Threat } from './space-block.js';

/** A blocker's decision beat: how often he re-reads whom to take. */
const RETARGET = 0.3;
/** Inside this he is on his man: he keeps him and mirrors (yd). */
const ON_MAN = 4;
/** STALK_CLOSE (experimental, off; STALK_CLOSE=1): the stalk as coached. Before the ball is out a receiver's stalk
 * does not wait at his alignment for the man to come: he closes the cushion under control to a breakdown point on
 * the man's line to the catch (STALK_BREAK off him, from what he sees of the man), and from there mirrors and puts his
 * hands on the man's catch-side half once he is within reach. NFL perimeter stalks (BDB 2025 WR/TE screens, blocker on
 * a DB, stalk_reference.py): gap 3.7 yd at the snap, 2.0 at 0.9 s, 1.1 at 1.2 s, first contact 1.0 s before the
 * catch, never 1 of 18; ours off: 5.5, 5.1, 4.7, at the catch, never 50 of 263. */
export const STALK_CLOSE = process.env.STALK_CLOSE !== '0';
/** LINE_DEPTH (on by default; LINE_DEPTH=0 restores; Run Game, 2026-11-25, Integration's ruling): before the throw a
 * released lineman's limit is his own depth past the line (8-3-1: an ineligible man more than a yard downfield while a
 * legal forward pass is still possible), not his target's. His downfield request tapers to nothing as his rearmost point
 * (centre less his body's radius, as the rule and test/screen-install.test.ts measure it) nears the line + LINE_LIMIT,
 * the line as he knows it from the snap; while the passer holds the ball long he sells the pass at the line and holds
 * there until the ball is out (or the passer is a runner), then blocks the screen. Off, the limit was keyed on his man:
 * he slid only while his man was more than 0.8 yd past the line, so a man at the line drew his fit downfield: te_screen
 * seed 5 with the tackle package (the passer, still 7.7 yd behind the line, lasting about a second longer) put the RT
 * 2.05 yd downfield at 6.25 s. Applied to his final request (after teammate spacing). Stated choices: the limit less a
 * 0.1 yd margin; once he is within his own stopping distance of it plus LINE_PAD (0.5 yd), nothing after his own
 * decision adds downfield speed, and he goes downfield only as fast as he can still stop before it. The stopping rate is
 * LINE_BRAKE (0.6) of his profile brake: te_screen seed 5's RT, asked for nothing downfield, shed only about 3.5 m/s²
 * from 4.4 m/s, so a cap at full profile brake started too late and he reached 1.03 yd. */
export const LINE_DEPTH = process.env.LINE_DEPTH !== '0';
const LINE_LIMIT = 1, LINE_MARGIN = 0.1, LINE_BRAKE = 0.6, LINE_PAD = 0.5;
/** LINE_DEPTH: the limit on a released lineman's final request (after teammate spacing, which can otherwise carry him
 * downfield: te_screen seed 5's RT asked back toward the line at 5 yd/s and spacing turned it into 3 yd/s downfield). */
export function capLineDepth(sim: PlaySim, a: Agent, intent: { vel: Vec2 }, decided?: { vel: Vec2 }): void {
  if (!LINE_DEPTH || !(a.behavior instanceof ScreenBlocker) || !a.behavior.isLineman || a.engagement) return;
  const passer = sim.carrier === sim.qb ? sim.qb : null;
  if (sim.ball.kind !== 'held' || !passer) return;
  const dir = sim.attackDir(a.team);
  // A passer who has crossed the line can no longer throw a legal forward pass: no limit then.
  if ((passer.pos.x - sim.los) * dir > 0) return;
  const room = LINE_LIMIT - LINE_MARGIN - (a.pos.x - sim.los) * dir + bodyRadius(a.body, 1, 0);
  // Only once he is within his own stopping distance of it (plus LINE_PAD): a release that never nears it is untouched.
  const v = Math.max(0, a.vel.x * dir), brake = LINE_BRAKE * a.profile.brake;
  if (room > v * v / (2 * brake) + LINE_PAD) return;
  // Nothing after his own decision (teammate spacing) may carry him further downfield than he asked, and he goes
  // downfield only as fast as he can still stop before the limit on his own braking.
  const own = decided ? decided.vel.x * dir : Infinity;
  const allowed = Math.max(0, Math.min(own, Math.sqrt(2 * brake * Math.max(0, room))));
  if (intent.vel.x * dir > allowed) intent.vel = { x: dir * allowed, y: intent.vel.y };
}
/** Where he breaks down: this far off the man, on the man's line to the catch (yd). A coaching figure (about a yard
 * and a half), not a fit. */
const STALK_BREAK = 1.5;

export class ScreenBlocker implements Behavior {
  readonly kind = 'screen-block';
  /** Keep this job through the catch: it is the screen's blocking, not a generic convoy. */
  readonly keepAfterCatch = true;
  /** LINE_DEPTH: an ineligible lineman released on the screen (the rule's limit applies to him). */
  get isLineman(): boolean { return this.lineman; }
  target: Agent | null = null;
  private retargetAt = -1;
  readonly home: Vec2;

  constructor(
    a: Agent,
    readonly job: ScreenJob,
    /** +1 when the screen is to +y of the ball. */
    readonly side: number,
    /** Where the screen is designed to be caught (absolute field coordinates). */
    readonly spot: Vec2,
    /** Ineligible lineman: stay at the line until the ball is thrown. */
    private readonly lineman: boolean,
  ) {
    this.home = { ...a.pos };
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (a.engagement) return stand();
    const dir = sim.attackDir(a.team);
    const thrown = sim.ball.kind === 'air' || (sim.carrier !== null && sim.carrier !== sim.qb);
    if (sim.carrier && sim.carrier.team !== a.team) return stand();
    const lane = carrierLane(sim, a, this.spot);
    if (sim.t >= this.retargetAt || !this.target || this.target.engagement || this.target.isDown(sim.t)) {
      this.retargetAt = sim.t + RETARGET;
      this.target = this.pick(a, sim, dir, thrown, lane);
    }
    const d = this.target;
    // He knows where the screen is thrown: while it is in the air he does
    // not stand in its path (a stalk blocker drifting inside to his man's
    // track under a floated bubble caught it himself; a released tackle got
    // hands on a tunnel throw).
    const clear = this.clearLane(a, sim);
    if (clear) return clear;
    // Before the throw a lineman may block only near the line (8-3-1); a
    // defender sitting in the screen there is his.
    if (this.lineman && !thrown && (!d || (d.pos.x - sim.los) * dir > 0.8)) return this.slide(a, sim, dir);
    if (!d) return this.lead(a, sim, dir, lane);
    const seen = sim.see(a, d);
    // Contact is felt, not seen: the block starts when the bodies meet,
    // however stale his picture of the man is.
    const touch = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
    const th = threatOf(sim, a, d, lane, seen);
    if (touch < a.profile.radius + d.profile.radius + 0.3) {
      if (sim.engage(a, d, 'run', this.drive(dir, seen.pos, th))) return stand();
    }
    const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
    // His man's track: from where he is to where he meets the carrier's lane
    // (or straight at the lane's start if he cannot reach it in time). Once
    // the man is close to the carrier he is running at the carrier himself,
    // not at a forecast: the fit is on his line to the carrier, a beat ahead.
    const c = sim.carrier && sim.carrier.team === a.team && sim.carrier !== sim.qb ? sim.carrier : null;
    let goal = th ? th.at : lane(0);
    if (c) {
      const cs = sim.see(a, c);
      const near = { x: cs.pos.x + cs.vel.x * 0.3, y: cs.pos.y + cs.vel.y * 0.3 };
      if (Math.hypot(seen.pos.x - near.x, seen.pos.y - near.y) < 6) goal = near;
    }
    const toGoal = norm(sub(goal, seen.pos));
    // STALK_CLOSE: close the cushion to the breakdown point, then hands on (see STALK_CLOSE).
    if (STALK_CLOSE && this.job === 'stalk' && !this.lineman) {
      const facingMan = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
      if (dist > STALK_BREAK + 0.5) {
        const brk = { x: seen.pos.x + toGoal.x * STALK_BREAK, y: seen.pos.y + toGoal.y * STALK_BREAK };
        const far = Math.hypot(brk.x - a.pos.x, brk.y - a.pos.y);
        // Run while far, gather as he nears it: under control at the breakdown, never parked in front of a man coming.
        return track(a, brk, { x: seen.vel.x * 0.5, y: seen.vel.y * 0.5 }, { gain: 1.6, cutSkill: 1, facing: facingMan, speed: far > 3 ? 0.9 : far > 1 ? 0.6 : 0.35 });
      }
      // Mirror and strike: his hands go to the man's catch-side half, where the man is going, a beat ahead.
      const hit = { x: seen.pos.x + toGoal.x * 0.4 + seen.vel.x * 0.15, y: seen.pos.y + toGoal.y * 0.4 + seen.vel.y * 0.15 };
      return track(a, hit, seen.vel, { gain: 2.4, cutSkill: 1, facing: facingMan });
    }
    // A receiver's stalk or crack does not release like a route: he works to
    // leverage, between his man and the catch point near his own depth, and
    // lets the man come to him; he attacks once the ball is out. NFL screen
    // blockers on DBs move 0.5 yd downfield and 0.7 yd across by 0.9 s while
    // the DB comes downhill to them (stalk_reference.py); he does not chase a
    // man who bails.
    if (!this.lineman && !thrown && dist > 2) {
      const lev = { x: seen.pos.x + toGoal.x * Math.min(2.5, dist - 0.5), y: seen.pos.y + toGoal.y * Math.min(2.5, dist - 0.5) };
      lev.x = dir > 0 ? Math.min(lev.x, this.home.x + 0.5) : Math.max(lev.x, this.home.x - 0.5);
      const far = Math.hypot(lev.x - a.pos.x, lev.y - a.pos.y);
      return runThrough(a, lev, { speed: far > 0.4 ? 0.45 : 0, cutSkill: 1, facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) });
    }
    const facing = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
    if (dist > ON_MAN && th) {
      // Get to the meeting point on his track, arriving under control: run
      // while it is far, then gather to set there and let him come.
      const fit = fitOn(a, th);
      const far = Math.hypot(fit.point.x - a.pos.x, fit.point.y - a.pos.y);
      if (far > 3) return runThrough(a, fit.point, { speed: 1, cutSkill: 1 });
      return goTo(a, fit.point, { speed: 1, through: 1.5, facing, cutSkill: 1 });
    }
    // Close: get his body onto the man's run to the ball at the earliest point
    // he can beat him to, re-read every step, as a pursuer aims at an
    // intercept. Aiming just in front of where the man is now arrives a
    // beat late at screen closing speeds, behind him as he runs by.
    const meet = meetOnTrack(a, d, seen, goal);
    if (meet) {
      const far = Math.hypot(meet.x - a.pos.x, meet.y - a.pos.y);
      if (far > 1.2) return runThrough(a, meet, { speed: 1, cutSkill: 1, facing });
      return track(a, meet, { x: seen.vel.x * 0.5, y: seen.vel.y * 0.5 }, { gain: 2.4, cutSkill: 1, facing });
    }
    // He cannot beat the man to his line: stay on it as he comes (the
    // inside-out fit, between him and the ball) and make him go through.
    const fit = { x: seen.pos.x + toGoal.x * 0.9, y: seen.pos.y + toGoal.y * 0.9 };
    if (dist > ON_MAN) return runThrough(a, fit, { speed: 0.95, cutSkill: 1 });
    return track(a, fit, seen.vel, { gain: 2.4, cutSkill: 1, facing });
  }

  /**
   * Nobody he can fit yet: lead. He climbs upfield in the screen's lane, 4-6
   * yd ahead of the carrier (or of where he will catch it), a little to his
   * job's side so the carrier can follow him up without running into him,
   * and keeps looking for the first man to show. He turns the play upfield:
   * his lane is the screen's, not wherever the carrier has drifted (leaders
   * who follow a drifting back sideways carry him to the sideline). He never
   * parks: a blocker who stops at the line stands in the back's path.
   */
  private lead(a: Agent, sim: PlaySim, dir: number, lane: Lane): MoveCommand {
    const ref = lane(0);
    const offset = this.job === 'out' ? 2 : this.job === 'in' || this.job === 'crack' ? -2 : -1;
    const ahead = (a.pos.x - ref.x) * dir;
    const x = ahead > 6 ? a.pos.x + dir : Math.max(ref.x * dir + 5, a.pos.x * dir + 2) * dir;
    const y = clamp(this.spot.y + this.side * offset, 1, FIELD_WIDTH - 1);
    return runThrough(a, { x, y }, { speed: ahead > 6 ? 0.6 : 0.9, cutSkill: 1 });
  }

  /** Out of the ball's path while it is in the air: within 1.5 yd of its
   * line from where it is now to where it is going, he steps straight off
   * that line, on its upfield side: toward the defense, and away from the
   * catcher, who comes to a screen from behind the line. Stepping off on
   * whichever side he stood backed a stalk blocker into the bubble's path
   * (Cover 3 with the flat defender holding depth: the catcher arrived 3.3
   * yd short of the throw, 14 of 16 incomplete). An eligible receiver may
   * stay near the catch point (the last 2 yd) to block there; an ineligible
   * lineman keeps off it altogether. */
  private clearLane(a: Agent, sim: PlaySim): MoveCommand | null {
    if (sim.ball.kind !== 'air') return null;
    const b = sim.ballPos(), to = sim.ball.intended;
    const vx = to.x - b.x, vy = to.y - b.y, L = Math.hypot(vx, vy);
    if (L < 2.5) return null;
    const ux = vx / L, uy = vy / L;
    const rx = a.pos.x - b.x, ry = a.pos.y - b.y;
    const along = rx * ux + ry * uy, across = rx * uy - ry * ux;
    if (along < 0 || along > (this.lineman ? L + 1 : L - 2) || Math.abs(across) > 1.5) return null;
    const dir = sim.attackDir(a.team);
    // The side of the line whose step points upfield; on a line that runs
    // straight upfield, the side he is already on.
    const s = Math.abs(uy) > 0.2 ? Math.sign(uy * dir) : Math.sign(across) || 1;
    // Eyes stay upfield on the defense while he gets out of the way.
    const up = dir > 0 ? 0 : Math.PI;
    return runThrough(a, { x: a.pos.x + uy * s * 2, y: a.pos.y - ux * s * 2 }, { speed: 0.8, cutSkill: 1, facing: up });
  }

  /** Lineman before the throw: slide along the line toward his landmark beside the catch. */
  private slide(a: Agent, sim: PlaySim, dir: number): MoveCommand {
    // Once his rusher is by, he steps back up to the line near his own lane and
    // leads from there when the ball is out. NFL released linemen on RB/TE
    // screens are 0.6 yd behind the line and 2.6 yd from the ball at the throw,
    // then 3.2 yd ahead of the catcher at the catch (screen_ol_reference.py);
    // they do not slide wide behind the rush.
    const across = clamp((this.spot.y - this.home.y) * this.side, 0, 2) * this.side;
    const to = { x: sim.los - 0.5 * dir, y: clamp(this.home.y + across, 1, FIELD_WIDTH - 1) };
    // Get off the rusher: a defender he sees right in front of him (upfield,
    // within 2 yd, less than a body width across) is the man coming past; he
    // steps around him toward the screen before going up, not into him.
    for (const d of sim.opponents(a)) {
      if (d.isDown(sim.t)) continue;
      const s = sim.see(a, d);
      const ahead = (s.pos.x - a.pos.x) * dir, off = (s.pos.y - a.pos.y) * this.side;
      if (ahead > -0.3 && ahead < 2 && Math.abs(off) < a.profile.radius + d.profile.radius + 0.3)
        return runThrough(a, { x: a.pos.x, y: clamp(s.pos.y + this.side * 1.6, 1, FIELD_WIDTH - 1) }, { speed: 0.8, facing: dir > 0 ? 0 : Math.PI });
    }
    return runThrough(a, to, { speed: Math.hypot(to.x - a.pos.x, to.y - a.pos.y) > 0.6 ? 0.8 : 0.1, facing: dir > 0 ? 0 : Math.PI });
  }

  /** Where he drives the man: away from the carrier's lane, else by his job (outside, upfield, inside). */
  private drive(dir: number, at: Vec2, th: Threat | null): Vec2 {
    if (th) {
      const away = sub(at, th.at);
      if (Math.hypot(away.x, away.y) > 0.5) return norm(away);
    }
    switch (this.job) {
      case 'out': return norm({ x: 0.5 * dir, y: this.side });
      case 'in': case 'crack': return norm({ x: 0.5 * dir, y: -this.side });
      default: return { x: dir, y: 0 };
    }
  }

  /**
   * His job as a preference, in seconds of slack he would give up to take a
   * man outside it: the out block favours men outside the catch, up the men
   * in front of it, in the men inside, a stalk the man over him, a crack the
   * next man inside him. A clearly more urgent or more reachable man wins.
   */
  bias(th: Threat, sim: PlaySim, ref: Vec2): number {
    const dir = sim.attackDir('O');
    const p = th.seen.pos;
    const out = (p.y - ref.y) * this.side, down = (p.x - ref.x) * dir;
    switch (this.job) {
      case 'out': return out > -1.5 ? 0 : 0.4;
      case 'in': return out < 1 ? 0 : 0.4;
      case 'up': return down > 1 && Math.abs(out) < 6 ? 0 : 0.25;
      case 'stalk': return Math.min(0.5, 0.05 * Math.hypot(p.x - this.home.x, p.y - this.home.y));
      case 'crack': return (p.y - this.home.y) * this.side < 1 ? 0 : 0.4;
    }
  }

  /** Seen aligned on the ball, within 4 yd of the tackles, before the snap: the rush. */
  private downLineman(sim: PlaySim, d: Agent): boolean {
    const p = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos;
    if (!p) return false;
    const ol = sim.offense.filter(o => /^(LT|LG|C|RG|RT)$/.test(o.slot)).map(o => sim.offAlign.spots[o.slot]?.pos.y ?? o.pos.y);
    return Math.abs(p.x - sim.los) < 1.6 && p.y > Math.min(...ol) - 4 && p.y < Math.max(...ol) + 4;
  }

  /**
   * Whom to take, from what he sees (space-block.ts): the screen's blockers
   * matched to the threats to the carrier's lane, most urgent first, each to
   * whoever can fit him with the most slack; this blocker takes his own row.
   * Before the throw the rush is left alone (a down lineman is the pass rush
   * the screen invites) and a stalk stays on the man over him.
   */
  private pick(a: Agent, sim: PlaySim, dir: number, thrown: boolean, lane: Lane): Agent | null {
    const mates = sim.teammates(a);
    // Men a teammate is already blocking are taken: that is visible.
    const taken = new Set<Agent>();
    for (const o of mates) if (o.engagement) taken.add(o.engagement.defender);
    const ref = thrown && sim.carrier && sim.carrier.team === a.team && sim.carrier !== sim.qb ? sim.carrier.pos : this.spot;
    const threats: Threat[] = [];
    for (const d of sim.opponents(a)) {
      if (d.engagement || d.isDown(sim.t) || taken.has(d)) continue;
      if (!thrown && this.downLineman(sim, d)) continue;
      const th = threatOf(sim, a, d, lane);
      if (th) threats.push(th);
    }
    if (!threats.length) return null;
    // The man over a stalk blocker before the throw.
    const stalkMan = (b: ScreenBlocker): Agent | null => {
      let best: Threat | null = null, bd = Infinity;
      for (const th of threats) {
        const dd = Math.hypot(th.seen.pos.x - b.home.x, th.seen.pos.y - b.home.y);
        if (dd < bd) { bd = dd; best = th; }
      }
      return best?.d ?? null;
    };
    const cands: Candidate[] = [];
    for (const o of mates) {
      if (!(o.behavior instanceof ScreenBlocker) || o.engagement || o.isDown(sim.t)) continue;
      const b = o.behavior;
      let on: Agent | null = null;
      if (o === a) {
        // He knows whom he is on.
        const t = this.target;
        if (t && !t.engagement && !t.isDown(sim.t)) {
          const s = sim.see(a, t);
          if (Math.hypot(s.pos.x - a.pos.x, s.pos.y - a.pos.y) < ON_MAN) on = t;
        }
      } else {
        // A teammate right on a man is on him.
        for (const th of threats) if (Math.hypot(th.seen.pos.x - o.pos.x, th.seen.pos.y - o.pos.y) < 2) { on = th.d; break; }
      }
      if (!thrown && b.job === 'stalk') on = stalkMan(b);
      cands.push({ b: o, on, bias: th => b.bias(th, sim, ref) });
    }
    const mine = matchThreats(threats, cands).get(a);
    // Once the ball is out he commits: "see it, hit it". He keeps his man
    // while that man can still reach the carrier and he can still get in his
    // way, unless a teammate is on him or a clearly more urgent man shows
    // that he can get in front of. Before the throw the picture is still
    // forming and he re-reads freely.
    const cur = this.target && threats.find(th => th.d === this.target);
    if (cur && (thrown || (mine && mine.th.d !== cur.d && mine.th.t > cur.t - 0.3))) {
      const mateOn = cands.some(c => c.b !== a && c.on === cur.d);
      const close = Math.hypot(cur.seen.pos.x - a.pos.x, cur.seen.pos.y - a.pos.y) < ON_MAN;
      const reachable = close || fitOn(a, cur).slack > (thrown ? -0.6 : -LATE);
      const urgent = mine && mine.th.d !== cur.d && mine.th.t < cur.t - (thrown ? 0.5 : 0.3) && mine.fit.slack > 0;
      if (!mateOn && reachable && !urgent) return cur.d;
    }
    return mine?.th.d ?? null;
  }
}
