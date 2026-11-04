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
 * Before the ball is thrown a released lineman stays within a yard of the line
 * (an ineligible man downfield) and slides toward his landmark beside the
 * catch point; once the ball is out he attacks his man. A receiver blocks from
 * the snap: a screen is caught behind the line.
 */
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import { FIELD_WIDTH } from '../../core/field.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { ScreenJob } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { Perceived } from '../perception.js';
import { blockerWorkPoint, readBlockerWorkPicture, type BlockerWorkPicture } from '../blocker-work-picture.js';
import { observedContact } from '../coverage-cues.js';
import { acquireFlight, observedHolder } from '../possession-read.js';
import { goTo, runThrough, stand, track } from './common.js';
import { sawThrow } from './defense.js';
import { LATE, carrierLane, fitOn, meetOnTrack, matchThreats, threatOf, type Candidate, type Lane, type Threat } from './space-block.js';

/** A blocker's decision beat: how often he re-reads whom to take. */
const RETARGET = 0.3;
/** Inside this he is on his man: he keeps him and mirrors (yd). */
const ON_MAN = 4;

export class ScreenBlocker implements Behavior {
  readonly kind = 'screen-block';
  /** Keep this job through the catch: it is the screen's blocking, not a generic convoy. */
  readonly keepAfterCatch = true;
  target: Agent | null = null;
  private retargetAt = -1;
  private workPicture: BlockerWorkPicture | null = null;
  private sawRelease = false;
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
    if (!this.workPicture || sim.t >= this.workPicture.nextRead) this.workPicture = readBlockerWorkPicture(a, sim);
    const carrying = this.workPicture.source === 'acquired' && this.workPicture.carrier !== null
      && this.workPicture.carrier !== sim.qb.idx;
    if (!this.sawRelease && sawThrow(a, sim, null)) {
      this.sawRelease = true;
      acquireFlight(a, sim);
    }
    const thrown = this.sawRelease || carrying;
    if (observedHolder(a, sim)) return stand();
    const lane = carrierLane(sim, a, this.spot, this.workPicture);
    const held = this.target ? sim.see(a, this.target) : null;
    if (sim.t >= this.retargetAt || !held || held.pose === 'down' || held.pose === 'rising'
      || this.claimed(a, sim, this.target!, held)) {
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
    const seen = d ? sim.see(a, d) : null;
    // Before the throw a lineman may block only behind the line (an
    // ineligible man downfield); a defender sitting in the screen there is his.
    if (this.lineman && !thrown && (!seen || (seen.pos.x - sim.los) * dir > 0.8)) return this.slide(a, sim, dir);
    if (!d || !seen) return this.lead(a, sim, dir, lane);
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
    let goal = th ? th.at : lane(0);
    if (carrying) {
      const p = blockerWorkPoint(this.workPicture, sim.t), v = this.workPicture.vel;
      const near = { x: p.x + v.x * 0.3, y: p.y + v.y * 0.3 };
      if (Math.hypot(seen.pos.x - near.x, seen.pos.y - near.y) < 6) goal = near;
    }
    const toGoal = norm(sub(goal, seen.pos));
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
   * that line. An eligible receiver may stay near the catch point (the last
   * 2 yd) to block there; an ineligible lineman keeps off it altogether. */
  private clearLane(a: Agent, sim: PlaySim): MoveCommand | null {
    if (sim.ball.kind !== 'air') return null;
    const b = sim.ballPos(), to = sim.ball.intended;
    const vx = to.x - b.x, vy = to.y - b.y, L = Math.hypot(vx, vy);
    if (L < 2.5) return null;
    const ux = vx / L, uy = vy / L;
    const rx = a.pos.x - b.x, ry = a.pos.y - b.y;
    const along = rx * ux + ry * uy, across = rx * uy - ry * ux;
    if (along < 0 || along > (this.lineman ? L + 1 : L - 2) || Math.abs(across) > 1.5) return null;
    const s = Math.sign(across) || 1;
    // Eyes stay upfield on the defense while he gets out of the way.
    const up = sim.attackDir(a.team) > 0 ? 0 : Math.PI;
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
      const s = sim.see(a, d);
      if (s.pose === 'down' || s.pose === 'rising') continue;
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
    return this.jobBias(this.job, this.home, th, sim, ref);
  }

  private jobBias(job: ScreenJob, home: Vec2, th: Threat, sim: PlaySim, ref: Vec2): number {
    const dir = sim.attackDir('O');
    const p = th.seen.pos;
    const out = (p.y - ref.y) * this.side, down = (p.x - ref.x) * dir;
    switch (job) {
      case 'out': return out > -1.5 ? 0 : 0.4;
      case 'in': return out < 1 ? 0 : 0.4;
      case 'up': return down > 1 && Math.abs(out) < 6 ? 0 : 0.25;
      case 'stalk': return Math.min(0.5, 0.05 * Math.hypot(p.x - home.x, p.y - home.y));
      case 'crack': return (p.y - home.y) * this.side < 1 ? 0 : 0.4;
    }
  }

  /** Seen aligned on the ball, within 4 yd of the tackles, before the snap: the rush. */
  private downLineman(sim: PlaySim, d: Agent): boolean {
    const p = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos;
    if (!p) return false;
    const ol = sim.offense.filter(o => /^(LT|LG|C|RG|RT)$/.test(o.slot))
      .flatMap(o => sim.offAlign.spots[o.slot] ? [sim.offAlign.spots[o.slot].pos.y] : []);
    if (!ol.length) return false;
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
    const ref = lane(0);
    const threats: Threat[] = [];
    for (const d of sim.opponents(a)) {
      const seen = sim.see(a, d);
      if (seen.pose === 'down' || seen.pose === 'rising' || this.claimed(a, sim, d, seen)) continue;
      if (!thrown && this.downLineman(sim, d)) continue;
      const th = threatOf(sim, a, d, lane, seen);
      if (th) threats.push(th);
    }
    if (!threats.length) return null;
    // The man over a stalk blocker before the throw.
    const stalkMan = (home: Vec2): Agent | null => {
      let best: Threat | null = null, bd = Infinity;
      for (const th of threats) {
        const dd = Math.hypot(th.seen.pos.x - home.x, th.seen.pos.y - home.y);
        if (dd < bd) { bd = dd; best = th; }
      }
      return best?.d ?? null;
    };
    const roles = this.installedRoles(a, sim);
    const cands: Candidate[] = [];
    for (const o of mates) {
      const role = roles.get(o);
      if (!role) continue;
      const cue = sim.see(a, o);
      if (o !== a && (cue.pose === 'down' || cue.pose === 'rising' || sim.opponents(a).some(d => {
        const seen = sim.see(a, d);
        return cue.pose === 'up' && seen.pose === 'up' && observedContact(o, cue, d, seen);
      }))) continue;
      let on: Agent | null = null;
      if (o === a) {
        // He knows whom he is on.
        const t = this.target;
        const s = t && threats.find(th => th.d === t)?.seen;
        if (t && s) {
          if (Math.hypot(s.pos.x - a.pos.x, s.pos.y - a.pos.y) < ON_MAN) on = t;
        }
      } else {
        // A teammate right on a man is on him.
        for (const th of threats) if (Math.hypot(th.seen.pos.x - cue.pos.x, th.seen.pos.y - cue.pos.y) < 2) { on = th.d; break; }
      }
      if (!thrown && role.job === 'stalk') on = stalkMan(role.home);
      cands.push({ b: o, on, mover: o === a
        ? { pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }
        : { pos: cue.pos, vel: cue.vel, profile: o.profile },
      bias: th => this.jobBias(role.job, role.home, th, sim, ref) });
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

  /** Teammates know the called jobs, not another controller's current phase.
   * A free lineman's future screen work can be anticipated from his acquired
   * movement; visible contact/pose and the ordinary reach fit constrain it. */
  private installedRoles(a: Agent, sim: PlaySim): Map<Agent, { job: ScreenJob; home: Vec2 }> {
    const roles = new Map<Agent, { job: ScreenJob; home: Vec2 }>();
    const off = sim.offAlign;
    const line = sim.offense.filter(o => /^(LT|LG|C|RG|RT)$/.test(o.slot) && off.spots[o.slot])
      .sort((p, q) => (off.spots[q.slot].pos.y - off.spots[p.slot].pos.y) * this.side);
    for (const block of sim.offCall.pass?.screen?.blocks ?? []) {
      const slot = off.numbering[block.who as keyof typeof off.numbering];
      const mate = block.who === 'T' ? line[0] : block.who === 'G' ? line[1]
        : sim.slot(block.who === 'C' ? 'C' : slot ?? '');
      const home = mate && off.spots[mate.slot]?.pos;
      if (mate && home) roles.set(mate, { job: block.job, home });
    }
    roles.set(a, { job: this.job, home: this.home });
    return roles;
  }

  private claimed(a: Agent, sim: PlaySim, d: Agent, seen: Perceived): boolean {
    if (seen.pose !== 'up') return false;
    return sim.teammates(a).some(o => {
      if (o === a) return false;
      const cue = sim.see(a, o);
      return cue.pose === 'up' && observedContact(o, cue, d, seen);
    });
  }
}
