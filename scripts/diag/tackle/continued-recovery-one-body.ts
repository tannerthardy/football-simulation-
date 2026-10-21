/** Controlled, source-pinned load evidence; World is not involved.
 * node --import tsx scripts/diag/tackle/continued-recovery-one-body.ts [out/file.json]
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {integrateContinuedRecovery,type RecoveryState,type RecoveryLoad} from './continued-recovery.js';
import {sourceVersion} from '../../source-version.js';
const params:RecoveryLoad={rb:.15,w:3.2,speed:3.4,capacity:1100,mobility:3.4/1100,
  latency:.12,force:{x:0,y:0},source:{x:0,y:0}};
function run(loads:number[],parts:number[],side=1,initial=.151,response=.12){
  let state:RecoveryState={xi:{x:side*initial,y:0},response},t=0,work=0,commandWork=0,dissipation=0;
  const rows:any[]=[];
  for(const load of loads){
    const end=t+.1;
    while(t<end-1e-12)for(const dt of parts){
      const h=Math.min(dt,end-t);if(h<=0)break;
      const flow=integrateContinuedRecovery(state,{...params,force:{x:-side*load,y:0}},h);
      state=flow.state;t+=h;work+=flow.work;commandWork+=flow.commandWork;dissipation+=flow.dissipation;
      rows.push({t,h,load,state,flow});
    }
  }
  return {side,parts,loads,initial:{xi:{x:side*initial,y:0},response},state,work,commandWork,dissipation,rows};
}
const sustained=[0,1e-7,1e-5,1e-3,20,100,300,600,1000,1500].map(load=>({load,...run(Array(8).fill(load),[.01])}));
const protocol=[0,100,300,600,600,600,0,0,0,0];
const changing=[1,-1].flatMap(side=>[[.05],[.05/12],[.03,.017,.003]].map(parts=>run(protocol,parts,side,.04,0)));
const out=process.argv[2]??'out/continued-recovery/final/one-body.json';
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({source:sourceVersion(),kernelSha256:createHash('sha256')
  .update(readFileSync('scripts/diag/tackle/continued-recovery.ts')).digest('hex'),params,sustained,changing},null,2)+'\n');
console.log(JSON.stringify({out,sustained:sustained.length,changing:changing.length,
  changingPositionDifference:Math.abs(changing[0].state.xi.x-changing[2].state.xi.x),
  changingWorkDifference:Math.abs(changing[0].work-changing[2].work)}));
