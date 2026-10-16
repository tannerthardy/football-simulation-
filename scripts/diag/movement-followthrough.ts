/** Saved current-state probe. No native play, behavior change or new cue read. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp} from '../../src/core/vec.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import type {Intent} from '../../src/physics/world.js';
import {Agent} from '../../src/sim/agent.js';
import {gatheringApproach,leverage} from '../../src/sim/behaviors/common.js';
import {withMovementObjective} from '../../src/sim/movement-objective.js';
import {spaceTeammates} from '../../src/sim/spacing.js';
import {sourceVersion} from '../source-version.js';

const pin='b1c75b872428237a8d9813ba4724b87f924c042d',root='data/reviews/current/pr87-run-policy-review/';
const blob=(name:string)=>execFileSync('git',['show',`${pin}:${root}${name}`],{maxBuffer:16*1024*1024});
const pair=JSON.parse(gunzipSync(blob('A042-paired.json.gz')).toString()),data=pair.candidate;
const setup=JSON.parse(blob('A042-setup.json').toString()).setup;
assert.equal(data.source,sourceVersion());
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const started=performance.now(),rows=[];
for(const [t,idx] of [[3.5,20],[3.55,17],[3.65,20]]){
 const frame=data.ticks.find((x:any)=>x.t===t),prior=data.ticks.find((x:any)=>x.t===Math.round((t-.05)*100)/100);
 const input=new Map<number,any>(frame.raw).get(idx),meta=data.initial[idx],body=structuredClone(frame.before[idx]);
 const player=setup.defense[meta.slot];assert.equal(player.id,meta.id);
 const a=new Agent(idx,'D',meta.slot,player,body.profile,body,{kind:input.job.startsWith('zone:')?'zone':'man',update(){throw Error('No decision repeat');}});
 a.runFit=input.runFit;
 const pictures=new Map<string,any>(frame.pictures),seen=pictures.get(`${idx}:6`);
 const dist=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y);
 const contact=a.profile.radius+data.initial[6].body.profile.radius+a.profile.reach*.65;
 const force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box');
 const offset=(force?Math.abs(leverage(a,seen.pos.y))*a.runFit!.side:leverage(a,seen.pos.y))*clamp((dist-contact)/6,0,1);
 const produced=gatheringApproach(a,seen,contact,offset);
 // No missing target is guessed. Only a full gather that exactly reproduces
 // the native raw request proves this was its already-computed moving goal.
 const matches=produced.gather===1&&hash(produced.near)===hash(input.command);
 const goal={kind:'moving' as const,point:{x:seen.pos.x,y:clamp(seen.pos.y+offset,.3,FIELD_WIDTH-.3)},velocity:seen.vel};
 const peers=data.initial.filter((p:any)=>p.idx>=11&&p.idx!==idx).map((p:any)=>({idx:p.idx,team:'D',profile:p.body.profile,
   get pos(){throw Error('Private peer position');},get vel(){throw Error('Private peer velocity');}} as unknown as Agent));
 const constrained=new Set(prior.contacts.filter((c:any)=>c.i===idx||c.j===idx).length?[a.body]:[]);
 const run=(tagged:boolean)=>{
  const raw:Intent=structuredClone(input.command),command=tagged?withMovementObjective(raw,goal):raw;
  const intents:Intent[]=[command,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
  const before=hash(a.body);let reads=0;
  spaceTeammates([a,...peers],intents,(_a,p)=>{reads++;return pictures.get(`${idx}:${p.idx}`);},{now:t,constrained});
  assert.equal(reads,10);assert.equal(hash(a.body),before);
  return intents[0];
 };
 const native=run(false);assert.equal(hash(native),hash(frame.commands[idx]),'Same-state production pipeline must reproduce before any candidate');
 const candidate=matches?run(true):undefined;
 const samples=(command:Intent)=>previewFreeMovement(a.body,command,t,12);
 rows.push({t,actor:idx,slot:meta.slot,job:input.job,gather:produced.gather,rawMatchesProduced:matches,
  raw:input.command,reproducedNear:produced.near,goal:matches?goal:null,consumedCue:seen,native,candidate,
  changed:!!candidate&&hash(candidate.vel)!==hash(native.vel),ownSpeed:a.speed,
  nativePath:samples(native),candidatePath:candidate?samples(candidate):null});
}
const report={question:'Does missing gather-goal transport prevent an existing useful local action in the saved current helper encounter?',
 accepted:'bb6d4c73948d53ba841dd9338dd240146c739f8c',source:sourceVersion(),evidence:pin,nativeExecutions:0,
 actualPrivatePeerReads:0,rows,elapsedMs:performance.now()-started};
mkdirSync('out/movement-followthrough',{recursive:true});
writeFileSync('out/movement-followthrough/gather-goal-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:rows.map(({nativePath,candidatePath,...r})=>r)}));
