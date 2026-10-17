/** Zero-engine independent PR106 review. Evaluate exact pinned TS with stub IO/measure. */
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const cp = require('node:child_process');
const path = require('node:path');
const ts = require(process.env.PR106_TYPESCRIPT_PATH || 'typescript');
const assert = require('node:assert/strict');
const PIN = '706a10cc22e87a5fced54641f00a5db2df249b4b';
const source = f => cp.execFileSync('git', ['show', PIN + ':' + f], {encoding:'utf8'});
const sha = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const transpile = (s, imports, globals={}) => {
  const js=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(js,{exports,require:n=>{if(n in imports)return imports[n];throw Error('Forbidden import '+n)},console:{log(){}},performance:{now:()=>0},process:{version:'stub',platform:'stub',arch:'stub',env:{}},structuredClone,Map,Set,...globals});
  return exports;
};
const report=transpile(source('scripts/diag/pass-suite-report.ts'),{});
const m={schema:'pass-game-manifest-v1',reference:{source:'reference'},budgets:{simulationSeconds:20,caseMs:5000,campaignMs:1800000},cases:[1,2,3].map(n=>({id:'case'+n,inputSha256:'input'+n,groups:['x'],concept:'stub',look:'x',formation:'stub',roster:'stub',context:'stub'})),looks:{x:{coverage:{id:'stub'}}},routes:{},pairs:[],limitations:[]};
let calls=0,behavior='wall';
const io=new Map();
const baseRow=c=>({case:c,status:behavior==='wall'?'censored-wall':'failed',error:behavior==='wall'?null:'injected numerical failure',elapsedMs:1,steps:4,physicalSignature:'partial-physical',initialSha256:'initial',metrics:{completedOutcome:false,attempted:false,completed:false,yac:null,gain:null,catchAt:null,throwAt:null,firstPostCatchContactAt:null,interception:null},observation:{firstLoaded:null,grasps:[],firstBodyContact:null,catchPicture:null,snapshots:[{reason:'partial-prefix'}]}});
const runnerSource=source('scripts/diag/pass-game-suite.ts').replace(/^if\(process\.argv\[1\].*$/m,'');
const runner=transpile(runnerSource,{
 'node:crypto':crypto,'node:zlib':zlib,'node:path':path,'node:url':require('node:url'),
 'node:child_process':{execFileSync:()=> 'stub-checkout'},
 'node:fs':{existsSync:p=>io.has(p),mkdirSync(){},readFileSync:p=>{
  if(io.has(p))return Buffer.from(io.get(p));
  if(p==='config/baseline.json')return Buffer.from(JSON.stringify({flags:{},worldDefaults:{}}));
  return Buffer.from('stub material '+p);
 },writeFileSync:(p,v)=>io.set(p,Buffer.from(v)),renameSync:(a,b)=>{io.set(b,io.get(a));io.delete(a)}},
 '../../src/playbook/routes.js':{ROUTES:{}},'../source-version.js':{sourceVersion:()=> 'reference'},
 './pass-suite-cases.js':{sha,validateManifest(){},buildManifest:()=>m},
 './pass-suite-measure.js':{measure:(_,c)=>{calls++;if(behavior==='throw')throw Error('injected constructor/finalization exception');return baseRow(c)}},
 './pass-suite-report.js':report
});
const summarize=i=>({status:i.status,newCases:i.runtime.newCases,cachedCases:i.runtime.cachedCases,rows:i.rows.length,failed:report.aggregate(i.rows).failed,censored:report.aggregate(i.rows).unfinished,skipped:i.skipped,failure:i.failure,measureCalls:calls});
const first=runner.runCampaign(m,'/wall',{checkpoint:'stub initial wall'});
const firstSummary=summarize(first);const partialCache=first.rows[0].cache;
const resumed=runner.runCampaign(m,'/wall',{checkpoint:'stub same output no retry'});
const resumeSummary={...summarize(resumed),partialCacheStillPresent:io.has(partialCache),publishedIndexRows:runner.readIndex('/wall/index.json').rows.length};
assert.equal(first.rows.length,1);assert.equal(first.skipped.length,2);assert.equal(calls,1);
assert.equal(resumed.rows.length,0);assert.deepEqual(Array.from(resumed.skipped),['case1','case2','case3']);assert.equal(report.aggregate(resumed.rows).unfinished,0);
behavior='failed';const failedFirst=runner.runCampaign(m,'/failed',{checkpoint:'stub returned failed prefix'});const failedInitial=summarize(failedFirst);
const failedResume=runner.runCampaign(m,'/failed',{checkpoint:'stub returned failed prefix reuse'});const failedResumed=summarize(failedResume);
assert.equal(failedFirst.rows.length,1);assert.equal(failedResume.rows.length,0);assert.equal(failedResumed.failed,0);
behavior='throw';const thrown=runner.runCampaign(m,'/throw',{checkpoint:'stub thrown measurement'});const thrownSummary=summarize(thrown);assert.equal(thrown.rows.length,0);assert.equal(thrown.runtime.newCases,0);
const html=report.html({...report.makeReport(first,m),checkpoint:'</script><script>injected</script>'});
assert.equal(html.includes('</script><script>injected'),false);
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log(JSON.stringify({schema:'pr106-stubbed-failure-review-v1',pin:PIN,engineImports:0,nativePlays:0,decision:'HOLD',sourceSha256:crypto.createHash('sha256').update(source('scripts/diag/pass-game-suite.ts')).digest('hex'),firstWall:firstSummary,resumedWall:resumeSummary,firstFailed:failedInitial,resumedFailed:failedResumed,uncaughtMeasure:thrownSummary,html:{scriptParse:'pass',delimiterEscaping:'pass'},limits:'Stubbed orchestration only; no claim of new native evidence or actual constructor failure frequency.'},null,2));
