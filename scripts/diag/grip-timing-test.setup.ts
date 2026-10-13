import { World } from '../../src/physics/world.js';
const step = World.prototype.step;
World.prototype.step = function (...args) {
  if (this.handIntegration === 'centered') {
    Reflect.set(this, 'handContact', 'patch'); Reflect.set(this, 'gripTiming', 'resolved');
  }
  return step.apply(this, args);
};
