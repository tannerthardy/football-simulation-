/** A short tackle opportunity forecast through ordinary movement physics.
 * It holds the defender's last command and the observed runner's velocity.
 * It predicts positioning, not a successful grip or an unseen future cut.
 */
import { clamp } from '../core/vec.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export interface TackleWindow {
  currentQuality: number;
  futureQuality: number;
  closest: number;
  closestAt: number;
  /** The forecast's best shot (wrap quality, which saturates at form-tackle range) is first attained before its last
   * upright sample, so the better shot is reached inside the lookahead. A runner he is closing on fast reaches it even
   * while the distance keeps falling through form range. False has
   * two football causes, and both mean "take the reach you have": (1) still closing at the horizon, so the better
   * shot keeps receding (a slow chase, or a runner faster than his seen velocity); (2) the forecast stops early
   * because his support would no longer be 'up' after that sample: the shot is real, but his feet are going, so he
   * reaches now rather than after losing his base. Both give the same decision today; if one is refined (e.g.
   * telling a fast late closure from a receding one), split them rather than changing the other. */
  reached: boolean;
  /** With `lead` > 0 (REACH_ARRIVAL: the hands' travel time): the shot where a reach started now lands (the quality at
   * now + lead), the best landing of a reach started at a later decision sample, and whether that best landing is
   * attained before the forecast's last upright sample. Absent with lead 0. */
  arrival?: { now: number; later: number; reached: boolean };
}

/** Existing geometric wrap quality: torso contact versus extended fingertips. */
export function contactQuality(distance: number, body: number, arms: number, band = .25): number {
  return clamp(1 - (distance - body - band) / Math.max(.2, arms - body - band), 0, 1);
}

/** Only free, upright movement is forecast. Contact/joint ownership remains
 * the caller's responsibility; a one-body preview cannot model those loads.
 */
export function previewTackleWindow(d: Agent, seen: Perceived,
  command: Intent | undefined, body: number, arms: number, now: number, band = .25, lead = 0): TackleWindow | null {
  const s = d.body.support;
  if (!command || command.free || command.dive || command.lunge || d.isDown(now)
    || d.engagement || (s && (s.state !== 'up' || s.foot || s.strike
      || Math.hypot(s.lean.x, s.lean.y) > 1e-6
      || Math.hypot(s.load.x, s.load.y) > 1e-6))) return null;
  let closest = Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y);
  const currentQuality = contactQuality(closest, body, arms, band);
  let closestAt = 0, lastT = 0, best = currentQuality, bestAt = 0;
  const track: { t: number; x: number; y: number }[] = [{ t: 0, x: d.pos.x, y: d.pos.y }];
  // Six ordinary decision samples preserve the previous 0.3 s lookahead.
  // A useful hip passing between now and the next tick is not a reason to
  // skip this attempt: tackles can only be chosen at the decision samples.
  for (const p of previewFreeMovement(d.body, command, now, 6)) {
    // Loss of support is negative forecast evidence, not permission to fall
    // back to the ideal straight-line estimate. Only credit earlier upright
    // decision samples; if there are none, there is no benefit to waiting.
    if (p.support !== 'up') break;
    lastT = p.t;
    track.push({ t: p.t, x: p.pos.x, y: p.pos.y });
    const distance = Math.hypot(seen.pos.x + seen.vel.x * p.t - p.pos.x,
      seen.pos.y + seen.vel.y * p.t - p.pos.y);
    if (distance < closest) { closest = distance; closestAt = p.t; }
    // The shot is the wrap quality, not the distance: closing on through form-tackle range still reaches the best
    // shot at the first sample that attains it.
    const quality = contactQuality(distance, body, arms, band);
    if (quality > best + 1e-9) { best = quality; bestAt = p.t; }
  }
  const window: TackleWindow = { currentQuality, futureQuality: contactQuality(closest, body, arms, band), closest, closestAt,
    reached: bestAt < lastT - 1e-9 };
  if (lead > 0) {
    // His forecast body between the samples (straight, as the World's step moves him) against the carrier he sees.
    const qAt = (t: number): number | null => {
      if (t > lastT + 1e-9) return null;
      let k = 1; while (k < track.length - 1 && track[k].t < t - 1e-9) k++;
      const a = track[k - 1], b = track[k] ?? a, u = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
      const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      return contactQuality(Math.hypot(seen.pos.x + seen.vel.x * t - x, seen.pos.y + seen.vel.y * t - y), body, arms, band);
    };
    const nowQ = qAt(lead);
    let later = -1, laterAt = 0;
    for (const p of track.slice(1)) { const q = qAt(p.t + lead); if (q === null) break; if (q > later + 1e-9) { later = q; laterAt = p.t + lead; } }
    if (nowQ !== null) window.arrival = { now: nowQ, later: Math.max(0, later), reached: later >= 0 && laterAt < lastT - 1e-9 };
  }
  return window;
}
