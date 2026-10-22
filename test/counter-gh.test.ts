import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {COUNTER_VARIANTS} from '../src/playbook/concepts.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
// BOX_ALIGN puts the one-high down safety in the box (4-6 yd), a real second-level
// defender: the all-walked-up scene is staged on the installed spot (7.5 yd).
vi.hoisted(()=>{process.env.BOX_ALIGN='0';});

const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/counter-second-level-inputs.json.gz',import.meta.url))).toString()) as {rows:{id:string;setup:PlaySetup}[]};
function setup(){
 const s=structuredClone(inputs.rows.find(r=>r.id==='GH01')!.setup);
 s.offCall.run={...COUNTER_VARIANTS.gh};
 return s;
}

describe('explicit Counter GH installation',()=>{
 it.each([false,true])('installs separate guard kick and H backer without vacating the tackle, flip=%s',flip=>{
  const s=setup();s.offCall.flip=flip;const sim=new PlaySim(s);
  const h=sim.slot('H')!,p=(h.behavior as RunBlocker).plan;
  const pulls=sim.offense.filter(a=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull');
  expect(pulls).toHaveLength(2);
  expect(pullies(pulls)).toEqual(['H',flip?'LG':'RG'].sort());
  expect(p.pullRole).toBe('lead');expect(p.target).not.toBeNull();
  expect(p.pullSurface?.blocker.slot).toBe(flip?'LG':'RG');
  expect((p.pullSurface!.blocker.behavior as RunBlocker).plan.target).toBe(p.pullSurface!.defender);
  expect(p.pullPath!.slice(0,2).every(w=>w.x<=h.pos.x)).toBe(true);
  expect(sim.offense.every(a=>!(a.behavior instanceof RunBlocker)||a.behavior.plan.combination?.backer!==p.target)).toBe(true);
 });
 function pullies(agents:{slot:string}[]){return agents.map(a=>a.slot).sort();}
 it('rejects an attached H rather than silently losing the second pull',()=>{
  const s=setup();s.offCall.formation.slots.H={side:'L',split:'inline',depth:.6};
  expect(()=>new PlaySim(s)).toThrow('Counter GH requires');
 });
 it('rejects three pullers and a missing guard instead of vacating extra work',()=>{
  for(const pullers of [['BSG','BST','H'],['H']] as const){
   const s=setup();s.offCall.run!.pullers=[...pullers];expect(()=>new PlaySim(s)).toThrow('Counter GH requires');
  }
 });
 it('rejects an uninstalled all-walked-up count instead of finding hidden free work',()=>{
  const s=setup();for(const slot of Object.keys(s.defCall.front.slots))if(slot.startsWith('LB'))s.defCall.front.slots[slot as keyof typeof s.defCall.front.slots]!.depth=.9;
  expect(()=>new PlaySim(s)).toThrow('all-walked-up accounting is not installed');
 });
 it('does not silently apply the H tag to another run installation',()=>{
  const s=setup();s.offCall.run!.scheme='insideZone';expect(()=>new PlaySim(s)).toThrow('installed only for Counter GH');
 });
});

/** A staged read through the real production update. Full normal constructor
 * and acquired history; no movement, contact or future runner state is awarded. */
function surfaceRead(mirror:boolean,privateLog:boolean,reachable=true,traffic?:'hidden'|'seen'|'clear'){
 const sim=new PlaySim(setup()),a=sim.slot('H')!,controller=a.behavior as RunBlocker;
 const p=controller.plan,g=p.pullSurface!.blocker,d=p.pullSurface!.defender,target=p.target!;
 sim.t=2;sim.world.time=2;
 a.body.pos=traffic?{x:37.7,y:25.37}:{x:38.1,y:28.12};a.body.vel={x:0,y:2};
 if(traffic==='seen')sim.slot('LG')!.body.pos={x:38.45,y:25.65};
 g.body.pos={x:39.8,y:30.2};g.body.vel={x:0,y:0};
 d.body.pos=reachable?{x:40,y:29.6}:{x:43,y:28};d.body.vel={x:0,y:0};
 target.body.pos={x:43,y:31};target.body.vel={x:0,y:0};
 if(privateLog)g.tags.add('block-log');else g.tags.delete('block-log');
 Reflect.set(controller,'pullIdx',1);
 if(mirror){
  for(const b of sim.agents){b.body.pos.y=2*sim.ballY-b.pos.y;b.body.vel.y*=-1;b.body.facing*=-1;}
  for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=2*sim.ballY-spot.pos.y;
  sim.offAlign.strongSign*=-1;p.drive.y*=-1;
  for(const w of p.pullPath!)w.y=2*sim.ballY-w.y;
 }
 for(let i=0;i<24;i++)sim.perception.record(sim.agents);
 if(traffic==='hidden')sim.slot('LG')!.body.pos={x:38.45,y:mirror?2*sim.ballY-25.65:25.65};
 const body=structuredClone(a.body),rng=JSON.stringify(sim.rng);
 const old=structuredClone(p.pullPath!.at(-1));
 const command=controller.update(a,sim);
 expect(a.body).toEqual(body);expect(JSON.stringify(sim.rng)).toBe(rng);
 expect(a.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
 return {command,corner:p.pullPath!.at(-1),old,target:p.target?.idx};
}

describe('GH consumes an achieved guard/end picture',()=>{
 it.each([false,true])('retains the near-wall response only from acquired traffic, mirror=%s',mirror=>{
  expect(surfaceRead(mirror,false,true,'hidden')).toEqual(surfaceRead(mirror,false,true,'clear'));
  expect(surfaceRead(mirror,false,true,'seen').command.vel.x).toBeLessThan(0);
 });
 it.each([false,true])('ignores the private log tag through production update, mirror=%s',mirror=>{
  expect(surfaceRead(mirror,true)).toEqual(surfaceRead(mirror,false));
  const r=surfaceRead(mirror,false);expect(r.corner).not.toEqual(r.old);
 });
 it.each([false,true])('does not follow a tagged but unreachable end connection, mirror=%s',mirror=>{
  const r=surfaceRead(mirror,true,false);expect(r.corner).toEqual(r.old);
 });
});

it.each([false,true])('carries acquired guard motion between reads without requiring an old native micro-crossing, mirror=%s',mirror=>{
 function request(moving:boolean){
  const sim=new PlaySim(structuredClone(inputs.rows.find(r=>r.id==='GH04')!.setup));
  const h=sim.slot('H')!,controller=h.behavior as RunBlocker,p=controller.plan;
  if(mirror){
   for(const b of sim.agents){b.body.pos.y=2*sim.ballY-b.pos.y;b.body.vel.y*=-1;b.body.facing*=-1;}
   for(const spot of Object.values(sim.offAlign.spots))if(spot)spot.pos.y=2*sim.ballY-spot.pos.y;
   sim.offAlign.strongSign*=-1;p.drive.y*=-1;
   for(const w of p.pullPath!)w.y=2*sim.ballY-w.y;
  }
  const side=mirror?-1:1,flat=p.pullPath![1],guard=p.pullSurface!.blocker,end=p.pullSurface!.defender;
  h.body.pos={x:flat.x,y:flat.y-side*2};h.body.vel={x:0,y:side*2};sim.t=1.4;
  Reflect.set(controller,'homeY',sim.offAlign.spots.H.pos.y);Reflect.set(controller,'pullIdx',1);
  // A delivered traffic picture held since 1.25s. Observation latency is
  // already represented; only the subsequent .15s may be carried forward.
  const pictures=sim.offense.filter(b=>['LT','LG','C','RG','RT'].includes(b.slot)).map(b=>b===guard
   ? {pos:{x:h.pos.x+.4,y:h.pos.y+side*.2},vel:{x:moving?-4:0,y:0}}
   : {pos:{x:45,y:h.pos.y+side*6},vel:{x:0,y:0}});
  Reflect.set(controller,'wrapTraffic',pictures);Reflect.set(controller,'wrapTrafficAt',1.25);
  Reflect.set(controller,'nextSurfaceRead',1.55);
  const before=structuredClone(h.body),rng=JSON.stringify(sim.rng),see=vi.spyOn(sim,'see');
  const command=controller.update(h,sim);
  expect(Reflect.get(controller,'wrapTrafficAt')).toBe(1.25);
  expect(see.mock.calls.some(([a,b])=>a===h&&(b===guard||b===end))).toBe(false);
  expect(h.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
  expect(h.engagement).toBeNull();expect(sim.world.joints).toHaveLength(0);
  see.mockRestore();return command;
 }
 const carried=request(true),stationary=request(false);
 expect(Math.abs(carried.vel.x)).toBeLessThan(.005);
 expect(carried.vel.y*(mirror?-1:1)).toBeGreaterThan(0);
 expect(stationary.vel.x).toBeLessThan(0);
});
