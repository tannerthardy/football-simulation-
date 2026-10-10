/** Replay the historical linear law before the first physics call.
 * node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts <script>
 * Pin this preload with each comparison; no force/controller/RNG overrides.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
World.prototype.step = function(intents, dt) {
  if (this.supportModel !== 'legacy')
    throw new RangeError('Linear attachment diagnostic requires live held-only support');
  if (this.boundedAttachment) Object.defineProperty(this, 'boundedAttachment', { value: false });
  return step.call(this, intents, dt);
};
