import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';

const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/second-level-access.json.gz',import.meta.url))).toString()) as
 {rows:Array<{id:string;setup:PlaySetup}>};
function stage(id:string,t:number){
 const sim=new PlaySim(structuredClone(inputs.rows.find(r=>r.id===id)!.setup));
 while(sim.phase==='live'&&sim.t<t-1e-9)sim.tick();
 const rt=sim.slot('RT')!,controller=rt.behavior as RunBlocker;
 expect(controller.plan.kind).toBe('climb');expect(controller.plan.departure).toBeDefined();
 expect(rt.engagement).toBeNull();expect(controller.target).toBe(sim.slot('LB_M'));
 return {sim,rt,controller};
}
describe('an earned departure hands off to the attainable near second-level surface',()=>{
 it('does not require walking through the linebacker center beyond first strike',()=>{
  const {sim,rt,controller}=stage('A018',2.4),keeper=sim.slot('RG')!;
  const hands=keeper.engagement!.hands;
  const interceptor=vi.spyOn(controller as unknown as {plannedClimb:(...args:unknown[])=>unknown},'plannedClimb');
  const update=controller.update;
  const decision=vi.spyOn(controller,'update').mockImplementation((a,s)=>{
   const bodies=s.agents.map(a=>structuredClone(a.body)),rng=JSON.stringify(s.rng);
   const request=update.call(controller,a,s);
   expect(s.agents.map(a=>a.body)).toEqual(bodies);expect(JSON.stringify(s.rng)).toBe(rng);
   return request;
  });
  // Tick supplies the normal new perception frame and mind/read cadence.
  // Calling update directly here would consume the previous tick's picture.
  sim.tick();
  expect(controller.plan.departure).toBeUndefined();
  expect(interceptor).toHaveBeenCalledOnce();
  expect(keeper.engagement!.hands).toBe(hands);expect(sim.world.joints).toContain(hands);
  expect(sim.events.find(e=>e.type==='block_climb'&&e.a===rt.idx)?.t).toBe(.8);
  interceptor.mockRestore();decision.mockRestore();
 });
 it('retains the departure when the keeper obstructs the approach before first strike',()=>{
  const {sim,rt,controller}=stage('A030',2.35);
  const interceptor=vi.spyOn(controller as unknown as {plannedClimb:(...args:unknown[])=>unknown},'plannedClimb');
  sim.tick();
  expect(controller.plan.departure).toBeDefined();expect(interceptor).not.toHaveBeenCalled();
  expect(controller.target).toBe(sim.slot('LB_M'));expect(rt.engagement).toBeNull();
  interceptor.mockRestore();
 });
});
