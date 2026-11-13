/** Explicit diagnostic mode before the first advance of each World.
 * node --import tsx --import ./scripts/diag/enable-centered-hands.ts <script>
 * Pin this preload/command with reports; engine source alone does not choose
 * a mode. No controller, capability, outcome or resolution overrides.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
const configured = new WeakSet<World>();
World.prototype.step = function(intents, dt) {
  if (!configured.has(this)) {
    Object.defineProperty(this, 'handIntegration', { value: 'centered' });
    configured.add(this);
  }
  return step.call(this, intents, dt);
};
