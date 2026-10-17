import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RunBlocker,planRunBlocking} from '../src/sim/behaviors/blocking.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import type {Perceived} from '../src/sim/perception.js';
const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());
function stage(id:string,mirror=false){
 const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id===id).setup) as PlaySetup);
 if(mirror){
  const reflect=(y:number)=>2*sim.ballY-y;
  for(const a of sim.agents){a.body.pos.y=reflect(a.pos.y);a.body.vel.y*=-1;a.body.facing*=-1;}
  for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=reflect(spot.pos.y);
  sim.offAlign.strongSign*=-1;
 }
 return sim;
}
describe('perimeter immediate count and attainable pin surface',()=>{
 it('accounts for every immediate down threat in the saved perimeter installations',()=>{
  for(const row of inputs.rows.filter((r:{id:string})=>['B','P','C'].includes(r.id[0]))){
   const sim=new PlaySim(structuredClone(row.setup) as PlaySetup),plans=planRunBlocking(sim,sim.offCall.run!);
   const down=sim.defense.filter(d=>d.pos.x-sim.los<2&&Math.abs(d.pos.y-sim.ballY)<9);
   for(const d of down)expect([...plans.values()].some(p=>p.target===d),`${row.id}/${d.slot}`).toBe(true);
  }
 });
 it.each([false,true])('accounts for Sam before sending a spare puller to deep support, reflected=%s',mirror=>{
  for(const id of ['B01','P01']){
   const sim=stage(id,mirror),before=structuredClone(sim.agents.map(a=>a.body)),rng=JSON.stringify(sim.rng);
   const plans=planRunBlocking(sim,sim.offCall.run!);
   const force=[...plans.values()].find(p=>p.pullRole==='force')!;
   expect(force.target?.slot).toBe('LB_S');
   const jobs=[...plans.values()].filter(p=>p.kind==='climb'||p.pullRole==='lead'||p.pullRole==='force').map(p=>p.target).filter(Boolean);
   expect(new Set(jobs).size).toBe(jobs.length);
   expect(sim.agents.map(a=>a.body)).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
  }
 });
 it.each([false,true])('uses the outside TE for the crack-toss pin and retains the named crack, reflected=%s',mirror=>{
  const sim=stage('C01',mirror),plans=planRunBlocking(sim,sim.offCall.run!);
  expect(plans.get(sim.slot('Y')!)?.target?.slot).toBe('DT_S');
  expect(plans.get(sim.slot('Y')!)?.kind).toBe('down');
  expect(plans.get(sim.slot('RG')!)?.target?.slot).toBe('LB_S');
  expect(plans.get(sim.slot('Z')!)?.kind).toBe('crack');
  expect(plans.get(sim.slot('Z')!)?.target?.slot).toBe('DE_S');
  expect(plans.get(sim.slot('RT')!)?.target?.slot).toBe('CB_S');
 });
 it('preserves the immediate Under kick and its free backer blocks',()=>{
  const sim=stage('P02'),plans=planRunBlocking(sim,sim.offCall.run!);
  expect(plans.get(sim.slot('RG')!)?.pullRole).toBe('kick');
  expect(plans.get(sim.slot('RG')!)?.target?.slot).toBe('LB_S');
  expect(plans.get(sim.slot('LG')!)?.target?.slot).toBe('LB_M');
  expect(plans.get(sim.slot('LT')!)?.target?.slot).toBe('LB_W');
 });
});
function fitPicture(mirror:boolean,obstructed=false,outside=false,privateContact=false){
 const sim=stage('P01'),a=sim.slot('C')!,controller=a.behavior as RunBlocker;
 controller.update(a,sim); // Ordinary snap initialization supplies observer/route memory.
 const reflect=(y:number)=>mirror?2*sim.ballY-y:y;
 const side=mirror?1:-1;
 if(mirror){
  for(const p of controller.plan.pullPath!)p.y=reflect(p.y);
  controller.plan.drive.y*=-1;sim.offAlign.strongSign*=-1;
 }
 sim.t=1.5;a.body.pos={x:38.8,y:reflect(23)};a.body.vel={x:0,y:side};
 Reflect.set(controller,'pullIdx',1);Object.defineProperty(a.mind,'placementError',{get:()=>0});
 const target=controller.plan.target!;
 if(privateContact)target.engagement={blocker:sim.slot('RG')!,defender:target,helpers:[]} as unknown as NonNullable<typeof target.engagement>;
 const see=sim.see.bind(sim);
 sim.see=(observer,other,scale)=>{
  const seen=see(observer,other,scale);if(observer!==a)return seen;
  const pos=other===target?{x:41,y:reflect(outside?20:23)}
   :obstructed&&other.slot==='Y'?{x:39.8,y:reflect(23.2)}:{x:48,y:reflect(45)};
  return {...seen,pos,vel:{x:0,y:0},pose:'up',age:.25} as Perceived;
 };
 const before=structuredClone(a.body),rng=JSON.stringify(sim.rng);
 const command=controller.update(a,sim);
 expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
 expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
 return command;
}
describe('production force hook fits acquired inside support only through clear space',()=>{
 it.each([false,true])('can fit inside the old corner after actual wall clearance, reflected=%s',mirror=>{
  const command=fitPicture(mirror);expect(command.facing).toBeDefined();expect(command.vel.x).toBeGreaterThan(0);
  expect(fitPicture(mirror,false,false,true)).toEqual(command);
 });
 it.each([false,true])('retains a genuinely obstructed route, reflected=%s',mirror=>{
  expect(fitPicture(mirror,true).facing).toBeUndefined();
 });
 it.each([false,true])('keeps the outside gate for deep support, reflected=%s',mirror=>{
  expect(fitPicture(mirror,false,true).facing).toBeUndefined();
 });
});
