import {describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../src/playbook/defense.js';
import {PlaySim} from '../src/sim/playsim.js';
import {RunBlocker,type Combination} from '../src/sim/behaviors/blocking.js';
import {readCollectionApproach,collectionCommand} from '../src/sim/collection-approach.js';
import {updateEngagements} from '../src/sim/engagement.js';
import {supportParams} from '../src/physics/support.js';
import type {Intent} from '../src/physics/world.js';

/** Opposing control declared before candidate results: C and RT are distinct,
 * nonoverlapping upright bodies closing the two near collection approaches.
 * No contact/release timing or strength manipulation supplies an exit. */
function obstruction(){
 const formation=FORMATION_BY_ID.ace_11,sim=new PlaySim({
  offense:pickOffense(generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'Obstructed collection'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:11});
 for(const a of sim.agents){a.body.pos={x:70+a.idx%5*3,y:3+Math.floor(a.idx/5)*3};a.body.vel={x:0,y:0};
  a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:a.facing})};}
 sim.t=sim.world.time=1.35;
 const helper=sim.slot('LG')!,owner=sim.slot('C')!,defender=sim.slot('DT_W')!,wall=sim.slot('RT')!;
 helper.body.pos={x:40,y:CENTER_Y+1.333333333333332};helper.body.facing=-.7;
 owner.body.pos={x:41.3,y:CENTER_Y+.6};owner.body.facing=Math.PI;
 defender.body.pos={x:42.2,y:CENTER_Y};defender.body.facing=Math.PI;
 wall.body.pos={x:40.8,y:CENTER_Y-.166666666666668};
 sim.slot('RB')!.body.pos={x:34,y:CENTER_Y};
 const combo:Combination={members:[owner,helper],defender,backer:sim.slot('LB_W')!,released:false,secureSince:-1,nextRead:0,
  soloKind:'drive',helpPolicy:{kind:'check',homeY:helper.pos.y,side:1}};
 owner.behavior=new RunBlocker({kind:'drive',target:defender,drive:{x:1,y:0},combination:combo});
 helper.behavior=new RunBlocker({kind:'combo',target:defender,drive:{x:1,y:0},combination:combo});
 for(let k=0;k<24;k++)sim.perception.record(sim.agents);
 const contact=helper.profile.radius+defender.profile.radius+.1+helper.player.measurables.armIn/36*.45;
 return {sim,helper,owner,defender,wall,combo,contact};
}

describe('free collection respects observed teammate obstruction',()=>{
 it('brakes through ordinary movement when its near strike surfaces are genuinely blocked',()=>{
  const f=obstruction(),{sim,helper,owner,wall}=f;
  expect(Math.hypot(owner.pos.x-wall.pos.x,owner.pos.y-wall.pos.y)).toBeGreaterThan(owner.profile.radius+wall.profile.radius);
  const choice=readCollectionApproach(helper,sim.see(helper,f.defender),
   {seen:sim.see(helper,owner),radius:owner.profile.radius},[{seen:sim.see(helper,wall),radius:wall.profile.radius}],f.contact,1,0,helper.mind.decisionInterval);
  expect(choice).not.toBeNull();expect(choice!.goal).toBeNull();
  helper.body.vel={x:.7,y:-.7};const before={...helper.pos},speed=Math.hypot(helper.vel.x,helper.vel.y);
  let impacts=0;
  for(let k=0;k<8;k++){
   const intents:Intent[]=sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
   intents[helper.idx]=helper.behavior.update(helper,sim);updateEngagements(sim,intents);
   expect(intents[helper.idx].vel).toEqual({x:0,y:0});
   const report=sim.world.step(intents,.05);
   expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
   expect(Math.hypot(report.groundImpulse[helper.idx].x,report.groundImpulse[helper.idx].y))
    .toBeLessThanOrEqual(supportParams(helper.profile).traction*.05+1e-8);
   impacts+=report.contacts.filter(c=>c.i===helper.idx||c.j===helper.idx).length;
   sim.t+=.05;sim.perception.record(sim.agents);
  }
  expect(Math.hypot(helper.pos.x-before.x,helper.pos.y-before.y)).toBeGreaterThan(0);
  expect(Math.hypot(helper.vel.x,helper.vel.y)).toBeLessThan(speed);
  expect(impacts).toBe(0);expect(helper.engagement).toBeNull();expect(f.combo.released).toBe(false);
  expect(sim.events.some(e=>e.type==='block_climb')).toBe(false);
 });

 it('keeps the production approach and held read when only a remote engagement flag changes',()=>{
  const {sim,helper,owner,defender,combo}=obstruction();
  // Retain a real former rep as the private-state poison, with no current
  // joint, new picture or helper contact. Only the remote flag varies below.
  const oldRep=sim.engage(owner,defender,'run',{x:1,y:0});
  expect(oldRep).not.toBeNull();sim.disengage(oldRep!);
  const controller=helper.behavior as RunBlocker;
  const attack=vi.spyOn(controller as unknown as {attack: (...args:unknown[])=>Intent},'attack');
  const physical=structuredClone(helper.body),rng=JSON.stringify(sim.rng);
  const ownerPicture=sim.see(helper,owner),downPicture=sim.see(helper,defender);
  const request=controller.update(helper,sim);
  expect(attack).toHaveBeenCalledWith(helper,sim,defender);
  expect(request.vel).toEqual({x:0,y:0});
  const held=Reflect.get(controller,'collectionRead');
  expect(held.choice.goal).toBeNull();

  defender.engagement=oldRep;
  expect(controller.update(helper,sim)).toEqual(request);
  expect(Reflect.get(controller,'collectionRead')).toBe(held);
  // A first read must also be independent of the remote flag, rather than
  // only retaining a previously admitted choice across a private transition.
  const fresh=new RunBlocker({kind:'combo',target:defender,drive:{x:1,y:0},combination:combo});
  helper.behavior=fresh;
  expect(fresh.update(helper,sim)).toEqual(request);
  expect(Reflect.get(fresh,'collectionRead').choice).toEqual(held.choice);
  expect(sim.see(helper,owner)).toEqual(ownerPicture);
  expect(sim.see(helper,defender)).toEqual(downPicture);
  expect(helper.body).toEqual(physical);expect(JSON.stringify(sim.rng)).toBe(rng);
  expect(helper.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
  expect(combo.released).toBe(false);expect(fresh.target).toBe(defender);

  // A genuinely acquired facing change is allowed to change the route on
  // the next ordinary read; this is not an unconditional stop policy.
  owner.body.facing=Math.atan2(downPicture.pos.y-owner.pos.y,downPicture.pos.x-owner.pos.x);
  for(let k=0;k<24;k++)sim.perception.record(sim.agents);
  sim.t+=helper.mind.decisionInterval;
  expect(Math.hypot(...Object.values(fresh.update(helper,sim).vel))).toBeGreaterThan(0);
  expect(Reflect.get(fresh,'collectionRead').choice).toBeNull();
  attack.mockRestore();
 });

 it('keeps a still-facing owner outside lost-contact collection and consumes no hidden peer state',()=>{
  const {sim,helper,owner,defender,wall,contact}=obstruction();
  const covered=sim.see(helper,owner),down=sim.see(helper,defender),other=sim.see(helper,wall);
  const before=sim.agents.map(a=>structuredClone(a.body)),rng=JSON.stringify(sim.rng);
  const random=vi.spyOn(sim.rng,'next');
  const peers=[{seen:other,radius:wall.profile.radius}],partner={seen:covered,radius:owner.profile.radius};
  const a=readCollectionApproach(helper,down,partner,peers,contact,1,.1,.2);
  owner.body.pos={x:70,y:10};owner.body.facing=0;wall.body.vel={x:9,y:9};
  expect(readCollectionApproach(helper,down,partner,peers,contact,1,.1,.2)).toEqual(a);
  expect(readCollectionApproach(helper,down,{...partner,seen:{...covered,facing:Math.atan2(down.pos.y-covered.pos.y,down.pos.x-covered.pos.x)}},
   peers,contact,1,.1,.2)).toBeNull();
  expect(JSON.stringify(sim.rng)).toBe(rng);expect(random).not.toHaveBeenCalled();random.mockRestore();
  expect(helper.body).toEqual(before[helper.idx]);expect(defender.body).toEqual(before[defender.idx]);
  expect(collectionCommand(helper,{goal:null,flow:{x:9,y:9}},.1,down).vel).toEqual({x:0,y:0});
 });
});
