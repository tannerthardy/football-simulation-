/** Small paired native-contact follow-up to PR51. No changed football logic.
 * Instrumented history is diagnostic, not a runtime benchmark. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sourceVersion} from '../../source-version.js';
import {rep,type Cell} from '../tackle/panel.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeTransitionInterval} from './grip-native-slip.js';
import {sha} from './grip-bounded-fixtures.js';
import {boundedAttachment} from '../../../src/physics/bounded-attachment.js';
import type {ActiveGripInput,ActiveGripResult} from '../../../src/physics/active-grip.js';
const root='out/grip-native-football';mkdirSync(root,{recursive:true});
const prior=JSON.parse(readFileSync('data/reviews/current/grip-native-forces.json','utf8')),
  inputs=prior.native.map((c:any)=>c.input) as Array<{id:string;name:string;cell:Cell;side:1|-1;seed:number}>,
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
inputs.push({id:'patch-45-8-0-5001-1',name:'declared new angle',cell:{angle:45,speed:8,cut:false,difficulty:'difficult'},side:1,seed:5001});
assert.deepEqual(flags,profile.flags);
const selected=process.argv.find(v=>v.startsWith('--id='))?.slice(5),modeOnly=process.argv.find(v=>v.startsWith('--mode='))?.slice(7),
  output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/panel.json`,rows:any[]=[];
const body=(b:any)=>({pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin,energy:b.energy,support:structuredClone(b.support)});
for(const input of inputs){
  if(selected&&input.id!==selected)continue;
  for(const mode of ['owned','previous','transition']){
    if(modeOnly&&mode!==modeOnly)continue;
    const ticks:any[]=[],invocations:any[]=[],calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>},start=performance.now();let pair:number[]=[];
    const result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
      const w:any=world;w.materialTransport='owned';
      if(mode!=='owned')w.activeGrip=(q:ActiveGripInput)=>{
        const call:any={time:w.time,input:q};invocations.push(call);
        try{const r:ActiveGripResult=mode==='previous'?nativeSpanInterval(q):nativeTransitionInterval(q);call.result=r;return r;}
        catch(e){call.refusal=String(e);throw e;}
      };
      const step=w.step;
      w.step=function(...args:any[]){
        if(!pair.length){pair=this.bodies.map((b:any,i:number)=>({b,i})).filter(({b}:any)=>Math.hypot(b.vel.x,b.vel.y)>1e-8).map(({i}:any)=>i);
          assert.equal(pair.length,2);pair.sort((i,j)=>Number(this.bodies[j].vel.x>0&&this.bodies[j].vel.y===0)-Number(this.bodies[i].vel.x>0&&this.bodies[i].vel.y===0));}
        const initial={time:this.time,bodies:pair.map(i=>body(this.bodies[i])),requests:pair.map(i=>structuredClone(args[0][i]))},r=step.apply(this,args),p=r.activeGrip;
        if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const[k,v]of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+(v as number);}
        const grips=this.joints.filter((j:any)=>j.kind==='grasp'&&j.b===this.bodies[pair[0]]).map((j:any)=>{
          const a=this.attachments.get(j),z=a?.material,m=z?(a.bounded?boundedAttachment(z,this.sp[pair[0]].comHeight).offset:z):undefined,
            c=Math.cos(j.b.facing),s=Math.sin(j.b.facing);
          return {broken:j.broken??false,slipping:j.slipping??false,legs:j.legs,hold:j.hold,force:j.force,origin:j.origin,
            material:z?{...z}:null,point:m?{x:j.b.pos.x+c*m.x-s*m.y,y:j.b.pos.y+s*m.x+c*m.y}:null};
        });
        ticks.push({initial,time:this.time,bodies:pair.map(i=>body(this.bodies[i])),grips,
          report:{activeGrip:p,contacts:r.contacts.filter((c:any)=>pair.includes(c.i)&&pair.includes(c.j)),work:r.work,
            groundWork:pair.map(i=>r.groundWork[i]),armWork:pair.map(i=>r.armWork[i]),supportMotorWork:pair.map(i=>r.supportMotorWork[i])}});
        return r;
      };
    }});
    const seconds=(performance.now()-start)/1000,old=prior.native.find((c:any)=>c.id===input.id)?.arms.find((a:any)=>a.mode===(mode==='owned'?'owned':'combined')),
      reused=mode!=='transition'&&old?['ending','finish','advanceAfterGrip','afterContact','contactToEnd','contactImpulse','peakClosing','carrierState']:[];
    for(const k of reused)assert.deepEqual((result as any)[k],old[k]);
    const rawPath=`${root}/${input.id}-${mode}.json`;writeFileSync(rawPath,JSON.stringify({input,mode,pair,result,calls,ticks,invocations}));
    const row={input,mode,result,calls,instrumentedSeconds:seconds,transitionCalls:invocations.filter(c=>c.result?.tangentSlip).length,
      transitionEvents:invocations.flatMap(c=>c.result?.tangentSlip?(c.result.events??[]).map((e:any)=>({kind:e.kind,time:c.time+e.time})):[]),
      legacyFieldsReproduced:reused,raw:{path:rawPath,sha256:sha(readFileSync(rawPath))}};
    rows.push(row);console.log(JSON.stringify({...row,raw:undefined}));
  }
}
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
const files=['scripts/diag/physics/grip-native-football.ts','scripts/diag/tackle/panel.ts','scripts/diag/physics/grip-native-slip.ts','src/physics/world.ts','src/physics/active-grip.ts'];
writeFileSync(output,JSON.stringify({meta:{commit,source,flags,timestamp:new Date().toISOString(),baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  settings:{handContact:'patch',substeps:96,materialTransport:'owned'},hashes:Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),
  inputs,priorEvidence:{path:'data/reviews/current/grip-native-forces.json',sha256:sha(readFileSync('data/reviews/current/grip-native-forces.json'))},
  note:'Instrumented histories; not a runtime benchmark. Acquisition advance is not NFL YAC. Censored cases are not completed tackles.'},rows},null,2)+'\n');
