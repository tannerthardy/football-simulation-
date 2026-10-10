/** Short free-movement predictions through the production World.
 * This is a controller aid, not a contact/reachability oracle. It predicts a
 * held command in empty space; callers must exclude grips and engagements.
 */
import type { Vec2 } from '../core/vec.js';
import type { Body } from './kinematics.js';
import { newSupport, type SupportStateKind } from './support.js';
import { World, type Intent } from './world.js';

export interface MovementSample {
  t: number;
  pos: Vec2;
  vel: Vec2;
  support: SupportStateKind;
}

const previews = new WeakMap<Body, { body: Body; world: World }>();

/** No mutation of the real body, observations or RNG. Each candidate starts
 * from the complete same body/support state; scratch World storage is reused.
 * The 50 ms sampling interval is the ordinary decision interval, rather than
 * a finer simulation that would change the controller's movement law.
 */
export function previewFreeMovement(source: Body, intent: Intent, now: number,
  steps = 8): MovementSample[] {
  let preview = previews.get(source);
  if (!preview) {
    const body: Body = { ...source, pos: { ...source.pos }, vel: { ...source.vel },
      support: source.support ? structuredClone(source.support) : undefined };
    preview = { body, world: new World([body]) };
    previews.set(source, preview);
  }
  const { body, world } = preview;
  // Optional gait fields must also be reset if absent in the current body.
  Object.assign(body, { ...source, pos: { ...source.pos }, vel: { ...source.vel },
    spin: source.spin, sprintLoad: source.sprintLoad, squeeze: source.squeeze,
    squeezeHeading: source.squeezeHeading,
    support: source.support ? structuredClone(source.support) : undefined });
  // World normally owns support from construction. A support-less diagnostic
  // source still needs the same ordinary initial support on every prediction.
  body.support ??= newSupport();
  world.time = now;
  const samples: MovementSample[] = [];
  for (let k = 0; k < steps; k++) {
    world.step([intent], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...body.pos }, vel: { ...body.vel },
      support: body.support!.state });
  }
  return samples;
}
