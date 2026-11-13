/** Explicit research selector. No global step/force/profile changes. */
import { World } from '../../src/physics/world.js';
const original = World.prototype.step;
World.prototype.step = function(intents, dt) {
  Object.defineProperty(this, 'impactTiming', { value: 'local-sweep', configurable: true });
  return original.call(this, intents, dt);
};
