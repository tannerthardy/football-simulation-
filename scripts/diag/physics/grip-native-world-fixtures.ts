/** Unchanged saved native contact requests, continued within their issued
 * controller tick. Selection is a physical below-slip phase, never a solver
 * answer or a fabricated passive version of the tackle. */
import {nativeAccountingInput} from './grip-world-accounting-inputs.js';
import type {ActiveGripSolver} from '../../../src/physics/active-grip.js';
export function nativeForceFixture(id='patch-45-8-0-3001-1',phase=16,mode:'legacy'|'owned'|'combined'='combined',solver?:ActiveGripSolver){
  const v=nativeAccountingInput(id),{w,p}=v,H=p.args[3];
  if(mode!=='legacy')w.materialTransport='owned';
  for(let k=0;k<phase;k++){const a=[...p.args];a[4]=p.args[4]-k*H;w.integrateSubstep(...a);}
  const args=[...p.args];args[4]=p.args[4]-phase*H;
  if(mode==='combined')w.activeGrip=solver;
  return {...v,H,phase,args,advance:(n=1)=>{for(let k=0;k<n;k++){const a=[...args];a[4]-=k*H;w.integrateSubstep(...a);}return w.report;}};
}
