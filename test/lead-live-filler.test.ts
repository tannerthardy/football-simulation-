import {describe,expect,it} from 'vitest';
import {PlaySim} from '../src/sim/playsim.js';
import {RunBlocker,playSideSign} from '../src/sim/behaviors/blocking.js';
import {nativeTraceSetup} from '../scripts/diag/command-trace.js';
import {inBlockReach} from '../src/sim/engagement.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';

// Opposing controls to wrap-path (S7-P022), from Integration's #390 holds.
// A man more than a yard behind the wrapper's lateral flow is an obsolete
// chaser unless he is still live work: inside strike reach, or a filler ahead
// of the runner the wrapper sees, the two closing on each other, within a step.
type Scene={lateral:number;defVel:{x:number;y:number};runnerX:number;runnerVel:{x:number;y:number}};
function scene(flip:boolean,s:Scene){
 const sim=new PlaySim(structuredClone(nativeTraceSetup({coverage:'cover3_buzz',concept:'counter',seed:1,roster:7,formation:'ace_11',flip})));
 const a=sim.slot('RT')!,d=sim.slot('LB_M')!,runner=sim.slot('RB')!;
 const side=playSideSign(sim,sim.offCall.run!);
 for(const body of sim.agents){body.body.pos={x:80+body.idx*2,y:3};body.body.vel={x:0,y:0};
  body.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})} as any;(body as any).snapReadyAt=0;}
 a.body.pos={x:42,y:sim.ballY+side*3};
 d.body.pos={x:42.2,y:a.pos.y-side*s.lateral};d.body.vel={...s.defVel};
 runner.body.pos={x:s.runnerX,y:d.pos.y};runner.body.vel={...s.runnerVel};
 (sim as any).ball={kind:'held',carrier:runner};
 a.body.facing=Math.atan2(d.pos.y-a.pos.y,d.pos.x-a.pos.x);
 d.body.facing=Math.atan2(a.pos.y-d.pos.y,a.pos.x-d.pos.x);
 const plan:any={kind:'pull',pullRole:'lead',target:d,drive:{x:1,y:0},
  pullPath:[{x:40,y:sim.ballY},{x:41,y:a.pos.y},{x:42.5,y:a.pos.y}]};
 const work=new RunBlocker(plan);a.behavior=work;
 Reflect.set(work,'pullIdx',plan.pullPath.length);Reflect.set(work,'pullCleared',true);
 Reflect.set(work,'nextRuleRead',Infinity);Reflect.set(work,'nextThreatRead',Infinity);
 sim.t=2;(sim as any).world.time=2;
 for(let k=0;k<24;k++)(sim as any).perception.record(sim.agents,runner.idx);
 const strike=a.profile.radius+d.profile.radius+.1+a.player.measurables.armIn/36*.45;
 return {sim,a,d,work,strike};
}

describe('lead keeps live filler work behind his flow',()=>{
 // Input sha f9c36745…: filler closing on the runner, already in strike reach.
 it.each([false,true])('takes LB_M in strike reach, flip %s',flip=>{
  const {sim,a,d,work}=scene(flip,{lateral:1.05,defVel:{x:-1,y:0},runnerX:40,runnerVel:{x:2,y:0}});
  expect(inBlockReach(a,d,'run')).toBe(true);
  work.update(a,sim);
  expect(work.target).toBe(d);
  expect(a.engagement?.defender).toBe(d);
 });

 // Input sha 0d7756ee…: a planted filler outside strike but within a step,
 // ahead of a runner coming at him. The runner closes the gap, not the man:
 // closing is judged on their relative motion. He stays the wrapper's man and
 // the request is an approach the body can make into strike.
 it.each([false,true])('keeps a stationary filler the runner is closing on, flip %s',flip=>{
  const {sim,a,d,work,strike}=scene(flip,{lateral:1.5,defVel:{x:0,y:0},runnerX:40,runnerVel:{x:2,y:0}});
  const gap=Math.hypot(a.pos.x-d.pos.x,a.pos.y-d.pos.y);
  expect(gap).toBeGreaterThan(strike);expect(gap).toBeLessThan(strike+1);
  const command=work.update(a,sim);
  expect(work.target).toBe(d);
  const v=command.vel,ux=(d.pos.x-a.pos.x)/gap,uy=(d.pos.y-a.pos.y)/gap;
  expect(v.x*ux+v.y*uy).toBeGreaterThan(0);
  const path=previewFreeMovement(structuredClone(a.body),command,sim.t,20);
  expect(path.some(p=>Math.hypot(p.pos.x-d.pos.x,p.pos.y-d.pos.y)<=strike)).toBe(true);
  expect(path.every(p=>p.support==='up')).toBe(true);
 });

 // Obsolete chasers stay dropped: the same planted man once the runner has
 // already passed him, and a man ahead of the runner who is leaving him faster
 // than the runner comes on.
 it.each([false,true])('drops a passed or departing man behind his flow, flip %s',flip=>{
  for(const s of [{lateral:1.5,defVel:{x:0,y:0},runnerX:43,runnerVel:{x:2,y:0}},
   {lateral:1.5,defVel:{x:3,y:0},runnerX:40,runnerVel:{x:2,y:0}}]){
   const {sim,a,d,work}=scene(flip,s);
   work.update(a,sim);
   expect(work.target).not.toBe(d);
  }
 });
});
