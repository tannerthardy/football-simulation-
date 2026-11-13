/** Explicit historical end-velocity comparison before the first advance.
 * node --import tsx --import ./scripts/diag/disable-centered-hands.ts <script>
 * Keep this invocation/checksum with reports after a future default change.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
const configured = new WeakSet<World>();
World.prototype.step = function(intents, dt) {
  if (!configured.has(this)) {
    Object.defineProperty(this, 'handIntegration', { value: 'end' });
    configured.add(this);
  }
  return step.call(this, intents, dt);
};
