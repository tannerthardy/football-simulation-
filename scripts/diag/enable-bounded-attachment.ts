/** Explicit diagnostic opt-in before the first physics call.
 * node --import tsx --import ./scripts/diag/enable-bounded-attachment.ts <script>
 * Record this preload and its checksum with each report: source alone does
 * not select the experiment. No RNG, controller or force overrides.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
World.prototype.step = function(intents, dt) {
  if (this.supportModel !== 'legacy')
    throw new RangeError('Bounded attachment diagnostic requires live held-only support');
  if (!this.boundedAttachment) Object.defineProperty(this, 'boundedAttachment', { value: true });
  return step.call(this, intents, dt);
};
