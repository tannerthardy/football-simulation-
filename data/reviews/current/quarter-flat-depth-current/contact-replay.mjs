import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const [manifestPath,expectedPath,out]=process.argv.slice(2);
if(!manifestPath||!expectedPath||!out)throw Error('MANIFEST EXPECTED OUTPUT');
const {PlaySim}=await import(pathToFileURL(resolve('src/sim/playsim.ts')));
const {sourceVersion}=await import(pathToFileURL(resolve('scripts/source-version.ts')));
const read=p=>JSON.parse(gunzipSync(readFileSync(p)));
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const m=read(manifestPath),c=m.cases.find(c=>c.id==='SLOT-SWING');
const expected=read(expectedPath).rows.find(r=>r.id===c.id);
if(sha(c.setup)!==c.inputSha256||expected.inputSha256!==c.inputSha256)throw Error('Input mismatch');
const sim=new PlaySim({...structuredClone(c.setup),record:true,recordLevel:'full',recordEvery:1});
const focus=sim.defense.find(a=>a.behavior.zone==='curl_flat_w'),runner=sim.slot(sim.offAlign.numbering.W2);
const states=[];sim.event('snap',sim.slot('C')??sim.qb);
while(sim.phase==='live'&&sim.t<m.seconds){
 sim.tick();
 states.push({t:sim.t,actors:[runner,...sim.defense].map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,
  pos:{...a.pos},vel:{...a.vel},facing:a.facing,body:(a===runner||a===focus)?structuredClone(a.body):undefined,
  request:structuredClone(sim.intents[a.idx])}))});
}
const {frames,telemetry,...result}=sim.buildResult();
const physicalSignature=sha({t:sim.t,phase:sim.phase,result,bodies:sim.agents.map(a=>a.body),rng:sim.rng,minds:sim.agents.map(a=>a.mind),perception:sim.perception});
if(physicalSignature!==expected.physicalSignature)throw Error('Recording changed the expected execution');
let matchedSamples=0;
for(const sample of expected.samples){
 const s=states.find(s=>Math.abs(s.t-sample.interval[1])<1e-7);if(!s)throw Error('Missing common tick');
 for(const old of [sample.defender,sample.receiver]){
  const current=s.actors.find(a=>a.idx===old.index);
  if(JSON.stringify([current.pos,current.vel])!==JSON.stringify([old.pos,old.vel]))throw Error('Recording changed a common pose');
 }
 matchedSamples++;
}
writeFileSync(out,gzipSync(JSON.stringify({source:sourceVersion(),operatorSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
 inputSha256:c.inputSha256,recordingOnlyOverrides:{record:true,recordLevel:'full',recordEvery:1},physicalSignature,matchedSamples,
 identities:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile})),result,frames,telemetry,states})));
console.log(JSON.stringify({source:sourceVersion(),id:c.id,matchedSamples,physicalSignature,recordingNeutral:true,out}));
