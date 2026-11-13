/** Trace the reproduced hand-fight disagreement at the unchanged 20 Hz
 * controller rate. No solver changes or new random draws.
 * node --import tsx scripts/diag/hand-fight-trace.ts out/trace.json [seed] [power]
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {redirect} from '../../src/lab/scenarios.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {sourceVersion} from '../source-version.js';

const seed=Number(process.argv[3]??3), rusherPower=Number(process.argv[4]??1);
const rows: unknown[]=[];
let substeps=12;
const original=PlaySim.prototype.tick;
PlaySim.prototype.tick=function(this:PlaySim) {
  const previousReport=this.lastStep;
  original.call(this);
  const report=this.lastStep;
  if(!report||report===previousReport) return;
  const actors=['RT','DE_S','QB'].map(slot=>{
    const a=this.slot(slot)!, s=a.body.support!, i=a.idx;
    return {slot,pos:{...a.pos},vel:{...a.vel},facing:a.body.facing,spin:a.body.spin,
      support:structuredClone(s),intent:structuredClone(this.intents[i]),
      groundImpulse:report.groundImpulse[i],groundYawImpulse:report.groundYawImpulse[i],
      armImpulse:report.armImpulse[i],armImpulseLimit:report.armImpulseLimit[i],
      armWork:report.armWork[i],armWorkLimit:report.armWorkLimit[i]};
  });
  const engagement=this.slot('DE_S')!.engagement;
  rows.push({substeps,t:this.t,actors,work:report.work,
    contacts:report.contacts.map(c=>({...c,a:this.agents[c.i].slot,b:this.agents[c.j].slot})),
    joints:this.world.joints.map(j=>({kind:j.kind,
      a:this.agents[this.world.indexOf(j.a)].slot,b:this.agents[this.world.indexOf(j.b)].slot,
      ...(j.kind==='grasp'?{capacity:j.capacity,force:j.force,legs:j.legs,hold:j.hold,reach:j.reach,
        pull:j.pull,slipping:j.slipping,broken:j.broken}
        :{extension:j.extension,push:j.push,hold:j.hold,steer:j.steer,normal:j.normalForce,tangent:j.tangentForce})})),
    falls:report.falls.map(i=>this.agents[i].slot),
    hands:engagement?.hands?{control:engagement.control,normal:engagement.hands.normalForce,
      tangent:engagement.hands.tangentForce,extension:engagement.hands.extension}:null});
};
const outcomes=[12,48,192].map(n=>{substeps=n;return {substeps:n,...redirect({seed,rusherPower,substeps:n})};});
PlaySim.prototype.tick=original;
const out=process.argv[2]??'out/hand-fight-trace.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),seed,rusherPower,controllerHz:20,
  note:'Tick-end trace; a refined numerical reference is not a physical truth. Substep contact transients need a finer trace if tick means are insufficient.',outcomes,rows},null,2)+'\n');
console.table(outcomes.map(({substeps,closest,falls})=>({substeps,closest,falls:falls.join(',')})));
console.log(`Saved ${out}`);
