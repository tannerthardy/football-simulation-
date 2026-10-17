/** Run only the declared four-game checkpoint, once, under a single profile. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';

const [input,out]=process.argv.slice(2);
assert.ok(input&&out,'Usage: accepted-game-batch.mjs INPUT OUT');
const manifest=JSON.parse(readFileSync(input,'utf8'));
assert.equal(manifest.fixtures.length,4);
assert.equal(manifest.budget.totalGames,4);
mkdirSync(out,{recursive:true});
const ledgerPath=join(out,'batch-ledger.json');
assert.ok(!existsSync(ledgerPath),'Never restart or overwrite an attempted batch');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const start=performance.now();
const ledger={schema:'accepted-game-batch-v1',input,inputSha256:sha(input),
  collectorSha256:sha('scripts/accepted-game-audit.mjs'),supervisorSha256:sha(import.meta.filename),
  startedAt:new Date().toISOString(),budget:manifest.budget,
  games:manifest.fixtures.map(f=>({id:f.id,seed:f.seed,status:'unrun'}))};
const save=()=>{writeFileSync(`${ledgerPath}.tmp`,JSON.stringify(ledger,null,2)+'\n');renameSync(`${ledgerPath}.tmp`,ledgerPath);};
save();
for(const row of ledger.games){
  const remaining=manifest.budget.maxCombinedGameSeconds-(performance.now()-start)/1000;
  if(remaining<=1){ledger.stopReason='Combined wall budget exhausted';break;}
  row.status='running';row.startedAt=new Date().toISOString();save();
  const gameStart=performance.now(),limit=Math.min(manifest.budget.maxGameSeconds,remaining);
  const result=await new Promise(resolve=>{
    const child=spawn(process.execPath,['--import','tsx','scripts/accepted-game-audit.mjs','run',input,row.id,'accepted',out],
      {stdio:'inherit',env:{...process.env,CHECKPOINT_REMAINING_SECONDS:String(limit)}});
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},limit*1000);
    child.on('error',error=>{clearTimeout(timeout);resolve({exitCode:1,error:String(error),timedOut});});
    child.on('exit',(code,signal)=>{clearTimeout(timeout);resolve({exitCode:code,signal,timedOut});});
  });
  Object.assign(row,result,{launcherSeconds:(performance.now()-gameStart)/1000,finishedAt:new Date().toISOString()});
  const summaryPath=join(out,'accepted',row.id,'summary.json');
  if(existsSync(summaryPath)){
    const summary=JSON.parse(readFileSync(summaryPath,'utf8'));
    Object.assign(row,{status:summary.complete&&result.exitCode===0?'complete':summary.status??'failed',
      complete:summary.complete,score:summary.score,steps:summary.steps,
      summary:summaryPath,summarySha256:sha(summaryPath)});
  }else row.status=result.timedOut?'hard-timeout':'failed-before-summary';
  save();
  if(row.status!=='complete'){ledger.stopReason=`${row.id}: ${row.status}; remaining fixtures unrun, no retry`;break;}
}
ledger.finishedAt=new Date().toISOString();
ledger.elapsedSeconds=(performance.now()-start)/1000;
ledger.completed=ledger.games.filter(g=>g.status==='complete').length;
ledger.attempted=ledger.games.filter(g=>g.status!=='unrun').length;
ledger.withinBudget=ledger.elapsedSeconds<=manifest.budget.maxCombinedGameSeconds+0.25;
save();
console.log(JSON.stringify({batchComplete:ledger.completed===4,completed:ledger.completed,attempted:ledger.attempted,elapsedSeconds:ledger.elapsedSeconds,stopReason:ledger.stopReason}));
if(ledger.completed!==4||!ledger.withinBudget)process.exitCode=1;
