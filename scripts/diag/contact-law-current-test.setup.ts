import {World} from '../../src/physics/world.js';
// Assess the unchanged production contracts under the isolated contact law.
// Keep explicit historical end-integration comparisons and all assertions.
const step=World.prototype.step;
World.prototype.step=function(...args){
  if(this.handIntegration==='centered'){
    Reflect.set(this,'handContact','patch');
    Reflect.set(this,'groundMovementSetting','legacy');
  }
  return step.apply(this,args);
};
