/** Bounded native shallow/distribution/support witnesses for HNFL-078/196/312. This is not a broad pass campaign. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Rng } from '../../src/core/rng.js';
import { generateTeam,pickDefense,pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { PlaySim,type PlaySetup } from '../../src/sim/playsim.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import { auditSchematicSnap,assertSchematicBudgets,assertSchematicFinite } from '../../src/lab/schematic-stress.js';
import { sourceVersion } from '../source-version.js';

const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(p:string,v:unknown)=>{mkdirSync(dirname(p),{recursive:true});const text=JSON.stringify(v);writeFileSync(p,p.endsWith('.gz')?gzipSync(text):text+'\n');};
const read=(p:string)=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)).toString():readFileSync(p,'utf8'));
const body=(a:PlaySim['agents'][number])=>({index:a.idx,id:a.player.id,slot:a.slot,pos:{...a.pos},vel:{...a.vel},support:a.body.support?.state??null});
export function plan() {
  const cases=[];
  for(const [id,concept,kind,back,rbSide,flip,os,ds,seed] of [
    ['S-AWAY','drive','pass','back_flat','R',false,401,402,41],
    ['S-TO','drive','pass','back_flat','L',false,401,402,41],
    ['S-BLOCK','drive','pass','block','R',false,401,402,41],
    ['S-MIRROR','drive','pass','back_flat','R',true,401,402,41],
    ['S-MESH','mesh','pass','back_flat','R',false,401,402,41],
    ['FRESH','drive','pass','back_flat','R',false,951,952,6103],
    ['VERTS','four_verts','pass','back_flat','R',false,401,402,41],
    ['PALMS','drive','pass','back_flat','R',false,401,402,41],
    ['PA','pa_post_dig','pass','block','L',false,401,402,41],
    ['IZ','iz_strong','run','block','L',false,401,402,41],
    ['OZ','oz_strong','run','block','L',false,401,402,41],
  ] as const){
    const formation=structuredClone(FORMATION_BY_ID.gun_doubles_11);
    formation.slots.RB!.side=rbSide;
    const pass=kind==='pass'?structuredClone(PASS_BY_ID[concept]):undefined;
    if(pass){pass.back=back;if(id==='FRESH')pass.weak[2]='shallow_high';}
    const setup:PlaySetup={offense:pickOffense(generateTeam(new Rng(os),'Under O','UFO',{strength:.6}),'11'),
      defense:pickDefense(generateTeam(new Rng(ds),'Under D','UFD',{strength:.6}),'nickel'),
      offCall:{formation,flip,kind,pass,run:kind==='run'?structuredClone(RUN_BY_ID[concept]):undefined,label:id},
      defCall:{personnel:'nickel',front:structuredClone(FRONT_BY_ID.over),coverage:structuredClone(COVERAGE_BY_ID[id==='PALMS'?'cover4_palms':'cover4']),
        pressure:null,zoneStyle:'match',label:id},los:40,ballY:26.666666666666668,firstDownX:50,seed,audibles:false,record:false};
    cases.push({id,inputSha256:sha(setup),setup});
  }
  return {schema:'quarters-underneath-v1',reference:sourceVersion(),seconds:7,caseMs:5000,cases};
}
export function run(m:ReturnType<typeof plan>,out:string) {
  if(existsSync(out))throw new Error('Output exists; retain it and choose a new explicit output');
  const profile=read('config/baseline.json'),source=sourceVersion();
  const provenance={source,manifest:sha(m),operator:fileSha('scripts/diag/quarters-underneath.ts'),node:process.version,
    lock:fileSha('package-lock.json'),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults};
  const rows:any[]=[];
  for(const c of m.cases){
    if(sha(c.setup)!==c.inputSha256)throw new Error('Input drift '+c.id);
    // The accepted input definitions remain fixed; changing installed rule code
    // is the intervention. No handoff, throw or receiver path is staged.
    const setup=structuredClone(c.setup);
    const sim=new PlaySim(setup),snap=auditSchematicSnap(sim),r=sim.slot(sim.offAlign.numbering.W2!)!;
    const a=sim.defense.find(d=>d.behavior instanceof CoverageDefender&&d.behavior.zone==='curl_flat_w')!;
    const coverage=a.behavior as CoverageDefender,samples:any[]=[],cues:any[]=[];
    const original=sim.world.step.bind(sim.world),see=sim.see.bind(sim);
    sim.see=(observer,target,scale)=>{const p=see(observer,target,scale);
      if(observer===a&&cues.length<4096)cues.push({t:sim.t,target:target.idx,slot:target.slot,scale:scale??1,picture:structuredClone(p)});return p;};
    const invariants={momentumResidual:0,workResidual:0,armImpulseExcess:0,armWorkExcess:0,motorWorkExcess:0};
    let steps=0,lastJob='',error:string|null=null;
    sim.world.step=(intents,dt)=>{
      const before=body(a),raw=structuredClone((Reflect.get(sim,'cmds') as PlaySim['intents'])[a.idx]);
      const momentum=()=>sim.agents.reduce((p,a)=>({x:p.x+a.profile.massKg*a.vel.x,y:p.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
      const p0=momentum(),report=original(intents,dt),p1=momentum(),g=report.groundImpulse.reduce((v,j)=>({x:v.x+j.x,y:v.y+j.y}),{x:0,y:0});
      invariants.momentumResidual=Math.max(invariants.momentumResidual,Math.hypot(p1.x-p0.x-g.x,p1.y-p0.y-g.y));
      invariants.workResidual=Math.max(invariants.workResidual,Math.abs(report.work.residual));
      for(const d of sim.agents){const i=d.idx;assertSchematicFinite(body(d),d.slot);
        invariants.armImpulseExcess=Math.max(invariants.armImpulseExcess,report.armImpulse[i]-report.armImpulseLimit[i]);
        invariants.armWorkExcess=Math.max(invariants.armWorkExcess,report.armWork[i]-report.armWorkLimit[i]);
        invariants.motorWorkExcess=Math.max(invariants.motorWorkExcess,report.supportMotorWork[i]-report.supportMotorWorkLimit[i]);}
      assertSchematicBudgets(invariants);steps++;
      if(steps%5===0||coverage.job!==lastJob){lastJob=coverage.job;samples.push({interval:[sim.t,sim.t+dt],before,raw,final:structuredClone(intents[a.idx]),
        defender:body(a),receiver:body(r),gap:Math.hypot(a.pos.x-r.pos.x,a.pos.y-r.pos.y),depthLeverage:a.pos.x-r.pos.x,
        job:coverage.job,rule:coverage.recordedRule(sim.t),recognition:a.recog?.read??null,runFit:a.runFit,
        defense:sim.defense.map(d=>({...body(d),job:d.behavior instanceof CoverageDefender?d.behavior.job:d.behavior.kind,runFit:d.runFit})),
        offense:sim.offense.filter(o=>sim.offAlign.refOf[o.slot as keyof typeof sim.offAlign.refOf]).map(body),ball:sim.ball.kind});}
      return report;
    };
    const started=performance.now();sim.event('snap',sim.slot('C')??sim.qb);
    try{while(sim.phase==='live'&&sim.t<m.seconds){if(performance.now()-started>=m.caseMs)throw new Error('Wall budget exhausted');sim.tick();}}
    catch(e){error=e instanceof Error?e.message:String(e);}
    const {frames,telemetry,...result}=sim.buildResult(),terminal=sim.phase==='dead'&&result.outcome!=='timeout';
    const row={id:c.id,inputSha256:c.inputSha256,elapsedMs:performance.now()-started,steps,error,terminal,
      status:error?'failed':terminal?'native':'censored',outcome:terminal?result.outcome:null,
      gain:terminal?result.offenseYards:null,yac:terminal&&result.stats.completed&&!result.turnover&&!result.stats.fumbledBy&&!result.penalty?result.stats.yac:null,
      physicalSignature:sha({t:sim.t,phase:sim.phase,result,bodies:sim.agents.map(a=>a.body),rng:sim.rng,minds:sim.agents.map(a=>a.mind),perception:sim.perception}),
      snap,defender:a.player.id,receiver:r.player.id,actualCatcher:result.stats.receiver??null,
      firstContact:result.events.find(e=>e.type==='carrier_contact'&&e.t>=sim.catchAt&&sim.catchAt>=0)??null,
      result,samples,cues,invariants};rows.push(row);write(out,{provenance,rows});if(error)throw new Error(c.id+': '+error);
  }
  if(sourceVersion()!==source)throw new Error('Source changed during collection');
  console.log(JSON.stringify({source,cases:rows.length,steps:rows.reduce((n,r)=>n+r.steps,0),native:rows.filter(r=>r.terminal).length,
    censored:rows.filter(r=>!r.terminal).length,simulationMs:rows.reduce((n,r)=>n+r.elapsedMs,0),out}));
}
function main(){const[mode,path,out,checkpoint]=process.argv.slice(2);
  if(mode==='plan'&&path){const m=plan();write(path,m);console.log(JSON.stringify({cases:m.cases.length,simulatedSnaps:0}));return;}
  if(mode!=='run'||!path||!out||!checkpoint)throw new Error('plan MANIFEST or run MANIFEST OUTPUT CHECKPOINT_REASON; no automatic campaign');
  run(read(path),out);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
