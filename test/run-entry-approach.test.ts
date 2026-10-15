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
 return{read:(filter?:any)=>runReadAim(rb,sim,opts,filter),approach,actors};
}
describe('run-entry approach uncertainty',()=>{
 it('compares fast, slower and gather from one unchanged body and acquired picture',()=>{
  const s=structuredClone(cases.failing),before=structuredClone(s),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.choices[0].knownMinimumGap).toBeLessThan(0);expect(r.choices[1].knownMinimumGap).toBeLessThan(0);
  expect(r.kind).toBe('gather');expect(r.knownMinimumGap).toBeGreaterThan(0);expect(r.up).toBe(true);
  expect(r.status).toBe('unknown');expect(r.minimumGap).toBeNull();expect(r.unknownPeers).toEqual([0,8]);
  expect(s).toEqual(before);
 });
 it('retains P019 fast exactly but does not certify its stale QB memory',()=>{
  const s=structuredClone(cases.clear),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.kind).toBe('fast');expect(r.status).toBe('unknown');expect(r.minimumGap).toBeNull();
  expect(r.knownMinimumGap).toBeGreaterThan(0);expect(r.unknownPeers).toEqual([0]);expect(r.command).toBe(s.command);
 });
 it('does not inflate the radius of a stationary teammate beside a clear lane',()=>{
  const s=structuredClone(cases.failing),rg=s.peers.find((p:any)=>p.id===5);
  s.body.vel={x:0,y:0};s.body.facing=0;s.body.spin=0;
  s.command.vel={x:s.body.profile.vmax,y:0};
  rg.picture.vel={x:0,y:0};
  rg.picture.age=.30;rg.picture.predictedFor=.30;
  rg.picture.pos={x:s.body.pos.x+1,y:s.body.pos.y+.9*(s.body.profile.radius+rg.radius)+.02};
  const r=chooseRunApproach(s.body,s.command,[rg],s.t,'center');
  expect(r.choices[0].minimumGap).toBeGreaterThan(0);expect(r.kind).toBe('fast');expect(r.status).toBe('clear');
  // Same body, command, last estimated position and zero velocity. Only the
  // information clock changes: this zero no longer supports stationary motion.
  for(const source of ['observed','remembered']as const){
   rg.picture.source=source;rg.picture.age=.35;
   const stale=chooseRunApproach(s.body,s.command,[rg],s.t,'center');
   expect(stale.status).toBe('unknown');expect(stale.minimumGap).toBeNull();
   expect(stale.unknownPeers).toEqual([rg.id]);expect(stale.gaps).toEqual([{id:rg.id,gap:null}]);
   expect(stale.command).toBe(s.command);expect(stale.path).toEqual(r.path);
   expect(stale.choices.every(c=>c.status==='unknown')).toBe(true);
  }
 });
 it('retains unavailable peers explicitly without reading a nonexistent position or velocity',()=>{
  const s=structuredClone(cases.clear),p={id:99,picture:{source:'unavailable' as const},radius:.4,brake:4};
  const r=chooseRunApproach(s.body,s.command,[p],s.t,'center');
  expect(r.status).toBe('unknown');expect(r.minimumGap).toBeNull();expect(r.unknownPeers).toEqual([99]);
  expect(r.command).toBe(s.command);
 });
 it('still acts on a demonstrated known obstruction when another peer is unknown',()=>{
  const s=structuredClone(cases.failing);
  s.peers.push({id:99,picture:{source:'unavailable'},radius:.4,brake:4});
  const r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.choices[0].status).toBe('blocked');expect(r.choices[1].status).toBe('blocked');
  expect(r.kind).toBe('gather');expect(r.status).toBe('unknown');expect(r.minimumGap).toBeNull();
  expect(r.knownMinimumGap).toBeGreaterThan(0);expect(r.unknownPeers).toEqual([0,8,99]);
 });
 it('does not re-rank either saved destination by pretending stale memories certify clearance',()=>{
  for(const id of ['failing','waiting-control']){
   const s=entryScene(id),old=s.read(),next=s.read((p:any)=>{const r=s.approach(p);return r.kind!=='gather'&&r.status==='clear';});
   expect(next).not.toBeNull();expect(next).toEqual(old);
   expect(s.approach(next!).status).toBe('unknown');
   expect(s.approach(next!).minimumGap).toBeNull();
  }
 });
 it('retains the original destination when no approach can be certified',()=>{
  const s=entryScene('failing');expect(s.read(()=>false)).toEqual(s.read());
 });
 it('entry risk does not recover private opponent pose, fatigue, engagement or movement',()=>{
  const s=entryScene('failing'),before=s.read();
  for(const d of s.actors.filter((a:Agent)=>a.team==='D')){
   d.body.pos={x:0,y:0};d.body.vel={x:20,y:20};d.body.energy=.01;
   d.body.support!.state='down';
   Object.defineProperty(d,'engagement',{get(){throw Error('Private engagement queried');}});
   Object.defineProperty(d,'speedScale',{get(){throw Error('Private fatigue queried');}});
   d.isDown=()=>{throw Error('Private pose queried');};
  }
  expect(s.read()).toEqual(before);
 });
});
