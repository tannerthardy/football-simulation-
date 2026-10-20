/** Bounded two-pair integration comparison. Preparation is read-only; execution
 * never retries an attempted game. The candidate smoke is reused in compare.
 * node scripts/checkpoint-games.mjs prepare BASELINE_ROOT CANDIDATE_ROOT MANIFEST
 * node scripts/checkpoint-games.mjs smoke|compare MANIFEST OUT
 */
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const [mode,...args]=process.argv.slice(2), tool=fileURLToPath(import.meta.url);
const collector=join(dirname(tool),'checkpoint-game.mjs');
const sha=x=>createHash('sha256').update(x).digest('hex'), fileSha=p=>sha(readFileSync(p));
const jsonSha=x=>sha(JSON.stringify(x));
const save=(p,x)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p+'.tmp',JSON.stringify(x,null,2)+'\n');renameSync(p+'.tmp',p);};
const commit=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const source=root=>{const walk=d=>readdirSync(join(root,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]).sort();const h=createHash('sha256');for(const f of walk('src'))h.update(f).update('\0').update(readFileSync(join(root,f))).update('\0');return h.digest('hex');};
if(mode==='prepare'){
  const [base,can,out]=args;assert.ok(base&&can&&out&&args.length===3,'prepare BASELINE_ROOT CANDIDATE_ROOT MANIFEST');
  assert.ok(!existsSync(out),'Never overwrite a frozen manifest');
  const baseline=resolve(base),candidate=resolve(can);
  const frozenInputPath=join(baseline,'data/reviews/current/accepted-controller-game-inputs.json');
  const frozen=JSON.parse(readFileSync(frozenInputPath,'utf8'));
  assert.equal(fileSha(frozenInputPath),'09c3796d27265a9e3218e3686a919863c02ded465af10de3815b4e04743d527b','Original four-game packet changed');
  const profile=JSON.parse(readFileSync(join(baseline,'config/baseline.json'),'utf8'));
  const cp=JSON.parse(readFileSync(join(candidate,'config/baseline.json'),'utf8'));
  assert.deepEqual(cp.flags,profile.flags,'Changed flag policy needs explicit manifest decision');
  assert.deepEqual(cp.worldDefaults,profile.worldDefaults,'Changed defaults need explicit manifest decision');
  const fixtures=frozen.fixtures.slice(0,2).map(({teams,...f})=>f);
  for(const f of fixtures)assert.equal(jsonSha(frozen.fixtures.find(x=>x.id===f.id).teams),f.teamsSha256);
  const manifest={schema:'matched-controller-game-inputs-v1',node:process.version,preparedBeforeOutcomes:true,
    previousAccepted:commit(baseline),historicalComparison:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
    arms:Object.fromEntries([['baseline',baseline],['candidate',candidate]].map(([arm,root])=>[arm,{root,commit:commit(root),sourceSha256:source(root)}])),
    frozenInputPath,frozenInputSha256:fileSha(frozenInputPath),fixtures,
    flags:{...profile.flags,RUN_CONTACT_COMPONENTS:'1'},worldDefaults:profile.worldDefaults,
    settings:{record:true,recordLevel:'full',handContact:'center'},
    budget:{gamesPerArm:2,totalGames:4,maxGameSeconds:120,maxCollectionSeconds:100,maxCombinedGameSeconds:480,maxGameSteps:600},
    question:'Does the exact reviewed composition complete ordinary run/pass games with coherent football, rules/stat accounting and acceptable runtime relative to previous accepted source?',
    limits:['Two fixed roster pairs are smoke/transfer evidence, not league-wide or NFL realism validation.','Game histories diverge; match clips by installed call/coverage/field context, not play number alone.','Official credits and raw physical film are reported separately.'],
    tooling:{collectorSha256:fileSha(collector),supervisorSha256:fileSha(tool)},
    executionOrder:['candidate/zone-reference (smoke, reused)','baseline/zone-reference','baseline/spread-air','candidate/spread-air']};
  save(out,manifest);console.log(JSON.stringify({prepared:resolve(out),manifestSha256:fileSha(out),arms:manifest.arms,fixtures:fixtures.map(f=>({id:f.id,seed:f.seed,teamsSha256:f.teamsSha256}))}));process.exit(0);
}
assert.ok(['smoke','compare'].includes(mode)&&args.length===2,'smoke|compare MANIFEST OUT');
const [manifestPath,output]=args,input=resolve(manifestPath),out=resolve(output),m=JSON.parse(readFileSync(input,'utf8'));
assert.equal(fileSha(collector),m.tooling.collectorSha256);assert.equal(fileSha(tool),m.tooling.supervisorSha256);
assert.equal(process.version,m.node);mkdirSync(out,{recursive:true});const ledgerPath=join(out,'batch-ledger.json');
let ledger;
if(existsSync(ledgerPath)){
 ledger=JSON.parse(readFileSync(ledgerPath,'utf8'));assert.equal(ledger.inputSha256,fileSha(input));
}else{
 assert.equal(mode,'smoke','Run candidate smoke first');
 ledger={schema:'matched-controller-game-batch-v1',input,inputSha256:fileSha(input),startedAt:new Date().toISOString(),budget:m.budget,
 games:[['candidate',m.fixtures[0]],['baseline',m.fixtures[0]],['baseline',m.fixtures[1]],['candidate',m.fixtures[1]]].map(([arm,f])=>({arm,id:f.id,seed:f.seed,status:'unrun'}))};save(ledgerPath,ledger);
}
const selected=mode==='smoke'?[ledger.games[0]]:ledger.games.slice(1);
if(mode==='compare')assert.equal(ledger.games[0].status,'complete','A passing smoke is required; never retry or waive a failed smoke');
for(const row of selected){
 assert.equal(row.status,'unrun',`Attempt already exists: ${row.arm}/${row.id}; no automatic retry`);
 const spent=ledger.games.reduce((n,g)=>n+(g.launcherSeconds??0),0),remaining=m.budget.maxCombinedGameSeconds-spent;
 if(remaining<=5){ledger.stopReason='Combined wall budget exhausted';break;}
 const a=m.arms[row.arm];assert.equal(commit(a.root),a.commit);assert.equal(source(a.root),a.sourceSha256);
 const env={...process.env,PATH:dirname(process.execPath)+':'+(process.env.PATH??'')};
 for(const[k,v]of Object.entries(m.flags)){if(v===null)delete env[k];else env[k]=v;}
 row.status='running';row.startedAt=new Date().toISOString();save(ledgerPath,ledger);
 const start=performance.now(),limit=Math.min(m.budget.maxGameSeconds,remaining);
 const result=await new Promise(resolveResult=>{
  const child=spawn(process.execPath,['--import','tsx',collector,'run',input,row.id,row.arm,out,String(limit)],{cwd:a.root,env,stdio:'inherit'});
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},limit*1000);
  child.on('error',error=>{clearTimeout(timer);resolveResult({exitCode:1,error:String(error),timedOut});});
  child.on('exit',(code,signal)=>{clearTimeout(timer);resolveResult({exitCode:code,signal,timedOut});});
 });
 Object.assign(row,result,{launcherSeconds:(performance.now()-start)/1000,finishedAt:new Date().toISOString()});
 const p=join(out,row.arm,row.id,'summary.json');
 if(existsSync(p)){const s=JSON.parse(readFileSync(p,'utf8'));Object.assign(row,{status:s.complete&&result.exitCode===0?'complete':s.censored?'censored':'failed',complete:s.complete,score:s.score,steps:s.steps,summary:p,summarySha256:fileSha(p)});}
 else row.status=result.timedOut?'hard-timeout':'failed-before-summary';
 save(ledgerPath,ledger);if(row.status!=='complete'){ledger.stopReason=`${row.arm}/${row.id}: ${row.status}; no retry`;break;}
}
ledger.lastPhase=mode;ledger.updatedAt=new Date().toISOString();ledger.completed=ledger.games.filter(g=>g.status==='complete').length;ledger.attempted=ledger.games.filter(g=>g.status!=='unrun').length;ledger.launcherSeconds=ledger.games.reduce((n,g)=>n+(g.launcherSeconds??0),0);save(ledgerPath,ledger);
console.log(JSON.stringify({phase:mode,completed:ledger.completed,attempted:ledger.attempted,launcherSeconds:ledger.launcherSeconds,stopReason:ledger.stopReason??null}));
if(ledger.stopReason||selected.some(g=>g.status!=='complete'))process.exitCode=1;
