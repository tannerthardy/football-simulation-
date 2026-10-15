import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';
import{chooseRunApproach}from'../src/sim/run-approach.js';
import{Agent}from'../src/sim/agent.js';
import{alignOffense}from'../src/playbook/alignment.js';
import{runReadAim}from'../src/sim/behaviors/carrier.js';
import type{PlaySim}from'../src/sim/playsim.js';
const cases=JSON.parse(readFileSync(new URL('./fixtures/run-entry-approach.json',import.meta.url),'utf8'));
function entryScene(id:string){
 const r=cases.entryScenes.find((r:any)=>r.id===id),f=r.frame;
 const actors=r.actors.map((a:any)=>new Agent(a.idx,a.team,a.slot,a.player,a.profile,
  {...structuredClone(f.before[a.idx]),profile:a.profile},{kind:'unused',update(){throw Error('No other decision');}}));
 const pictures=new Map(r.cues.filter((c:any)=>c.kind==='see').map((c:any)=>[c.target,c.picture]));
 const sim={t:r.t,dt:.05,los:r.los,ballY:r.ballY,offCall:r.call,offAlign:alignOffense(r.call.formation,r.call.flip,r.los,r.ballY),
  offense:actors.filter((a:Agent)=>a.team==='O'),defense:actors.filter((a:Agent)=>a.team==='D'),attackDir:()=>1,
  opponents:(a:Agent)=>actors.filter((b:Agent)=>b.team!==a.team),see:(_a:Agent,b:Agent)=>structuredClone(pictures.get(b.idx))}as unknown as PlaySim;
 const revive=(v:any):any=>v&&typeof v==='object'?(Object.keys(v).length===1&&'agent'in v?actors[v.agent]
  :Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,v])=>[k,revive(v)]))):v;
 const opts=revive(f.behavior[6].opts),rb=actors[6],saved=id==='failing'?cases.failing:cases.clear;
 const approach=(p:any)=>{const h=Math.atan2(p.y-rb.pos.y,p.x-rb.pos.x);return chooseRunApproach(rb.body,
  {...saved.command,vel:{x:Math.cos(h)*rb.profile.vmax,y:Math.sin(h)*rb.profile.vmax}},saved.peers,r.t,'center');};
 return{read:(filter?:any)=>runReadAim(rb,sim,opts,filter),approach};
}
describe('run-entry approach uncertainty',()=>{
 it('compares fast, slower and gather from one unchanged body and acquired picture',()=>{
  const s=structuredClone(cases.failing),before=structuredClone(s),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.choices[0].minimumGap).toBeLessThan(0);expect(r.choices[1].minimumGap).toBeLessThan(0);
  expect(r.kind).toBe('gather');expect(r.minimumGap).toBeGreaterThan(0);expect(r.up).toBe(true);
  expect(s).toEqual(before);
 });
 it('retains the genuine clear-route fast request exactly, despite acquired-picture age',()=>{
  const s=structuredClone(cases.clear),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.kind).toBe('fast');expect(r.minimumGap).toBeGreaterThan(0);expect(r.command).toBe(s.command);
 });
 it('does not inflate the radius of a stationary teammate beside a clear lane',()=>{
  const s=structuredClone(cases.failing),rg=s.peers.find((p:any)=>p.id===5);
  s.body.vel={x:0,y:0};s.body.facing=0;s.body.spin=0;
  s.command.vel={x:s.body.profile.vmax,y:0};
  rg.picture.vel={x:0,y:0};
  rg.picture.pos={x:s.body.pos.x+1,y:s.body.pos.y+.9*(s.body.profile.radius+rg.radius)+.02};
  const r=chooseRunApproach(s.body,s.command,[rg],s.t,'center');
  expect(r.choices[0].minimumGap).toBeGreaterThan(0);expect(r.kind).toBe('fast');
 });
 it('admits a moving approach before ranking its destination; preserves the clear entry',()=>{
  for(const id of ['failing','waiting-control']){
   const s=entryScene(id),old=s.read(),next=s.read((p:any)=>{const r=s.approach(p);return r.kind!=='gather'&&r.minimumGap>=0;});
   expect(next).not.toBeNull();expect(s.approach(next!).kind).not.toBe('gather');
   if(id==='failing'){expect(s.approach(old!).kind).toBe('gather');expect(next).not.toEqual(old);}
   else expect(next).toEqual(old);
  }
 });
});
