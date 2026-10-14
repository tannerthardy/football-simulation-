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

type MovementModel = World['handContact'];
const previews = new WeakMap<Body, Partial<Record<MovementModel, { body: Body; world: World }>>>();

/** No mutation of the real body, observations or RNG. Each candidate starts
 * from the complete same body/support state; scratch World storage is reused.
 * The 50 ms sampling interval is the ordinary decision interval, rather than
 * a finer simulation that would change the controller's movement law.
 * Pass the caller's handContact model when testing experimental movement;
 * it also selects that World's gait and yaw. Each model has separate scratch
 * state. This remains an unloaded forecast, never a prediction of held contact.
 */
export function previewFreeMovement(source: Body, intent: Intent, now: number,
  steps = 8, handContact: MovementModel = 'center', driveSteps = steps): MovementSample[] {
  let models = previews.get(source);
  if (!models) {
    models = {};
    previews.set(source, models);
  }
  let preview = models[handContact];
  if (!preview) {
    const body: Body = { ...source, pos: { ...source.pos }, vel: { ...source.vel },
      support: source.support ? structuredClone(source.support) : undefined };
    preview = { body, world: new World([body], { handContact }) };
    models[handContact] = preview;
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
    // A controller can verify a held prefix followed by ordinary braking.
    // This changes the forecast command, never the movement/contact law.
    world.step([k < driveSteps ? intent : { ...intent, vel: { x: 0, y: 0 } }], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...body.pos }, vel: { ...body.vel },
      support: body.support!.state });
  }
  return samples;
}
