/** Fixed inputs, full native endings and neutral/plain controls. Shards avoid
 * the JS single-string ceiling without reducing the window or assertions. */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const directory=process.argv[2] ?? 'out/run-hand-coherence';
const chosen=process.argv[process.argv.indexOf('--arm')+1];
const manifestPath='docs/reviews/run-hand-coherence-inputs.json';
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const arms=[
 ['baseline',[],false],
 ['default',[],true],
 ['hands',['HAND_MOTOR=1','RUN_HANDS=1'],true],
 ['seal-hands',['HAND_MOTOR=1','RUN_HANDS=1','RUN_HAND_COHERENCE=1'],true],
 ['components-hands',['RUN_CONTACT_COMPONENTS=1','HAND_MOTOR=1','RUN_HANDS=1'],true],
 ['components-seal-hands',['RUN_CONTACT_COMPONENTS=1','HAND_MOTOR=1','RUN_HANDS=1','RUN_HAND_COHERENCE=1'],true],
 ['combined-hands',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'],true],
 ['combined-seal-hands',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1','RUN_HAND_COHERENCE=1'],true],
];
if(!process.argv.includes('--arm')||!arms.some(a=>a[0]===chosen))throw Error('Choose an explicit --arm');
mkdirSync(directory,{recursive:true});
const [name,flags,candidate]=arms.find(a=>a[0]===chosen);
const index={protocol:'run-hand-coherence-shards-v1',comparisonCommit:manifest.comparisonCommit,
 manifestSha256:createHash('sha256').update(readFileSync(manifestPath)).digest('hex'),arm:name,flags,shards:[]};
for(let start=0;start<manifest.inputs.length;start+=10){
 const shard=String(start/10).padStart(2,'0'),inputs=`${directory}/inputs-${shard}.json`;
 writeFileSync(inputs,JSON.stringify({inputs:manifest.inputs.slice(start,start+10)},null,2)+'\n');
 const output=`${directory}/${name}-${shard}.json.gz`,receipt=`${directory}/${name}-${shard}-receipt.json`;
 const run=spawnSync(process.execPath,['scripts/baseline.mjs',...(candidate?['--candidate']:[]),'--receipt',receipt,
  ...flags.flatMap(f=>['--flag',f]),'--',process.execPath,'--import','tsx','scripts/diag/defense/hand-action-panel.ts',output],
  {encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,FLOW_INPUTS:inputs,FLOW_STOP:'25',FLOW_TRACE:'1',CONTACT_TRACE:'1',CONTACT_SNAPSHOT:'',HAND_REMOVE:'',HAND_KEEP:''}});
 writeFileSync(`${directory}/${name}-${shard}.log`,(run.stdout??'')+(run.stderr??''));
 index.shards.push({inputs,output,receipt,count:manifest.inputs.slice(start,start+10).length,exitCode:run.status});
 writeFileSync(`${directory}/${name}-index.json`,JSON.stringify(index,null,2)+'\n');
 if(run.status!==0||run.error)throw Error(`${name}/${shard} failed`);
 console.log(`${name}/${shard} complete`);
}
