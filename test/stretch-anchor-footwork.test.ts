import {afterEach,describe,expect,it,vi} from 'vitest';
import {contactFixture} from '../scripts/diag/run-contact-technique.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import type {Intent} from '../src/physics/world.js';

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});

async function command(side:number,anchor:boolean,stretch=true){
 vi.stubEnv('RUN_ANCHOR',anchor?'1':'0');
 vi.stubEnv('ANCHOR_SPLIT','1');vi.stubEnv('STRETCH_REACH','1');vi.resetModules();
 const {updateEngagements}=await import('../src/sim/engagement.js');
 const {runContactObservers}=await import('../src/sim/run-contact-observer.js');
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side});
 f.sim.offCall.run=stretch?RUN_BY_ID.wz_strong:RUN_BY_ID.iz_strong;
 f.engagement.surfaceAxis={x:-1,y:0};f.engagement.drive={x:1,y:0};f.engagement.nextMoveAt=Infinity;
 // Declared incoming loaded state; actual execution remains a separate World
 // witness. No future runner route or new opponent information is supplied.
 f.blocker.body.vel={x:-.4,y:side*.8};
 f.blocker.body.support!.felt={x:-1000,y:-side*400};
 const bodies=structuredClone(f.sim.agents.map(a=>a.body)),hands=f.engagement.hands;
 let movement:any;
 runContactObservers.set(f.sim,(_e,phase,data)=>{if(phase==='movement')movement=data;});
 const intents:Intent[]=f.sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
 updateEngagements(f.sim,intents);
 expect(f.sim.agents.map(a=>a.body)).toEqual(bodies);expect(f.engagement.hands).toBe(hands);
 return {command:intents[f.blocker.idx],movement,profile:structuredClone(f.blocker.profile),rng:structuredClone(f.sim.rng),
  hand:{push:hands!.push,hold:hands!.hold,steer:hands!.steer,extension:hands!.extension}};
}

describe('a loaded stretch anchor retains useful shoulder footwork',()=>{
 it.each([-1,1])('adds depth resistance without commanding loss of the existing shoulder work, side=%s',async side=>{
  const free=await command(side,false),anchor=await command(side,true);
  expect(anchor.movement.anchored).toBe(true);expect(free.movement.anchored).toBe(false);
  expect(Math.abs(free.command.vel.y)).toBeGreaterThan(.1);
  expect(anchor.command.vel.y).toBeCloseTo(free.command.vel.y,12);
  expect(anchor.command.vel.x).toBeCloseTo(2.4,12);
  expect(anchor.command.vel.x).toBeGreaterThan(free.command.vel.x);
  expect(anchor.command.push).toBe(free.command.push);expect(anchor.command.posture).toBe(free.command.posture);
  expect(anchor.profile).toEqual(free.profile);expect(anchor.hand).toEqual(free.hand);expect(anchor.rng).toEqual(free.rng);
 });
 it('preserves the ordinary vertical-block anchor response',async()=>{
  const drive=await command(1,true,false);
  expect(drive.movement.anchored).toBe(true);expect(drive.command.vel.x).toBeCloseTo(2.4,12);
  expect(drive.command.vel.y).toBeCloseTo(drive.movement.lat.y*drive.movement.lateral*.3,12);
 });
});
