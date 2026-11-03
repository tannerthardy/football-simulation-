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
import type { Perceived } from '../perception.js';
import type { PlaySim } from '../playsim.js';
import { runThrough, stand } from './common.js';

/** A blocker's decision beat: how often he re-reads whom to take. */
const RETARGET = 0.3;

export class ScreenBlocker implements Behavior {
  readonly kind = 'screen-block';
  /** Keep this job through the catch: it is the screen's blocking, not a generic convoy. */
  readonly keepAfterCatch = true;
  target: Agent | null = null;
  private retargetAt = -1;
  private readonly home: Vec2;

  constructor(
    a: Agent,
    readonly job: ScreenJob,
    /** +1 when the screen is to +y of the ball. */
    private readonly side: number,
    /** Where the screen is designed to be caught (absolute field coordinates). */
    private readonly spot: Vec2,
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
    if (sim.t >= this.retargetAt || !this.target || this.target.engagement || this.target.isDown(sim.t)) {
      this.retargetAt = sim.t + RETARGET;
      this.target = this.pick(a, sim, dir);
    }
    // The point he blocks for: the ball carrier once he has it, else the catch point.
    const ref = thrown && sim.carrier && sim.carrier.team === a.team && sim.carrier !== sim.qb ? sim.carrier.pos : this.spot;
    const d = this.target;
    // Before the throw a lineman may block only behind the line (an
    // ineligible man downfield); a defender sitting in the screen there is his.
    if (this.lineman && !thrown && (!d || (d.pos.x - sim.los) * dir > 0.8)) return this.slide(a, sim, dir);
    if (!d) return runThrough(a, { x: ref.x + 3 * dir, y: ref.y + this.side * (this.job === 'out' ? 2 : 0) }, { speed: 0.75 });
    const seen = sim.see(a, d);
    // Fit on his path to the ball, between him and it, then strike through him.
    const toRef = norm(sub(ref, seen.pos));
    const fit = { x: seen.pos.x + toRef.x * 0.8, y: seen.pos.y + toRef.y * 0.8 };
    const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
    if (dist < a.profile.radius + d.profile.radius + 0.25) {
      if (sim.engage(a, d, 'run', this.drive(dir))) return stand();
    }
    // Run, then buzz the feet under control in the last couple of yards.
    return runThrough(a, fit, { speed: dist > 3 ? 0.95 : 0.6, cutSkill: 1 });
  }

  /** Lineman before the throw: slide along the line toward his landmark beside the catch. */
  private slide(a: Agent, sim: PlaySim, dir: number): MoveCommand {
    const lane = this.job === 'out' ? 2.5 : this.job === 'up' ? 0.5 : -1.5;
    // Flat to the landmark a yard behind the line: he let his rusher go upfield
    // past him, so he works across behind the rush, not back up through it.
    const to = { x: sim.los - 1.0 * dir, y: clamp(this.spot.y + this.side * lane, 1, FIELD_WIDTH - 1) };
    return runThrough(a, to, { speed: Math.hypot(to.x - a.pos.x, to.y - a.pos.y) > 1 ? 0.8 : 0.2, facing: dir > 0 ? 0 : Math.PI });
  }

  /** Where he drives the man: outside for the out block, upfield for up, inside for in. */
  private drive(dir: number): Vec2 {
    switch (this.job) {
      case 'out': return norm({ x: 0.5 * dir, y: this.side });
      case 'in': case 'crack': return norm({ x: 0.5 * dir, y: -this.side });
      default: return { x: dir, y: 0 };
    }
  }

  /** Seen aligned on the ball, within 4 yd of the tackles, before the snap: the rush. */
  private downLineman(sim: PlaySim, d: Agent): boolean {
    const p = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos;
    if (!p) return false;
    const ol = sim.offense.filter(o => /^(LT|LG|C|RG|RT)$/.test(o.slot)).map(o => sim.offAlign.spots[o.slot]?.pos.y ?? o.pos.y);
    return Math.abs(p.x - sim.los) < 1.6 && p.y > Math.min(...ol) - 4 && p.y < Math.max(...ol) + 4;
  }

  /** Whom to take, from what he sees: unengaged, on his feet, not a teammate's man. */
  private pick(a: Agent, sim: PlaySim, dir: number): Agent | null {
    const claimed = new Set<Agent>();
    for (const o of sim.teammates(a)) {
      if (o === a) continue;
      const b = o.behavior as { target?: Agent | null };
      if (b && 'target' in b && b.target) claimed.add(b.target);
      if (o.engagement) claimed.add(o.engagement.defender);
    }
    // A stalk stays on the man over him while he can still block him.
    if (this.job === 'stalk' && this.target && !this.target.engagement && !this.target.isDown(sim.t)
      && Math.hypot(this.target.pos.x - a.pos.x, this.target.pos.y - a.pos.y) < 12) return this.target;
    const pool: { d: Agent; s: Perceived }[] = [];
    for (const d of sim.opponents(a)) {
      if (d.engagement || d.isDown(sim.t) || claimed.has(d)) continue;
      // Down linemen (seen on the line near the tackles at the snap) are
      // the pass rush the screen invites past; a perimeter or alley block is
      // for the men off the ball. 'in' still takes a lineman chasing back.
      if (this.job !== 'in' && this.downLineman(sim, d)) continue;
      pool.push({ d, s: sim.see(a, d) });
    }
    if (!pool.length) return null;
    const spot = this.spot, side = this.side;
    const down = (p: Vec2) => (p.x - spot.x) * dir;       // past the catch point, upfield
    const out = (p: Vec2) => (p.y - spot.y) * side;        // outside the catch point
    const toSpot = (p: Vec2) => Math.hypot(p.x - spot.x, p.y - spot.y);
    const near = pool.filter(c => toSpot(c.s.pos) < 16 && down(c.s.pos) > -2);
    const best = (cands: typeof pool, f: (c: typeof pool[0]) => number) =>
      cands.length ? cands.reduce((b, c) => (f(c) < f(b) ? c : b)).d : null;
    switch (this.job) {
      // The outermost threat to the catch: outside or level with it.
      case 'out': return best(near.filter(c => out(c.s.pos) > -1.5), c => toSpot(c.s.pos) - 0.3 * out(c.s.pos)) ?? best(near, c => toSpot(c.s.pos));
      // The alley: in front of the catch point, the nearest one coming to it.
      case 'up': return best(near.filter(c => down(c.s.pos) > 1 && Math.abs(out(c.s.pos)) < 6), c => toSpot(c.s.pos)) ?? best(near, c => toSpot(c.s.pos));
      // Anyone chasing from inside.
      case 'in': return best(near.filter(c => out(c.s.pos) < 1), c => toSpot(c.s.pos)) ?? best(near, c => toSpot(c.s.pos));
      // The man over me: nearest to where I lined up.
      case 'stalk': return best(pool, c => Math.hypot(c.s.pos.x - this.home.x, c.s.pos.y - this.home.y));
      // The next man inside me, toward the catch point.
      case 'crack': return best(pool.filter(c => (c.s.pos.y - this.home.y) * side < 1 && toSpot(c.s.pos) < 14), c => toSpot(c.s.pos)) ?? best(near, c => toSpot(c.s.pos));
    }
  }
}
