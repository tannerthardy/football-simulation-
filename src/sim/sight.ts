/** Line of sight with body heights (SEE_SIGHT plumbing, 2026-11-14; docs/reviews/2026-11-13-perception-proposal.md
 * section 12). Geometry, no dice: whether light reaches an observer's eyes from a point on a target, past the other
 * bodies on the field. Not information: it decides only whether a perception channel gets a new sample.
 *
 * Bodies are a torso (the body's radius, up to his shoulder) and a head (HEAD_RADIUS, up to his full height), both
 * lowered by his posture the way the pads are (support.ts padHeightAt) and lying low when he is off his feet. Heights
 * are anthropometric segment ratios of stature (Drillis and Contini 1966: eye 0.936, shoulder 0.818). So a tall QB sees
 * a rusher's helmet over a crouched guard's pads, a tackle's head hides a rusher directly behind it, a short QB sees
 * less, and a back sees through a gap wider than a body.
 *
 * No consumer calls it yet: identity everywhere. Presented possession (#713) and SEE_SIGHT's consumer groups build on
 * it, each behind its own flag; track()'s `inSight` keeps its flat test until its own restage. */
import { padHeightAt, supportParams } from '../physics/support.js';
import type { Agent } from './agent.js';

/** Eye and shoulder height as fractions of stature (Drillis and Contini 1966). */
export const EYE = 0.936;
export const SHOULDER = 0.818;
/** Half-width of a helmeted head (yd), about 9 in across. */
export const HEAD_RADIUS = 0.125;
/** Height of a body lying on the ground (yd). */
const DOWN_HEIGHT = 0.35;

/** Height (yd) of the point `frac` of the way up his stature, as his posture holds it now. */
export function bodyHeight(a: Agent, frac: number): number {
  const s = a.body.support;
  if (s && s.state !== 'up') return Math.min(DOWN_HEIGHT, frac * a.profile.heightYd);
  const sp = supportParams(a.profile), posture = s?.posture ?? 0.2;
  return frac * a.profile.heightYd * padHeightAt(sp, posture) / padHeightAt(sp, 0);
}

/** Whether `observer`'s eyes have a clear line to `target` at `height` (yd; default his eyes, the head). View direction
 * (body facing, gaze) is the caller's: this is occlusion only. `bodies` defaults to everyone else on the field. */
export function lineOfSight(bodies: readonly Agent[], observer: Agent, target: Agent, height?: number): boolean {
  const eye = bodyHeight(observer, EYE), h = height ?? bodyHeight(target, EYE);
  const sx = target.pos.x - observer.pos.x, sy = target.pos.y - observer.pos.y, l2 = sx * sx + sy * sy;
  if (l2 < 1e-9) return true;
  for (const b of bodies) {
    if (b === observer || b === target) continue;
    const u = ((b.pos.x - observer.pos.x) * sx + (b.pos.y - observer.pos.y) * sy) / l2;
    if (u <= 0 || u >= 1) continue;
    const px = observer.pos.x + sx * u - b.pos.x, py = observer.pos.y + sy * u - b.pos.y, d = Math.hypot(px, py);
    // A body touching either end cannot stand between them.
    const along = Math.sqrt(l2) * Math.min(u, 1 - u);
    if (along < b.profile.radius) continue;
    const line = eye + (h - eye) * u;
    if (d < b.profile.radius && line < bodyHeight(b, SHOULDER)) return false;
    if (d < HEAD_RADIUS && line < bodyHeight(b, 1)) return false;
  }
  return true;
}
