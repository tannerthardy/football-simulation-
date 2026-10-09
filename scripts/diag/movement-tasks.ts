/** Matched NFL trajectory feasibility through the ordinary World.
 * node --import tsx scripts/diag/movement-tasks.ts out/movement-inputs.json out/movement-trials.json
 * A laboratory controller knows the desired path. It does not represent a
 * football player's perception or predict his choices. No parameters fitted.
 */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Rng} from '../../src/core/rng.js';
import {generatePlayer} from '../../src/players/generator.js';
import {derivePhysical,solveSprint,type PhysicalProfile} from '../../src/players/physical.js';
import {RATING_KEYS,type Measurables,type Position} from '../../src/players/types.js';
import type {Body} from '../../src/physics/kinematics.js';
import {World} from '../../src/physics/world.js';
import {supportParams} from '../../src/physics/support.js';
import {sourceVersion} from '../source-version.js';
import {createHash} from 'node:crypto';

type Point=[number,number,number,number,number];
interface Fixture {
  athlete:string;draftYear:number;split:string;group:string;drill:string;event:string;
  measurables:Partial<Measurables>;missingMeasurements:string[];completeAgility:boolean;contactUnknown:boolean;points:Point[];
}
const input=process.argv[2],out=process.argv[3]??'out/movement-trials.json';
if(!input)throw new Error('Provide ignored movement-task fixtures');
const raw=readFileSync(input),data=JSON.parse(raw.toString()) as {fixtures:Fixture[];inputs:unknown;selection:string;extractorSha256:string};
const positions:Record<string,Position>={WR:'WR',TE:'TE',OL:'OT',DL:'DT',DB:'CB',LB:'LB'};
const fallback:Measurables={heightIn:74,weightLb:220,armIn:32,handIn:9.5,tenSplit:1.65,forty:4.7,
  vertical:32,broad:115,threeCone:7.3,shuttle:4.4,bench:20};
const modes=['footballMapping','sprintFit'] as const;
const responses=[.15,.4];
const trials=[];
for(const f of data.fixtures){
  const player=generatePlayer(new Rng(1),positions[f.group]??'LB');
  // No NFL quality inferred. Every mental/control rating is the same neutral
  // value. Unknown non-sprint measurements use explicitly recorded proxies.
  for(const key of RATING_KEYS)player.ratings[key]=50;
  player.measurables={...fallback,...f.measurables};
  const profile=derivePhysical(player),sprint=solveSprint(player.measurables.tenSplit,player.measurables.forty);
  for(const mode of modes)for(const response of responses){
    const p:PhysicalProfile={...profile,...(mode==='sprintFit'?{vmax:sprint.vmax,tau:sprint.tau}:{})};
    const first=f.points[0],body:Body={pos:{x:0,y:0},vel:{x:first[3],y:first[4]},
      facing:Math.atan2(first[4],first[3]),energy:1,profile:p};
    const world=new World([body]);
    const frames:Point[]=[[0,0,0,body.vel.x,body.vel.y]];
    let rmse=0,maxError=0,maxGroundFraction=0,workResidual=0,fallen=false;
    const last=f.points[f.points.length-1][0];
    for(let step=1;step*.05<=last+1e-7;step++){
      const t=step*.05,k=Math.min(f.points.length-2,Math.floor(t/.1));
      const a=f.points[k],b=f.points[k+1],fraction=Math.min(1,(t-a[0])/(b[0]-a[0]));
      const target=a.map((v,i)=>v+(b[i]-v)*fraction) as Point;
      // A fixed position/velocity feedback controller; only its response
      // time changes between paired reps, never force or body capacity.
      const vx=target[3]+(target[1]-body.pos.x)/response;
      const vy=target[4]+(target[2]-body.pos.y)/response;
      const r=world.step([{vel:{x:vx,y:vy},facing:Math.atan2(vy,vx)}],.05);
      const error=Math.hypot(body.pos.x-target[1],body.pos.y-target[2]);
      rmse+=error*error;maxError=Math.max(maxError,error);fallen ||= r.falls.length>0;
      const traction=supportParams(p).traction;
      maxGroundFraction=Math.max(maxGroundFraction,Math.hypot(r.groundImpulse[0].x,r.groundImpulse[0].y)/(traction*.05));
      workResidual=Math.max(workResidual,Math.abs(r.work.residual));
      frames.push([t,body.pos.x,body.pos.y,body.vel.x,body.vel.y]);
    }
    trials.push({athlete:f.athlete,draftYear:f.draftYear,split:f.split,group:f.group,drill:f.drill,event:f.event,
      completeAgility:f.completeAgility,missingMeasurements:f.missingMeasurements,contactUnknown:f.contactUnknown,
      mode,responseSeconds:response,rmseYd:Math.sqrt(rmse/Math.max(1,frames.length-1)),maxErrorYd:maxError,
      fallen,maxGroundFraction,workResidual,profile:p,frames});
  }
}
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),inputSha256:createHash('sha256').update(raw).digest('hex'),
  inputs:data.inputs,selection:data.selection,fixtureExtractorSha256:data.extractorSha256,
  runnerSha256:createHash('sha256').update(readFileSync('scripts/diag/movement-tasks.ts')).digest('hex'),
  note:'Path-feasibility diagnostic, not a forecast or validated athlete rating. Neutral ratings and explicit missing-measurement proxies. SprintFit changes only V/tau to the measured split/forty solution; footballMapping is the current derivePhysical mapping. Facing follows the command: observed backpedal orientation is unavailable, so that drill only tests its path geometry. OL contact geometry is unknown and not simulated. Same body per controller-response pair; trajectories remain ignored.',
  trials})+'\n');
console.log(`${data.fixtures.length} fixtures; ${trials.length} paired trials; saved ${out}`);
