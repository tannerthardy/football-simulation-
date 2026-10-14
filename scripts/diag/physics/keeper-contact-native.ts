/** Three existing PR #11 inputs; no new policy or perception. Complete patch
 * and identical-prefix continuation are diagnostic arms, not promoted fixes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { readWitness, stateError } from './keeper-contact-law.js';

type Input={id:string;concept:string;kind:'run';seed:number;flip:boolean;o:number;d:number;front:string;formation:string};
const manifestPath='config/keeper-contact-law.json';
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as {inputs:Input[];strength:number;los:number;stopSeconds:number;forkSeconds:number};
const copy=<T>(v:T):T=>structuredClone(v);
const serialize=(v:unknown)=>JSON.stringify(v,(_k,x:unknown)=>x instanceof Agent?{agent:x.idx}:x instanceof PlaySim?{sim:true}
  :x instanceof Map?[...x]:x instanceof Set?[...x]:x instanceof Float64Array?[...x]:x);
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
type Arm='center'|'patch-from-snap'|'patch-from-2.4';
function execute(input:Input,arm:Arm) {
  const formation=FORMATION_BY_ID[input.formation];
  const sim=new PlaySim({
    offense:pickOffense(generateTeam(new Rng(input.o),'O','O',{strength:manifest.strength}),formation.personnel),
    defense:pickDefense(generateTeam(new Rng(input.d),'D','D',{strength:manifest.strength}),'base43'),
    offCall:{formation,flip:input.flip,kind:'run',run:RUN_BY_ID[input.concept],label:input.id},
    defCall:{personnel:'base43',front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over Cover 3'},
    los:manifest.los,ballY:CENTER_Y,firstDownX:50,seed:input.seed,
    handContact:arm==='patch-from-snap'?'patch':'center',
  });
  const initial=copy(sim.agents.map(a=>a.pos)),profiles=copy(sim.agents.map(a=>a.profile));
  const hashes:string[]=[],frames:unknown[]=[],witness=readWitness();
  let crossing:number|null=null, frozenInputError:number|null=null;
  const limits={armImpulse:0,armWork:0,workResidual:0};
  const step=sim.world.step.bind(sim.world);
  // Capture the input before World without advancing, perceiving or evaluating.
  sim.world.step=(intents,dt)=>{
    if(input.id==='uc12-wz-s3-mirror'&&Math.abs(sim.t-2.4)<1e-8&&arm!=='patch-from-snap') {
      const bodies=witness.slots.map(slot=>sim.agents.find(a=>a.slot===slot)!.body);
      frozenInputError=stateError(bodies,witness.beforeBodies);
      assert(frozenInputError<1e-12,'Identical native 2.4-s witness prefix required');
      for(let k=0;k<bodies.length;k++)assert.deepEqual(intents[sim.world.indexOf(bodies[k])],witness.intents[k]);
    }
    return step(intents,dt);
  };
  while(sim.phase==='live'&&sim.t<manifest.stopSeconds) {
    const t=sim.t;
    if(arm==='patch-from-2.4'&&Math.abs(t-manifest.forkSeconds)<1e-8)Reflect.set(sim.world,'handContact','patch');
    sim.tick();
    const state={t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
      agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
      engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds')};
    hashes.push(sha(serialize(state)));
    const rb=sim.agents.find(a=>a.slot==='RB')!, report=sim.lastStep!;
    if(crossing===null&&sim.carrier===rb&&rb.pos.x>=sim.los)crossing=sim.t;
    for(let i=0;i<sim.agents.length;i++) {
      limits.armImpulse=Math.max(limits.armImpulse,report.armImpulse[i]-report.armImpulseLimit[i]);
      limits.armWork=Math.max(limits.armWork,report.armWork[i]-report.armWorkLimit[i]);
    }
    limits.workResidual=Math.max(limits.workResidual,Math.abs(report.work.residual));
    frames.push({t,after:sim.t,carrier:sim.carrier?.slot,
      bodies:sim.agents.map(a=>({slot:a.slot,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,spin:a.body.spin,
        request:copy(Reflect.get(sim,'cmds')[a.idx]),intent:copy(sim.intents[a.idx]),
        support:copy(a.body.support),energy:a.body.energy})),
      hands:sim.world.joints.filter(j=>j.kind==='hands').map(j=>({a:sim.agents[sim.world.indexOf(j.a)].slot,b:sim.agents[sim.world.indexOf(j.b)].slot,
        normal:j.normalForce,tangent:j.tangentForce,forceOnB:j.forceOnB,momentOnA:j.momentOnA,momentOnB:j.momentOnB})),
      contacts:report.contacts.map(c=>({...c,a:sim.agents[c.i].slot,b:sim.agents[c.j].slot,delivered:c.impulse>1e-9})),
      falls:report.falls.map(i=>sim.agents[i].slot)});
  }
  const first=sim.events.find(e=>e.type==='carrier_contact');
  return {input,arm,initial,profiles,hashes,frames,frozenInputError,
    endTime:sim.t,outcome:sim.outcome,censored:sim.phase==='live',crossing,
    gain:(sim.endSpot??sim.carrier?.pos??{x:sim.los}).x-sim.los,
    firstContact:first?{t:first.t,opponent:sim.agents[first.b!]?.slot,note:first.note,
      depth:sim.firstContactX===null?null:sim.firstContactX-sim.los,
      roundedEventDepth:first.pos?first.pos.x-sim.los:null}:null,limits,events:sim.events};
}
const started=performance.now();
const panel=manifest.inputs.map(input=>{
  const arms=(['center','patch-from-snap','patch-from-2.4'] as const).map(arm=>execute(input,arm));
  const a=arms[0],fork=arms[2],prefix=a.frames.filter((f)=> (f as {t:number}).t<manifest.forkSeconds).length;
  assert.deepEqual(fork.hashes.slice(0,prefix),a.hashes.slice(0,prefix),'Continuation prefix must match exactly');
  return {id:input.id,prefixTicks:prefix,arms};
});
const result={protocol:'keeper-contact-native-v1',comparisonCommit:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,
  manifestSha256:sha(readFileSync(manifestPath)),worldSha256:sha(readFileSync('src/physics/world.ts')),
  collectorSha256:sha(readFileSync('scripts/diag/physics/keeper-contact-native.ts')),elapsedSeconds:(performance.now()-started)/1000,panel};
const path=process.argv[2]??'out/keeper-contact-law/native.json';mkdirSync(dirname(path),{recursive:true});
writeFileSync(path,JSON.stringify(result)+'\n');
console.log(JSON.stringify({...result,panel:panel.map(p=>({...p,arms:p.arms.map(({frames,hashes,initial,profiles,events,...a})=>a)}))}));
