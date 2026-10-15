/** Guarded helper alone on the previously declared native contact manifest.
 * Reuse original ownership/solver arms; instrumented cost is not a benchmark. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {nativeTransitionInterval} from './grip-native-slip.js';
import {rep} from '../tackle/panel.js';
const root='out/grip-native-reel-stop';mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),
  profile=JSON.parse(readFileSync('config/baseline.json','utf8')),flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
  priorPath='data/reviews/current/grip-native-football.json',prior=JSON.parse(readFileSync(priorPath,'utf8')),
  files=['scripts/diag/physics/grip-native-span-model.ts','scripts/diag/physics/grip-native-span-reference.ts',
    'scripts/diag/physics/grip-native-reel-reference.ts','scripts/diag/physics/grip-native-reel-stop-evidence.ts','config/grip-native-reel-stop-inputs.json'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),rows=[];
assert.deepEqual(flags,profile.flags);
for(const p of ['src/physics/world.ts','src/physics/support.ts','src/physics/virtual-foot.ts','config/baseline.json','test/grip-fast.test.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`337be32:${p}`])));
for(const input of prior.inputs){
  const calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>},start=performance.now(),
    result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
      const w:any=world;w.materialTransport='owned';w.activeGrip=nativeTransitionInterval;
      const step=w.step;w.step=function(...a:any[]){const r=step.apply(this,a),p=r.activeGrip;
        if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const[k,v]of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+(v as number);}return r;};
    }});
  const previous=prior.rows.filter((r:any)=>r.id===input.id),old=previous.find((r:any)=>r.mode==='transition');
  assert(result.advanceAfterGrip!==null&&result.contactToEnd!==null);
  // A changed ending is evidence, not an assertion to pin to the old solver.
  rows.push({input,result,calls,prior:previous,instrumentedSeconds:(performance.now()-start)/1000,
    delta:{advance:result.advanceAfterGrip-old.advanceAfterGrip,time:result.contactToEnd-old.contactToEnd}});
  console.log(JSON.stringify(rows.at(-1)));
}
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(`${root}/football.json`,JSON.stringify({meta:{commit,source,flags,node:process.version,timestamp:new Date().toISOString(),
  baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',parent:'337be328dc8d00f13ad8db7d7004dc7c6f501793',hashes,
  settings:{handContact:'patch',gripTiming:'midpoint',constraintWork:'per-solve',substeps:96,materialTransport:'owned',activeGrip:'guarded nativeTransitionInterval only'},
  prior:{path:priorPath,sha256:sha(readFileSync(priorPath))},note:'Existing input manifest; guarded helper alone. Instrumented elapsed times are not benchmark cost. Two censored cases are not completed tackles.'},rows},null,2)+'\n');
