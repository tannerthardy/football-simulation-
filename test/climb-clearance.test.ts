import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import type {Body} from '../src/physics/kinematics.js';
import {CONTACT_SCALE,World,type Intent} from '../src/physics/world.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {clearClimbStep,climbLookahead,type ClimbObstacle} from '../src/sim/climb-clearance.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';

const fixture=JSON.parse(readFileSync('test/fixtures/climb-clearance.json','utf8'));
function saved() {
 const f=structuredClone(fixture);f.body.support.since=-Infinity;
 return {...f,horizon:climbLookahead(f.body,f.command,f.horizon)};
}
function path(body:Body,command:Intent,horizon:number) {
 const copy=structuredClone(body),world=new World([copy]);world.time=.45;
 const states=[structuredClone(copy)];
 for(let k=0;k<Math.ceil(horizon/.05);k++) {
  const r=world.step([command],.05);expect(Math.abs(r.work.residual)).toBeLessThan(1e-7);
  expect(r.armImpulse[0]).toBe(0);states.push(structuredClone(copy));
 }
 return states;
}
function clearance(states:Body[],peer:ClimbObstacle) {
 let min=Infinity;
 for(let k=0;k<states.length;k++) {
  const p=states[k].pos,t=k*.05;
  min=Math.min(min,Math.hypot(p.x-peer.pos.x-peer.vel.x*t,p.y-peer.pos.y-peer.vel.y*t)
   -CONTACT_SCALE*(states[k].profile.radius+peer.radius));
 }
 return min;
}
const choose=(f:ReturnType<typeof saved>)=>clearClimbStep(f.body,f.command,f.goal,f.peers,.45,f.horizon,1,'center');

describe('a free climb clears acquired first-level bodies',()=>{
 it('changes the exact saved LG request before spending its stopping room',()=>{
  const f=saved(),before=structuredClone(f),choice=choose(f),down=f.peers.find((p:any)=>p.slot==='DT_W');
  expect(f.horizon).toBeGreaterThan(fixture.horizon);
  expect(choice.kind).toBe('around');expect(choice.blockedBy).toContain(down.id);
  expect(choice.command.vel.y).toBeGreaterThan(0);
  expect(Math.hypot(choice.command.vel.x,choice.command.vel.y)).toBeCloseTo(Math.hypot(f.command.vel.x,f.command.vel.y),12);
  expect(clearance(path(f.body,f.command,f.horizon),down)).toBeLessThan(0);
  expect(clearance(path(f.body,choice.command,f.horizon),down)).toBeGreaterThanOrEqual(0);
  expect(f).toEqual(before);
 });
 it('keeps an ordinary genuinely clear approach exact',()=>{
  const f=saved();f.peers=[{id:90,pos:{x:60,y:45},vel:{x:0,y:0},radius:.4}];
  const choice=choose(f);expect(choice.kind).toBe('direct');expect(choice.command).toBe(f.command);
  expect(path(f.body,choice.command,.6)).toEqual(path(f.body,f.command,.6));
 });
 it('accounts for the neighboring route together with the down man',()=>{
  const f=saved(),first=choose(f),states=path(f.body,first.command,f.horizon),p=states.at(-1)!.pos;
  const neighbor:ClimbObstacle={id:91,pos:{...p},vel:{x:0,y:0},radius:.34};
  expect(clearance(states,neighbor)).toBeLessThan(0);f.peers.push(neighbor);
  const next=choose(f);expect(next.command).not.toEqual(first.command);
  expect(next.minimumGap).toBeGreaterThanOrEqual(0);
  expect(clearance(path(f.body,next.command,f.horizon),neighbor)).toBeGreaterThanOrEqual(0);
 });
 it('reports a genuinely too-late obstruction instead of certifying a request',()=>{
  const f=saved();f.body.vel={x:6,y:0};f.command={vel:{x:7,y:0},facing:0};f.horizon=.6;
  f.peers=[-.7,0,.7].map((y,id)=>({id,pos:{x:f.body.pos.x+.8,y:f.body.pos.y+y},vel:{x:0,y:0},radius:.36}));
  const choice=choose(f);expect(choice.kind).toBe('blocked');expect(choice.minimumGap).toBeLessThan(0);
  const own=structuredClone(f.body),other=structuredClone(f.body);other.pos={...f.peers[1].pos};other.vel={x:0,y:0};
  const world=new World([own,other]);world.time=.45;let hits=0;
  for(let k=0;k<6;k++)hits+=world.step([choice.command,{vel:{x:0,y:0}}],.05).contacts.length;
  expect(hits).toBeGreaterThan(0);
 });
 it('mirrors the acquired detour and achieved motion',()=>{
  const right=saved(),left=saved(),by=26.666666666666668;
  const reflect=(v:any,key='')=>{
   if(!v||typeof v!=='object')return;
   if('x'in v&&'y'in v&&typeof v.x==='number'&&typeof v.y==='number')v.y=key==='pos'||key==='goal'?2*by-v.y:-v.y;
   for(const [k,value]of Object.entries(v)){
    if(k==='facing'||k==='spin')v[k]=-(value as number);
    else if(k!=='profile')reflect(value,k);
   }
  };
  reflect(left);const r=choose(right),l=clearClimbStep(left.body,left.command,left.goal,left.peers,.45,left.horizon,-1,'center');
  expect(l.kind).toBe(r.kind);expect(l.command.vel.x).toBeCloseTo(r.command.vel.x,10);
  expect(l.command.vel.y).toBeCloseTo(-r.command.vel.y,10);
  const rp=path(right.body,r.command,right.horizon),lp=path(left.body,l.command,left.horizon);
  for(let i=0;i<rp.length;i++){
   expect(lp[i].pos.x).toBeCloseTo(rp[i].pos.x,9);expect(lp[i].pos.y+rp[i].pos.y).toBeCloseTo(2*by,9);
  }
 });
 it('does not turn an expired installed route into free space',()=>{
  const f=saved(),q=f.peers.find((p:any)=>p.slot==='QB');
  q.pos={x:f.body.pos.x+1,y:f.body.pos.y};q.vel={x:0,y:0};q.validFor=0;q.maxSpeed=8;
  q.route=[{t:0,pos:{...q.pos}}];q.horizon=f.horizon;
  const selected=choose(f);expect(selected.kind).toBe('blocked');expect(selected.blockedBy).toContain(q.id);
 });
});

function stage() {
 const formation=FORMATION_BY_ID.ace_12;
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.iz_weak,label:'inside'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
 const f=saved(),a=sim.slot('LG')!,target=sim.slot('LB_M')!;a.body=f.body;sim.t=.45;
 a.behavior=new RunBlocker({kind:'climb',target,drive:{x:.9284766908852592,y:.37139067635410367}});
 Object.defineProperty(a.mind,'decisionInterval',{get:()=>fixture.horizon});
 sim.see=(_a,b)=>{
  if(b===target)return structuredClone(fixture.targetPicture);
  const p=fixture.peers.find((p:any)=>p.id===b.idx);return structuredClone(p?.picture??{pos:{x:80,y:50},vel:{x:0,y:0},facing:Math.PI,stance:null});
 };
 sim.teammateInformation=(_a,b)=>structuredClone(fixture.peers.find((p:any)=>p.id===b.idx)?.picture??{source:'unavailable'});
 const contact=a.profile.radius+target.profile.radius+.1+a.player.measurables.armIn/36*.45;
 const select=()=>Reflect.get(a.behavior,'plannedClimb').call(a.behavior,a,sim,target,contact,structuredClone(fixture.targetPicture)) as Intent;
 return {sim,a,target,select};
}

describe('climb clearance is an ordinary personal read',()=>{
 it('holds its deliberate first step without refreshing other players mid-beat',()=>{
  const s=stage(),peer=vi.spyOn(s.sim,'teammateInformation');const first=s.select();
  const read=Reflect.get(s.a.behavior,'climbRead');expect(read.clearance.kind).toBe('around');
  const count=peer.mock.calls.length;s.sim.t+=.05;s.a.body.vel={x:0,y:1};
  expect(s.select()).toEqual(first);expect(peer.mock.calls.length).toBe(count);
  expect(read.nextRead).toBeCloseTo(.45+fixture.horizon,12);
 });
 it('ignores hidden body/job divergence and preserves own body and RNG',()=>{
  const s=stage(),own=structuredClone(s.a.body),rng=structuredClone(s.sim.rng),first=s.select();
  for(const b of s.sim.agents)if(b!==s.a){b.body.pos={x:80+b.idx,y:3};b.body.vel={x:9,y:-9};b.behavior={kind:'private',update:()=>{throw Error('hidden job');}};}
  Reflect.set(s.a.behavior,'climbRead',null);expect(s.select()).toEqual(first);
  expect(s.a.body).toEqual(own);expect(s.sim.rng).toEqual(rng);
 });
 it('keeps a felt loaded body outside the free clearance forecast',()=>{
  const s=stage();s.a.body.support!.load={x:100,y:0};s.select();
  expect(Reflect.get(s.a.behavior,'climbRead').clearance).toBeUndefined();
 });
});
