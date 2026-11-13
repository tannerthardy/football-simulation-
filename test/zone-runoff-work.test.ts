import {afterEach,describe,expect,it,vi} from 'vitest';
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.ARM_PRESS = '0'; });
import {contactFixture} from '../scripts/diag/run-contact-technique.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {updateEngagements} from '../src/sim/engagement.js';
import {supportParams} from '../src/physics/support.js';

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
function fixture(side:1|-1,phase:'reach'|'runoff'|'seal'='runoff'){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side});
 const {blocker:b,defender:d,engagement:e,sim}=f;
 sim.offCall.run={...sim.offCall.run!,scheme:'outsideZone',
  direction:sim.offAlign.strongSign===side?'strong':'weak'};
 const sep=b.profile.radius+d.profile.radius;
 d.body.pos={x:b.pos.x+sep,y:b.pos.y+side*Math.sin(.3*Math.PI/2)*sep};
 d.body.vel={x:0,y:0};e.surfaceAxis={x:-1,y:0};e.sealTarget=-side*.3;
 const drive={x:.6726727939963124,y:side*.7399400733959437};e.drive={...drive};
 const behavior=new RunBlocker({kind:'reach',target:d,drive:{...drive}});b.behavior=behavior;
 // A personally acquired runoff interpretation held across a newly stopping
 // defender. Keep its existing .2s decision beat and acquired drive together.
 behavior.zoneRead={phase,target:d.idx,side,t:.9,nextRead:1.1,
  drive,sealTarget:e.sealTarget,aim:{x:d.pos.x-.3,y:d.pos.y-side*.6},
  horizon:.2,neededTravel:.5,availableTravel:.1,
  seen:{pos:{...d.pos},vel:{x:0,y:side*2},age:.2,carrying:null,stance:null,facing:Math.PI,pose:'up'}};
 e.nextMoveAt=Infinity;
 for(let k=0;k<24;k++)sim.perception.record(sim.agents);
 return {...f,behavior};
}
function commands(f:ReturnType<typeof fixture>){
 const intents=f.sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
 updateEngagements(f.sim,intents);return intents;
}
describe('acquired stretch runoff work survives the contact handoff',()=>{
 it.each([-1,1] as const)('retains selected lateral work within existing contact and body limits, side=%s',side=>{
  const f=fixture(side),before=structuredClone(f.blocker.body),intents=commands(f);
  expect(intents[f.blocker.idx].vel.y*side).toBeGreaterThan(1.5);
  expect(f.blocker.body).toEqual(before);
  const report=f.sim.world.step(intents,f.sim.dt);
  expect(f.blocker.vel.y*side).toBeGreaterThan(before.vel.y*side);
  expect(Math.hypot(report.groundImpulse[f.blocker.idx].x,report.groundImpulse[f.blocker.idx].y))
   .toBeLessThanOrEqual(supportParams(f.blocker.profile).traction*f.sim.dt+1e-8);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
 });
 it.each(['reach','seal'] as const)('does not turn held %s work into runoff transport',phase=>{
  const f=fixture(1,phase),intent=commands(f)[f.blocker.idx];
  expect(Math.abs(intent.vel.y)).toBeLessThan(1e-8);
 });
 it('ends the contribution when the next acquired read changes technique',()=>{
  const f=fixture(1);
  expect(commands(f)[f.blocker.idx].vel.y).toBeGreaterThan(1.5);
  f.behavior.zoneRead!.phase='seal';
  expect(Math.abs(commands(f)[f.blocker.idx].vel.y)).toBeLessThan(1e-8);
 });
 it('does not carry a departed target or another job into contact',()=>{
  for(const change of ['target','role'] as const){
   const f=fixture(1);
   if(change==='target')f.behavior.plan.target=f.sim.slot('DE_S')!;
   else f.behavior.plan.kind='down';
   expect(Math.abs(commands(f)[f.blocker.idx].vel.y)).toBeLessThan(1e-8);
  }
 });
 it('keeps the legacy drive-plus-tangent comparison separate',async()=>{
  vi.stubEnv('RUN_CONTACT_COMPONENTS','0');vi.resetModules();
  const {updateEngagements:legacyUpdate}=await import('../src/sim/engagement.js');
  const run=(phase:'reach'|'runoff')=>{
   const f=fixture(1,phase),intents=f.sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
   legacyUpdate(f.sim,intents);return intents[f.blocker.idx];
  };
  expect(run('runoff')).toEqual(run('reach'));
 });
});
