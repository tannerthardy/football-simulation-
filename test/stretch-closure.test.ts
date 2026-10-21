import {describe,expect,it} from 'vitest';
import {contactFixture,contactCommands} from '../scripts/diag/run-contact-technique.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {runContactObservers} from '../src/sim/run-contact-observer.js';

/** Same acquired native hands, shifted to a valid lateral fit. This is a
 * controller question, not a requirement that the block win a native play. */
function fit(side:number,dx:number,dy:number){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side});
 f.sim.offCall.run=RUN_BY_ID.wz_strong;
 f.engagement.surfaceAxis={x:-1,y:0};f.engagement.drive={x:1,y:0};
 f.engagement.nextMoveAt=Infinity;
 f.defender.body.pos={x:f.blocker.pos.x+dx,y:f.blocker.pos.y+side*dy};
 f.defender.body.vel={x:0,y:0};f.blocker.body.vel={x:0,y:0};
 f.blocker.body.facing=Math.atan2(side*dy,dx);
 f.blocker.body.support!.felt={x:0,y:0};
 let movement:any;
 runContactObservers.set(f.sim,(_e,phase,data)=>{if(phase==='movement')movement=data;});
 return{...f,read:()=>{const commands=contactCommands(f);return{commands,movement};}};
}

describe('stretch connection footwork closes the actual separation',()=>{
 it.each([-1,1])('does not turn purely lateral separation into an upfield step, mirror=%s',side=>{
  const f=fit(side,0,.85),before=structuredClone(f.sim.agents.map(a=>a.body));
  const{commands,movement}=f.read();
  expect(movement.anchored).toBe(false);
  expect(commands[f.blocker.idx].vel.x).toBeCloseTo(f.defender.vel.x,12);
  expect(f.sim.agents.map(a=>a.body)).toEqual(before);
 });
 it.each([-1,1])('does not increase normal separation after reaching above the defender, mirror=%s',side=>{
  const f=fit(side,-.1,.85),{commands,movement}=f.read();
  expect(movement.anchored).toBe(false);
  const correction=commands[f.blocker.idx].vel.x-f.defender.vel.x;
  expect(correction*(f.defender.pos.x-f.blocker.pos.x)).toBeGreaterThan(0);
 });
 it('retains forward closure on the ordinary aligned contact',()=>{
  const f=fit(1,.9,0),{commands,movement}=f.read();
  expect(movement.anchored).toBe(false);
  const gap=.9-f.blocker.profile.radius-f.defender.profile.radius;
  expect(commands[f.blocker.idx].vel.x).toBeCloseTo(gap*3,12);
 });
 it.each([-1,1])('uses the normal distance to contact without sacrificing the existing lateral offset, mirror=%s',side=>{
  const f=fit(side,.8,.4),{commands,movement}=f.read();
  expect(movement.anchored).toBe(false);
  // Inspect the requested proportional goal, not an assertion that the
  // body instantly executes it: removing its gain must end on the torso
  // clearance circle at this same lateral offset.
  const forwardGoal=commands[f.blocker.idx].vel.x/3;
  const remainingX=f.defender.pos.x-f.blocker.pos.x-forwardGoal;
  const lateral=f.defender.pos.y-f.blocker.pos.y;
  expect(Math.hypot(remainingX,lateral)).toBeCloseTo(f.blocker.profile.radius+f.defender.profile.radius,12);
 });
});
