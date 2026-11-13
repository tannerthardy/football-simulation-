import {vi,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {alignOffense} from '../src/playbook/alignment.js';
import {liveAim} from '../src/sim/behaviors/carrier.js';
import {gapIn,linePicture} from '../src/sim/live-gaps.js';
import type {Agent} from '../src/sim/agent.js';
import type {PlaySim} from '../src/sim/playsim.js';
// Recorded on the installed line; OL_SPLITS and OL_STAGGER stage a different play.
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; });

const fixture=JSON.parse(readFileSync(new URL('./fixtures/p033-gap-decision.json',import.meta.url),'utf8'));
function scene(at:number,mirror=false){
 const d=fixture.decisions.find((x:any)=>x.t===at),center=fixture.ballY;
 const reflect=(y:number)=>mirror?2*center-y:y;
 const offense=fixture.actors.filter((a:any)=>a.team==='O').map((a:any)=>({...a})) as Agent[];
 const offAlign=alignOffense(fixture.call.formation,fixture.call.flip,fixture.los,center);
 if(mirror)for(const spot of Object.values(offAlign.spots))if(spot)spot.pos.y=reflect(spot.pos.y);
 // The recorded defenders too: whether a body is seen on a defender is part of RB's own picture.
 const defense=fixture.actors.filter((a:any)=>a.team==='D'&&d.pictures[a.idx]).map((a:any)=>({...a})) as Agent[];
 const sim={t:at,offense,offAlign,ballY:center,attackDir:()=>1,
  opponents:(a:Agent)=>a.team==='O'?defense:offense,
  see:(_a:Agent,b:Agent)=>{const p=structuredClone(d.pictures[b.idx]);p.pos.y=reflect(p.pos.y);if(mirror)p.vel.y*=-1;return p;},
 } as unknown as PlaySim;
 return{sim,rb:offense.find(a=>a.slot==='RB')!,d,side:mirror?-1:1,
  guard:reflect(d.pictures[4].pos.y),tackle:reflect(d.pictures[1].pos.y)};
}
describe('a center climbing cannot renumber the acquired run gap',()=>{
 it('keeps the original B landmark before departure (opposing control)',()=>{
  const s=scene(2);
  expect(gapIn(linePicture(s.sim,s.rb),'B',s.side)).toBeCloseTo(s.d.aim.preferred,12);
  expect(liveAim(s.rb,s.sim,s.d.behavior.opts)!.y).toBeCloseTo(s.d.aim.preferred,12);
 });
 it.each([false,true])('keeps B between the same guard and tackle after C leaves, mirror %s',mirror=>{
  const s=scene(2.2,mirror),p=linePicture(s.sim,s.rb);
  expect(p.departed.some(b=>b.agent.slot==='C')).toBe(true);
  expect(gapIn(p,'B',s.side)).toBeCloseTo((s.guard+s.tackle)/2,12);
  if(!mirror){
   expect(liveAim(s.rb,s.sim,s.d.behavior.opts)!.y).toBeCloseTo(31.652923811167536,12);
   // Recorded old B is exactly the A landmark after inserting a phantom
   // center at outward index zero. This is a named-gap error, not lost sight.
   expect(gapIn(p,'A',s.side)).toBeCloseTo(s.d.aim.preferred,12);
  }
 });
});
