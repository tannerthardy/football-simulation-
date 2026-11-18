/** Bounded help decisions from visible spacing, not teammates' hidden jobs.
 * Keep the called rule unless a deep responsibility is visibly threatened
 * or a short break can be squeezed with the roof secured. Delayed pictures
 * and stable judgment error can make help late, or make a defender trust a
 * teammate who is not actually in position. No random bust roll per tick.
 */
import { isDeepZone } from '../../playbook/alignment.js';
import type { Agent } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { Perceived } from '../perception.js';
import { hasObservedFlight, observedHolder } from '../possession-read.js';
import { infoHonest, playsThrow } from '../behaviors/defense.js';
import type { ReceiverRead, ReleaseReader } from './reads.js';
import type { Directive } from './rules.js';
/** QB_STANCE (behaviors/qb.ts; read here too): the passer's gaze is his head while his chest is open in his stance. */
const QB_STANCE_SEEN = process.env.QB_STANCE === '1';

/** JUDGE_SEEN_BALL (experimental, off; JUDGE_SEEN_BALL=1 turns it on): a deep
 * defender's help decisions freeze when he sees the throw (sawThrow, his own
 * delayed picture; latched once seen), not at the true release. */
const JUDGE_SEEN_BALL = process.env.JUDGE_SEEN_BALL === '1';

export class CoverageJudgment {
  private nextRead = -1;
  private override: Directive | null = null;
  private primaryKey = '';
  /** JUDGE_SEEN_BALL: he has seen the throw (latched: turning away does not unsee it). */
  private sawBall = false;
  reason = 'rule';

  decide(a: Agent, sim: PlaySim, reader: ReleaseReader, primary: Directive, deep: boolean): Directive {
    // A catch he has acquired (he saw the throw, then a receiver holding
    // it) ends help decisions; the ball is the job now.
    const holder = deep ? observedHolder(a, sim) : null;
    if (!deep || (holder && holder.target !== sim.qb && hasObservedFlight(a))) return primary;
    // Release is not a cue to undo a help decision. Keep the current job
    // until its technique sees the ball and transitions to playing it.
    const seenBall = JUDGE_SEEN_BALL || infoHonest(3);
    if (seenBall && !this.sawBall && playsThrow(a, sim, null)) this.sawBall = true;
    if (seenBall ? this.sawBall : sim.ball.kind === 'air') return this.override ?? primary;
    const key = primary.t === 'zone' ? `zone:${primary.zone}` : `${primary.t}:${primary.r.slot}`;
    if (sim.t < this.nextRead && key === this.primaryKey) return this.override ?? primary;
    this.nextRead = sim.t + a.mind.decisionInterval;
    this.primaryKey = key;
    this.override = null;
    this.reason = 'rule';
    if (primary.t !== 'zone' && primary.t !== 'man' && primary.t !== 'rob') return primary;
    if (primary.t === 'zone' && !isDeepZone(primary.zone)) return primary;
    const own = primary.t === 'zone' ? null : reader.read(sim, primary.r);
    const routes = sim.offense.flatMap(r => {
      const rd = reader.read(sim, r);
      if (!rd || rd.release === 'none' || rd.release === 'block' || Math.abs(rd.pos.y - a.pos.y) > 14) return [];
      // A zone player can glance over his shoulder. A threat wholly behind
      // his current field of vision cannot magically trigger a rescue.
      const dx = rd.pos.x - a.pos.x, dy = rd.pos.y - a.pos.y;
      const visible = Math.cos(a.facing) * dx + Math.sin(a.facing) * dy > -0.45 * Math.hypot(dx, dy);
      return visible || own?.r === r ? [rd] : [];
    });
    const climbing = (r: ReceiverRead) => r.depth > 5 && r.vel.x > 3 && r.release === 'vertical';
    const capped = (r: ReceiverRead) => hasVisibleCap(a, sim, r);
    // A confirmed upfield stem is already the primary's responsibility.
    // Waiting for five yards can abandon him during the release itself.
    // A visible roof or an observed break can still permit help elsewhere.
    if (own && own.release === 'vertical' && own.vel.x > 3 && !capped(own)) return primary;
    const danger = routes.filter(r => r.r !== own?.r && climbing(r) && !capped(r))
      .sort((p, q) => (q.depth - 0.25 * Math.abs(q.pos.y - a.pos.y)) - (p.depth - 0.25 * Math.abs(p.pos.y - a.pos.y)))[0];
    if (danger && danger.pos.x > a.pos.x - 5) {
      this.override = { t: 'man', r: danger.r, opts: infoHonest(7) ? { overTop: true, lev: 'inside', initialPosition: { ...danger.pos } } : { overTop: true, lev: 'inside' } };
      this.reason = `protect-vertical:${danger.r.slot}`;
    } else if (!routes.some(r => climbing(r) && !capped(r))) {
      const short = own ?? routes.filter(r => r.depth > 2 && r.depth < 14 && r.vel.x < 2.5)
        .sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y))[0];
      // A declaration and a planted/slowing receiver are evidence for a
      // break. QB gaze adds confidence, but is not the hidden target ID.
      if (short && short.depth > 2 && short.vel.x < 2.5 && ['stop', 'in', 'out', 'under'].includes(short.release)) {
        const qb = sim.see(a, sim.qb);
        const direction = Math.atan2(short.pos.y - qb.pos.y, short.pos.x - qb.pos.x);
        // QB_STANCE: his chest is open to his throwing-arm side in his stance; his gaze is his head.
        const eyes = Math.cos((QB_STANCE_SEEN ? qb.head ?? qb.facing : qb.facing) - direction);
        const confidence = a.mind.focus * (0.5 + 0.5 * a.r('playRecognition')) + 0.08 * eyes + 0.08 * a.mind.judgment(`break:${short.r.slot}`);
        if (confidence > 0.55 && Math.hypot(short.pos.x - a.pos.x, short.pos.y - a.pos.y) < 10) {
          this.override = { t: 'rob', r: short.r };
          this.reason = `squeeze-break:${short.r.slot}`;
        }
      }
    }
    return this.override ?? primary;
  }
}

/** Does the consumed moving picture sustain help through the next read?
 * Positions are already dead-reckoned to now. Sample age adds a conservative
 * persistence reserve; it is not another position correction. More distant
 * help remains unestablished by this short moving picture. */
export function hasProjectedCap(rd: Pick<ReceiverRead, 'pos' | 'vel'>, seen: Perceived,
  decisionInterval: number, error: number): boolean {
  if ((seen.pose != null && seen.pose !== 'up') || seen.vel.x <= -1) return false;
  const depth = seen.pos.x - rd.pos.x, closing = rd.vel.x - seen.vel.x;
  const lateral = seen.pos.y - rd.pos.y, lateralRate = seen.vel.y - rd.vel.y;
  const horizon = decisionInterval + Math.max(0, seen.age ?? 0);
  const margin = 0.4 - error, width = 2.3 + error;
  if (depth <= margin || depth - closing * horizon <= margin
    || Math.abs(lateral + lateralRate * horizon) >= width) return false;
  return depth < 6;
}

/** No assignment, hidden capacity or current unseen body state enters help. */
export function hasVisibleCap(a: Agent, sim: PlaySim, rd: ReceiverRead): boolean {
  const error = 0.45 * (1 - a.r('discipline')) + 0.35 * a.mind.judgment(`cap:${rd.r.slot}`);
  return sim.defense.some(d => {
    if (d === a) return false;
    const seen = sim.see(a, d);
    return hasProjectedCap(rd, seen, a.mind.decisionInterval, error);
  });
}
