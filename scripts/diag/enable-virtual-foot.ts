/** Explicit diagnostic preload for existing game/probe commands.
 * node --import tsx --import ./scripts/diag/enable-virtual-foot.ts <script>
 * Enables the experimental option before the first physics call. No new
 * observations, RNG draws or controller calls; not imported by the product.
 * Command/manifests must record this preload: source alone does not select it.
 */
import { World } from '../../src/physics/world.js';

const step = World.prototype.step;
World.prototype.step = function(intents, dt) {
  if (this.supportModel === 'legacy')
    Object.defineProperty(this, 'supportModel', { value: 'virtual-foot' });
  return step.call(this, intents, dt);
};
