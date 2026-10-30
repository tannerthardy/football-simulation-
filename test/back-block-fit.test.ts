import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {RunBlocker,playSideSign} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// Counter's center blocks back for the pulled guard. Tracked centers stay
// flat, half a yard in front of the backside tackle and on his play-side hip,
// and hold him at the line (ctrback.py, 2022 counters: tackle +0.18 yd at 1.5 s,
// center +0.45 yd to his play side). Fitting the tackle's seen spot instead,
// the center met him beside his track and he ran past into the backfield.
// Recorded snap S13-P082 (Gun Doubles counter): develop's tackle is behind the
// line at 1.5 s on all five restage streams (-0.04 to -0.42 yd); fitting his
// path to the ball, +0.21 to +0.71.
const saved=JSON.parse(readFileSync(new URL('./fixtures/counter-back-block-s13-p082.json',import.meta.url),'utf8'));

function at15() {
 const sim=new PlaySim(restoreSetup(Buffer.from(saved.setup,'base64')));
 const c=sim.slot('C')!,block=c.behavior as RunBlocker;
 expect(block.plan.kind).toBe('down');
 const d=block.plan.target!,tick=sim.tick.bind(sim);
 let seen:{c:{x:number;y:number};d:{x:number;y:number}}|null=null;
 sim.tick=()=>{tick();if(!seen&&sim.t>=1.5-1e-9)seen={c:{...c.pos},d:{...d.pos}};};
 sim.run();
 const ps=playSideSign(sim,sim.offCall.run!);
 return {sim,seen:seen!,ps};
}

describe('counter back block, recorded S13-P082',()=>{
 it('holds the backside tackle at the line, from his play-side hip',()=>{
  const {sim,seen,ps}=at15(),los=sim.los,dir=sim.attackDir('O');
  expect((seen.d.x-los)*dir).toBeGreaterThan(.1);
  expect((seen.c.y-seen.d.y)*ps).toBeGreaterThan(0);
 });
});
