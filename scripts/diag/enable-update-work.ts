/** Previous numerical policy for paired diagnostics, never a force retune. */
import { World } from '../../src/physics/world.js';
const original = World.prototype.step;
World.prototype.step = function(intents, dt) {
  Object.defineProperty(this, 'constraintWork', { value: 'per-update', configurable: true });
  return original.call(this, intents, dt);
};
