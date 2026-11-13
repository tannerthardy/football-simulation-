import {afterEach,describe,expect,it,vi} from 'vitest';
import {contactCommands,contactFixture} from '../scripts/diag/run-contact-technique.js';
import {CENTER_Y} from '../src/core/field.js';
import type {Agent} from '../src/sim/agent.js';
import type {Perceived} from '../src/sim/perception.js';
import type {RunFitJob} from '../src/sim/run-fits.js';
import {runContactObservers} from '../src/sim/run-contact-observer.js';
function stage(side=1,kind:RunFitJob['kind']='interior',technique:RunFitJob['technique']='attack'){
 const f=contactFixture({type:'run',runBlock:60,passBlock:60,side,seed:11});
 f.engagement.surfaceAxis={x:-1,y:0};f.engagement.drive={x:1,y:0};f.engagement.sealTarget=0;f.engagement.nextMoveAt=Infinity;
 f.defender.runFit={gap:'B',side,kind,technique,edge:'box',pace:'stack'};f.defender.recog!.read='run';
 const warm=f.sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));f.sim.world.step(warm,f.sim.dt);f.sim.t=f.sim.world.time=1.5;
 const back=f.sim.slot('RB')!;f.sim.ball={kind:'held',carrier:back};f.sim.handoffAt=.5;
 const qbCue:Perceived={pos:{x:39,y:CENTER_Y},vel:{x:0,y:0},facing:0,pose:'up',stance:null,carrying:false,age:.25};
 const backCue:Perceived={pos:{x:35,y:CENTER_Y+side*6},vel:{x:2,y:side*3},facing:0,pose:'up',stance:null,carrying:true,age:.25};
 const blockerCue:Perceived={pos:{...f.blocker.pos},vel:{x:0,y:0},facing:f.blocker.facing,pose:'up',stance:'low',age:.25};
 const pictures=new Map<Agent,Perceived>([[back,backCue],[f.sim.qb,qbCue],[f.blocker,blockerCue]]),see=f.sim.see.bind(f.sim);
 vi.spyOn(f.sim,'see').mockImplementation((observer,target,...rest)=>observer===f.defender&&pictures.has(target)?structuredClone(pictures.get(target)!):see(observer,target,...rest));
 return{...f,side,back,backCue,qbCue,blockerCue,pictures};
}
type Scene=ReturnType<typeof stage>;
const cmd=(f:Scene)=>contactCommands(f)[f.defender.idx];
const next=(f:Scene)=>{f.sim.t+=f.defender.mind.decisionInterval+.01;};
afterEach(()=>vi.restoreAllMocks());
describe('first-level acquired lateral runner objective',()=>{
 it('advances the acquired moving point once, in the existing movement planner',()=>{
  const f=stage(),samples:Record<string,unknown>[]=[];
  runContactObservers.set(f.sim,(_rep,phase,data)=>{if(phase==='movement')samples.push(data);});
  try{cmd(f);}finally{runContactObservers.delete(f.sim);}
  const trail=f.defender.profile.radius+f.back.profile.radius+f.defender.profile.reach*.65;
  expect(samples[0].defensiveAim).toEqual({x:f.defender.pos.x,y:f.backCue.pos.y-trail});
  expect(samples[0].heldTargetFlow).toBe(f.backCue.vel.y);
 });
 it.each([-1,1])('works toward an acquired carrying back who has left the fit, side=%s',side=>{
  const f=stage(side),body=structuredClone(f.defender.body),profile=structuredClone(f.defender.profile),hands=f.engagement.hands,c=cmd(f);
  expect(c.vel.y*side).toBeGreaterThan(0);expect(c.vel.x).toBe(-1.5);expect(f.engagement.hands).toBe(hands);
  expect(f.defender.body).toEqual(body);expect(f.defender.profile).toEqual(profile);expect(f.defender.runFit!.side).toBe(side);
 });
 it.each([-1,1])('hidden holder, live motion and private give/keep flags do not choose the new flow, side=%s',side=>{
  const a=stage(side),b=stage(side);b.sim.ball={kind:'held',carrier:b.sim.qb};b.sim.handoffAt=-1;b.sim.scrambled=true;b.sim.isPass=true;
  b.back.body.pos={x:85,y:CENTER_Y-side*15};b.back.body.vel={x:9,y:-side*8};b.sim.qb.body.vel.y=-side*8;
  expect(cmd(b)).toEqual(cmd(a));expect(JSON.stringify(b.sim.rng)).toBe(JSON.stringify(a.sim.rng));
 });
 it.each([false,null,undefined])('unknown or negative observed possession=%s does not fall back to the true live holder',carrying=>{
  const f=stage(),control=stage();f.backCue.carrying=carrying;control.backCue.carrying=false;
  expect(cmd(f)).toEqual(cmd(control));
 });
 it('rejects contradictory backfield possession and stale or unavailable evidence',()=>{
  for(const mutate of [(f:Scene)=>{f.qbCue.carrying=true;},(f:Scene)=>{f.qbCue.carrying=null;},(f:Scene)=>{f.backCue.age=2;},(f:Scene)=>{f.qbCue.age=undefined;}]){
   const f=stage(),control=stage();mutate(f);control.backCue.carrying=false;expect(cmd(f)).toEqual(cmd(control));
  }
 });
 it.each(['lag','control']as const)('preserves %s depth technique while deciding whether to flow',technique=>{
  const f=stage(1,'interior',technique),control=stage(1,'interior',technique);control.backCue.carrying=false;
  if(technique==='lag')expect(cmd(f)).toEqual(cmd(control));else expect(cmd(f).vel.y).toBeGreaterThan(cmd(control).vel.y);
 });
 it('retains a frontside box shoulder and an uncertain stationary mesh',()=>{
  const near=stage(1,'edge'),unknown=stage(1,'edge');near.backCue.pos.y=near.defender.pos.y+.1;unknown.backCue.carrying=false;
  expect(cmd(near)).toEqual(cmd(unknown));
  const stopped=stage(),control=stage();stopped.backCue.vel.y=0;control.backCue.carrying=false;expect(cmd(stopped)).toEqual(cmd(control));
 });
 it.each(['box','spill']as const)('does not replace the installed %s edge contract with an inside trail',edge=>{
  const f=stage(1,'edge'),control=stage(1,'edge');f.defender.runFit!.edge=control.defender.runFit!.edge=edge;control.backCue.carrying=false;
  expect(cmd(f)).toEqual(cmd(control));
 });
 it('holds acquired target and motion together within a decision, then answers contradictory evidence',()=>{
  const f=stage(),control=stage();expect(cmd(f)).toEqual(cmd(control));f.backCue.carrying=false;f.backCue.vel.y=-3;
  f.sim.t+=.01;control.sim.t+=.01;expect(cmd(f)).toEqual(cmd(control));next(f);next(control);expect(cmd(f).vel.y).toBeLessThan(cmd(control).vel.y);
 });
 it('hands a shallow acquired runner to the existing contact pursuit rather than preserving deep lateral flow',()=>{
  const left=stage(),right=stage();left.backCue.pos.x=right.backCue.pos.x=39;left.blockerCue.vel.y=-2;right.blockerCue.vel.y=2;
  expect(cmd(left).vel).toEqual(cmd(right).vel);
 });
});

// Only the new deep lateral mode is acquired; legacy contact-reading metadata
// remains outside this correction. An observed empty QB cannot declare a run
// merely because authoritative hidden possession happens to select his picture.
describe('acquired deep-flow activation does not use the hidden holder',()=>{
 it.each(['pass','unsure']as const)('does not activate new flow while personally reading %s',read=>{
  const left=stage(),right=stage();
  for(const f of [left,right]){f.defender.recog!.read=read;f.qbCue.pos.x=f.sim.los+3;}
  right.sim.ball={kind:'held',carrier:right.sim.qb};
  const emitted=(f:Scene)=>{
   const samples:Record<string,unknown>[]=[];
   runContactObservers.set(f.sim,(_rep,phase,data)=>{if(phase==='movement')samples.push(data);});
   try{return{command:cmd(f),aim:samples[0].defensiveAim,flow:samples[0].heldTargetFlow};}
   finally{runContactObservers.delete(f.sim);}
  };
  const a=emitted(left),b=emitted(right);
  // Legacy `reading`/`declared` may still differ through authoritative holder
  // selection. Do not broaden this repair to that prior target policy.
  expect(a.flow).toBeUndefined();expect(b.flow).toBeUndefined();
 });
});
