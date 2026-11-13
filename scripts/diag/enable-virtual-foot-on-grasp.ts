/** Isolated model switch at the first incoming grasp. Use with wrap-feedback
 * to retain the exact LEGACY pre-wrap trajectory before testing coupling.
 * Explicit diagnostic only; no controller/RNG/observation calls are added.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
World.prototype.step = function(intents, dt) {
  if (this.supportModel === 'legacy' && this.joints.some(j => j.kind === 'grasp' && !j.broken))
    Object.defineProperty(this, 'supportModel', { value: 'virtual-foot' });
  return step.call(this, intents, dt);
};
