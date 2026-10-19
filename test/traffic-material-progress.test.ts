import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it} from 'vitest';
import type {Body} from '../src/physics/kinematics.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';
import type {Intent} from '../src/physics/world.js';
import {Agent} from '../src/sim/agent.js';
import {withMovementObjective} from '../src/sim/movement-objective.js';
import {spaceTeammates} from '../src/sim/spacing.js';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-material-progress.json.gz',import.meta.url))).toString());
function replay(name:string,goal=true,clear=false){
 const entry=fixture.cases.find((c:any)=>c.case===name),first=entry.rows[0],initial=entry.actor;
 const a=new Agent(initial.idx,'D',initial.slot,initial.player,first.body.profile,structuredClone(first.body),
  {kind:initial.behavior,update(){throw Error('No new football decision');}});
 const outputs=(entry.rows as any[]).map(row=>{
  Object.assign(a.body,structuredClone(row.body));
  const pictures=new Map<number,any>();
  const peers=(row.peers as any[]).map(p=>{
   const seen=structuredClone(p.seen);if(clear)seen.pos.x+=30;pictures.set(p.idx,seen);
   return {idx:p.idx,team:'D',profile:p.profile,get pos(){throw Error('Hidden peer position');},get vel(){throw Error('Hidden peer velocity');}} as unknown as Agent;
  });
  const command:Intent=row.goal&&goal?withMovementObjective(structuredClone(row.command),row.goal):structuredClone(row.command);
  const intents:Intent[]=[command,...peers.map(()=>({vel:{x:0,y:0},free:true}))];let reads=0;
  spaceTeammates([a,...peers],intents,(_a,p)=>{reads++;return pictures.get(p.idx);},{now:row.t});
  expect(reads).toBe(10);expect(a.body).toEqual(row.body);
  return {row,command:intents[0],pictures};
 });
 return outputs.at(-1)!;
}
function measure(result:ReturnType<typeof replay>){
 const {row,command,pictures}=result,body:Body=structuredClone(row.body),path=previewFreeMovement(body,command,row.t,12),last=path.at(-1)!;
 const speed=Math.hypot(row.command.vel.x,row.command.vel.y),forward={x:row.command.vel.x/speed,y:row.command.vel.y/speed};
 const progress=(last.pos.x-body.pos.x)*forward.x+(last.pos.y-body.pos.y)*forward.y;
 const error=Math.hypot(last.pos.x-row.goal.point.x,last.pos.y-row.goal.point.y);
 const clearance=Math.min(...(row.peers as any[]).map(p=>{
  const seen=pictures.get(p.idx),touch=.9*(body.profile.radius+p.profile.radius);let x=body.pos.x-seen.pos.x,y=body.pos.y-seen.pos.y,best=Math.hypot(x,y)-touch;
  for(const sample of path){const rx=sample.pos.x-seen.pos.x-seen.vel.x*sample.t,ry=sample.pos.y-seen.pos.y-seen.vel.y*sample.t,dx=rx-x,dy=ry-y,u=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x+u*dx,y+u*dy)-touch);x=rx;y=ry;}return best;
 }));
 return {progress,error,clearance,upright:path.every(p=>p.support==='up')};
}
describe('safe traffic steps require useful achieved progress',()=>{
 it('retains an already clear moving gather instead of a millimetre-scale waypoint gain',()=>{
  const original=replay('TOSS',false),chosen=replay('TOSS'),old=measure(original),next=measure(chosen);
  expect(old.clearance).toBeGreaterThan(0);
  expect(chosen.command.vel).toEqual(original.command.vel);
  expect(next.progress).toBe(old.progress);expect(next.clearance).toBe(old.clearance);
 });
 it('preserves the meaningful, informed moving step around the same acquired teammate',()=>{
  const original=replay('DUO',false),chosen=replay('DUO'),old=measure(original),next=measure(chosen);
  expect(chosen.command.vel).toEqual(chosen.row.nativeFinal.vel);
  expect(next.progress-old.progress).toBeGreaterThan(.05);
  expect(next.error).toBeLessThan(old.error);expect(next.clearance).toBeGreaterThan(0);expect(next.upright).toBe(true);
 });
 it('preserves an ordinary clear request that already achieves substantial progress',()=>{
  const chosen=replay('TOSS',true,true),next=measure(chosen);
  expect(chosen.command.vel).toEqual(chosen.row.command.vel);
  expect(next.progress).toBeGreaterThan(2);expect(next.clearance).toBeGreaterThan(0);expect(next.upright).toBe(true);
 });
});
