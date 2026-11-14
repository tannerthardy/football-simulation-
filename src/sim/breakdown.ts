/**
 * L2_BREAKDOWN (default off): players break down before a second-level
 * collision instead of running tall into it.
 *
 * A blocker approaching his second-level man (climb, lead, stalk) who will
 * meet him within half a second at more than 3 yd/s closing (his own picture
 * of the man) sinks his hips (posture 0.7: lower pad level, wider base). A
 * linebacker or DB who sees a blocker arriving the same way sets a take-on
 * base (0.6); bracing for an arriving runner the same way is a tackler's
 * base. Speed is untouched; World contact decides who wins and falls.
 *
 * Before (zone snaps, 1,025 second-level contacts): median postures at
 * contact 0.41 (blocker) and 0.18 (defender), i.e. tall with a narrow base;
 * at 5-7 yd/s closing the defender fell 73% and both 30%, above 7 yd/s both
 * fell every time (s19-105: centre and backer down for 1.2 s). With it:
 * falls 6/10/4% -> 2/4/1% (blocker/defender/both). Also capping the
 * blocker's closing speed at 3 yd/s cost outside-zone second-level contacts
 * (26% -> 22%) without preventing more falls, so speed is left alone.
 */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { MoveCommand } from '../physics/kinematics.js';
import { seenDown } from './seen-contact.js';

/** HONEST_READS (behaviors/defense.ts): screen nearby bodies by his picture of them. */
const HONEST_READS = process.env.HONEST_READS !== '0';

export const L2_BREAKDOWN = process.env.L2_BREAKDOWN !== '0';
const CLOSING = 3.0, HORIZON = .5;
const isDL = (s: string) => /^D[ET]|^NT/.test(s);

function closingOn(a: Agent, sim: PlaySim, o: Agent): { closing: number; ttc: number } {
  const s = sim.see(a, o), dx = s.pos.x - a.pos.x, dy = s.pos.y - a.pos.y, d = Math.hypot(dx, dy) || 1e-9;
  const u = { x: dx / d, y: dy / d }, closing = (a.vel.x - s.vel.x) * u.x + (a.vel.y - s.vel.y) * u.y;
  const gap = Math.max(0, d - a.profile.radius - o.profile.radius);
  return { closing, ttc: closing > .1 ? gap / closing : Infinity };
}

export function breakdownForContact(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  if (!cmd?.vel || a.engagement || a.isDown(sim.t) || a.behavior.kind === 'carrier') return cmd;
  if (a.team === 'O') {
    const plan = (a.behavior as { plan?: { kind?: string; pullRole?: string; target?: Agent | null } }).plan;
    const t = plan?.target;
    if (!t || t.team !== 'D' || isDL(t.slot) || t.isDown(sim.t)) return cmd;
    if (!(plan!.kind === 'climb' || plan!.kind === 'lead' || plan!.kind === 'stalk' || (plan!.kind === 'pull' && plan!.pullRole === 'lead'))) return cmd;
    const c = closingOn(a, sim, t);
    if (c.ttc > HORIZON || c.closing <= CLOSING) return cmd;
    return { ...cmd, posture: Math.max((cmd as { posture?: number }).posture ?? 0, .7) } as MoveCommand;
  }
  if (isDL(a.slot)) return cmd;
  for (const o of sim.offense) {
    if (o === sim.qb) continue;
    if (HONEST_READS) {
      // His picture of the body: one he sees on the ground or beyond 3.5 yd is no contact threat.
      const seen = sim.see(a, o);
      if (seenDown(sim, a, o) || Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) > 3.5) continue;
    } else {
      if (o.isDown(sim.t)) continue;
      if (Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) > 3.5) continue;
    }
    const c = closingOn(a, sim, o);
    if (c.ttc <= HORIZON && c.closing > CLOSING)
      return { ...cmd, posture: Math.max((cmd as { posture?: number }).posture ?? 0, .6) } as MoveCommand;
  }
  return cmd;
}
