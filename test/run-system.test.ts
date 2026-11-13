import {vi, describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam,pickOffense,pickDefense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONT_BY_ID,COVERAGE_BY_ID,PRESSURES } from '../src/playbook/defense.js';
import { FORMATIONS,FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';
import { RunBlocker,planRunBlocking } from '../src/sim/behaviors/blocking.js';
import { runReadAim } from '../src/sim/behaviors/carrier.js';
import { helperSupport } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
import { buildRunFits,executeRunFit,blockingIndicator } from '../src/sim/run-fits.js';
import { tryTackles } from '../src/sim/tackle.js';
// The library's installed fronts. SHORT_PACKAGE puts the Bear's Sam on the line
// (six men), where Duo has no double to take: an offensive check, not this contract.
vi.hoisted(() => { process.env.SHORT_PACKAGE = '0'; });
const o=generateTeam(new Rng(11),'O','O',{strength:.55});
const d=generateTeam(new Rng(12),'D','D',{strength:.55});
function make(concept='iz_strong',form='ace_11',patch:Partial<DefensivePlayCall>={},flip=false,record=false) {
 const formation=FORMATION_BY_ID[form];
 const defCall:DefensivePlayCall={personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'test',...patch};
 return new PlaySim({offense:pickOffense(o,formation.personnel),defense:pickDefense(d,defCall.personnel),
 offCall:{formation,flip,kind:'run',run:RUN_BY_ID[concept],label:concept},defCall,los:40,ballY:CENTER_Y,firstDownX:50,seed:77,record});
}
function observe(sim:PlaySim) {for(let i=0;i<24;i++)sim.perception.record(sim.agents);}

describe('front and coverage fit contracts',()=>{
 it.each([false,true])('gives Cover 2 corners force and keeps Tite 4i players in B, flip=%s',(flip)=>{
  const sim=make('iz_strong','ace_11',{personnel:'base34',front:FRONT_BY_ID.tite,coverage:COVERAGE_BY_ID.cover2,runPolicy:{edge:'spill',linebacker:'stack'}},flip);
  expect(sim.slot('DT_S')!.runFit!.gap).toBe('B');expect(sim.slot('DT_W')!.runFit!.gap).toBe('B');
  expect(sim.slot('NT')!.runFit!.technique).toBe('lag');
  const forces=sim.defense.filter((a)=>a.runFit?.kind==='force');
  expect(forces.map((a)=>a.slot).sort()).toEqual(['CB_S','CB_W']);
  expect(new Set(forces.map((a)=>a.runFit!.side)).size).toBe(2);
 });
 it('keeps mixed coverage support asymmetric',()=>{
  const sim=make('iz_strong','ace_11',{coverage:COVERAGE_BY_ID.cover6});
  const force=sim.defense.filter((a)=>a.runFit?.kind==='force');
  expect(force).toHaveLength(2);
  expect(force.filter((a)=>a.slot.startsWith('CB'))).toHaveLength(1);
 });
 it('pairs an end spike with ownership of the vacated edge',()=>{
  const sim=make('iz_strong','ace_11',{coverage:COVERAGE_BY_ID.cover2,gapExchange:{edge:'DE_W',backer:'LB_W'}});
  const jobs=buildRunFits(sim),end=jobs.get(sim.slot('DE_W')!)!,backer=jobs.get(sim.slot('LB_W')!)!;
  expect(end.gap).toBe('B');expect(backer.gap).toBe('C');expect(backer.side).toBe(end.side);
  expect(end.partner).toBe('LB_W');expect(backer.partner).toBe('DE_W');
 });
 it('holds an insertion landmark instead of chasing a back at a deep mesh',()=>{
  const sim=make(),back=sim.slot('RB')!,lb=sim.slot('LB_M')!;
  sim.handoffAt=1.2;sim.ball={kind:'held',carrier:back};sim.t=1.3;
  lb.body.pos={x:41.5,y:CENTER_Y};back.body.pos={x:35,y:CENTER_Y};observe(sim);
  const cmd=executeRunFit(lb,sim,'A',1);
  expect(cmd.vel.x).toBeGreaterThan(-2);
 });
 it('keeps an alley cap while the back is still at a deep mesh',()=>{
  const sim=make(),s=sim.slot('FS')!;
  expect(s.runFit!.kind).toBe('alley');
  s.body.pos={x:48,y:CENTER_Y+1.2};observe(sim);
  const cmd=executeRunFit(s,sim,'A',1);
  expect(cmd.vel.x).toBeGreaterThan(-2);
 });
 it('reads visible lateral guard movement without reading the concept name',()=>{
  const sim=make(),g=sim.slot('LG')!,lb=sim.slot('LB_M')!;
  g.body.pos={x:38,y:g.pos.y+1};g.body.vel={x:0,y:3};observe(sim);
  expect(blockingIndicator(lb,sim)?.kind).toBe('pull');
  g.body.vel={x:0,y:0};observe(sim);expect(blockingIndicator(lb,sim)).toBeNull();
 });
 it('recognizes an off-ball wing slice as a separate observed cue',()=>{
  const sim=make('split_zone','gun_wing_12'),h=sim.slot('H')!,lb=sim.slot('LB_M')!;
  h.body.pos={x:38.6,y:h.pos.y+1};h.body.vel={x:0,y:3};observe(sim);
  expect(blockingIndicator(lb,sim)?.kind).toBe('slice');
 });
});

describe('scheme execution and local rules',()=>{
 it('keeps formation identifiers unique when adding scheme eligibility',()=>expect(new Set(FORMATIONS.map((f)=>f.id)).size).toBe(FORMATIONS.length));
 it.each(['over','under','odd','tite','bear'])('uses vertical Duo doubles against %s',(id)=>{
  const front=FRONT_BY_ID[id],sim=make('duo','i_pro_21',{front,personnel:front.personnel[0]});
  const plans=[...planRunBlocking(sim,sim.offCall.run!).values()];
  expect(plans.some((p)=>p.combination)).toBe(true);
  expect(plans.every((p)=>p.kind!=='pull' && p.kind!=='reach')).toBe(true);
  expect(plans.filter((p)=>p.kind==='drive'||p.kind==='combo').every((p)=>p.drive.y===0)).toBe(true);
 });
 it.each([false,true])('gives split zone one slice target and leaves no DL orphaned, flip=%s',(flip)=>{
  const sim=make('split_zone','gun_wing_12',{},flip);
  const h=sim.slot('H')!,plan=(h.behavior as RunBlocker).plan;
  expect(plan.kind).toBe('pull');expect(plan.pullRole).toBe('kick');
  expect((plan.target!.pos.y-CENTER_Y)*sim.offAlign.strongSign).toBeLessThan(0);
  const plans=sim.offense.filter((b)=>b.behavior instanceof RunBlocker).map((b)=>(b.behavior as RunBlocker).plan);
  expect(plans.filter((p)=>p.target===plan.target)).toHaveLength(1);
  for(const defender of sim.defense.filter((a)=>a.slot.startsWith('DE')||a.slot.startsWith('DT')))expect(plans.some((p)=>p.target===defender)).toBe(true);
 });
 it('rejects split zone without a slice blocker',()=>expect(()=>make('split_zone')).toThrow(/off-ball/));
 it('distinguishes wide zone lateral intent from inside zone',()=>{
  const iz=make(),wz=make('wz_strong');
  const drive=(sim:PlaySim)=>(sim.slot('RG')!.behavior as RunBlocker).plan.drive;
  expect(Math.abs(drive(wz).y)).toBeGreaterThan(Math.abs(drive(iz).y));
 });
 it('passes crossing adjacent threats while preserving both owners',()=>{
  const sim=make(),a=sim.slot('LG')!,b=sim.slot('C')!,x=sim.slot('DT_W')!,y=sim.slot('DT_S')!;
  a.behavior=new RunBlocker({kind:'drive',target:x,drive:{x:1,y:0}});
  b.behavior=new RunBlocker({kind:'drive',target:y,drive:{x:1,y:0}});
  x.body.pos={x:43,y:b.pos.y};y.body.pos={x:43,y:a.pos.y};observe(sim);sim.t=.5;
  a.behavior.update(a,sim);
  expect((a.behavior as RunBlocker).target).toBe(y);expect((b.behavior as RunBlocker).target).toBe(x);
  expect(sim.events.some((e)=>e.type==='block_exchange')).toBe(true);
 });
 it('collects actual penetration before climbing',()=>{
  const sim=make(),a=sim.slot('C')!,x=sim.slot('DT_S')!;
  a.behavior=new RunBlocker({kind:'climb',target:sim.slot('LB_M')!,drive:{x:1,y:0}});
  x.body.pos={x:39.6,y:a.pos.y};observe(sim);sim.t=.5;a.behavior.update(a,sim);
  expect((a.behavior as RunBlocker).target).toBe(x);expect(a.tags.has('block-collect')).toBe(true);
 });
 it('logs an end that crosses inside and sends the wrapper outside',()=>{
  const sim=make('counter'),pullers=sim.offense.filter((a)=>a.behavior instanceof RunBlocker && a.behavior.plan.kind==='pull');
  const kick=pullers.find((a)=>(a.behavior as RunBlocker).plan.pullRole==='kick')!,wrap=pullers.find((a)=>a!==kick)!;
  const p=(kick.behavior as RunBlocker).plan,side=-sim.offAlign.strongSign;
  kick.body.pos={x:39,y:CENTER_Y+side*2};p.target!.body.pos={x:39.2,y:kick.pos.y-side*.5};
  p.pullPath=[];observe(sim);sim.t=1;kick.behavior.update(kick,sim);
  expect(kick.tags.has('block-log')).toBe(true);expect(p.drive.y*side).toBeLessThan(0);
  wrap.behavior.update(wrap,sim);expect(wrap.tags.has('wrap-log')).toBe(true);
  expect(((wrap.behavior as RunBlocker).plan.pullPath!.at(-1)!.y-kick.pos.y)*side).toBeGreaterThan(0);
 });
 it('moves a Duo read away from a declaring MIKE',()=>{
  const sim=make('duo'),rb=sim.slot('RB')!,key=sim.slot('LB_M')!;
  rb.body.pos={x:38,y:CENTER_Y};for(const a of sim.defense)a.body.pos={x:55,y:CENTER_Y+15};
  key.body.pos={x:42,y:CENTER_Y};key.body.vel={x:-1,y:2};observe(sim);
  const aim=runReadAim(rb,sim,{aim:{x:40.6,y:CENTER_Y},run:{scheme:'duo',side:1,readKey:key}})!;
  expect(aim.y).toBeLessThan(CENTER_Y);
 });
});

describe('functional contact and pre-snap motion',()=>{
 it('rejects remote engagement and builds helper force only in useful contact',()=>{
  const sim=make(),b=sim.slot('C')!,h=sim.slot('LG')!,def=sim.slot('DT_S')!;
  b.body.pos={x:38,y:CENTER_Y};def.body.pos={x:45,y:CENTER_Y};
  expect(sim.engage(b,def,'run',{x:1,y:0})).toBeNull();
  def.body.pos.x=38.8;const e=sim.engage(b,def,'run',{x:1,y:0})!;
  h.body.pos={x:38,y:CENTER_Y+.4};sim.engage(h,def,'run',{x:1,y:0});
  expect(helperSupport(sim,e,h)).toBe(0);sim.t=.2;expect(helperSupport(sim,e,h)).toBeGreaterThan(.5);
  h.body.pos.x=41;expect(helperSupport(sim,e,h)).toBe(0);
 });
 it('does not attempt a diving tackle through another body',()=>{
  const sim=make(),rb=sim.slot('RB')!,def=sim.slot('LB_M')!,blocker=sim.slot('C')!;
  sim.t=2;sim.ball={kind:'held',carrier:rb};sim.handoffAt=1;
  for(const a of sim.agents)a.body.pos={x:70+a.idx*3,y:10};
  def.body.pos={x:45,y:CENTER_Y};rb.body.pos={x:46.6,y:CENTER_Y};rb.body.vel={x:8,y:0};
  blocker.body.pos={x:45.8,y:CENTER_Y};tryTackles(sim);
  expect(def.nextTackleAt).toBeLessThan(2);expect(sim.bond).toBeNull();
 });
 it('retains legal unfinished stem positions, momentum and negative replay frames',()=>{
  const patch={front:FRONT_BY_ID.under,frontStem:{from:FRONT_BY_ID.over,secondsBeforeSnap:.2}};
  const sim=make('iz_strong','ace_11',patch,false,true),plain=make('iz_strong','ace_11',{front:FRONT_BY_ID.under});
  const dt=sim.slot('DT_S')!;
  expect(Math.abs(dt.pos.y-plain.slot('DT_S')!.pos.y)).toBeGreaterThan(.3);expect(Math.abs(dt.vel.y)).toBeGreaterThan(.1);
  expect(sim.defense.every((a)=>a.pos.x-a.profile.radius>sim.los)).toBe(true);
  expect(sim.frames[0].t).toBeLessThan(0);expect(sim.frames.at(-1)!.t).toBe(0);
  const recent=sim.perception.perceive(dt.idx,.05);expect(Math.abs(recent.vel.y)).toBeGreaterThan(0);
  // An offensive observer whose latency exceeds this short stem still sees
  // the old presentation; history must not grant instant recognition.
  const seen=sim.see(sim.slot('C')!,dt);expect(seen.pos.y).not.toBe(dt.pos.y);
  const plainResult=make('iz_strong','ace_11',patch).run(),recordedResult=sim.run();
  expect({...plainResult,frames:undefined}).toEqual({...recordedResult,frames:undefined});
  expect(sim.frames.every((f,i)=>i===0 || f.t>sim.frames[i-1].t)).toBe(true);
 });
 it('walks a called blitzer down without manufacturing instantaneous arrival',()=>{
  const pressure=PRESSURES.find((p)=>p.id==='mike_a')!;
  const sim=make('iz_strong','ace_11',{pressure,creep:{slot:'LB_M',secondsBeforeSnap:.3}});
  const lb=sim.slot('LB_M')!;expect(lb.pos.x).toBeGreaterThan(42);expect(lb.vel.x).toBeLessThan(0);
 });
});
