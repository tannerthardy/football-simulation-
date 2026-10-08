/**
 * Ball-carrier vision.
 *
 * Every ~0.1 s the carrier samples candidate headings. For each heading he
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
import type { MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';

export interface CarrierOptions {
  /** Designed aiming point (run concept) and how long to honor it. */
  aim?: Vec2;
  aimUntil?: number;
  /** QB scramble: may slide. */
  qb?: boolean;
}

const SAMPLES = [0.25, 0.5, 0.75, 1.0, 1.3, 1.6, 2.0];

export class BallCarrier implements Behavior {
  readonly kind = 'carrier';
  private heading: number | null = null;
  private nextEval = 0;
  private visionNoise: number;

  constructor(
    private readonly opts: CarrierOptions = {},
    a?: Agent,
  ) {
    this.visionNoise = a ? 1 - a.r('vision') : 0.5;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const dir = sim.attackDir(a.team);
    const cutSkill = 0.85 + 0.35 * a.r('elusiveness');

    // Designed phase: press the aiming point.
    if (this.opts.aim && this.opts.aimUntil !== undefined && sim.t < this.opts.aimUntil && (a.pos.x - sim.los) * dir < -0.8) {
      const aim = this.opts.aim;
      const h = angleOf({ x: aim.x - a.pos.x, y: aim.y - a.pos.y });
      this.heading = h;
      // Only abandon the design early if the aiming point is clearly closed.
      if (sim.t >= this.nextEval) {
        this.nextEval = sim.t + 0.1;
        const best = this.evaluate(a, sim, dir, true);
        if (best && best.blocked && sim.rng.chance(0.25 + 0.5 * a.r('vision'))) this.opts.aimUntil = sim.t;
      }
      return { vel: { x: Math.cos(h) * a.profile.vmax, y: Math.sin(h) * a.profile.vmax }, cutSkill };
    }

    // QB slide: past the sticks (or any gain) with a hit coming.
    if (this.opts.qb && sim.isPass && (a.pos.x - sim.los) * dir > 1) {
      const threat = Math.min(...sim.opponents(a).map((d) => (d.isDown(sim.t) ? 9 : timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile }, a.pos, 1.0))));
      if (threat < 0.35 && !sim.bond) {
        sim.event('slide', a);
        sim.finishCarry('slide', a.pos);
        return { vel: { x: 0, y: 0 } };
      }
    }

    if (sim.t >= this.nextEval || this.heading === null) {
      this.nextEval = sim.t + 0.1;
      const best = this.evaluate(a, sim, dir, false);
      if (best) this.heading = best.heading;
      else if (this.heading === null) this.heading = dir > 0 ? 0 : Math.PI;
    }
    const h = this.heading!;
    return { vel: { x: Math.cos(h) * a.profile.vmax, y: Math.sin(h) * a.profile.vmax }, cutSkill };
  }

  private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): { heading: number; score: number; blocked: boolean } | null {
    const vision = a.r('vision');
    const range = 7 + 22 * vision;
    const p = a.pos;
    const speed = a.speed;
    const cur = speed > 0.8 ? angleOf(a.vel) : dir > 0 ? 0 : Math.PI;
    const base = dir > 0 ? 0 : Math.PI;
    const goalX = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X;
    const hurry = sim.hurry && a.team === 'O';

    // Perceived defenders (vision-filtered).
    const threats: Array<{ pos: Vec2; vel: Vec2; d: Agent; extra: number }> = [];
    for (const d of sim.opponents(a)) {
      const dd = Math.hypot(d.pos.x - p.x, d.pos.y - p.y);
      if (dd > range) continue;
      // Backside defenders behind the runner are easy to miss for poor-vision backs.
      const behind = (d.pos.x - p.x) * dir < -1.5;
      if (behind && sim.rng.next() > 0.35 + 0.6 * vision) continue;
      const seen = sim.see(a, d, 0.7);
      let extra = 0;
      if (d.isDown(sim.t)) extra += d.downUntil - sim.t + 0.2;
      if (d.engagement) extra += d.engagement.win > 0.6 ? 0.25 : 0.7;
      threats.push({ pos: seen.pos, vel: seen.vel, d, extra });
    }

    const cands: number[] = [];
    const spread = designed ? 0.9 : 1.55;
    for (let k = -8; k <= 8; k++) cands.push(base + (k / 8) * spread);
    cands.push(cur);

    let best: { heading: number; score: number; blocked: boolean } | null = null;
    let curScore = -Infinity;
    let curBlocked = false;
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
      for (const t of SAMPLES) {
        const d = vmax * t - (vmax - s0) * tau * (1 - Math.exp(-t / tau));
        const q = { x: p.x + hx * d, y: p.y + hy * d };
        if (q.y < 0.4 || q.y > FIELD_WIDTH - 0.4) {
          clean = false;
          break;
        }
        let minMargin = Infinity;
        for (const th of threats) {
          const tt = timeToReach({ pos: th.pos, vel: th.vel, profile: th.d.profile }, q, a.profile.radius + th.d.profile.radius + 0.4) + th.extra;
          const m = tt - t;
          if (m < minMargin) minMargin = m;
        }
        if (minMargin < 0) {
          clean = false;
          break;
        }
        lastQ = q;
        safeGain = (q.x - p.x) * dir;
        if ((q.x - goalX) * dir >= 0) break;
      }
      let score = safeGain;
      if (clean) score += 3 + 0.4 * safeGain;
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
      score += sim.rng.normal(0, 0.15 + 1.4 * this.visionNoise);
      const blocked = !clean && safeGain < 1.5;
      if (h === cur) {
        curScore = score;
        curBlocked = blocked;
      }
      if (!best || score > best.score) best = { heading: h, score, blocked };
    }
    // Hysteresis: keep the current lane unless the new one is clearly better.
    if (best && best.heading !== cur && best.score - curScore < 0.4) best = { heading: cur, score: curScore, blocked: curBlocked };
    return best ? { heading: clampHeading(best.heading, dir), score: best.score, blocked: best.blocked } : null;
  }
}

function clampHeading(h: number, dir: number): number {
  // Never run straight backwards; allow up to ~100° off the attack direction.
  const base = dir > 0 ? 0 : Math.PI;
  const off = angleDiff(base, h);
  return base + clamp(off, -1.75, 1.75);
}
