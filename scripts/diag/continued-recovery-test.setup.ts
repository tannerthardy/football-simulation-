import {World} from '../../src/physics/world.js';
import {withRecoveryExperiment} from './tackle/grip-refinement.js';

// Explicit candidate controls only; never installed by the default projects.
const step=World.prototype.step;
World.prototype.step=function(...args){
  if(process.env.RECOVERY_CONTACT==='patch'&&this.handIntegration==='centered')Reflect.set(this,'handContact','patch');
  return withRecoveryExperiment(this,'continued-recovery',()=>step.apply(this,args)).result;
};
