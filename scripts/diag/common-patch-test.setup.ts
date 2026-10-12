import { World } from '../../src/physics/world.js';

// Opt-in diagnostic: rerun unchanged production fixtures under patch hands.
// Preserve the explicit historical end-integration comparison. All native
// centered worlds otherwise execute the same experimental law as PlaySim's
// handContact option. Never install this setup in the default test projects.
const step = World.prototype.step;
World.prototype.step = function(...args) {
  if (this.handIntegration === 'centered') Reflect.set(this, 'handContact', 'patch');
  return step.apply(this, args);
};
