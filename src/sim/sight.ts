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
export const SIGHT_PURE = process.env.SIGHT_PURE !== '0';

/** SIGHT_STALE (experimental, off; numeric bits, acts inside SIGHT_PURE's sight history): what a player believes of a man he cannot see.
 * Today the picture of a man he lost ages without bound on the velocity it showed (a carrier's read of a defender behind him ran to 16 s,
 * p90 56-63 yd off the man), and a man he has never seen is located by the perception record's oldest sample, the true position through
 * whatever hides him (an information leak). Bit 1: a lost man is carried on his last velocity for the record's length and then held. Bit 2:
 * a picture older than his own delay says so (`Perceived.stale`) and carries a `spread` that grows with the age. Bit 4: a man not seen since
 * the snap is believed where he lined up (every player saw the alignment), moving as he was then for the record's length and then held,
 * in place of the record's oldest true sample. docs/reviews/2026-11-16-sight-stale.md. */
export const SIGHT_STALE = Number(process.env.SIGHT_STALE ?? 7) | 0;
/** SIGHT_STALE bit 2: the spread of a stale picture grows by this much per second since he was last seen (yd/s). A stated choice, not a fit:
 * about the speed change of a man who jogs or stops in a second; no consumer reads `spread` yet, so it moves nothing. */
export const STALE_SPREAD = 2;
export const STALE_HOLD = (SIGHT_STALE & 1) !== 0, STALE_MARK = (SIGHT_STALE & 2) !== 0, STALE_ALIGN = (SIGHT_STALE & 4) !== 0;

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

/** One tick's bodies for many line tests (SIGHT_PURE's per-tick history, which tests every pair every tick): each body's position, radius and the three heights he had at that
 * tick, taken once, so a pair costs a loop over the others and no allocation. `clear(i, j)` answers what `lineOfSight` answers for the same bodies, positions and recorded poses
 * (test/sight.test.ts holds the two together). */
export class SightFrame {
  readonly x: Float64Array; readonly y: Float64Array; readonly radius: Float64Array;
  readonly eye: Float64Array; readonly shoulder: Float64Array; readonly top: Float64Array;
  constructor(readonly n: number) {
    this.x = new Float64Array(n); this.y = new Float64Array(n); this.radius = new Float64Array(n);
    this.eye = new Float64Array(n); this.shoulder = new Float64Array(n); this.top = new Float64Array(n);
  }
  set(i: number, a: Agent, x: number, y: number, pose: PoseAt | null): void {
    this.x[i] = x; this.y[i] = y; this.radius[i] = a.profile.radius;
    this.eye[i] = bodyHeight(a, EYE, pose); this.shoulder[i] = bodyHeight(a, SHOULDER, pose); this.top[i] = bodyHeight(a, 1, pose);
  }
  clear(io: number, it: number): boolean {
    const ox = this.x[io]!, oy = this.y[io]!, sx = this.x[it]! - ox, sy = this.y[it]! - oy, l2 = sx * sx + sy * sy;
    if (l2 < 1e-9) return true;
    const eye = this.eye[io]!, h = this.eye[it]!, L = Math.sqrt(l2);
    for (let b = 0; b < this.n; b++) {
      if (b === io || b === it) continue;
      const bx = this.x[b]!, by = this.y[b]!, u = ((bx - ox) * sx + (by - oy) * sy) / l2;
      if (u <= 0 || u >= 1) continue;
      const px = ox + sx * u - bx, py = oy + sy * u - by, d = Math.hypot(px, py), r = this.radius[b]!;
      if (L * Math.min(u, 1 - u) < r) continue;
      const line = eye + (h - eye) * u;
      if (d < r && line < this.shoulder[b]!) return false;
      if (d < HEAD_RADIUS && line < this.top[b]!) return false;
    }
    return true;
  }
}
