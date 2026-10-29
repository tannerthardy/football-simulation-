/** Short free-movement predictions through the production World.
 * This is a controller aid, not a contact/reachability oracle. It predicts a
 * held or own-state feedback command in empty space; callers must exclude
 * grips and engagements. Feedback cannot observe another live body.
 */
import type { Vec2 } from '../core/vec.js';
import type { Body } from './kinematics.js';
import { newSupport, type Support, type SupportStateKind } from './support.js';
import { World, type Intent } from './world.js';

export interface MovementSample {
  t: number;
  pos: Vec2;
  vel: Vec2;
  support: SupportStateKind;
}

type MovementModel = World['handContact'];
/** Feedback sees only the actor's scratch body and elapsed forecast time. */
export type MovementRequest = Intent | ((body: Readonly<Body>, elapsed: number) => Intent);
const previews = new WeakMap<Body, Partial<Record<MovementModel, { body: Body; world: World }>>>();

/** Ordinary support contains scalars and flat vectors. Avoid the native
 * serializer for that common case, retaining every optional property. More
 * complex state (including experimental feet or shared vectors) still takes
 * structuredClone's complete graph-copy path.
 */
function copySupport(source: Support | undefined): Support | undefined {
  if (!source) return undefined;
  if (source.foot || Object.getOwnPropertySymbols(source).length) return structuredClone(source);
  const copy = { ...source }, seen = new Set<object>();
  for (const key of Object.keys(copy) as (keyof Support)[]) {
    const value = copy[key];
    if (value && typeof value === 'object') {
      if (seen.has(value) || Object.getPrototypeOf(value) !== Object.prototype
        || Object.getOwnPropertySymbols(value).length
        || Object.values(value).some(v => (v !== null && typeof v === 'object')
          || typeof v === 'function' || typeof v === 'symbol')) return structuredClone(source);
      seen.add(value);
      // The checks above establish a flat data record. Indexing the typed
      // union otherwise asks TypeScript for an intersection of every field.
      (copy as unknown as Record<string, unknown>)[key] = { ...value };
    } else if (typeof value === 'function' || typeof value === 'symbol') return structuredClone(source);
  }
  return copy;
}

/** No mutation of the real body, observations or RNG. Each candidate starts
 * from the complete same body/support state; scratch World storage is reused.
 * The 50 ms sampling interval is the ordinary decision interval, rather than
 * a finer simulation that would change the controller's movement law.
 * Pass the caller's handContact model when testing experimental movement;
 * it also selects that World's gait and yaw. Each model has separate scratch
 * state. This remains an unloaded forecast, never a prediction of held contact.
 */
export function previewFreeMovement(source: Body, intent: MovementRequest, now: number,
  steps?: number, handContact?: MovementModel): MovementSample[];
// Keep the original held-Intent signature last for existing typed observers
// and mocks; feedback is an additive call form, not a changed Intent contract.
export function previewFreeMovement(source: Body, intent: Intent, now: number,
  steps?: number, handContact?: MovementModel): MovementSample[];
export function previewFreeMovement(source: Body, intent: MovementRequest, now: number,
  steps = 8, handContact: MovementModel = 'center'): MovementSample[] {
  let models = previews.get(source);
  if (!models) {
    models = {};
    previews.set(source, models);
  }
  let preview = models[handContact];
  if (!preview) {
    const body: Body = { ...source, pos: { ...source.pos }, vel: { ...source.vel },
      support: copySupport(source.support) };
    preview = { body, world: new World([body], { handContact }) };
    models[handContact] = preview;
  }
  const { body, world } = preview;
  // Optional gait fields must also be reset if absent in the current body.
  Object.assign(body, { ...source, pos: { ...source.pos }, vel: { ...source.vel },
    spin: source.spin, sprintLoad: source.sprintLoad, squeeze: source.squeeze,
    squeezeHeading: source.squeezeHeading,
    support: copySupport(source.support) });
  // World normally owns support from construction. A support-less diagnostic
  // source still needs the same ordinary initial support on every prediction.
  body.support ??= newSupport();
  world.time = now;
  const samples: MovementSample[] = [];
  for (let k = 0; k < steps; k++) {
    const command = typeof intent === 'function' ? intent(body, k * .05) : intent;
    world.step([command], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...body.pos }, vel: { ...body.vel },
      support: body.support!.state });
  }
  return samples;
}
