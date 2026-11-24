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

/** SIGHT_BODY (experimental, off; SIGHT_BODY=1): a man is seen when any part of him is, not only one point of his head. Today the line of sight is one ray from the observer's eye to the
 * target's one head point, so a 9-inch helmet on that line (a tackle's, an end's, a back's) hides a perimeter defender for as long as the three bodies line up (QB lane's finding, 2026-11-24:
 * the passer's picture of the corner he keys 1.05-1.45 s old; docs/reviews/2026-11-24-qb-sight.md: in default games perimeter defenders are blocked on 18% of ticks, only by helmets, and
 * about a third to a half of those are a single-ray artefact). On, the target is seen if the ray is clear to ANY of three points: his head (eye height, as before) and his two shoulder
 * tips (`SHOULDER` height, a torso half-width `SHOULDER_HALF` = 0.2 yd either side of the line, across it). Why those points: the head and the two shoulders are the extremes of the part of a body
 * above the other bodies' shoulders; anything lower is hidden by the same bodies that hide the shoulders, and a point on the centreline at shoulder height is between the two. The observer's eye
 * stays one point (a passer's own head movement in the pocket is a separate choice, not made here). 0.2 yd is the half-width of a shoulder-to-shoulder span of about 0.4 yd of body radius
 * (the bodies' collision radii are 0.3-0.4 yd; a lineman's shoulders are wider, a corner's narrower). */
export const SIGHT_BODY = process.env.SIGHT_BODY === '1';
export const SHOULDER_HALF = 0.2;

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
  const clear = (tx: number, ty: number, th: number): boolean => {
    const sx = tx - o.x, sy = ty - o.y, l2 = sx * sx + sy * sy;
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
      const line = eye + (th - eye) * u;
      const at = poseOf?.(b);
      if (d < b.profile.radius && line < bodyHeight(b, SHOULDER, at)) return false;
      if (d < HEAD_RADIUS && line < bodyHeight(b, 1, at)) return false;
    }
    return true;
  };
  if (clear(t.x, t.y, h)) return true;
  if (!SIGHT_BODY || height !== undefined) return false;
  // SIGHT_BODY: his shoulder tips, across the line from the observer.
  const dx = t.x - o.x, dy = t.y - o.y, L = Math.hypot(dx, dy);
  if (L < 1e-9) return true;
  const nx = -dy / L, ny = dx / L, sh = bodyHeight(target, SHOULDER, poseOf?.(target));
  return clear(t.x + nx * SHOULDER_HALF, t.y + ny * SHOULDER_HALF, sh) || clear(t.x - nx * SHOULDER_HALF, t.y - ny * SHOULDER_HALF, sh);
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
    const ox = this.x[io]!, oy = this.y[io]!, eye = this.eye[io]!;
    if (this.ray(io, it, ox, oy, eye, this.x[it]!, this.y[it]!, this.eye[it]!)) return true;
    if (!SIGHT_BODY) return false;
    const dx = this.x[it]! - ox, dy = this.y[it]! - oy, L = Math.hypot(dx, dy);
    if (L < 1e-9) return true;
    const nx = -dy / L, ny = dx / L, sh = this.shoulder[it]!;
    return this.ray(io, it, ox, oy, eye, this.x[it]! + nx * SHOULDER_HALF, this.y[it]! + ny * SHOULDER_HALF, sh)
      || this.ray(io, it, ox, oy, eye, this.x[it]! - nx * SHOULDER_HALF, this.y[it]! - ny * SHOULDER_HALF, sh);
  }
  private ray(io: number, it: number, ox: number, oy: number, eye: number, tx: number, ty: number, h: number): boolean {
    const sx = tx - ox, sy = ty - oy, l2 = sx * sx + sy * sy;
    if (l2 < 1e-9) return true;
    const L = Math.sqrt(l2);
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
