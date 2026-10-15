import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {Body} from '../src/physics/kinematics.js';
import {CONTACT_SCALE,World,type Intent} from '../src/physics/world.js';
import type {Agent} from '../src/sim/agent.js';
import {spaceTeammates} from '../src/sim/spacing.js';
import {clearMovementStep} from '../src/sim/movement-clearance.js';

const saved=JSON.parse(readFileSync('test/fixtures/runner-clearance.json','utf8'));
function fixture(index=0){const f=structuredClone(saved.states[index]);f.body.support.since=-Infinity;return f;}
function actor(body:Body):Agent {
 return {body,team:'O',engagement:null,speedScale:1,
  get pos(){return body.pos;},get vel(){return body.vel;},get profile(){return body.profile;},
  isDown:()=>body.support?.state!=='up'} as unknown as Agent;
}
function select(f:ReturnType<typeof fixture>,hiddenShift=0,constrained=false,enabled=true){
 const own=actor(f.body),peers=f.peers.map((p:any)=>{
  const body=structuredClone(f.body);body.profile={...body.profile,radius:p.radius,vmax:p.maxSpeed,tau:p.tau};
  body.pos={x:80+hiddenShift,y:3};body.vel={x:9,y:9};return actor(body);
 });
 const agents=[own,...peers],intents:Intent[]=[structuredClone(f.command),...peers.map(()=>({vel:{x:0,y:0}}))];
 spaceTeammates(agents,intents,(a,b)=>a===own?f.peers[peers.indexOf(b)].picture:null,
  {now:f.t,runCarrier:enabled?own.body:undefined,constrained:constrained?new Set([own.body]):undefined});
 return intents[0];
}
/** Actual unloaded World motion, with independent relative swept geometry. */
function execute(f:ReturnType<typeof fixture>,command:Intent,peerTravel=(t:number,_peer:any)=>t){
 const body=structuredClone(f.body),world=new World([body]);world.time=f.t;
 let previous={...body.pos},gap=Infinity;
 for(let k=0;k<12;k++){
  const r=world.step([command],.05);expect(Math.abs(r.work.residual)).toBeLessThan(1e-7);
  expect(r.armImpulse[0]).toBe(0);expect(body.support!.state).toBe('up');
  for(const peer of f.peers){
   const p=peer.picture,t=k*.05,rx=previous.x-p.pos.x-p.vel.x*peerTravel(t,peer),ry=previous.y-p.pos.y-p.vel.y*peerTravel(t,peer);
   const dx=body.pos.x-p.pos.x-p.vel.x*peerTravel(t+.05,peer)-rx,dy=body.pos.y-p.pos.y-p.vel.y*peerTravel(t+.05,peer)-ry;
   const u=Math.max(0,Math.min(1,-(rx*dx+ry*dy)/Math.max(1e-12,dx*dx+dy*dy)));
   gap=Math.min(gap,Math.hypot(rx+u*dx,ry+u*dy)-CONTACT_SCALE*(body.profile.radius+peer.radius));
  }
  previous={...body.pos};
 }
 return {body,gap};
}

describe('post-exchange runner navigation uses achievable motion',()=>{
 it('does not sacrifice clearance or demand extra progress at the saved counter handoff',()=>{
  const f=fixture(),before=structuredClone(f),choice=select(f);
  expect(execute(f,f.command).gap).toBeLessThan(0);
  const corrected=execute(f,choice),old=execute(f,f.oldFinal);
  expect(corrected.gap).toBeGreaterThanOrEqual(0);
  expect(corrected.body.pos.x).toBeGreaterThanOrEqual(old.body.pos.x);
  expect(f).toEqual(before);
 });
 it.each([1,2])('does not release/stop solely across the old speed cutoff, exact state %s',index=>{
  const f=fixture(index),speed=Math.hypot(f.body.vel.x,f.body.vel.y);
  expect(index===1?speed>2:speed<2).toBe(true);
  const choice=select(f);expect(Math.hypot(choice.vel.x,choice.vel.y)).toBeGreaterThan(2);
  expect(execute(f,choice).gap).toBeGreaterThanOrEqual(0);
 });
 it.each([0,.2,.4])('does not rely on a teammate maintaining speed after %s seconds',stop=>{
  const f=fixture(),choice=select(f);
  expect(execute(f,choice,t=>Math.min(t,stop)).gap).toBeGreaterThanOrEqual(0);
 });
 it('does not call a lane clear solely because a crossing peer keeps its old speed',()=>{
  const f=fixture(1),vmax=7,tau=1.6,past=.3;
  f.command={vel:{x:f.body.profile.vmax,y:0},cutSkill:1};
  const picture={source:'observed',pos:{x:f.body.pos.x+2.5,y:f.body.pos.y+2},vel:{x:0,y:-2},predictedFor:past};
  f.peers=[{id:99,radius:.36,maxSpeed:vmax,tau,picture}];
  const peer={id:99,pos:picture.pos,vel:picture.vel,radius:.36,maxSpeed:vmax,mayStop:true,pace:{tau,predictedFor:past}};
  const goal={x:f.body.pos.x+5,y:f.body.pos.y};
  const old=clearMovementStep(f.body,f.command,goal,[{...peer,pace:undefined}],f.t,.6,1,'center');
  const choice=clearMovementStep(f.body,f.command,goal,[peer],f.t,.6,1,'center');
  expect(old.kind).toBe('direct');expect(choice.kind).not.toBe('direct');
  const travel=(t:number)=>((vmax*(past+t)-(vmax-2)*tau*(1-Math.exp(-(past+t)/tau)))-2*past)/2;
  expect(execute(f,old.command,travel).gap).toBeLessThan(0);
  expect(execute(f,choice.command,travel).gap).toBeGreaterThanOrEqual(0);
 });
 it('leaves ordinary clear-path acceleration and its achieved movement exact',()=>{
  const f=fixture();for(const p of f.peers)p.picture={...p.picture,pos:{x:80,y:45},vel:{x:0,y:0}};
  const choice=select(f);expect(choice).toEqual(f.command);expect(execute(f,choice)).toEqual(execute(f,f.command));
 });
 it('does not use hidden teammate divergence or mutate the supplied picture',()=>{
  const f=fixture(),before=structuredClone(f);expect(select(f,0)).toEqual(select(f,500));expect(f).toEqual(before);
 });
 it('retains the existing contact controller when the runner feels a constraint',()=>{
  const f=fixture();expect(select(f,0,true)).toEqual(select(f,0,true,false));
 });
});
