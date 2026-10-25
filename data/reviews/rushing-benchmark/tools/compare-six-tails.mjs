/** Saved-only native counterfactual comparison; no engine or prediction imports. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { gunzipSync } from 'node:zlib';
const [baselinePath,candidatePath,originalSubsetPath,outputPath]=process.argv.slice(2);
if(process.argv.length!==6)throw Error('Usage: compare-six-tails.mjs BASELINE_JSON_GZ CANDIDATE_JSON_GZ ORIGINAL_WITNESS_JSON_GZ OUTPUT_JSON');
const sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Published collector stores job by reference. Do not use later-mutated job
// objects as evidence of the actual earlier native state.
const prefixState=a=>({...a,job:undefined});
const prefixStep=s=>({...s,agents:s.agents.map(prefixState),achievedAgents:s.achievedAgents.map(prefixState)});
const requireCheck=(ok,message)=>{if(!ok)throw Error(message);};
function packet(path){const bytes=readFileSync(path);return {bytes,json:JSON.parse(gunzipSync(bytes)),sha256:sha(bytes)};}
const bb=packet(baselinePath),cc=packet(candidatePath),oo=packet(originalSubsetPath),baseline=bb.json,candidate=cc.json,original=oo.json;
const sourceB='3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f',sourceC='8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006';
requireCheck(baseline.sourceBefore===sourceB&&baseline.sourceAfter===sourceB,'Fresh baseline source differs');
requireCheck(candidate.sourceBefore===sourceC&&candidate.sourceAfter===sourceC,'Candidate source differs');
requireCheck(baseline.rows.length===6&&candidate.rows.length===6&&original.rows.length===6,'Exactly six original cases required');
requireCheck(baseline.toolSha256===candidate.toolSha256&&baseline.bodyCodecSha256===candidate.bodyCodecSha256,'Observer/decoder differs');
const eventTypes=new Set(['throw','catch','interception','carrier_contact','tackle_wrap','broken_tackle','missed_tackle','tackle','touchdown','oob','fall']);
const outcome=r=>({offenseYards:r.result.offenseYards,outcome:r.result.outcome,endX:r.result.endX,endY:r.result.endY,
 duration:r.result.duration,turnover:r.result.turnover,stats:r.result.stats,
 timeline:r.result.events.filter(e=>eventTypes.has(e.type))});
const rows=[];
for(const b of baseline.rows){
 const c=candidate.rows.find(r=>r.id===b.id),o=original.rows.find(r=>r.id===b.id);
 requireCheck(c&&o,`Missing original identity ${b.id}`);
 for(const r of [b,c])requireCheck(r.observerVerified&&r.executionSha256===r.plainExecutionSha256
  &&r.resultSha256===r.plainResultSha256&&same(r.nextRng,r.plainNextRng)&&r.nextRngU32===r.plainNextRngU32,`${r.id}: Native recording parity differs`);
 for(const key of ['case','setup','offAlign','physicalInitial','exactInitialBodies','initialRng','profilesSha256','players'])
  requireCheck(same(b[key],c[key])&&same(b[key],o[key]),`${b.id}: Actual ${key} differs`);
 requireCheck(b.executionSha256===o.executionSha256&&b.resultSha256===o.resultSha256,`${b.id}: 3cb execution differs from retained601`);
 const cSteps=new Map(c.steps.map(s=>[s.t,s]));
 const bCommands=new Map(b.commands.map(cmd=>[`${cmd.t}/${cmd.a}`,cmd]));
 const cCommands=new Map(c.commands.map(cmd=>[`${cmd.t}/${cmd.a}`,cmd]));
 let firstChangedApplied=null,firstChangedRaw=null,firstChangedBody=null,firstChangedAchieved=null;
 const changedActors=new Set(),commandChanges=[];
 for(const bs of b.steps){
  const cs=cSteps.get(bs.t);if(!cs)continue;
  const appliedChanged=[];
  for(let a=0;a<22;a++){
   const bc=bCommands.get(`${bs.t}/${a}`),dc=cCommands.get(`${bs.t}/${a}`);
   if(bc&&dc&&!same(bc.rawCommand,dc.rawCommand)&&!firstChangedRaw)
    firstChangedRaw={t:bs.t,a,slot:bs.agents[a].slot,baseline:bc.rawCommand,candidate:dc.rawCommand};
   if(!same(bs.agents[a].body,cs.agents[a].body)&&!firstChangedBody)
    firstChangedBody={t:bs.t,a,slot:bs.agents[a].slot,baseline:bs.agents[a].body,candidate:cs.agents[a].body};
   if(!same(bs.achievedAgents[a].body,cs.achievedAgents[a].body)&&!firstChangedAchieved)
    firstChangedAchieved={t:bs.t,a,slot:bs.agents[a].slot,baseline:bs.achievedAgents[a].body,candidate:cs.achievedAgents[a].body};
   if(!same(bs.appliedCommands[a],cs.appliedCommands[a])){
    changedActors.add(bs.agents[a].slot);appliedChanged.push(a);
    if(commandChanges.length<12)commandChanges.push({t:bs.t,a,slot:bs.agents[a].slot,baseline:bs.appliedCommands[a],candidate:cs.appliedCommands[a]});
   }
  }
  if(appliedChanged.length&&!firstChangedApplied){
   const beforeEqual=same(bs.agents.map(prefixState),cs.agents.map(prefixState)),rawsEqual=bs.commands.every(i=>{
    const bc=b.commands[i],dc=cCommands.get(`${bc.t}/${bc.a}`);return dc&&same(bc.rawCommand,dc.rawCommand)&&same(bc.bodyBefore,dc.bodyBefore)&&same(bc.mindBefore,dc.mindBefore);
   });
   const picturesB=b.pictures.filter(p=>p.t===bs.t),picturesC=c.pictures.filter(p=>p.t===bs.t);
   firstChangedApplied={t:bs.t,actors:appliedChanged.map(a=>({a,slot:bs.agents[a].slot,baselineRaw:bCommands.get(`${bs.t}/${a}`)?.rawCommand,
    candidateRaw:cCommands.get(`${bs.t}/${a}`)?.rawCommand,baselineContained:bs.containedCommands[a],candidateContained:cs.containedCommands[a],
    baselineApplied:bs.appliedCommands[a],candidateApplied:cs.appliedCommands[a],bodyBefore:bs.agents[a].body,
    baselineAchieved:bs.achievedAgents[a].body,candidateAchieved:cs.achievedAgents[a].body,
    consumedPipelinePictures:picturesB.filter(p=>p.a===a&&p.actor===null&&b.players[p.b].team===b.players[a].team)
   })),all22BeforeWorldStatesEqual:beforeEqual,all22ActualRawBodiesMindsAndRequestsEqual:rawsEqual,
   allConsumedPicturesEqual:same(picturesB,picturesC),containedCommandsEqual:same(bs.containedCommands,cs.containedCommands)};
   requireCheck(beforeEqual&&rawsEqual&&same(picturesB,picturesC)&&same(bs.containedCommands,cs.containedCommands),`${b.id}: First applied change does not share actual common prefix`);
  }
 }
 const beforeFirst=firstChangedApplied?firstChangedApplied.t:Infinity;
 const commonPrefixSteps=b.steps.filter(s=>s.t<beforeFirst&&cSteps.has(s.t));
  requireCheck(commonPrefixSteps.every(s=>same(prefixStep(s),prefixStep(cSteps.get(s.t)))),`${b.id}: Actual World-step prefix differs before first instruction`);
 const row={id:b.id,case:b.case,setupSha256:sha(JSON.stringify(b.setup)),exactInitialBodiesSha256:sha(JSON.stringify(b.exactInitialBodies)),
  initialRng:b.initialRng,profilesSha256:b.profilesSha256,observerPlainParity:true,retained601BaselineExecutionExact:true,
  baselineExecutionSha256:b.executionSha256,baselinePlainExecutionSha256:b.plainExecutionSha256,
  candidateExecutionSha256:c.executionSha256,candidatePlainExecutionSha256:c.plainExecutionSha256,
  baselineResultSha256:b.resultSha256,candidateResultSha256:c.resultSha256,
  baselineNextRng:b.nextRng,candidateNextRng:c.nextRng,baselineCopiedNextU32:b.nextRngU32,candidateCopiedNextU32:c.nextRngU32,
  exactExecutionUnchanged:b.executionSha256===c.executionSha256,exactResultUnchanged:b.resultSha256===c.resultSha256,
  offenseYardsDelta:c.result.offenseYards-b.result.offenseYards,baseline:outcome(b),candidate:outcome(c),
  commonPrefix:{wholeWorldStepsExceptUnclonedJobMetadataExact:commonPrefixSteps.length,through:commonPrefixSteps.at(-1)?.t??null,
   firstChangedApplied,firstChangedRaw,firstChangedBody,firstChangedAchieved},
  changedAppliedActorSlots:[...changedActors],first12AppliedCommandChanges:commandChanges,
  teamContacts:{baseline:b.steps.flatMap(s=>s.report.contacts.filter(contact=>b.players[contact.i].team===b.players[contact.j].team).map(contact=>({t:s.t,...contact}))),
   candidate:c.steps.flatMap(s=>s.report.contacts.filter(contact=>c.players[contact.i].team===c.players[contact.j].team).map(contact=>({t:s.t,...contact})))}}
 rows.push(row);
}
const result={schema:'six-tail-quarter-gather-native-comparison-v1',sources:{baseline:sourceB,candidate:sourceC,retainedOriginal:original.sourceBefore},
 inputs:{baseline:{filename:basename(baselinePath),sha256:bb.sha256,bytes:bb.bytes.length},candidate:{filename:basename(candidatePath),sha256:cc.sha256,bytes:cc.bytes.length},
 originalSavedWitness:{filename:basename(originalSubsetPath),sha256:oo.sha256},collectorSha256:baseline.toolSha256,bodyCodecSha256:baseline.bodyCodecSha256},
 comparisonToolSha256:sha(readFileSync(new URL(import.meta.url))),checks:{sixActualSetupsPlayersAndEncodedInitialBodiesExact:true,all12ObservedPlainExecutionsEqual:true,
 allSixFresh3cbExecutionsExactRetained601:true,allFirstAppliedChangesHaveExactBodyMindRequestPicturePrefixes:true},
 summary:{nativeCases:6,exactExecutionsUnchanged:rows.filter(r=>r.exactExecutionUnchanged).length,exactResultsUnchanged:rows.filter(r=>r.exactResultUnchanged).length,
  offenseYardsChanged:rows.filter(r=>r.offenseYardsDelta!==0).length,offenseYardsDeltas:rows.map(r=>({id:r.id,delta:r.offenseYardsDelta}))},
 limits:['Six deliberately retained native tail cases, not a representative football distribution.',
 'Outcome parity does not imply identical pursuit or contact trajectories. All adverse mirror outcomes retained.',
 'Recorders capture controller returns and actual World commands; no extra observations, controls or RNG calls.',
 'Original actorState.job is not cloned at capture and can be mutated later. Common-prefix comparison excludes only this aliased metadata object; exact bodies/raw requests/consumed pictures/World reports remain required.'],rows};
writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:outputPath,bytes:Buffer.byteLength(JSON.stringify(result,null,2)+'\n'),summary:result.summary,
 firstChanges:rows.map(r=>({id:r.id,t:r.commonPrefix.firstChangedApplied?.t??null,actors:r.commonPrefix.firstChangedApplied?.actors.map(a=>a.slot)??[]}))}));
