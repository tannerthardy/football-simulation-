/** Start every resolution from the same real first-wrap state, then hold
 * the incoming control fixed. Isolates grasp/support from earlier block drift.
 * node --import tsx scripts/diag/grasp-support-convergence.ts out/grasp-support.json
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {World,type Intent,type Joint,type GraspJoint,type HandJoint} from '../../src/physics/world.js';
import type {Body} from '../../src/physics/kinematics.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {redirect} from '../../src/lab/scenarios.js';
import {sourceVersion} from '../source-version.js';

type StoredJoint=(Omit<GraspJoint,'a'|'b'>|Omit<HandJoint,'a'|'b'|'actor'|'holder'>)&{a:number;b:number;actor?:number;holder?:number};
interface Setup{time:number;slots:string[];bodies:Body[];intents:Array<Intent|null|undefined>;joints:StoredJoint[]}
const originalStep=World.prototype.step,originalTick=PlaySim.prototype.tick;
let current:PlaySim|undefined,setup:Setup|undefined;
PlaySim.prototype.tick=function(){current=this;return originalTick.call(this);};
function capture(this:World,intents:ReadonlyArray<Intent|null|undefined>,dt:number){
  if(!setup&&current?.world===this&&this.joints.some(j=>j.kind==='grasp'&&!j.broken)){
    setup={time:this.time,slots:current.agents.map(a=>a.slot),bodies:structuredClone(this.bodies),
      intents:structuredClone(intents) as Array<Intent|null|undefined>,joints:this.joints.map(j=>{
        if(j.kind==='grasp'){const {a,b,...value}=j;return {...structuredClone(value),a:this.indexOf(a),b:this.indexOf(b)};}
        const {a,b,actor,holder,...value}=j;
        return {...structuredClone(value),a:this.indexOf(a),b:this.indexOf(b),actor:actor?this.indexOf(actor):undefined,holder:holder?this.indexOf(holder):undefined};
      })};
  }
  return originalStep.call(this,intents,dt);
}
World.prototype.step=capture;

const fixtures=[],switched=[];
for(const [seed,power] of [[3,.7],[3,1],[3,1.4],[11,1],[11,1.4]]){
  setup=undefined;redirect({seed,rusherPower:power,substeps:192});
  if(!setup)throw new Error(`No wrap state in ${seed}/${power}`);
  const initial:Setup=setup;
  // Restore observer while running pure-world trials: they do not invoke a
  // football controller or update their inputs from the numerical reference.
  World.prototype.step=originalStep;
  const trials=[];
  for(const substeps of [6,12,24,48,96,192]){
    const bs=structuredClone(initial.bodies),world=new World(bs,{substeps});world.time=initial.time;
    world.joints=initial.joints.map(stored=>{
      const {a,b,actor,holder,...value}=stored;
      return {...structuredClone(value),a:bs[a],b:bs[b],...(value.kind==='hands'?{actor:actor===undefined?undefined:bs[actor],holder:holder===undefined?undefined:bs[holder]}:{})} as Joint;
    });
    const falls=new Set<number>(),frames=[];let momentumError=0,workError=0;
    for(let k=0;k<8;k++){
      const before=bs.reduce((s,b)=>({x:s.x+b.profile.massKg*b.vel.x,y:s.y+b.profile.massKg*b.vel.y}),{x:0,y:0});
      const r=world.step(initial.intents,.05);
      const after=bs.reduce((s,b)=>({x:s.x+b.profile.massKg*b.vel.x,y:s.y+b.profile.massKg*b.vel.y}),{x:0,y:0});
      const g=r.groundImpulse.reduce((s,v)=>({x:s.x+v.x,y:s.y+v.y}),{x:0,y:0});
      momentumError=Math.max(momentumError,Math.hypot(after.x-before.x-g.x,after.y-before.y-g.y));
      workError=Math.max(workError,Math.abs(r.work.residual));for(const i of r.falls)falls.add(i);
      frames.push({t:world.time,actors:bs.map((b,i)=>({slot:initial.slots[i],pos:{...b.pos},vel:{...b.vel},state:b.support!.state,
        peak:b.support!.peak,xi:{...b.support!.xi},legs:b.support!.feetLock})).filter(a=>['QB','DE_S','RT'].includes(a.slot))});
    }
    trials.push({substeps,momentumError,workError,falls:[...falls].map(i=>initial.slots[i]),frames});
  }
  fixtures.push({seed,power,initial,trials});
  // Keep the real controllers running, but switch physics resolution only
  // when the first wrap exists. This locates pre-wrap vs post-wrap dependence.
  for(const before of [12,192])for(const after of [12,192]){
    let wrap:unknown=null;
    World.prototype.step=function(intents,dt){
      if(!wrap&&current?.world===this&&this.joints.some(j=>j.kind==='grasp'&&!j.broken)){
        wrap={t:this.time,actors:current.agents.filter(a=>['RT','DE_S','QB'].includes(a.slot)).map(a=>({
          slot:a.slot,pos:{...a.pos},vel:{...a.vel},support:structuredClone(a.body.support)}))};
        this.substeps=after;
      }
      return originalStep.call(this,intents,dt);
    };
    const result=redirect({seed,rusherPower:power,substeps:before});
    switched.push({seed,power,before,after,wrap,...result});
  }
  World.prototype.step=capture;
}
World.prototype.step=originalStep;PlaySim.prototype.tick=originalTick;
const out=process.argv[2]??'out/grasp-support.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Each fixture starts from the identical 192-substep first-wrap state. Then eight 20-Hz world ticks hold the incoming intent and controller joint capacity fixed; grip slip/ratcheting and support evolve normally. No new decisions, random draws or officiated ending. Switched trials separately keep real football controllers and change only solver resolution at the first incoming wrap. Numerical isolation, not NFL validation.',fixtures,switched},null,2)+'\n');
console.table(fixtures.flatMap(f=>f.trials.map(t=>({seed:f.seed,power:f.power,substeps:t.substeps,falls:t.falls.join(','),qbPeak:t.frames.at(-1)!.actors.find(a=>a.slot==='QB')!.peak}))));
console.table(switched.map(({seed,power,before,after,closest,falls})=>({seed,power,before,after,closest,falls:falls.join(',')})));
