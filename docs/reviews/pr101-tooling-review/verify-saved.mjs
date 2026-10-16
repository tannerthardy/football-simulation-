import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if(!process.argv[2])throw new Error('Explicit frozen source checkout required');
const target=resolve(process.argv[2]);process.chdir(target);
fs.mkdirSync('out/pr101-review',{recursive:true});
const { frozenInput, sha, caseKey } = await import(pathToFileURL(resolve(target,'scripts/diag/run-action-suite.ts')).href);
const root='data/reviews/current/run-action-suite/';
const load=n=>JSON.parse(n.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(root+n)):fs.readFileSync(root+n));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=load('rows.json.gz'), summary=load('summary.json'), witness=load('witness-packet.json.gz');
const result={nativeExecutions:0,scope:'Saved bytes and pure input/key reconstruction only; no PlaySim construction or ticks',arms:{},checks:[]};
const byId=new Map(rows.map(r=>[r.case.id,r]));assert.equal(byId.size,1848);
for(const host of ['accepted','perimeter']){
 const m=load(host+'-manifest.json.gz'),idx=load(host+'-index.json.gz');
 assert.equal(sha(m),idx.provenance.manifest);
 assert.deepEqual(idx.rows.map(r=>r.id),m.cases.map(c=>c.id));
 assert.equal(new Set(idx.rows.map(r=>r.key)).size,idx.rows.length);
 assert.equal(idx.rows.length,idx.planned);assert.equal(idx.executed+idx.cached,idx.planned);
 assert.equal(idx.skipped.length,0);assert.equal(idx.failure,null);assert.equal(idx.status,'complete');
 for(let i=0;i<m.cases.length;i++){
  const c=m.cases[i],e=idx.rows[i],r=byId.get(c.id);
  assert.equal(sha(frozenInput(m,c)),c.inputSha256);assert.equal(e.key,caseKey(m,c,idx.provenance));
  assert.equal(e.path,`out/run-action-${host}/cache/${e.key}.json.gz`);
  assert.deepEqual(r.case,c);assert.equal(r.host,host);assert.equal(r.status,e.status);assert.deepEqual(r.metrics,e.metrics);
  assert.equal(r.metrics.terminal,r.status==='native');
  if(!r.metrics.terminal)for(const k of ['gain','fieldGain','success','outcome'])assert.equal(r.metrics[k],null);
 }
 const sourceHash=crypto.createHash('sha256');
 const paths=cp.execFileSync('git',['ls-tree','-r','--name-only',idx.head,'src'],{encoding:'utf8'}).trim().split('\n').sort();
 for(const path of paths)sourceHash.update(path).update('\0').update(cp.execFileSync('git',['show',`${idx.head}:${path}`])).update('\0');
 assert.equal(sourceHash.digest('hex'),idx.provenance.source);
 for(const [key,path] of [['collector','scripts/diag/run-action-suite.ts'],['lock','package-lock.json'],['sourceHelper','scripts/source-version.ts']])assert.equal(digest(cp.execFileSync('git',['show',`${idx.head}:${path}`])),idx.provenance[key]);
 result.arms[host]={head:idx.head,source:idx.provenance.source,planned:idx.planned,executed:idx.executed,cached:idx.cached,terminal:idx.rows.filter(r=>r.status==='native').length,censored:idx.censored,skipped:idx.skipped.length,elapsedSeconds:idx.elapsedSeconds};
}
for(const w of witness){const r=byId.get(w.id),idx=load(r.host+'-index.json.gz'),e=idx.rows.find(e=>e.id===w.id);assert.equal(w.cacheKey,e.key);assert.equal(w.source,idx.provenance.source);assert.deepEqual(w.metrics,r.metrics);assert.match(w.rowSha256,/^[0-9a-f]{64}$/);}
assert.equal(summary.n,rows.length);assert.equal(summary.pairs.length,216);
for(const [cohort,phase] of [['primary','primary'],['prototype','perimeter']])for(const [family,s] of Object.entries(summary[cohort])){
 const rs=rows.filter(r=>r.case.phase===phase&&r.case.family===family),ys=rs.filter(r=>r.metrics.terminal).map(r=>r.metrics.gain).sort((a,b)=>a-b);
 assert.equal(s.n,rs.length);assert.equal(s.terminal,ys.length);assert.equal(s.censored,rs.length-ys.length);
 assert.ok(Math.abs(s.mean-ys.reduce((a,b)=>a+b,0)/ys.length)<1e-12);
 assert.equal(s.median,(ys[(ys.length-1)>>1]+ys[ys.length>>1])/2);
}
for(const p of summary.pairs){const a=byId.get(p.paCase),b=byId.get(p.plainCase);assert.equal(a.host,'accepted');assert.equal(b.host,'accepted');assert.equal(p.gainDelta,a.metrics.gain-b.metrics.gain);assert.deepEqual(p.pa,a.metrics);assert.deepEqual(p.plain,b.metrics);}
const html=fs.readFileSync('docs/reviews/run-playaction-stress/film.html','utf8');
const data=JSON.parse(html.split('<script>const data=')[1].split(';const $=')[0]);
assert.deepEqual(data.selections,load('film-selections.json'));assert.equal(data.selections.length,20);assert.equal(Object.keys(data.films).length,40);
let frames=0,states=0,maxEndingGap=0;
for(const [id,f] of Object.entries(data.films)){
 assert.deepEqual(f.metrics,byId.get(id).metrics);assert.equal(f.slots.length,22);assert.equal(new Set(f.slots).size,22);assert.equal(f.radius.length,22);
 let last=-1;for(const fr of f.frames){assert.ok(fr.t>last);last=fr.t;assert.ok(Math.abs(fr.t-fr.before-.05)<1e-10);assert.equal(fr.states.length,22);for(const s of fr.states){assert.equal(s.length,11);assert.ok(s.slice(0,9).every(Number.isFinite));states++;}frames++;}
 maxEndingGap=Math.max(maxEndingGap,f.metrics.duration-last);assert.ok(f.metrics.duration-last<=.15000001);
 assert.equal(f.source,load(byId.get(id).host+'-index.json.gz').provenance.source);
}
assert.ok(!/(?:fetch\(|src=["']https?:|href=["']https?:|XMLHttpRequest)/.test(html));
fs.writeFileSync('out/pr101-review/film-script.js',html.split('<script>')[1].split('</script>')[0]);
const costs=load('costs.json');let seconds=0;for(const c of costs){const r=load('receipts/'+c.receipt);assert.equal(r.exitCode,c.exitCode);assert.deepEqual(r.commands,c.commands);assert.equal(r.inputsUnchanged,true);seconds+=c.commands.reduce((s,v)=>s+v.elapsedSeconds,0);}
const receipt=load('receipts/run-1792138598964-294048.json');
const freeze='579a20e2062d0a159c3a4e88b10e21819f88b7c1';
const validPaths=cp.execFileSync('git',['ls-tree','-r','--name-only',freeze,'test','scripts','config','vitest.config.ts','package.json','package-lock.json','.nvmrc'],{encoding:'utf8'}).trim().split('\n').sort();
const validation=crypto.createHash('sha256');for(const path of validPaths)validation.update(path).update('\0').update(cp.execFileSync('git',['show',`${freeze}:${path}`])).update('\0');
result.focusedReceiptValidationMatchesFreeze=validation.digest('hex')===receipt.validationSha256;
assert.equal(result.focusedReceiptValidationMatchesFreeze,true);
result.film={views:20,cases:40,frames,states,maxEndingGap,externalRequests:false};result.receipts={count:costs.length,failed:costs.filter(c=>c.exitCode!==0).length,commandSeconds:seconds};
result.checks=['1848 ordered case/input/key/index/compact joins','both historical engine source hashes and collector/lock/helper hashes','terminal/censor nullability','family descriptive statistics and 216 pair metrics','40 witness keys/source/metrics (raw row digests unavailable)','self-contained film IDs, states, timing and source separation','all seven receipts and frozen focused-test validation tree'];
fs.writeFileSync('out/pr101-review/saved-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
