import {afterEach,describe,expect,it,vi} from 'vitest';
import {norm} from '../src/core/vec.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {runContactObservers} from '../src/sim/run-contact-observer.js';
import {contactFixture,contactCommands} from '../scripts/diag/run-contact-technique.js';

afterEach(()=>vi.restoreAllMocks());

/** Actual acquired solo runaway read, real hands and unchanged native body
 * capacities. No future route, native result or phase is prescribed. */
function fixture(side:number){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side});
 const {sim,blocker:b,defender:d,engagement:e}=f;
 sim.offCall.run={...RUN_BY_ID.wz_strong,direction:side===sim.offAlign.strongSign?'strong':'weak'};
 d.body.pos={x:b.pos.x+.6,y:b.pos.y+side*.25};d.body.vel={x:0,y:side*1.5};
 b.body.vel={x:0,y:0};b.body.facing=Math.atan2(side*.25,.6);
 const drive=norm({x:1,y:side*1.1});
 e.drive={...drive};e.surfaceAxis={x:-drive.x,y:-drive.y};e.nextMoveAt=Infinity;
 const behavior=new RunBlocker({kind:'reach',target:d,drive});b.behavior=behavior;
 for(let k=0;k<24;k++)sim.perception.record(sim.agents);
 behavior.update(b,sim);
 expect(behavior.zoneRead?.phase).toBe('runoff');
 let movement:any;
 runContactObservers.set(sim,(_rep,phase,data)=>{if(phase==='movement')movement=structuredClone(data);});
 return {...f,b,d,e,behavior,drive,read:()=>{const commands=contactCommands(f);return{commands,movement};}};
}

describe('an acquired runoff works to displace instead of only staying connected',()=>{
 it.each([-1,1])('uses the ordinary displacement step in the acquired diagonal frame, side=%s',side=>{
  const f=fixture(side),old=fixture(side),before=structuredClone(f.sim.agents.map(a=>a.body));
  Object.assign(old.behavior,{contactFootwork:()=>null});
  const baseline=old.read(),hands=f.e.hands;
  const {commands,movement}=f.read();
  expect(movement.anchored).toBe(false);
  expect(movement.forward).toBe(2.4);
  const v=commands[f.b.idx].vel;
  expect(v.x*f.drive.x+v.y*f.drive.y).toBeCloseTo(2.4,12);
  expect(f.sim.agents.map(a=>a.body)).toEqual(before);
  expect(f.e.hands).toBe(hands);
  expect(movement.forward).toBeGreaterThan(baseline.movement.forward);
  // Ordinary hand calculation can update its settings. The new feet goal
  // must leave those settings equal to the same-state legacy response.
  expect({extension:hands!.extension,push:hands!.push,hold:hands!.hold,steer:hands!.steer})
   .toEqual({extension:old.e.hands!.extension,push:old.e.hands!.push,hold:old.e.hands!.hold,steer:old.e.hands!.steer});
  const report=f.sim.world.step(commands,f.sim.dt);
  old.sim.world.step(baseline.commands,old.sim.dt);
  expect(f.b.vel.y*side).toBeGreaterThan(old.b.vel.y*side);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for(const a of f.sim.agents)expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx]+1e-8);
 });

 it('keeps a genuine lost-depth brace instead of making an extra lateral escape',()=>{
  const f=fixture(-1);
  f.b.body.vel={x:-.4,y:-.7};f.b.body.support!.felt={x:-1000,y:0};
  const {commands,movement}=f.read();
  expect(movement.anchored).toBe(true);
  expect(commands[f.b.idx].vel.x).toBeCloseTo(2.4+movement.lat.x*movement.lateral*.3,12);
  expect(commands[f.b.idx].vel.y).toBeCloseTo(movement.lat.y*movement.lateral*.3,12);
 });

 it('keeps an acquired mode until the existing read, without consulting hidden continuation',()=>{
  const f=fixture(-1),spy=vi.spyOn(f.sim,'see');
  expect(f.behavior.contactFootwork(f.b,f.sim)).toBe('displace');
  f.d.body.vel={x:9,y:8};f.d.downUntil=f.sim.t+10;
  expect(f.behavior.contactFootwork(f.b,f.sim)).toBe('displace');
  expect(spy).not.toHaveBeenCalled();
 });

 it.each(['reach','seal'] as const)('keeps the connection goal for held %s',phase=>{
  const f=fixture(-1);f.behavior.zoneRead!.phase=phase;
  expect(f.behavior.contactFootwork(f.b,f.sim)).toBe('connect');
 });

 it.each(['wrong-target','unreleased-combo','drive','other-joint'] as const)('rejects a stale or unsupported goal: %s',control=>{
  const f=fixture(-1);
  if(control==='wrong-target')f.behavior.zoneRead!.target=999;
  else if(control==='drive')f.behavior.plan.kind='drive';
  else if(control==='unreleased-combo')f.behavior.plan.combination={members:[f.b,f.sim.slot('RG')!],defender:f.d,
   backer:null,released:false,secureSince:-1,nextRead:0,soloKind:'reach'};
  else f.sim.world.joints.push({...f.e.hands!,a:f.b.body,b:f.sim.slot('RG')!.body});
  expect(f.behavior.contactFootwork(f.b,f.sim)).toBeNull();
 });
});
