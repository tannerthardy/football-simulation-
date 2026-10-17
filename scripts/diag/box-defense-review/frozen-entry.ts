/** Re-evaluate saved acquired reads; zero physics ticks or new perceptions. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Agent} from '../../../src/sim/agent.js';
import {runReadAim} from '../../../src/sim/behaviors/carrier.js';
import {runReadObservers} from '../../../src/sim/run-read-observer.js';
import type {PlaySim} from '../../../src/sim/playsim.js';
import {sourceVersion} from '../../source-version.js';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Explicit input/output required');
const row=JSON.parse(gunzipSync(readFileSync(input)).toString()).rows[0];
const reads=row.reads.filter((r:any)=>[1.55,1.75,2.15,2.3].includes(r.t)).map((r:any)=>{
 const agents=row.actors.map((a:any)=>new Agent(a.idx,a.team,a.slot,a.player,a.profile,
  {...structuredClone(row.initial[a.idx].body),profile:a.profile},{kind:'unused',update(){throw Error('No extra decisions');}}));
 const rb=agents[r.actor];rb.body=structuredClone(r.body);
 const pictures=new Map(r.pictures.map((p:any)=>[p.target,p.picture]));
 const sim={t:r.t,dt:.05,los:40,ballY:26.67,qb:agents.find((a:Agent)=>a.slot==='QB'),
  offense:agents.filter((a:Agent)=>a.team==='O'),defense:agents.filter((a:Agent)=>a.team==='D'),
  attackDir:()=>1,opponents:()=>agents.filter((a:Agent)=>a.team==='D'),
  offAlign:{spots:{}},see:(_a:Agent,b:Agent)=>structuredClone(pictures.get(b.idx)),
 }as unknown as PlaySim;
 const opts={...r.opts,aim:{...r.opts.aim,y:r.preferred},aimGap:undefined};
 let observed:any;runReadObservers.set(sim,e=>{if(e.phase==='aim')observed=structuredClone(e);});
 const selected=runReadAim(rb,sim,opts);
 return{t:r.t,preferred:r.preferred,selected,top:observed.candidates.sort((a:any,b:any)=>a.score-b.score).slice(0,5)};
});
const result={source:sourceVersion(),input,physicsTicks:0,reads};writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
