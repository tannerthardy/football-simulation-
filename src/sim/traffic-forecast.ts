/** Alternative teammate motion inferred from acquired information only. */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { newSupport } from '../physics/support.js';
import type { PhysicalProfile } from '../players/physical.js';
import { TEAMMATE_INFORMATION_LIMITS, type TeammateForecast, type TeammatePicture } from './teammate-information.js';

type Sample = { t: number; pos: Vec2; vel: Vec2 };
const STEP = .05;

function at(samples: readonly Sample[], t: number): Sample {
  const index = samples.findIndex(sample => sample.t >= t - 1e-9);
  const hi = samples[index < 0 ? samples.length - 1 : index];
  const lo = samples[Math.max(0, (index < 0 ? samples.length - 1 : index) - 1)];
  const fraction = hi.t > lo.t ? Math.max(0, Math.min(1, (t - lo.t) / (hi.t - lo.t))) : 0;
  return { t,
    pos: { x: lo.pos.x + fraction * (hi.pos.x - lo.pos.x), y: lo.pos.y + fraction * (hi.pos.y - lo.pos.y) },
    vel: { x: lo.vel.x + fraction * (hi.vel.x - lo.vel.x), y: lo.vel.y + fraction * (hi.vel.y - lo.vel.y) } };
}

/** A moving teammate may have begun an ordinary stop since the last look.
 * This branch is a possibility to check alongside the coasting estimate,
 * never a new observation or an assertion about his current intention.
 *
 * Reconstruct the acquired sample before applying braking, so delayed delivery
 * cannot first move the teammate forward for free and only then let him stop.
 * Facing along sampled travel, neutral support/posture and full energy are
 * declared nominal assumptions. No live body, fatigue, stance or contact is
 * imported. This does not bound collision-driven displacement or every turn.
 */
export function brakingTeammateForecast(picture: TeammatePicture, profile: PhysicalProfile,
  now: number, horizon: number): TeammateForecast | undefined {
  if (picture.source !== 'observed' && picture.source !== 'remembered') return undefined;
  if (![now, horizon, picture.age, picture.predictedFor, picture.pos.x, picture.pos.y,
    picture.vel.x, picture.vel.y].every(Number.isFinite)
    || horizon <= 0 || picture.age < 0 || picture.predictedFor < 0
    || picture.predictedFor > picture.age + 1e-9
    || picture.age > TEAMMATE_INFORMATION_LIMITS.prediction + 1e-9
    || Math.hypot(picture.vel.x, picture.vel.y) < 1e-6) return undefined;
  // Beyond the existing prediction horizon, query no longer retains the
  // sampled velocity. A stationary memory is not evidence of a physical stop.
  const validFor = Math.min(horizon, TEAMMATE_INFORMATION_LIMITS.memory - picture.age);
  if (validFor <= 1e-9) return undefined;
  const source: Body = {
    pos: { x: picture.pos.x - picture.vel.x * picture.predictedFor,
      y: picture.pos.y - picture.vel.y * picture.predictedFor },
    vel: { ...picture.vel }, facing: Math.atan2(picture.vel.y, picture.vel.x),
    energy: 1, profile: { ...profile }, support: newSupport(),
  };
  const duration = picture.age + validFor;
  const path: Sample[] = [{ t: 0, pos: { ...source.pos }, vel: { ...source.vel } },
    ...previewFreeMovement(source, { vel: { x: 0, y: 0 } }, now - picture.age,
      Math.ceil((duration - 1e-9) / STEP))];
  const first = at(path, picture.age);
  const last = at(path, duration);
  return { validFor, samples: [
    { ...first, t: 0 },
    ...path.filter(sample => sample.t > picture.age + 1e-9 && sample.t < duration - 1e-9)
      .map(sample => ({ t: sample.t - picture.age, pos: { ...sample.pos }, vel: { ...sample.vel } })),
    { ...last, t: validFor },
  ] };
}
