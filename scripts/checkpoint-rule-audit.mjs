/** Read saved Game summaries only; no engine import, replay or new observation.
 * node scripts/checkpoint-rule-audit.mjs OUT
 * Generic represented-model limitations are review items, not automatic failures.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const out=process.argv[2];assert.ok(out,'OUT required');
const ledger=JSON.parse(readFileSync(join(out,'batch-ledger.json'),'utf8'));
const result={schema:'matched-game-rule-audit-v1',inputSha256:ledger.inputSha256,hardFailures:[],games:[],limits:['A recorded limitation does not itself establish an illegally awarded result. Preserve and review its exact play context.','Missing historical FoulRecords/officialCredit are unavailable, not proof that the previous accepted build had no fouls.','No game or rules-source code is executed by this audit.']};
for(const row of ledger.games){
 if(row.status==='unrun')continue;
 const key=`${row.arm}/${row.id}`;
 if(row.status!=='complete')result.hardFailures.push({game:key,reason:'Attempt incomplete or failed',status:row.status});
 if(!row.summary||!existsSync(row.summary))continue;
 const summary=JSON.parse(readFileSync(row.summary,'utf8'));
 if(summary.error||summary.artifactError)result.hardFailures.push({game:key,reason:'Recorded collector/engine/artifact error',error:summary.error,artifactError:summary.artifactError});
 const g={game:key,commit:summary.provenance.commit,sourceSha256:summary.provenance.sourceSha256,
  byKind:{},calledKinds:{},assessments:{},limitations:[],calledRecords:0,calledWithoutVisibleDisposition:[],acceptedScrimmageWithoutOfficialView:[],unresolvedRecords:[],officialTreatments:{},statisticalLimitations:[]};
 for(const p of summary.log){
  g.byKind[p.kind]=(g.byKind[p.kind]??0)+1;
  const fouls=p.fouls??(p.foul?[p.foul]:[]),records=p.foulRecords??[];
  for(const f of fouls)g.calledKinds[f.kind]=(g.calledKinds[f.kind]??0)+1;
  for(const r of records){
   g.assessments[r.assessment]=(g.assessments[r.assessment]??0)+1;
   if(r.assessment==='unresolved')g.unresolvedRecords.push({index:p.index,kind:p.kind,call:p.call,record:r});
   if(r.called){g.calledRecords++;if(!fouls.some(f=>f.kind===r.kind))g.calledWithoutVisibleDisposition.push({index:p.index,call:p.call,record:r});}
  }
  if(['run','pass'].includes(p.kind)&&fouls.some(f=>f.accepted&&!f.offset)&&!p.official)
   g.acceptedScrimmageWithoutOfficialView.push({index:p.index,call:p.call,fouls});
  for(const text of p.ruleLimitations??[])g.limitations.push({index:p.index,kind:p.kind,call:p.call,outcome:p.outcome,rawYards:p.yards,nullified:p.nullified??false,official:p.official??null,officialCredit:p.officialCredit??null,text});
  if(p.officialCredit){g.officialTreatments[p.officialCredit.treatment]=(g.officialTreatments[p.officialCredit.treatment]??0)+1;for(const text of p.officialCredit.limitations??[])g.statisticalLimitations.push({index:p.index,text});}
 }
 // These are missing contract outputs, rather than generic model limitations.
 if(g.calledWithoutVisibleDisposition.length)result.hardFailures.push({game:key,reason:'Called native/legacy foul record has no visible Game disposition',plays:g.calledWithoutVisibleDisposition});
 if(g.acceptedScrimmageWithoutOfficialView.length)result.hardFailures.push({game:key,reason:'Accepted scrimmage foul lacks explicit official enforcement view',plays:g.acceptedScrimmageWithoutOfficialView});
 result.games.push(g);
}
result.passed=result.hardFailures.length===0;
result.reviewItems=result.games.reduce((n,g)=>n+g.limitations.length+g.unresolvedRecords.length,0);
writeFileSync(join(out,'rule-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,games:result.games.length,reviewItems:result.reviewItems,hardFailures:result.hardFailures,summary:result.games.map(g=>({game:g.game,calledKinds:g.calledKinds,assessments:g.assessments,limitations:g.limitations.length,unresolvedRecords:g.unresolvedRecords.length,officialTreatments:g.officialTreatments}))}));
if(!result.passed)process.exitCode=1;
