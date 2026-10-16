/** Explicit major-change checkpoint. Default invocation plans ZERO native ticks. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { ROUTES } from '../../src/playbook/routes.js';
import { sourceVersion } from '../source-version.js';
import { buildManifest, validateManifest, sha, type Manifest, type Scenario } from './pass-suite-cases.js';
import { measure, type Measurement } from './pass-suite-measure.js';
import { compact, makeReport, markdown, html, type Index } from './pass-suite-report.js';

export const OPERATOR='pass-game-v1';
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function writeJSON(path:string,value:unknown) {
  mkdirSync(dirname(path),{recursive:true});const tmp=path+'.tmp',s=JSON.stringify(value);
  writeFileSync(tmp,path.endsWith('.gz')?gzipSync(s):s+'\n');renameSync(tmp,path);
}
export function readJSON(path:string):any {
  const b=readFileSync(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(b).toString():b.toString());
}
export function provenance(m:Manifest) {
  const profile=readJSON('config/baseline.json');
  return {operator:OPERATOR,source:sourceVersion(),manifest:sha(m),node:process.version,platform:process.platform,arch:process.arch,
    lock:fileSha('package-lock.json'),collector:sha(['cases','measure','report'].map(n=>fileSha('scripts/diag/pass-suite-'+n+'.ts'))
      .concat(fileSha('scripts/diag/pass-game-suite.ts'),fileSha('scripts/source-version.ts'))),
    flags:Object.fromEntries(Object.keys(profile.flags).sort().map(k=>[k,process.env[k]??null])),
    declaredWorldDefaults:profile.worldDefaults,routes:sha(ROUTES)};
}
export const caseKey=(c:Scenario,p:ReturnType<typeof provenance>)=>sha({input:c.inputSha256,provenance:p});
export function selectCases(m:Manifest,group?:string,ids?:string) {
  if(group&&!m.cases.some(c=>c.groups.includes(group)))throw new Error('Unknown group '+group);
  const requested=ids?.split(','),known=new Set(m.cases.map(c=>c.id));
  if(requested?.some(id=>!known.has(id))||requested&&new Set(requested).size!==requested.length)throw new Error('Unknown or duplicate case ID');
  const selected=m.cases.filter(c=>(!group||c.groups.includes(group))&&(!requested||requested.includes(c.id)));
  if(!selected.length)throw new Error('Empty selection');return selected;
}
export function cacheEnvelope(row:Measurement,key:string) {return {schema:'pass-game-case-v1',key,rowSha256:sha(row),row};}
export function validateCache(value:ReturnType<typeof cacheEnvelope>,key:string,c:Scenario) {
  if(value.schema!=='pass-game-case-v1'||value.key!==key||value.row.case.id!==c.id||value.row.case.inputSha256!==c.inputSha256
    ||sha(value.row)!==value.rowSha256)throw new Error('Corrupt or incompatible cache '+c.id);
  if(!['native','censored-sim','censored-engine'].includes(value.row.status))throw new Error('Failed/wall-censored cache requires a new explicit checkpoint/output: '+c.id);
}
export function readIndex(path:string):Index {
  const value=readJSON(path);
  if(value.schema!=='pass-game-index-envelope-v1'||value.sha256!==sha(value.index)||value.index.schema!=='pass-game-index-v1')
    throw new Error('Corrupt index '+path);
  return value.index;
}
export function validateComparison(base:Index,m:Manifest,selected:Scenario[],p:ReturnType<typeof provenance>,settingsReason?:string) {
  if(base.status!=='complete'||base.skipped.length||base.failure)throw new Error('Baseline collection is incomplete');
  if(base.provenance.source!==m.reference.source)throw new Error('Baseline is not the manifest reference source');
  for(const key of ['operator','manifest','node','platform','arch','lock','collector'])
    if(base.provenance[key]!==p[key as keyof typeof p])throw new Error('Incompatible comparison '+key);
  if(!settingsReason&&(sha(base.provenance.flags)!==sha(p.flags)||sha(base.provenance.declaredWorldDefaults)!==sha(p.declaredWorldDefaults)))
    throw new Error('Settings changed; declare --allow-settings-change REASON');
  const rows=new Map(base.rows.map(r=>[r.case.id,r]));
  if(rows.size!==base.rows.length||base.rows.length!==base.selection.length)throw new Error('Invalid baseline selection');
  for(const c of selected){const r=rows.get(c.id);
    if(!r||r.case.inputSha256!==c.inputSha256||!['native','censored-sim','censored-engine'].includes(r.status))throw new Error('Missing/incompatible baseline case '+c.id);}
}
function checkpoint(reason?:string) {if(!reason?.trim())throw new Error('Execution requires --checkpoint REASON (major change or bounded validation)');}
function routeContract(m:Manifest,reason?:string) {
  if(sha(ROUTES)!==sha(m.routes)&&!reason)throw new Error('Native route definitions changed; declare --allow-route-change REASON or make a new reference manifest');
}
function checkout() {
  return {head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),
    dirty:execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),
    utc:new Date().toISOString()};
}
export function publish(out:string,index:Index,m:Manifest,baseline?:Index) {
  writeJSON(join(out,'index.json'),{schema:'pass-game-index-envelope-v1',sha256:sha(index),index});
  const r={...makeReport(index,m,baseline),reportSourceSha256:fileSha('scripts/diag/pass-suite-report.ts')};writeJSON(join(out,'report.json'),r);
  writeFileSync(join(out,'report.md'),markdown(r));writeFileSync(join(out,'report.html'),html(r));
}
interface RunOptions {checkpoint:string;compare?:string;group?:string;cases?:string;allowRouteChange?:string;allowSettingsChange?:string}
export function runCampaign(m:Manifest,out:string,options:RunOptions) {
  checkpoint(options.checkpoint);validateManifest(m);routeContract(m,options.allowRouteChange);
  const selected=selectCases(m,options.group,options.cases),p=provenance(m),baseline=options.compare?readIndex(options.compare):undefined;
  if(baseline)validateComparison(baseline,m,selected,p,options.allowSettingsChange);
  else if(p.source!==m.reference.source)throw new Error('Candidate source requires --compare REFERENCE_INDEX; do not silently relabel a candidate as baseline');
  const previousPath=join(out,'index.json');
  if(existsSync(previousPath)){
    const prior=readIndex(previousPath);
    if(sha(prior.provenance)!==sha(p))throw new Error('Output belongs to a different source/operator; use a new output directory');
  }
  const start=performance.now();
  const index:Index={schema:'pass-game-index-v1',provenance:p,checkout:checkout(),checkpoint:options.checkpoint,
    status:'running',manifestCases:m.cases.length,selection:selected.map(c=>c.id),rows:[],skipped:[],failure:null,
    runtime:{wallMs:0,newCases:0,cachedCases:0,newSimulationMs:0,cachedOriginalSimulationMs:0,newSteps:0},
    baseline:options.compare?resolve(options.compare):null,routeChangeReason:options.allowRouteChange??null,settingsChangeReason:options.allowSettingsChange??null};
  mkdirSync(join(out,'cache'),{recursive:true});writeJSON(join(out,'manifest.json.gz'),m);
  const save=(final=false)=>{index.runtime.wallMs=performance.now()-start;
    index.skipped=selected.slice(index.rows.length).map(c=>c.id);
    if(final)publish(out,index,m,baseline);
    else writeJSON(join(out,'index.json'),{schema:'pass-game-index-envelope-v1',sha256:sha(index),index});};
  for(const c of selected){
    if(performance.now()-start>=m.budgets.campaignMs){index.status='budget-exhausted';break;}
    const key=caseKey(c,p),cache=resolve(out,'cache',key+'.json.gz');
    try{
      if(existsSync(cache)){
        const value=readJSON(cache);validateCache(value,key,c);index.rows.push(compact(value.row,cache,value.rowSha256));
        index.runtime.cachedCases++;index.runtime.cachedOriginalSimulationMs+=value.row.elapsedMs;
      }else{
        const row=measure(m,c),value=cacheEnvelope(row,key);writeJSON(cache,value);index.rows.push(compact(row,cache,value.rowSha256));
        index.runtime.newCases++;index.runtime.newSimulationMs+=row.elapsedMs;index.runtime.newSteps+=row.steps;
        if(row.status==='failed'||row.status==='censored-wall'){index.status='blocked';index.failure={case:c.id,status:row.status,error:row.error};break;}
      }
    }catch(e){index.status='blocked';index.failure={case:c.id,error:e instanceof Error?e.message:String(e)};break;}
    if(index.rows.length%32===0){save();console.log(JSON.stringify({collected:index.rows.length,selected:selected.length,new:index.runtime.newCases,cached:index.runtime.cachedCases,seconds:(performance.now()-start)/1000}));}
  }
  if(sha(provenance(m))!==sha(p)){index.status='blocked';index.failure={error:'Source/settings/operator changed during collection; evidence is invalid'};}
  if(index.status==='running')index.status=index.rows.length===selected.length?'complete':'partial';save(true);return index;
}
export async function main(argv=process.argv.slice(2)) {
  const [mode='plan',...rest]=argv;
  if(mode==='plan'){
    if(rest.length>1&&(rest.length!==3||rest[1]!=='--refresh-reference'||!rest[2].trim())||rest[0]?.startsWith('--'))
      throw new Error('plan [MANIFEST.json.gz] [--refresh-reference REASON]');
    const m=rest[1]==='--refresh-reference'?buildManifest({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),reason:rest[2]})
      :readJSON('config/pass-game-suite-v1.json.gz') as Manifest;validateManifest(m);
    const path=rest[0]??'out/pass-game-suite/manifest.json.gz';writeJSON(path,m);
    console.log(JSON.stringify({manifest:path,sha256:sha(m),cases:m.cases.length,groups:Object.fromEntries([...new Set(m.cases.flatMap(c=>c.groups))].map(g=>[g,m.cases.filter(c=>c.groups.includes(g)).length])),pairs:m.pairs.length,budgets:m.budgets,simulatedSnaps:0}));return;
  }
  if(mode==='report'){
    const [path,out,baselinePath]=rest;if(!path||!out||rest.length>3)throw new Error('report INDEX OUTPUT [BASELINE_INDEX]');
    const index=readIndex(path),m=readJSON(join(dirname(path),'manifest.json.gz')) as Manifest;
    if(sha(m)!==index.provenance.manifest)throw new Error('Report manifest mismatch');
    const base=baselinePath?readIndex(baselinePath):index.baseline?readIndex(index.baseline):undefined;
    if(base)validateComparison(base,m,m.cases.filter(c=>index.selection.includes(c.id)),index.provenance as ReturnType<typeof provenance>,index.settingsChangeReason??undefined);
    mkdirSync(out,{recursive:true});publish(out,index,m,base);writeJSON(join(out,'manifest.json.gz'),m);
    console.log(JSON.stringify({report:out,simulatedSnaps:0}));return;
  }
  const flags=new Map<string,string>(),positionals:string[]=[];
  for(let i=0;i<rest.length;i++){
    if(rest[i].startsWith('--')){if(!['--checkpoint','--compare','--group','--cases','--allow-route-change','--allow-settings-change'].includes(rest[i])||!rest[i+1]||rest[i+1].startsWith('--')||flags.has(rest[i]))throw new Error('Invalid/duplicate option '+rest[i]);flags.set(rest[i],rest[++i]);}
    else positionals.push(rest[i]);
  }
  checkpoint(flags.get('--checkpoint'));
  if(mode==='run'){
    const [path,out]=positionals;if(!path||!out||positionals.length!==2)throw new Error('run MANIFEST OUTPUT --checkpoint REASON [--compare INDEX] [--group GROUP] [--cases ID,ID]');
    const index=runCampaign(readJSON(path),out,{checkpoint:flags.get('--checkpoint')!,compare:flags.get('--compare'),group:flags.get('--group'),cases:flags.get('--cases'),
      allowRouteChange:flags.get('--allow-route-change'),allowSettingsChange:flags.get('--allow-settings-change')});
    console.log(JSON.stringify({status:index.status,runtime:index.runtime,failure:index.failure,report:join(out,'report.html')}));if(index.status!=='complete')process.exitCode=1;return;
  }
  if(mode==='inspect'){
    const [path,id,out]=positionals;if(!path||!id||!out||positionals.length!==3)throw new Error('inspect MANIFEST CASE OUTPUT.json.gz --checkpoint REASON');
    if([...flags.keys()].some(k=>!['--checkpoint','--allow-route-change'].includes(k)))throw new Error('Unsupported inspect flag');
    const m=readJSON(path) as Manifest;validateManifest(m);routeContract(m,flags.get('--allow-route-change'));
    if(id.includes(','))throw new Error('inspect accepts exactly one case');
    const c=selectCases(m,undefined,id)[0],p=provenance(m),row=measure(m,c,{record:true});
    if(sha(provenance(m))!==sha(p))throw new Error('Source/settings/operator changed during inspection');
    writeJSON(out,{checkpoint:flags.get('--checkpoint'),provenance:p,checkout:checkout(),row,sha256:sha(row)});
    console.log(JSON.stringify({status:row.status,simulatedSnaps:1,metrics:row.metrics,out}));if(row.status==='failed'||row.status==='censored-wall')process.exitCode=1;return;
  }
  throw new Error('Unknown command '+mode);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
