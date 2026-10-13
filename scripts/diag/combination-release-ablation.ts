/** Small native-snap counterfactuals, not release policies. Reconstruct the
 * original prefix once; clone the complete snap graph with its prototypes,
 * identities and RNG state. A control must match the saved complete history. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { Agent } from '../../src/sim/agent.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output=process.argv[2]??'out/combination-collection/release-ablations.json';
const includeTrial=process.argv.includes('--trial');
const nativeOnly=process.argv.includes('--native-only');
if(includeTrial)assert.equal(sourceVersion(),'2da6243f85f0b48663f07eb9e273e98a223eeb3db2f55d648bd48fcea205828c',
  'Use archived trial 4074038; final runtime has withdrawn this rejected policy');
const encode=(v:unknown)=>JSON.stringify(v,(_k,x)=>x instanceof Agent?{agent:x.idx}:x instanceof PlaySim?{sim:true}
  :x instanceof Map?[...x]:x instanceof Set?[...x]:x instanceof Float64Array?[...x]:x);
const copy=(v:unknown)=>JSON.parse(encode(v));
/** No prototype methods or closure-bound instances are replaced. The saved
 * native control below disqualifies the clone if anything is omitted. */
function clone<T>(v:T,memo=new Map<any,any>()):T {
  if(v===null||typeof v!=='object')return v;
  if(memo.has(v))return memo.get(v);
  let out:any;
  // These World caches are empty at native snap entry (no joints); they are
  // rebuilt by normal execution. Cloning a later loaded state is unsupported.
  if(v instanceof WeakMap){out=new WeakMap();memo.set(v,out);return out;}
  if(v instanceof WeakSet){out=new WeakSet();memo.set(v,out);return out;}
  if(ArrayBuffer.isView(v)){out=new (v.constructor as any)(v);memo.set(v,out);return out;}
  if(v instanceof Map){out=new Map();memo.set(v,out);for(const [k,x] of v)out.set(clone(k,memo),clone(x,memo));return out;}
  if(v instanceof Set){out=new Set();memo.set(v,out);for(const x of v)out.add(clone(x,memo));return out;}
  out=Array.isArray(v)?[]:Object.create(Object.getPrototypeOf(v));memo.set(v,out);
  for(const k of Reflect.ownKeys(v))out[k]=clone((v as any)[k],memo);
  return out;
}
type Arm={id:string;release?:number;spacing?:boolean;candidate?:boolean};
const arms:Arm[]=nativeOnly?[{id:'native'}]:[{id:'native'},...[.3,1.05,1.3,1.55,1.8].map(release=>({id:`forced-${release}`,release})),
  {id:'native-no-helper-spacing',spacing:true},...(includeTrial?[{id:'stretch-check',candidate:true}]:[])];
const input={rosterSeed:71,strength:.55,gameSeed:73,nativePlayIndex:48,playSeed:2986046475,
  concept:'oz_weak',arms,expectedNativeHistory:'eca2500ca390f40e70b5997544d8d18a85aa69a802cfe5a6075cedd0af8c8259'};
function trial(sim:PlaySim,arm:Arm,observe:boolean){
  if(arm.candidate)for(const a of sim.offense)if(a.behavior instanceof RunBlocker){
    const c=a.behavior.plan.combination;
    if(c&&a===c.members[1])c.helpPolicy={kind:'check',homeY:a.pos.y,side:Math.sign(a.pos.y-c.members[0].pos.y)};
  }
  const helper=sim.slot('RG')!,keeper=sim.slot('RT')!,down=sim.slot('DE_W')!,backer=sim.slot('LB_W')!;
  const combo=(helper.behavior as RunBlocker).plan.combination!;
  const frames:any[]=[],history=createHash('sha256');
  const tick=sim.tick.bind(sim),step=sim.world.step.bind(sim.world);
  if(arm.spacing)sim.world.step=(intents,dt)=>{
    assert.equal(intents,sim.intents);
    if(sim.t>=2.15&&!helper.engagement)sim.intents[helper.idx]={...Reflect.get(sim,'cmds')[helper.idx]};
    return step(intents,dt);
  };
  sim.tick=()=>{
    if(arm.release!==undefined&&sim.t===arm.release){
      assert.equal(helper.engagement,null,'Forced unjoined control must not erase helper load');
      combo.released=true;
      for(const a of combo.members){const p=(a.behavior as RunBlocker).plan;p.combination=undefined;p.climbTo=undefined;}
      const p=(helper.behavior as RunBlocker).plan;p.kind='climb';p.target=backer;p.drive={x:1,y:0};
      helper.tags.add('diagnostic-forced-release');
    }
    const t=sim.t,eventStart=sim.events.length;
    tick();
    history.update(encode({t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
      agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
      engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds')}));
    if(observe)frames.push(copy({t,after:sim.t,carrier:sim.carrier?.slot,events:sim.events.slice(eventStart),
      agents:[helper,keeper,down,backer,sim.slot('RB')!].map(a=>({slot:a.slot,body:a.body,
        requested:Reflect.get(sim,'cmds')[a.idx],applied:sim.intents[a.idx],
        plan:a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,target:a.behavior.plan.target?.slot,
          climbRead:Reflect.get(a.behavior,'climbRead')}:null})),
      engagements:sim.engagements.map(e=>({blocker:e.blocker.slot,defender:e.defender.slot,helpers:e.helpers.map(a=>a.slot),
        force:e.hands?Math.hypot(e.hands.normalForce??0,e.hands.tangentForce??0):0,
        live:!!e.hands&&sim.world.joints.includes(e.hands)})),contacts:sim.lastStep?.contacts}));
  };
  const result=sim.run();
  return {id:arm.id,historySha256:history.digest('hex'),gain:result.yards,endTime:sim.t,
    outcome:result.outcome,censored:sim.phase==='live',events:sim.events,frames};
}
const rng=new Rng(input.rosterSeed),home=generateTeam(rng,'Census home','CH',{strength:input.strength}),
  away=generateTeam(rng,'Census away','CA',{strength:input.strength});
const stop=new Error('bounded native prefix complete');let rows:any[]=[];
try{simulateGame(home,away,{seed:input.gameSeed,hooks:{playResult(sim,kind){
  if(kind!=='scrimmage'||sim.rng.key!==input.playSeed)return undefined;
  assert.equal(sim.t,0);assert.equal(sim.world.joints.length,0);
  for(const arm of arms){
    const observed=trial(clone(sim),arm,true),plain=trial(clone(sim),arm,false);
    assert.equal(observed.historySha256,plain.historySha256,arm.id+' observer neutrality');
    if(arm.id==='native')assert.equal(observed.historySha256,input.expectedNativeHistory,'Native clone exactness');
    rows.push(observed);console.log(JSON.stringify({id:arm.id,gain:observed.gain,end:observed.endTime,censored:observed.censored}));
  }throw stop;
}}});}catch(e){if(e!==stop)throw e;}
assert.equal(rows.length,arms.length);
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,encode({protocol:'combination-release-ablation-v1',
  input,sourceSha256:sourceVersion(),observerNeutral:true,nativeCloneExact:true,
  warning:'Forced departures and spacing removal are causal ablations, not football policies or promotions.',rows})+'\n');
