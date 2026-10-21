import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {PlaySim as Baseline} from './accepted/src/sim/playsim.ts';
import {PlaySim as Candidate} from '../../src/sim/playsim.ts';
const inputs=['toss','pass'].map(name=>{const c=JSON.parse(gunzipSync(readFileSync(`out/loaded-movement/yaw-native/${name}-input.json.gz`)))[0];return {...c,inputSha256:createHash('sha256').update(JSON.stringify(c.setup)).digest('hex')};});
const ticks=60;
function digest(root:string){
 const paths=(dir:string):string[]=>readdirSync(root+'/'+dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?paths(dir+'/'+e.name):[dir+'/'+e.name]).sort();
 const h=createHash('sha256');for(const p of paths('src'))h.update(p).update('\0').update(readFileSync(root+'/'+p)).update('\0');return h.digest('hex');
}
const baselineSource=digest('out/yaw-readiness/accepted'),candidateSource=digest('.');
if(baselineSource!=='4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571')throw Error('Accepted archive source mismatch');
const expectedCandidate='03233b05ba0cbdfc1fe4fe6787caec2dc41fe4b09ef07726917c3edf0f9ebee1';
if(candidateSource!==expectedCandidate)throw Error('Candidate source mismatch');

let sink=0;
function run(mode:'baseline'|'candidate',input:any){
 const setup=structuredClone(input.setup);setup.record=false;delete setup.recordLevel;
 const W=mode==='baseline'?Baseline:Candidate,init=performance.now(),sim=new W(setup);
 sim.event('snap',sim.slot('C'));
 const cpuStart=process.cpuUsage();
 const start=performance.now();
 for(let n=0;n<ticks;n++){if(sim.phase!=='live')throw Error(`${input.id}/${mode} ended before60ticks: ${sim.t}`);sim.tick();}
 const end=performance.now();
 const cpu=process.cpuUsage(cpuStart);
 sink+=sim.agents[0].pos.x+sim.agents[0].pos.y;
 return{cpuMillisecondsPerTick:(cpu.user+cpu.system)/1000/ticks,tickMilliseconds:(end-start)/ticks,initInclusiveMilliseconds:(end-init)/ticks,final:{t:sim.t,phase:sim.phase,eventCount:sim.events.length,carrier:sim.carrier?.idx,ball:sim.ball.kind}};
}
const warmupStartedAt=new Date().toISOString();
for(let round=0;round<4;round++)for(const input of inputs)for(const mode of ['baseline','candidate'] as const)run(mode,input);
const busySnapshot=execFileSync('ps',['-eo','pid,ppid,pcpu,etime,comm'],{encoding:'utf8'});
const processes=busySnapshot.trim().split('\n').slice(1).map(line=>{const [pid,ppid,cpu,elapsed,command]=line.trim().split(/\s+/);return{pid:Number(pid),ppid:Number(ppid),cpu:Number(cpu),elapsed,command};});
const related=new Set([process.pid,process.ppid]);for(let n=0;n<processes.length;n++)for(const p of processes)if(related.has(p.ppid))related.add(p.pid);
const competing=processes.filter(p=>p.command==='node'&&!related.has(p.pid)&&p.cpu>=5);
if(competing.length){writeFileSync('out/yaw-readiness/native-cost-busy.json',JSON.stringify({at:new Date().toISOString(),competing,busySnapshot},null,2));throw Error('Competing Node CPU process before timed rounds');}
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
if(digest('.')!==candidateSource||digest('out/yaw-readiness/accepted')!==baselineSource)throw Error('Imported source changed');
const cpuSummary=inputs.map(input=>{const selected=rows.filter(r=>r.id===input.id);return{id:input.id,baseline:stats(selected.map(r=>r.costs.baseline.cpuMillisecondsPerTick)),candidate:stats(selected.map(r=>r.costs.candidate.cpuMillisecondsPerTick))};});
const out={warmupStartedAt,timedStartedAt,timedFinishedAt,busySnapshot,competing,cpuSummary,node:process.version,baselineRevision:'2c98bed94adad8087c65f381d4090444ad283985',candidateRevision:'f96a85fdd818b6fd860554e7a9881083ae0dd60c',baselineSource:'4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571',candidateSource,ticksPerPrefix:ticks,rounds:20,warmupPairsPerCase:4,inputs:inputs.map(({id,inputSha256})=>({id,inputSha256})),recording:false,copying:'outside all clocks',budget:{medianRatio:1.1,p95Ratio:1.25},summary,combinedPairedRatio:stats(paired),rows,sink};
Object.assign(out,{budgetDecision:{medianLimit:1.1,pairedP95Limit:1.25,allInputsPass:summary.every(s=>s.pairedRatio.median<=1.1&&s.pairedRatio.p95<=1.25),inputs:summary.map(s=>({id:s.id,medianPass:s.pairedRatio.median<=1.1,pairedP95Pass:s.pairedRatio.p95<=1.25}))}});
writeFileSync('out/yaw-readiness/native-cost-final.json',JSON.stringify(out,null,2));console.log(JSON.stringify({summary,combinedPairedRatio:out.combinedPairedRatio,cpuSummary},null,2));
