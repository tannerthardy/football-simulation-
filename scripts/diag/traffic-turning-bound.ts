/** Corroborate the conservative free-movement forecast tube, including falls.
 * node --import tsx scripts/diag/traffic-turning-bound.ts [output.json]
 * This is a numerical witness for current laws, not an NFL motion fit.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Rng} from '../../src/core/rng.js';
import {G} from '../../src/core/units.js';
import {generateTeam} from '../../src/league/team.js';
import {derivePhysical} from '../../src/players/physical.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {newSupport,supportParams,criticalDeviation} from '../../src/physics/support.js';
import type {Body} from '../../src/physics/kinematics.js';
import type {Intent} from '../../src/physics/world.js';
import {sourceVersion} from '../source-version.js';

const sourceBefore=sourceVersion();
const output=process.argv[2]??'out/football-handbook/turning-bound-probe.json';
if(process.argv.length>3)throw new Error('Usage: traffic-turning-bound.ts [output.json]');
const rows=[];
let maximumRatio=0,maximumExcess=-Infinity,falls=0,passed=0;
const players=generateTeam(new Rng(71),'bound','BND').roster;
for(const player of players){
 const profile=derivePhysical(player),A=supportParams(profile).traction/profile.massKg;
 for(const speed of [2,9,15]) for(const disturbance of [false,true])
 for(const turn of [-Math.PI/2,Math.PI/2,Math.PI]){
  const support=newSupport(.7);
  if(disturbance){support.xi={x:criticalDeviation(supportParams(profile),support.posture,0,1)*1.2,y:0};support.accel={x:30,y:-30};support.feltTip={x:20,y:0};}
  const body:Body={pos:{x:50,y:26},vel:{x:speed,y:0},facing:0,energy:.6,
    spin:6,profile,support};
  const command:Intent={vel:{x:9*Math.cos(turn),y:9*Math.sin(turn)},facing:turn,posture:.7,cutSkill:1.5};
  const original=structuredClone(body);
  const samples=previewFreeMovement(body,command,2,12);
  if(JSON.stringify(body)!==JSON.stringify(original))throw new Error('source mutation');
  for(const s of samples){
   const error=Math.hypot(s.pos.x-original.pos.x-original.vel.x*s.t,
    s.pos.y-original.pos.y-original.vel.y*s.t),bound=.5*A*s.t*s.t;
   const ratio=error/bound;
   maximumRatio=Math.max(maximumRatio,ratio);maximumExcess=Math.max(maximumExcess,error-bound);
   if(error>bound+1e-10)throw new Error(`tube failure ${player.position} ${speed} ${error} ${bound}`);
  }
  if(samples.some(s=>s.support!=='up'))falls++;
  // Compare the cheap gate against the exact swept forecast at a fixed
  // deterministic grid of stationary and moving consumed peer pictures.
  for(const dx of [-7,-3,0,3,7])for(const dy of [-5,-2,0,2,5])
  for(const pv of [{x:0,y:0},{x:3,y:-2}]){
   const r0={x:-dx,y:-dy},v={x:speed-pv.x,y:-pv.y},H=.6,touch=.9*(profile.radius+.25),tube=.5*A*H*H;
   const t=Math.max(0,Math.min(H,-(r0.x*v.x+r0.y*v.y)/(v.x*v.x+v.y*v.y||1)));
   const safe=Math.hypot(r0.x+t*v.x,r0.y+t*v.y)>touch+tube+1e-9;
   if(!safe)continue;
   let last=r0,minimum=Math.hypot(r0.x,r0.y);
   for(const s of samples){
    const next={x:s.pos.x-original.pos.x-dx-pv.x*s.t,y:s.pos.y-original.pos.y-dy-pv.y*s.t};
    const ex=next.x-last.x,ey=next.y-last.y;
    const z=Math.max(0,Math.min(1,-(last.x*ex+last.y*ey)/(ex*ex+ey*ey||1)));
    minimum=Math.min(minimum,Math.hypot(last.x+z*ex,last.y+z*ey));last=next;
   }
   if(minimum<=touch)throw new Error('false-safe broadphase');
   passed++;
  }
  rows.push({position:player.position,speed,disturbance,turn,falls:samples.some(s=>s.support!=='up')});
 }
}
const A=1.1*G,H=.6,touch=.4696363636363636;
const witness={ballisticSeparation:1.1,expandedTouch:touch+.5*A*H*H,
 gateSkips:1.1>touch+.5*A*H*H};
if(witness.gateSkips)throw new Error('lost curved-contact witness');
const sourceAfter=sourceVersion();
if(sourceBefore!==sourceAfter)throw new Error('Source changed during probe');
const result={schema:'traffic-turning-ballistic-bound-v1',sourceBefore,sourceAfter,
 toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 rosterSha256:createHash('sha256').update(JSON.stringify(players)).digest('hex'),node:process.version,
 input:{rosterSeed:71,speeds:[2,9,15],disturbance:[false,true],turns:[-Math.PI/2,Math.PI/2,Math.PI],steps:12,dt:.05},
 profiles:players.length,forecasts:rows.length,samples:rows.length*12,
 forecastsWithFall:falls,maximumTubeUse:maximumRatio,maximumExcess,definitelySafePictures:passed,
 witness,A,H,tube:.5*A*H*H};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
