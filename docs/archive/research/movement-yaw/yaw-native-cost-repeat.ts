import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {PlaySim as Baseline} from './yaw-archive/src/sim/playsim.ts';
import {PlaySim as Candidate} from '../../src/sim/playsim.ts';
const inputs=['toss','pass'].map(name=>{const c=JSON.parse(gunzipSync(readFileSync(`out/loaded-movement/yaw-native/${name}-input.json.gz`)))[0];return {...c,inputSha256:createHash('sha256').update(JSON.stringify(c.setup)).digest('hex')};});
const ticks=60;
let sink=0;
function run(mode:'baseline'|'candidate',input:any){
 const setup=structuredClone(input.setup);setup.record=false;delete setup.recordLevel;
 const W=mode==='baseline'?Baseline:Candidate,init=performance.now(),sim=new W(setup);
 sim.event('snap',sim.slot('C'));
 const start=performance.now();
 for(let n=0;n<ticks;n++){if(sim.phase!=='live')throw Error(`${input.id}/${mode} ended before60ticks: ${sim.t}`);sim.tick();}
 const end=performance.now();
 sink+=sim.agents[0].pos.x+sim.agents[0].pos.y;
 return{tickMilliseconds:(end-start)/ticks,initInclusiveMilliseconds:(end-init)/ticks,final:{t:sim.t,phase:sim.phase,eventCount:sim.events.length,carrier:sim.carrier?.idx,ball:sim.ball.kind}};
}
const warmupStartedAt=new Date().toISOString();
for(let round=0;round<4;round++)for(const input of inputs)for(const mode of ['baseline','candidate'] as const)run(mode,input);
const timedStartedAt=new Date().toISOString();
const rows=[];
for(let round=0;round<20;round++)for(const input of round%2?[...inputs].reverse():inputs){
 const order=(round%2?['candidate','baseline']:['baseline','candidate']) as ('baseline'|'candidate')[];
 const costs:any={};for(const mode of order)costs[mode]=run(mode,input);
 rows.push({round,id:input.id,order,costs,ratio:costs.candidate.tickMilliseconds/costs.baseline.tickMilliseconds,initInclusiveRatio:costs.candidate.initInclusiveMilliseconds/costs.baseline.initInclusiveMilliseconds});
}
const timedFinishedAt=new Date().toISOString();
const quant=(vs:number[],p:number)=>{const v=[...vs].sort((a,b)=>a-b);return v[Math.ceil(p*v.length)-1]};
const stats=(vs:number[])=>({median:quant(vs,.5),p95:quant(vs,.95),max:Math.max(...vs)});
const summary=inputs.map(input=>{const selected=rows.filter(r=>r.id===input.id);return{id:input.id,baseline:stats(selected.map(r=>r.costs.baseline.tickMilliseconds)),candidate:stats(selected.map(r=>r.costs.candidate.tickMilliseconds)),pairedRatio:stats(selected.map(r=>r.ratio)),initInclusiveBaseline:stats(selected.map(r=>r.costs.baseline.initInclusiveMilliseconds)),initInclusiveCandidate:stats(selected.map(r=>r.costs.candidate.initInclusiveMilliseconds)),initInclusivePairedRatio:stats(selected.map(r=>r.initInclusiveRatio)),candidateP95VersusBaselineP95:quant(selected.map(r=>r.costs.candidate.tickMilliseconds),.95)/quant(selected.map(r=>r.costs.baseline.tickMilliseconds),.95),allLive:selected.every(r=>Object.values(r.costs).every((c:any)=>c.final.phase==='live'))};});
const paired=[...rows.map(r=>r.ratio)];
const out={warmupStartedAt,timedStartedAt,timedFinishedAt,node:process.version,baselineRevision:'2c98bed94adad8087c65f381d4090444ad283985',candidateRevision:'aadac6d8b78bd452ff3bb92b337e027bec4a0d25',baselineSource:'4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571',candidateSource:'8ea7dadd45db400da68e31a92b215572d0243c48495e97d666b7dcb5ce08c8c2',ticksPerPrefix:ticks,rounds:20,warmupPairsPerCase:4,inputs:inputs.map(({id,inputSha256})=>({id,inputSha256})),recording:false,copying:'outside all clocks',budget:{medianRatio:1.1,p95Ratio:1.25},summary,combinedPairedRatio:stats(paired),rows,sink};
writeFileSync('out/loaded-movement/yaw-native-cost-repeat-evidence.json',JSON.stringify(out,null,2));console.log(JSON.stringify({summary,combinedPairedRatio:out.combinedPairedRatio},null,2));
