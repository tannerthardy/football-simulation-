/** Explicit frozen-envelope integration experiment, without a force retune. */
import { World } from '../../src/physics/world.js';
const original = World.prototype.step;
World.prototype.step = function(intents, dt) {
  Object.defineProperty(this, 'supportIntegration', { value: 'integrated', configurable: true });
  return original.call(this, intents, dt);
};
