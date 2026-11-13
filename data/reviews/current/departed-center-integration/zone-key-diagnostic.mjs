/** One cue-only diagnostic; no World steps or football game. */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Recognition} from '../../../../src/sim/recognition.ts';
import {contactFixture} from '../../../../scripts/diag/run-contact-technique.ts';
import {showsBlock} from '../../../../src/sim/coverage-cues.ts';

const approvedSource=execFileSync('git',['show','a1b16e666a9ee7d1bc1d2aecba141fc535863b24:src/sim/recognition.ts'],{encoding:'utf8'});
const reference=resolve('out/controller-integration/approved-recognition.mts');
mkdirSync(dirname(reference),{recursive:true});
writeFileSync(reference,approvedSource.replace(/from '([^']+)'/g,(_m,p)=>
 `from '${p.startsWith('.')?pathToFileURL(resolve('src/sim',p).replace(/\.js$/,'.ts')).href:p}'`));
const {Recognition:ApprovedRecognition}=await import(pathToFileURL(reference).href);

const began=performance.now();
function read(Class,nearSpeed,keySpeed,cue='upright'){
 const {sim}=contactFixture({type:'run',runBlock:60,passBlock:60});
 const a=sim.slot('CB_S'),target=sim.slot('X'),near=sim.slot('Y');
 a.body.pos={x:42,y:35};a.behavior={kind:'zone',update:()=>({vel:{x:0,y:0}})};
 const rec=new Class(a,sim,0);a.recog=rec;
 sim.see=function(_observer,r){
  let pos={x:this.snapX[r.idx],y:20},vel={x:0,y:0};
  if(r===this.qb)pos={x:36.5,y:20};
  else if(r.slot==='RB')pos={x:34,y:20};
  else if(r===target){pos={x:41,y:43};vel={x:keySpeed,y:0};}
  else if(r===near){pos=cue==='own-contact'?{x:41.4,y:35}:{x:41,y:35.5};vel={x:nearSpeed,y:0};}
  else if(!['LT','LG','C','RG','RT'].includes(r.slot))pos={x:41,y:15};
  return{pos,vel,facing:0,stance:r===near&&cue==='low-pads'?'low':null,pose:'up',age:.25};
 };
 const trajectory=[];
 for(let k=0;k<16;k++){sim.t=.65+k*sim.dt;rec.update(a,sim);trajectory.push({read:rec.read,pPass:rec.pPass(),readAt:rec.readAt});}
 return{read:rec.read,pPass:rec.pPass(),legitimateBlockingCue:showsBlock(a,sim,near,sim.see(a,near),[a]),trajectory};
}
const inputs=[{name:'upright-stationary',speed:0,cue:'upright'},
 {name:'release',speed:6,cue:'upright'},{name:'low-pads',speed:1,cue:'low-pads'},
 {name:'own-contact',speed:0,cue:'own-contact'}];
const rows=inputs.map(i=>({...i,before:read(ApprovedRecognition,i.speed,6,i.cue),after:read(Recognition,i.speed,6,i.cue)}));
assert.equal(rows[0].before.read,'run');assert.equal(rows[0].after.read,'unsure');
assert.equal(rows[0].after.legitimateBlockingCue,false);
for(const row of rows.slice(1))assert.equal(row.after.read,row.before.read);
assert.equal(rows[1].after.read,'pass');
for(const row of rows.slice(2)){assert.equal(row.after.legitimateBlockingCue,true);assert.equal(row.after.read,'run');}
assert.deepEqual(read(Recognition,0,0).trajectory,read(Recognition,0,6).trajectory);
const result={schema:'zone-key-contract-diagnostic-v1',approvedSource:'a1b16e666a9ee7d1bc1d2aecba141fc535863b24',
 approvedModuleSha256:createHash('sha256').update(approvedSource).digest('hex'),
 compared:'same selected nearby Y pictures, only Recognition implementation differs; far X does not change current result',
 rows,newWorldSteps:0,newGames:0,elapsedSeconds:(performance.now()-began)/1000};
writeFileSync(new URL('./zone-key-diagnostic.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,rows:rows.map(r=>({name:r.name,before:r.before.read,after:r.after.read,blockingCue:r.after.legitimateBlockingCue}))}));
