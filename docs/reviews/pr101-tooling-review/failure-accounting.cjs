// Execute only the extracted CLI orchestration with in-memory stubs. No engine imports.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {resolve}=require('node:path'),{createRequire}=require('node:module');
if(!process.argv[2])throw new Error('Explicit frozen source checkout required');
const target=resolve(process.argv[2]);process.chdir(target);fs.mkdirSync('out/pr101-review',{recursive:true});
const ts=createRequire(resolve(target,'package.json'))('typescript');
const source=fs.readFileSync('scripts/diag/run-action-suite.ts','utf8');
const main=source.slice(source.indexOf('async function main()'),source.indexOf("if(process.argv[1]"));
const js=ts.transpile(main+'\nglobalThis.invoke=main;', {target:ts.ScriptTarget.ES2022});
const results=[];
async function run(kind){
 const writes={},cases=['first','second','third'].map(id=>({id,inputSha256:id}));let attempts=0;
 const m={host:'accepted',cases,budgets:{campaignMs:100000,caseMs:5000,simulationSeconds:20}};
 const p={source:'668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac'};
 const sandbox={process:{argv:['node','collector','run','manifest','output','--checkpoint','offline review stub'],exitCode:0},
  readJSON:()=>m,validateManifest:()=>{},provenance:()=>p,performance:{now:()=>0},execFileSync:()=> 'frozen-head',
  mkdirSync:()=>{},join:(...s)=>s.join('/'),existsSync:()=>false,sha:JSON.stringify,caseKey:(_,c)=>c.id,
  writeJSON:(path,value)=>writes[path]=value,q:x=>x,console:{log:()=>{}},
  measure:(_,c)=>{attempts++;if(kind==='exception')throw Error('Material physics discrepancy (stub)');return {case:c,status:'censored-wall',metrics:{terminal:false,gain:null},observation:{frames:['last valid saved state']}};}};
 vm.createContext(sandbox);vm.runInContext(js,sandbox);await sandbox.invoke();
 const index=writes['output/index.json'];const result={scenario:kind,stubbedAttempts:attempts,executed:index.executed,censored:index.censored,rows:index.rows.length,skipped:[...index.skipped],failure:index.failure,cacheSaved:!!writes['output/cache/first.json.gz'],exitCode:sandbox.process.exitCode};
 assert.equal(attempts,1);assert.equal(index.rows.length,0);assert.equal(index.censored,0);assert.equal(index.skipped[0],'first');
 if(kind==='exception')assert.equal(result.cacheSaved,false);else assert.equal(result.cacheSaved,true);
 results.push(result);
}
(async()=>{await run('wall-censor');await run('exception');const result={nativeExecutions:0,engineImports:0,description:'Exact frozen main() transpiled; in-memory IO and measure() stubs. Observed behavior, not a proposed fix.',results};fs.writeFileSync('out/pr101-review/failure-accounting.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));})();
