import {describe,expect,it} from 'vitest';
import {PlaySim} from '../src/sim/playsim.js';
import {RunBlocker,playSideSign} from '../src/sim/behaviors/blocking.js';
import {nativeTraceSetup} from '../scripts/diag/command-trace.js';
import {inBlockReach} from '../src/sim/engagement.js';

// Opposing control to wrap-path (S7-P022), from Integration's #390 hold
// (input sha f9c36745…): a lead already square to, and inside native strike
// reach of, an inside filler ahead of the runner he sees keeps that man and
// takes him, even though the filler sits more than a yard behind his lateral
// flow. The passed-man rule is for obsolete chasers, not live work.
describe('lead keeps a reachable filler behind his flow',()=>{
 it.each([false,true])('takes LB_M in strike reach, flip %s',flip=>{
  const sim=new PlaySim(structuredClone(nativeTraceSetup({coverage:'cover3_buzz',concept:'counter',seed:1,roster:7,formation:'ace_11',flip})));
  const a=sim.slot('RT')!,d=sim.slot('LB_M')!,runner=sim.slot('RB')!;
  const side=playSideSign(sim,sim.offCall.run!);
  for(const body of sim.agents){body.body.pos={x:80+body.idx*2,y:3};body.body.vel={x:0,y:0};
   body.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})} as any;(body as any).snapReadyAt=0;}
  a.body.pos={x:42,y:sim.ballY+side*3};
  d.body.pos={x:42.2,y:a.pos.y-side*1.05};d.body.vel={x:-1,y:0};
  runner.body.pos={x:40,y:d.pos.y};runner.body.vel={x:2,y:0};
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
  expect(inBlockReach(a,d,'run')).toBe(true);
  work.update(a,sim);
  expect(work.target).toBe(d);
  expect(a.engagement?.defender).toBe(d);
 });
});
