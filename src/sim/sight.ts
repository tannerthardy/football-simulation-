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

/** SIGHT_PURE (experimental, off; SIGHT_PURE=1): a past tick's line of sight is a function of that tick. `lineOfSight` places the bodies
 * where the perception record had them but took every body's height and posture as it is NOW, so the same past tick gave a
 * different answer asked at different times, and `sighted()` keeps the first answer: what a player saw at a past tick then
 * depended on when anyone first asked, not on what was there (an observer changed plays; docs/reviews/2026-11-16-sight-pure.md).
 * On, the record carries each body's posture and whether he was up at every tick and a past sight line reads them. */
export const SIGHT_PURE = process.env.SIGHT_PURE === '1';

/** A body's posture as a tick recorded it (SIGHT_PURE). */
export interface PoseAt { up: boolean; posture: number }

/** Height (yd) of the point `frac` of the way up his stature, as his posture holds it now (or as `at` records it). */
export function bodyHeight(a: Agent, frac: number, at?: PoseAt | null): number {
  const s = a.body.support;
  if (at ? !at.up : s && s.state !== 'up') return Math.min(DOWN_HEIGHT, frac * a.profile.heightYd);
  const sp = supportParams(a.profile), posture = at ? at.posture : s?.posture ?? 0.2;
  return frac * a.profile.heightYd * padHeightAt(sp, posture) / padHeightAt(sp, 0);
}

/** Whether `observer`'s eyes have a clear line to `target` at `height` (yd; default his eyes, the head). View direction
 * (body facing, gaze) is the caller's: this is occlusion only. `posOf` places the bodies (default: where they are now;
 * a recorded moment for a past sight line, with null for a body not recorded there). Heights and postures are now's unless `poseOf` gives
 * the recorded ones (SIGHT_PURE). */
export function lineOfSight(bodies: readonly Agent[], observer: Agent, target: Agent, height?: number,
  posOf: (a: Agent) => { x: number; y: number } | null = (a) => a.pos,
  poseOf?: (a: Agent) => PoseAt | null): boolean {
  const eye = bodyHeight(observer, EYE, poseOf?.(observer)), h = height ?? bodyHeight(target, EYE, poseOf?.(target));
  const o = posOf(observer), t = posOf(target);
  if (!o || !t) return true;
  const sx = t.x - o.x, sy = t.y - o.y, l2 = sx * sx + sy * sy;
  if (l2 < 1e-9) return true;
  for (const b of bodies) {
    if (b === observer || b === target) continue;
    const bp = posOf(b);
    if (!bp) continue;
    const u = ((bp.x - o.x) * sx + (bp.y - o.y) * sy) / l2;
    if (u <= 0 || u >= 1) continue;
    const px = o.x + sx * u - bp.x, py = o.y + sy * u - bp.y, d = Math.hypot(px, py);
    // A body touching either end cannot stand between them.
    const along = Math.sqrt(l2) * Math.min(u, 1 - u);
    if (along < b.profile.radius) continue;
    const line = eye + (h - eye) * u;
    const at = poseOf?.(b);
    if (d < b.profile.radius && line < bodyHeight(b, SHOULDER, at)) return false;
    if (d < HEAD_RADIUS && line < bodyHeight(b, 1, at)) return false;
  }
  return true;
}
