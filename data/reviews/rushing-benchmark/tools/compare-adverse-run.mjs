/** Saved-only comparison of the one native Split Zone adverse. */
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {gunzipSync} from 'node:zlib';
const [bp,cp,op]=process.argv.slice(2);
if(process.argv.length!==5)throw Error('Usage: compare-adverse-run.mjs BASELINE_GZ CANDIDATE_GZ NEW_OUTPUT_JSON');
const sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function check(ok,s){if(!ok)throw Error(s);}
function load(p){const bytes=readFileSync(p);return {json:JSON.parse(gunzipSync(bytes)),receipt:{filename:basename(p),sha256:sha(bytes),bytes:bytes.length}};}
const bb=load(bp),cc=load(cp),b=bb.json.rows[0],c=cc.json.rows[0];
const sources={baseline:'3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f',candidate:'8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006'};
for(const [p,s] of [[bb.json,sources.baseline],[cc.json,sources.candidate]])check(p.schema==='retained-adverse-run-command-panel-v1'&&p.sourceBefore===s&&p.sourceAfter===s&&p.rows.length===1,'Source/identity guard');
check(b.id==='CT-R1-split_zone-under-L-S11'&&c.id===b.id,'Native case differs');
check(bb.json.toolSha256===cc.json.toolSha256&&bb.json.bodyCodecSha256===cc.json.bodyCodecSha256,'Collector/codec differs');
for(const r of [b,c])check(r.observerVerified&&r.parentExecutionExact&&r.parentResultExact&&r.executionSha256===r.plainExecutionSha256&&r.resultSha256===r.plainResultSha256&&same(r.nextRng,r.plainNextRng)&&r.nextRngU32===r.plainNextRngU32,'Native panel/observed/plain receipt differs');
for(const k of ['case','setup','offAlign','physicalInitial','exactInitialBodies','initialRng','profilesSha256','players','panelInitial','panelProfileSha256'])check(same(b[k],c[k]),`Native initial ${k} differs`);
const cSteps=new Map(c.steps.map(s=>[s.t,s])),cCommands=new Map(c.commands.map(v=>[`${v.t}/${v.a}`,v]));
let fork=null,prefix=0;
for(const bs of b.steps){const cs=cSteps.get(bs.t);if(!cs)break;
 const changed=bs.appliedCommands.flatMap((v,i)=>same(v,cs.appliedCommands[i])?[]:[i]);
 if(changed.length){
  const bpics=b.pictures.filter(p=>p.t===bs.t),cpics=c.pictures.filter(p=>p.t===bs.t);
  const bodiesEqual=same(bs.agents,cs.agents),containedEqual=same(bs.containedCommands,cs.containedCommands);
  const rawEqual=bs.commands.every(i=>{const a=b.commands[i],d=cCommands.get(`${a.t}/${a.a}`);return d&&same(a,d);});
  check(bodiesEqual&&containedEqual&&rawEqual&&same(bpics,cpics),'First applied fork lacks exact actual common prefix');
  fork={t:bs.t,changedActors:changed.map(i=>({idx:i,slot:bs.agents[i].slot,baselineRaw:b.commands.find(v=>v.t===bs.t&&v.a===i).rawCommand,candidateRaw:c.commands.find(v=>v.t===bs.t&&v.a===i).rawCommand,baselineContained:bs.containedCommands[i],candidateContained:cs.containedCommands[i],baselineApplied:bs.appliedCommands[i],candidateApplied:cs.appliedCommands[i],bodyBefore:bs.agents[i].body,baselineAchieved:bs.achievedAgents[i].body,candidateAchieved:cs.achievedAgents[i].body,consumedPipelinePictures:bpics.filter(p=>p.a===i&&p.actor===null&&b.players[p.b].team===b.players[i].team)})),all22BeforeWorldStatesExact:bodiesEqual,allActualControllerRecordsExact:rawEqual,allConsumedPicturesExact:same(bpics,cpics),containedCommandsExact:containedEqual};break;
 }
 check(same(bs,cs),`World-step prefix differs at${bs.t}`);prefix++;
}
check(fork?.t===2.15&&fork.changedActors.length===1&&fork.changedActors[0].idx===6,'Expected first quarter fork differs');
const clean=r=>({...r,frames:undefined,telemetry:undefined});
const traceTimes=[2.1,2.15,2.2,3.65,3.7,3.8,3.9,4,4.15,4.25];
const phase=(row,p)=>({source:p.sourceBefore,reference:p.reference,executionSha256:row.executionSha256,plainExecutionSha256:row.plainExecutionSha256,resultSha256:row.resultSha256,plainResultSha256:row.plainResultSha256,nextRng:row.nextRng,plainNextRng:row.plainNextRng,copiedNextU32:row.nextRngU32,plainCopiedNextU32:row.plainNextRngU32,retainedPanelSignature:row.retainedPanelSignature,originalPanelExecutionSha256:row.parentExecutionSha256,result:clean(row.result),selectedTimeline:row.steps.filter(s=>traceTimes.includes(s.t)).map(s=>({t:s.t,ball:s.ball,carrier:s.carrier,selectedActors:s.agents.filter(a=>[6,18,20,21].includes(a.idx)),achievedSelectedActors:s.achievedAgents.filter(a=>[6,18,20,21].includes(a.idx)),commands:s.commands.map(i=>row.commands[i]).filter(a=>[6,18,20,21].includes(a.a)),containedCommands:s.containedCommands.map((v,i)=>({i,v})).filter(a=>[6,18,20,21].includes(a.i)),appliedCommands:s.appliedCommands.map((v,i)=>({i,v})).filter(a=>[6,18,20,21].includes(a.i)),nativeJoints:s.nativeJoints,contacts:s.report.contacts,previousContacts:s.previousContacts}))});
const output={schema:'split-zone-quarter-gather-adverse-comparison-v1',savedOnly:true,newNativeSimulations:0,sources,inputs:{baseline:bb.receipt,candidate:cc.receipt},toolSha256:sha(readFileSync(new URL(import.meta.url))),collectorSha256:bb.json.toolSha256,bodyCodecSha256:bb.json.bodyCodecSha256,id:b.id,case:b.case,setup:b.setup,commonInitial:{setupSha256:sha(JSON.stringify(b.setup)),profilesSha256:b.profilesSha256,exactInitialBodiesSha256:sha(JSON.stringify(b.exactInitialBodies)),panelInitialSha256:sha(JSON.stringify(b.panelInitial)),initialRng:b.initialRng},checks:{allInitialInputsExact:true,bothObservedPlainExecutionsExact:true,bothOriginalSameSourcePanelEndpointSignaturesExact:true,wholeWorldStepPrefixExact:prefix},firstChangedApplied:fork,baseline:phase(b,bb.json),candidate:phase(c,cc.json),limits:['One retained native Split Zone adverse, not a representative distribution.','All native command/body/contact records are inherited from existing dual-execution collector packets. The comparison invokes no simulation, controller, perception or RNG.','This single-case collector clones job/zone at capture; common-prefix equality includes those fields.','Bodies are exact encoded snapshots, not a full PlaySim or coupled-world restart checkpoint.','Collector top comment/one inherited limits string incorrectly say six native inputs; executable case list and source-guarded reference retain exactly this one case.']};
writeFileSync(op,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:op,prefix,firstFork:fork.t,baseline:{gain:b.result.offenseYards,outcome:b.result.outcome},candidate:{gain:c.result.offenseYards,outcome:c.result.outcome},checks:output.checks}));
