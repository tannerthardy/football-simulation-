import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { enduranceFactor, fatigueFactor } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import type { Agent } from '../src/sim/agent.js';
import { spaceTeammates } from '../src/sim/spacing.js';

const fixtures=JSON.parse(readFileSync(new URL('./fixtures/joint-spacing.json',import.meta.url),'utf8'));
function stage(f:any){
 const body=structuredClone(f.body);
 const a={idx:f.idx,team:'O',behavior:{kind:'run-block'},body,profile:body.profile,
  get pos(){return body.pos;},get vel(){return body.vel;},
  get speedScale(){return fatigueFactor(body.energy)*enduranceFactor(body)*(1-.08*(body.squeeze??0));},
  isDown:()=>false} as Agent;
 const peers=f.peers.map((p:any)=>({idx:p.idx,team:'O',profile:p.profile,
  get pos(){throw Error('Private peer position');},get vel(){throw Error('Private peer velocity');}} as Agent));
 const commands:Intent[]=[structuredClone(f.raw),...peers.map(()=>({free:true,vel:{x:0,y:0}}))];
 return {a,peers,commands,run:()=>spaceTeammates([a,...peers],commands,(_a,b)=>f.peers.find((p:any)=>p.idx===b.idx).seen,{now:f.t})};
}

describe('neighboring teammate closing limits',()=>{
 it.each(fixtures)('retains every admitted limit at $caseId/$t without reading private motion',f=>{
  const s=stage(f),before=structuredClone(s.a.body);s.run();const command=s.commands[0];
  expect(f.limits.some((c:any)=>f.ordinary.vel.x*c.nx+f.ordinary.vel.y*c.ny>c.limit+1e-7)).toBe(true);
  for(const c of f.limits)expect(command.vel.x*c.nx+command.vel.y*c.ny).toBeLessThanOrEqual(c.limit+1e-8);
  expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThanOrEqual(s.a.profile.vmax*s.a.speedScale+1e-8);
  expect({...command,vel:undefined}).toEqual({...f.raw,vel:undefined});
  expect(s.a.body).toEqual(before);
 });
 it('keeps the ordinary response when moving peers make the limits inconsistent',()=>{
  const f=structuredClone(fixtures[0]);f.body.pos={x:0,y:0};f.body.vel={x:0,y:0};f.body.support=newSupport();
  f.body.profile.radius=.3;f.raw={vel:{x:0,y:0}};
  f.peers=f.peers.slice(0,2).map((p:any,i:number)=>({...p,profile:{...p.profile,radius:.3},
   seen:{pos:{x:i===0?.5:-.5,y:0},vel:{x:i===0?-1:1,y:0},age:0}}));
  const s=stage(f);s.run();expect(s.commands[0].vel).toEqual({x:1,y:0});
 });
 it('does not add a restriction to a clear route or alter a single-peer gather',()=>{
  const f=structuredClone(fixtures[0]);f.body.pos={x:0,y:0};f.body.vel={x:0,y:0};f.body.support=newSupport();
  f.raw={vel:{x:2,y:0}};f.peers=f.peers.slice(0,1);
  f.peers[0].seen={pos:{x:10,y:0},vel:{x:0,y:0},age:0};
  let s=stage(f);s.run();expect(s.commands[0]).toEqual(f.raw);
  f.peers[0].seen.pos={x:.3,y:0};s=stage(f);s.run();expect(s.commands[0].vel).toEqual({x:0,y:0});
 });
});
