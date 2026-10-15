import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Agent} from '../src/sim/agent.js';
import {alignOffense} from '../src/playbook/alignment.js';
import {runReadAim} from '../src/sim/behaviors/carrier.js';
import type {PlaySim} from '../src/sim/playsim.js';
const packet=JSON.parse(readFileSync(new URL('./fixtures/run-entry-cues.json',import.meta.url),'utf8'));
function scene(id:string){
 const r=packet.cases.find((r:any)=>r.id===id),f=r.frame;
 const actors=r.actors.map((a:any)=>new Agent(a.idx,a.team,a.slot,a.player,a.profile,
  {...structuredClone(f.before[a.idx]),profile:a.profile},{kind:'unused',update(){throw Error('No other decision requested');}}));
 if(f.engagements)for(const e of f.engagements)for(const a of [e.blocker,e.defender,...e.helpers])actors[a.agent].engagement=e;
 else for(const j of f.joints)if(j.kind==='hands'){actors[j.a].engagement={};actors[j.b].engagement={};}
 const pictures=new Map<number,any>(r.cues.filter((c:any)=>c.kind==='see').map((c:any)=>[c.target,c.picture]));
 const sim={t:r.t,dt:.05,los:r.los,ballY:r.ballY,offCall:r.call,
  offAlign:alignOffense(r.call.formation,r.call.flip,r.los,r.ballY),
  offense:actors.filter((a:Agent)=>a.team==='O'),defense:actors.filter((a:Agent)=>a.team==='D'),
  attackDir:()=>1,opponents:(a:Agent)=>actors.filter((b:Agent)=>b.team!==a.team),
  see:(_a:Agent,b:Agent)=>{const p=pictures.get(b.idx);if(!p)throw Error('Missing consumed cue');return structuredClone(p);},
 } as unknown as PlaySim;
 const revive=(v:any):any=>v&&typeof v==='object'?(Object.keys(v).length===1&&'agent'in v?actors[v.agent]
  :Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,v])=>[k,revive(v)]))):v;
 const opts=revive(f.behavior[6].opts),rb=actors[6];
 return{r,actors,sim,rb,pictures,read:()=>runReadAim(rb,sim,opts)};
}
describe('run entry risk uses the acquired defender picture',()=>{
 it('does not award a hidden engagement delay to the recorded outside entry',()=>{
  const s=scene('failing');
  const decision=s.read();
  expect(decision).not.toEqual(s.r.recordedRead.selected);
  for(const d of s.sim.defense)d.engagement=null;
  expect(s.read()).toEqual(decision);
 });
 it('does not inspect live opponent engagement, support, fatigue or position',()=>{
  const s=scene('failing'),decision=s.read();
  for(const d of s.sim.defense){
   d.body.pos={x:0,y:0};d.body.vel={x:20,y:20};d.body.energy=.01;
   d.body.support!.state='down';
   Object.defineProperty(d,'engagement',{get(){throw Error('Private engagement queried');}});
   Object.defineProperty(d,'speedScale',{get(){throw Error('Private fatigue queried');}});
   d.isDown=()=>{throw Error('Private pose queried');};
  }
  expect(s.read()).toEqual(decision);
 });
 it.each(['waiting-control','legitimate-win-control'])('preserves the exact-parent contrasting entry: %s',id=>{
  const s=scene(id);expect(s.read()).toEqual(s.r.parentRead.selected);
 });
});
