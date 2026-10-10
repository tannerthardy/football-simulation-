/** Explicit research selector; does not change support or contact constants. */
import { World } from '../../src/physics/world.js';
const original = World.prototype.step;
World.prototype.step = function(intents, dt) {
  Object.defineProperty(this, 'constraintWork', { value: 'per-solve', configurable: true });
  return original.call(this, intents, dt);
};
