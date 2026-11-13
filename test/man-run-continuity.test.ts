import {describe,expect,it,beforeAll,afterAll,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {ManCoverage,playBall,runFit,sawThrow} from '../src/sim/behaviors/defense.js';
import {showsBlock} from '../src/sim/coverage-cues.js';
import {ReleaseReader} from '../src/sim/coverage/reads.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';

// These panels record the blocking-admission contract of a man marker
// on a perimeter receiver; PASS_FIRST (on) keeps such a marker on his man
// until the ball crosses. Pin it off so the admission machinery is tested.
beforeAll(() => { vi.stubEnv('PASS_FIRST', '0'); });
afterAll(() => { vi.unstubAllEnvs(); });

/** Synthetic controller boundary, not a reconstructed whole-play checkpoint. */
function stage(side=1){
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(71),'O','MO'),'11'),
  defense:pickDefense(generateTeam(new Rng(72),'D','MD'),'base43'),
  offCall:{formation:FORMATION_BY_ID.ace_11,flip:side<0,kind:'pass',pass:PASS_BY_ID.pa_post_dig,label:'PA control'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover1_off,pressure:null,label:'Man'},
  los:40,ballY:26,firstDownX:50,seed:5});
 const a=sim.slot('CB_S')!,r=sim.slot('Z')!;
 a.body.pos={x:46,y:26+side*10};a.body.vel={x:0,y:0};a.body.facing=Math.PI;
 a.runFit={gap:'D',side,kind:'alley',technique:'attack',edge:'box',pace:'stack'};a.recog!.read='run';
 sim.t=.8;
 let cue:Perceived={pos:{x:41,y:a.pos.y-side*.5},vel:{x:4,y:side*.2},facing:0,stance:'low',pose:'up',carrying:false,age:.25};
 const far:Perceived={pos:{x:70,y:50},vel:{x:0,y:0},facing:0,stance:'high',pose:'up',carrying:false,age:.25};
 let qbCue:Perceived={...far,pos:{x:36,y:26},carrying:true};
 let backCue:Perceived={...far,pos:{x:36,y:25}};
 sim.see=(_observer,target)=>structuredClone(target===r?cue:target===sim.qb?qbCue:target===sim.slot('RB')?backCue:far);
 const man=new ManCoverage(a,sim,r,false,'D',side,{initialPosition:cue.pos});a.behavior=man;
 return{sim,a,r,man,cue:()=>cue,set:(delta:Partial<Perceived>)=>{cue={...cue,...delta};},
  setBack:(delta:Partial<Perceived>)=>{backCue={...backCue,...delta};},setQB:(delta:Partial<Perceived>)=>{qbCue={...qbCue,...delta};},
  backfield:()=>({backfield:{back:sim.slot('RB')!,backCue,qbCue}}),update:()=>man.update(a,sim)};
}
function accept(f:ReturnType<typeof stage>){expect(showsBlock(f.a,f.sim,f.r,f.cue())).toBe(true);f.update();f.sim.t=1.2;}
function flight(f:ReturnType<typeof stage>,recognized=false){
 const release=recognized?.01:f.sim.t;f.sim.throwAt=release;
 f.sim.ball={kind:'air',flight:{pos:{x:44,y:f.a.pos.y,z:2},vel:{x:20,y:0,z:-1},drag:0},thrower:f.sim.qb,target:f.r,
  releaseT:release,releaseX:36,intended:{x:46,y:f.a.pos.y,z:1.2},arrivalT:f.sim.t+.1,deflected:false,throwaway:false}; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
 f.sim.ballPath=[{t:f.sim.t+.1,x:f.a.pos.x-.2,y:f.a.pos.y,z:1.2}];
}

describe('a man marker distinguishes blocking admission from continued evidence',()=>{
 it.each([-1,1])('keeps an accepted support duty while the same low-pad picture crosses LOS+2, side %s',side=>{
  const f=stage(side),expected=stage(side);accept(f);accept(expected);
  for(const x of [42.1,43.4,45]){
   for(const s of[f,expected])s.set({pos:{x,y:s.cue().pos.y}});
   expect(showsBlock(f.a,f.sim,f.r,f.cue())).toBe(false);
   expect(f.update()).toEqual(runFit(expected.a,expected.sim,'D',side));
   f.sim.t+=.25;expected.sim.t+=.25;
  }
 });
 it.each(['low','high'] as const)('does not initially spend man duty on a deep %s-pad picture',stance=>{
  const f=stage();f.set({pos:{x:43.5,y:f.cue().pos.y},stance});
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
 });
 it('keeps the original shallow policy when no installed backfield picture can support continuation',()=>{
  const f=stage();f.sim.offAlign.spots.RB.backfield=false;accept(f);
  f.set({pos:{x:43.4,y:f.cue().pos.y}});
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
 });
 it('retains acquired reachable facing-contact evidence beyond the shallow admission area',()=>{
  const f=stage(),expected=stage();accept(f);accept(expected);
  for(const s of[f,expected])s.set({pos:{x:45.3,y:s.a.pos.y},vel:{x:0,y:0},stance:'high'});
  expect(showsBlock(f.a,f.sim,f.r,f.cue())).toBe(false);
  expect(f.update()).toEqual(runFit(expected.a,expected.sim,'D',1));
 });
 it.each([{x:6,y:0},{x:0,y:5},{x:0,y:-5}])('restores a newly acquired upright release while it is still in front of the defender: %j',vel=>{
  const f=stage();accept(f);f.set({pos:{x:43.4,y:f.cue().pos.y},vel,stance:'high'});
  expect(f.cue().pos.x).toBeLessThan(f.a.pos.x);
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
  // The same deep low-pad picture cannot re-admit after release erased it.
  f.sim.t+=.25;f.set({stance:'low'});
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
 });
 it.each(['pass','unsure'] as const)('does not retain acceptance after belief becomes %s',read=>{
  const f=stage();accept(f);f.a.recog!.read=read;f.set({pos:{x:43.4,y:f.cue().pos.y}});
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
  f.sim.t+=.25;f.a.recog!.read='run';
  expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));
 });
 it('keeps current acquired blocking through unrecognized flight; recognized reachable ball still wins',()=>{
  const held=stage(),air=stage(),recognized=stage();
  for(const f of[held,air,recognized]){accept(f);f.set({pos:{x:43.4,y:f.cue().pos.y}});}
  flight(air);flight(recognized,true);recognized.a.tags.add('looking');
  expect(sawThrow(air.a,air.sim,air.r)).toBe(false);
  const expected=stage();accept(expected);expected.set({pos:{x:43.4,y:expected.cue().pos.y}});
  expect(held.update()).toEqual(runFit(expected.a,expected.sim,'D',1));
  expect(air.update()).toEqual(held.update());
  expect(sawThrow(recognized.a,recognized.sim,recognized.r)).toBe(true);
  expect(recognized.update()).toEqual(playBall(recognized.a,recognized.sim,recognized.r));
  expect(recognized.a.tags.has('onBall')).toBe(true);
 });
 it('does not learn hidden receiver motion, call intent or release timing as reality snapshots advance',()=>{
  const reference=stage(),hidden=stage();accept(reference);accept(hidden);
  for(const f of[reference,hidden])f.set({pos:{x:43.4,y:f.cue().pos.y}});
  for(let k=0;k<4;k++){
   hidden.r.body.pos={x:85+k,y:3};hidden.r.body.vel={x:-8,y:7};hidden.r.stance='high';hidden.sim.throwAt=.1;
   hidden.sim.offCall.pass=PASS_BY_ID.four_verts;
   reference.sim.perception.record(reference.sim.agents);hidden.sim.perception.record(hidden.sim.agents);
   const before=structuredClone(hidden.sim.perception);
   for(let j=0;j<3;j++)expect(hidden.update()).toEqual(reference.update());
   expect(hidden.sim.perception).toEqual(before);expect(hidden.sim.rng).toEqual(reference.sim.rng);
   reference.sim.t+=.05;hidden.sim.t+=.05;
  }
  // Only a newly acquired contrary picture ends this instance's support.
  hidden.set({stance:'high'});expect(hidden.update()).toEqual(hidden.man.trackReceiver(hidden.a,hidden.sim));
 });
 it('does not call an upright waiting receiver a blocker merely because time passed',()=>{
  const f=stage();f.set({stance:'high',vel:{x:0,y:0}});
  for(const t of[.8,2,5]){f.sim.t=t;expect(f.update()).toEqual(f.man.trackReceiver(f.a,f.sim));}
 });

 it('keeps acquired runner support independent of hidden holder, exchange flags and unrecognized flight',()=>{
  const held=stage(),hidden=stage(),air=stage();
  for(const f of[held,hidden,air]){
   accept(f);f.set({pos:{x:43.4,y:f.cue().pos.y}});
   f.setQB({carrying:false});f.setBack({pos:{x:41,y:30},vel:{x:3,y:1},carrying:true});
  }
  held.sim.ball={kind:'held',carrier:held.sim.slot('RB')!};
  hidden.sim.ball={kind:'held',carrier:hidden.sim.qb};hidden.sim.scrambled=true;hidden.sim.handoffAt=-1;
  flight(air);
  expect(sawThrow(air.a,air.sim,air.r)).toBe(false);
  expect(hidden.update()).toEqual(held.update());expect(air.update()).toEqual(held.update());
 });

 it('retires the expected back after acquired empty-back / carrying-QB contradiction, even when hidden possession disagrees',()=>{
  const f=stage(),expected=stage();
  for(const s of[f,expected]){
   accept(s);s.set({pos:{x:43.4,y:s.cue().pos.y}});
   s.setQB({pos:{x:39,y:26},carrying:true});s.setBack({pos:{x:43,y:30},carrying:false});
  }
  f.sim.ball={kind:'held',carrier:f.sim.slot('RB')!};expected.sim.scrambled=true;
  expect(f.update()).toEqual(runFit(expected.a,expected.sim,'D',1));
  // A later returning empty back cannot reinstall the retired expectation.
  f.sim.t+=.25;expected.sim.t+=.25;f.setBack({pos:{x:36,y:10}});expected.setBack({pos:{x:36,y:10}});
  expect(f.update()).toEqual(runFit(expected.a,expected.sim,'D',1));
 });

 it.each([[true,true],[null,false],[true,null]] as const)('does not resolve ambiguous backfield possession from hidden truth: QB=%s back=%s',(qb,back)=>{
  const f=stage(),hidden=stage();
  for(const s of[f,hidden]){accept(s);s.set({pos:{x:43.4,y:s.cue().pos.y}});s.setQB({carrying:qb});s.setBack({carrying:back});}
  hidden.sim.ball={kind:'held',carrier:hidden.sim.slot('RB')!};hidden.sim.scrambled=true;hidden.sim.handoffAt=.1;
  expect(hidden.update()).toEqual(f.update());expect(hidden.sim.rng).toEqual(f.sim.rng);
 });

 it('keeps installed-picture force pursuit distinct from an affirmative keyed-runner fit',()=>{
  const pictured=stage(),keyed=stage();
  for(const f of[pictured,keyed]){f.a.runFit!.kind='force';f.setQB({carrying:false});f.setBack({pos:{x:41,y:30},carrying:true});}
  const p=runFit(pictured.a,pictured.sim,'D',1,pictured.backfield());
  const k=runFit(keyed.a,keyed.sim,'D',1,{target:keyed.sim.slot('RB')!,cue:keyed.backfield().backfield.backCue});
  expect(p).not.toEqual(k);expect(p.facing).toBe(Math.PI);
 });
});

describe('release readers retain admitted blocking on the same acquired evidence',()=>{
 function readStage(){
  const f=stage(),reader=new ReleaseReader(f.a,f.sim);
  const read=(t:number)=>{f.sim.t=t;return reader.read(f.sim,f.r)!;};
  read(.6);expect(read(.8).release).toBe('block');
  return{...f,read};
 }
 it('does not turn an accepted low-pad blocker into a vertical just because he crosses LOS+2',()=>{
  const f=readStage();f.set({pos:{x:43.4,y:f.cue().pos.y}});
  for(const t of[1,1.2,1.4,1.6])expect(f.read(t).release).toBe('block');
 });
 it('keeps acquired facing-contact evidence after the blocker has passed the shallow entry area',()=>{
  const f=readStage();f.set({pos:{x:45.3,y:f.a.pos.y},vel:{x:0,y:0},stance:'high'});
  for(const t of[1,1.2,1.4])expect(f.read(t).release).toBe('block');
 });
 it('still requires normal confirmation of an acquired upright release, outward route and wheel',()=>{
  const f=readStage();f.set({pos:{x:43.4,y:f.cue().pos.y},vel:{x:6,y:0},stance:'high'});
  expect(f.read(1).release).toBe('block');expect(f.read(1.2).release).toBe('vertical');
  const out=Math.sign(f.r.pos.y-f.sim.ballY)||1;
  f.set({pos:{x:44,y:f.cue().pos.y},vel:{x:0,y:out*5}});expect(f.read(1.4).release).toBe('vertical');expect(f.read(1.6).release).toBe('out');
  f.set({pos:{x:48,y:f.cue().pos.y+out*2},vel:{x:6,y:0}});
  expect(f.read(1.8).release).toBe('out');expect(f.read(2).release).toBe('vertical');
 });
 it('does not initially classify a deep low-pad route as an accepted blocker',()=>{
  const f=stage(),reader=new ReleaseReader(f.a,f.sim);f.set({pos:{x:43.4,y:f.cue().pos.y}});
  f.sim.t=1;reader.read(f.sim,f.r);f.sim.t=1.2;expect(reader.read(f.sim,f.r)!.release).toBe('vertical');
 });
 it.each(['pass','unsure'] as const)('keeps an upright pressed vertical under the existing %s-read contract',read=>{
  const f=readStage();f.a.recog!.read=read;
  f.set({pos:{x:43.4,y:f.a.pos.y},vel:{x:5,y:0},stance:'high'});
  f.a.body.pos={x:44.1,y:f.a.pos.y};
  expect(f.read(1).release).toBe('block');expect(f.read(1.2).release).toBe('vertical');
 });
});
