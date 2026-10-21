/** Explicit saved-only six-case first-fork proof; full traces remain ignored. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { decodeBody, encodeBody } from './native-body-codec.mjs';
const [baselinePath,candidatePath,comparisonPath,outputPath,receiptPath]=process.argv.slice(2);
if(process.argv.length!==7)throw Error('Usage: reduce-six-tail-proof.mjs BASELINE_GZ CANDIDATE_GZ COMPARISON_JSON OUTPUT_GZ RECEIPT_JSON');
const sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function check(ok,message){if(!ok)throw Error(message);}
const read=p=>{const bytes=readFileSync(p);return {bytes,sha256:sha(bytes),data:JSON.parse(gunzipSync(bytes))};};
const b=read(baselinePath),c=read(candidatePath),comparisonBytes=readFileSync(comparisonPath),comparison=JSON.parse(comparisonBytes);
const sourceB='3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f',sourceC='8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006';
check(b.data.sourceBefore===sourceB&&b.data.sourceAfter===sourceB&&c.data.sourceBefore===sourceC&&c.data.sourceAfter===sourceC,'Source pin mismatch');
check(comparison.inputs.baseline.sha256===b.sha256&&comparison.inputs.candidate.sha256===c.sha256,'Comparison raw packet mismatch');
const codecSha256=sha(readFileSync(new URL('./native-body-codec.mjs',import.meta.url)));
check(b.data.toolSha256===c.data.toolSha256&&b.data.bodyCodecSha256===codecSha256&&c.data.bodyCodecSha256===codecSha256,'Observer/codec differs');
const counts={identities:0,phaseWindows:0,commands:0,pictures:0,steps:0,bodyRoundTrips:0,exactCopies:0,resolvedPictureReferences:0,resolvedCommandReferences:0};
function copy(x){const v=JSON.parse(JSON.stringify(x));check(same(x,v),'Record copy differs');counts.exactCopies++;return v;}
function body(encoded){check(same(encodeBody(decodeBody(encoded)),encoded),'Encoded body round-trip differs');counts.bodyRoundTrips++;}
const selection=comparison.rows.map(row=>{
 const first=row.commonPrefix.firstChangedApplied?.t;
 const times=first===undefined?[]:[first-.05,first,first+.05].map(t=>Math.round(t*100)/100);
 if(row.id==='DA-R2-curl_flat-cover2-R')times.push(4.15,4.20,4.25);
 return {id:row.id,times:[...new Set(times)].sort((a,b)=>a-b),firstChangedAppliedAt:first??null,
  reason:first===undefined?'Unchanged execution guard; retain initial/outcome/endpoint/RNG receipts.':'First applied command fork ± one native tick; C2R also retains the declared native half/quarter gather control ticks.'};
});
const commonRows=b.data.rows.map(before=>{
 const after=c.data.rows.find(r=>r.id===before.id);check(!!after,'Missing identity');counts.identities++;
 const keys=['id','case','setup','offAlign','physicalInitial','exactInitialBodies','initialRng','profilesSha256','players'];
 for(const k of keys)check(same(before[k],after[k]),`Actual common initial ${k} differs`);
 for(const initial of before.exactInitialBodies)body(initial.body);
 return Object.fromEntries(keys.map(k=>[k,copy(before[k])]));
});
const phases=[['baseline',b],['candidate',c]].map(([label,phase])=>({label,sourceBefore:phase.data.sourceBefore,sourceAfter:phase.data.sourceAfter,
 raw:{filename:basename(label==='baseline'?baselinePath:candidatePath),sha256:phase.sha256,bytes:phase.bytes.length,fullRawPublished:false},
 rows:phase.data.rows.map(row=>{
  check(row.observerVerified&&row.executionSha256===row.plainExecutionSha256&&row.resultSha256===row.plainResultSha256
   &&same(row.nextRng,row.plainNextRng)&&row.nextRngU32===row.plainNextRngU32,'Native observed/plain receipt differs');
  const plan=selection.find(s=>s.id===row.id),receiptKeys=['executionSha256','plainExecutionSha256','resultSha256','plainResultSha256',
   'nextRng','plainNextRng','nextRngU32','plainNextRngU32','observerVerified','parentExecutionExact','parentResultExact','parentExecutionSha256'];
  const {frames:_frames,telemetry:_telemetry,...result}=row.result;
  check(sha(JSON.stringify(result))===row.resultSha256,'Clean result hash differs');
  const windows=plan.times.map(t=>{
   counts.phaseWindows++;
   const commands=row.commands.flatMap((record,originalIndex)=>record.t===t?[{originalIndex,record:copy(record)}]:[]);
   const pictures=row.pictures.flatMap((record,originalIndex)=>record.t===t?[{originalIndex,record:copy(record)}]:[]);
   const steps=row.steps.flatMap((record,originalIndex)=>record.t===t?[{originalIndex,record:copy(record)}]:[]);
   check(steps.length===1&&commands.length===22,`Missing complete native window ${row.id}/${t}`);
   const commandIds=new Set(commands.map(item=>item.originalIndex)),pictureIds=new Set(pictures.map(item=>item.originalIndex));
   for(const item of commands){body(item.record.bodyBefore);
    for(let i=item.record.picturesFrom;i<item.record.picturesTo;i++){check(pictureIds.has(i),'Missing consumed controller picture');counts.resolvedPictureReferences++;}
    for(const i of item.record.windowPictureIndices)check(pictureIds.has(i),'Missing actual catch-window picture');
   }
   for(const item of steps){const s=item.record;
    check(s.agents.length===22&&s.achievedAgents.length===22&&s.containedCommands.length===22&&s.appliedCommands.length===22,'Missing whole-world context');
    for(const i of s.commands){check(commandIds.has(i),'Missing actual raw World input');counts.resolvedCommandReferences++;}
    // Diagnostic job is an aliased mutable object in the original observer.
    // Omit it rather than present future mutations as a captured earlier cue.
    for(const a of [...s.agents,...s.achievedAgents]){body(a.body);delete a.job;}
   }
   counts.commands+=commands.length;counts.pictures+=pictures.length;counts.steps+=steps.length;
   return {t,commands,pictures,steps};
  });
  return {id:row.id,initialBodiesSha256:sha(JSON.stringify(row.exactInitialBodies)),setupSha256:sha(JSON.stringify(row.setup)),
   ...Object.fromEntries(receiptKeys.map(k=>[k,copy(row[k])])),result:copy(result),windows};
 })}));
check(counts.identities===6&&counts.phaseWindows===24&&counts.steps===24&&counts.commands===528,'Unexpected explicit selection count');
const packet={schema:'six-tail-quarter-gather-selected-proof-v1',sources:{baseline:sourceB,candidate:sourceC},
 provenance:{collectorSha256:b.data.toolSha256,bodyCodecSha256:codecSha256,reducerSha256:sha(readFileSync(new URL(import.meta.url))),
 comparison:{filename:basename(comparisonPath),sha256:sha(comparisonBytes)},originalReference:b.data.reference},
 selection,definitions:{indices:'Original full-row command/picture indices preserved in complete record wrappers, no renumbering.',
  initial:'Shared all-six actual setups/players/profiles/encoded bodies and inherited legacy mind/recognition JSON projection retained once; validated equal across fresh executions.',
  omittedFields:['result.frames','result.telemetry','steps.agents[].job','steps.achievedAgents[].job'],
  jobOmission:'Original collector actorState.job was not cloned and can reflect later native mutations. Physical common-prefix proof excludes only this aliased job metadata; do not treat omitted job as null or unknown responsibility.',
  scope:'Explicit first-quarter applied-request windows and requested positive controls; not all native sampling. Full raw packets are not published.',
  endpoint:'Full clean result/events/stats/endpoint and complete recorded/plain/copy-RNG receipts for each of all six native cases.'},
 checks:counts,commonRows,phases,
 limits:['Six retrospective witnesses, not a representative distribution.','Legacy physicalInitial/minds are not restart checkpoints.',
  'Decoded exact bodies can support free previews; active contact constraints and full controller/recognition state are not complete checkpoints.']};
const utf8=Buffer.from(JSON.stringify(packet)),gzip=gzipSync(utf8,{level:9});check(same(JSON.parse(gunzipSync(gzip)),packet),'Compression round-trip differs');
writeFileSync(outputPath,gzip,{flag:'wx'});
const receipt={schema:'six-tail-quarter-gather-selected-proof-receipt-v1',savedOnly:true,newSimulations:0,sources:packet.sources,
 subset:{filename:basename(outputPath),sha256:sha(gzip),bytes:gzip.length,decodedUtf8Sha256:sha(utf8),decodedUtf8Bytes:utf8.length},
 rawPackets:phases.map(p=>({label:p.label,source:p.sourceBefore,...p.raw})),provenance:packet.provenance,selection,checks:counts,
 parity:{allSixCommonInitialPinsExact:true,all12StoredObservedPlainExecutionsExact:true,all12CleanResultsRehashed:true,allNativeReferenceIndicesResolved:true,allBodyRoundTripsExact:true},
 omittedFields:packet.definitions.omittedFields,jobOmission:packet.definitions.jobOmission,
 reproduction:{baseline:'node --import tsx native-tail-commands.ts PINNED_3CB_ARCHIVE '+sourceB+' NEW_BASELINE_GZ ORIGINAL_601_COVERAGE_FINAL_GZ',
 candidate:'node --import tsx native-tail-commands.ts PINNED_8D2_ARCHIVE '+sourceC+' NEW_CANDIDATE_GZ ORIGINAL_601_COVERAGE_FINAL_GZ',
 reducer:'node reduce-six-tail-proof.mjs BASELINE_GZ CANDIDATE_GZ COMPARISON_JSON NEW_PROOF_GZ NEW_RECEIPT_JSON'}};
writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:outputPath,bytes:gzip.length,sha256:sha(gzip),checks:counts}));
