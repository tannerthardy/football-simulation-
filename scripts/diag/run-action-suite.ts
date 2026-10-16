/** Explicit, resumable run/PA checkpoint. Default invocation plans zero snaps.
 * plan MANIFEST [accepted|perimeter]; run MANIFEST OUT --checkpoint REASON;
 * inspect MANIFEST CASE OUT [seconds] (one saved-input diagnostic).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { auditSchematicSnap, assertSchematicBudgets } from '../../src/lab/schematic-stress.js';
import { RUN_BY_ID, RUN_CONCEPTS, PASS_BY_ID } from '../../src/playbook/concepts.js';
import { FRONT_BY_ID, COVERAGE_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { DefensivePlayCall, Formation, OffensivePlayCall, RunConcept } from '../../src/playbook/types.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { ScoutingReport, type SnapContext } from '../../src/sim/recognition.js';
import { sourceVersion } from '../source-version.js';

export const sha = (v: unknown): string => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileSha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const clone = <T>(x: T): T => structuredClone(x);
const q = (x: number) => Math.round(x * 1e5) / 1e5;
export const ACCEPTED = 'bb6d4c73948d53ba841dd9338dd240146c739f8c';
export const PRIMARY: Array<[string, string, string]> = [
  ['insideZone','iz_strong','ace_12'], ['outsideZone','oz_strong','ace_12'], ['wideZone','wz_strong','ace_12'],
  ['splitZone','split_zone','gun_wing_12'], ['power','power','i_pro_21'], ['counter','counter','i_pro_21'],
  ['duo','duo','ace_12'], ['trap','trap','ace_12'], ['draw','draw','gun_doubles_11'],
  ['toss','toss','ace_12'], ['qbDraw','lab_qb_draw','gun_doubles_11'],
];
export const TRANSFER: Array<[string, string]> = [
  ...['insideZone','outsideZone','wideZone'].flatMap(s => ['gun_doubles_11','pistol_12','i_pro_21'].map(f => [s,f] as [string,string])),
  ['splitZone','heavy_13'], ['power','ace_12'], ['power','gun_wing_12'], ['counter','ace_12'], ['counter','gun_wing_12'],
  ['duo','i_pro_21'], ['trap','gun_doubles_11'], ['draw','ace_12'], ['toss','i_pro_21'], ['qbDraw','pistol_11'],
];
const LOOK_SPECS = [
  ['over3','base43','over','cover3','box',''], ['under3','base43','under','cover3','spill',''],
  ['wide9','nickel','wide9','cover3','spill',''], ['tite4','base34','tite','cover4','box',''],
  ['odd3','base34','odd','cover3','spill',''], ['bear1','goalline','bear','cover1','box',''],
  ['over2','base43','over','cover2','box',''], ['over4','base43','over','cover4','box',''],
  ['off1','base43','over','cover1_off','box',''], ['mike1','base43','over','cover1','box','mike_a'],
] as const;
const PA_LOOKS = ['over3','under3','tite4','over2','over4','mike1'];
const TRANSFER_LOOKS = ['over3','under3','wide9','tite4'];
const PA = [['postdig','pa_post_dig','insideZone','ace_12'], ['flood','pa_flood','wideZone','ace_12'],
  ['shot','pa_shot','power','i_pro_21']] as const;
export interface Case {
  id: string; phase: 'primary'|'transfer'|'reaction'|'pa'|'perimeter'; family: string;
  formation: string; direction: 'strong'|'weak'; look: string; roster: string; seed: number;
  context: string; arm: 'run'|'pa'|'plain'; package?: string; inputSha256?: string;
}
export interface Manifest {
  schema: 'run-action-suite-v1'; host: 'accepted'|'perimeter'; accepted: string;
  budgets: { simulationSeconds: number; caseMs: number; campaignMs: number };
  rosters: Record<string, { offense: Record<string, PlaySetup['offense']>; defense: Record<string, PlaySetup['defense']> }>;
  formations: Record<string, Formation>; runs: Record<string, RunConcept>;
  passes: Record<string, NonNullable<OffensivePlayCall['pass']>>; looks: Record<string, DefensivePlayCall>;
  contexts: Record<string, { down: number; distance: number; history: boolean[] }>;
  cases: Case[]; design: Record<string, string>;
}

export function buildManifest(host: Manifest['host'] = 'accepted'): Manifest {
  const runs = Object.fromEntries(PRIMARY.map(([family,id]) => [family,
    id === 'lab_qb_draw' ? {...RUN_BY_ID.draw,id,name:'Lab explicit QB Draw',scheme:'qbDraw' as const} : clone(RUN_BY_ID[id])]));
  for (const [family, run] of Object.entries(runs)) {
    const weak = RUN_BY_ID[run.id.replace('_strong','_weak')];
    if (weak && weak.id !== run.id) runs[family+':weak'] = clone(weak);
  }
  const proto = ['buck_sweep','pin_pull','crack_toss'];
  if (host === 'perimeter') for (const id of proto) {
    if (!RUN_BY_ID[id]) throw new Error('Prototype calls require the separately pinned PR99 host');
    runs[RUN_BY_ID[id].scheme] = clone(RUN_BY_ID[id]);
  }
  const rosters: Manifest['rosters'] = {};
  for (const [id,os,ds] of [['pair11',11,12],['pair31',31,32]] as const) {
    const o = generateTeam(new Rng(os),id+' O',id+'O',{strength:.55});
    const d = generateTeam(new Rng(ds),id+' D',id+'D',{strength:.55});
    rosters[id] = {offense:Object.fromEntries(['11','12','13','21'].map(p => [p,pickOffense(o,p as '11')])),
      defense:Object.fromEntries(['base43','base34','nickel','goalline'].map(p=>[p,pickDefense(d,p as 'base43')]))};
  }
  const looks = Object.fromEntries(LOOK_SPECS.map(([id,personnel,front,coverage,edge,pressure]) => [id,
    {personnel,front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID[coverage],
      pressure:pressure?PRESSURE_BY_ID[pressure]:null,zoneStyle:'match' as const,
      runPolicy:{edge,linebacker:'stack' as const},label:id}]));
  const manifest: Manifest = {schema:'run-action-suite-v1',host,accepted:ACCEPTED,
    budgets:{simulationSeconds:20,caseMs:5000,campaignMs:host==='accepted'?1800000:480000},rosters,
    formations:clone(FORMATION_BY_ID),runs,passes:Object.fromEntries(PA.map(([p,id])=>[p,clone(PASS_BY_ID[id])])),looks,
    contexts:{neutral:{down:1,distance:10,history:[]},runheavy:{down:1,distance:10,history:[...Array(18).fill(false),...Array(6).fill(true)]},
      passalert:{down:3,distance:8,history:[]}},cases:[],design:{
      insideZone:'Inside-zone mesh + glance/post-dig; line sell missing in native PA.',
      outsideZone:'Outside-zone fake + over/flood; distinct mesh direction and line sell missing.',
      wideZone:'Wide-zone fake + flood/boot; native flood exists, true lateral boot/line action missing.',
      splitZone:'Split-flow fake + slice/leak; native PA has no slice installation.',
      power:'Power pull-action + post/shot; native shot exists, actual guard pull fake missing.',
      counter:'Counter pull-action + cross/shot; native PA has no counter step/pull fake.',
      duo:'Vertical double-team sell + post/dig; native PA has no Duo double sell.',
      trap:'Trap fake + TE pop; native PA has no trap pull fake.',
      draw:'Delayed draw look + seam/pop; native PA has no draw-line presentation.',
      toss:'Fake toss + flood/throwback; native PA has no fake-pitch action.',
      qbDraw:'QB draw threat + pop; native PA has no QB keeper fake.',
      buckSweep:'Two-guard Buck action + waggle; prototype run only, PA pull/boot missing.',
      pinPull:'Pin/pull action + flood; prototype run only, corresponding PA surface missing.',
      crackToss:'Crack/fake toss + receiver release; prototype run only, legal fake/release timing missing.',
    }};
  const add = (phase:Case['phase'],family:string,formation:string,look:string,roster:string,seed:number,
    direction:Case['direction']='strong',context='neutral',arm:Case['arm']='run',pkg?:string) => {
    const id=[phase,family,formation,look,roster,seed,direction,context,arm,pkg??''].join('/');
    manifest.cases.push({id,phase,family,formation,look,roster,seed,direction,context,arm,...(pkg?{package:pkg}:{})});
  };
  const families = host==='accepted'?PRIMARY:proto.map(id=>[RUN_BY_ID[id].scheme,id,id==='crack_toss'?'ace_nasty_12':'ace_12']);
  for(const [family,,formation] of families)for(const look of Object.keys(looks))for(const roster of Object.keys(rosters))
    for(const seed of [77,71001])for(const side of ['strong','weak'] as const)add(host==='accepted'?'primary':'perimeter',family,formation,look,roster,seed,side);
  if(host==='accepted') {
    for(const [family,formation] of TRANSFER)for(const look of TRANSFER_LOOKS)for(const side of ['strong','weak'] as const)
      add('transfer',family,formation,look,'pair11',77,side);
    for(const [pkg,,family,formation] of PA)for(const look of PA_LOOKS)for(const roster of Object.keys(rosters))for(const seed of [77,71001])
      for(const context of Object.keys(manifest.contexts)) {
        if(context!=='neutral')add('reaction',family,formation,look,roster,seed,'strong',context);
        for(const arm of ['pa','plain'] as const)add('pa',family,formation,look,roster,seed,'strong',context,arm,pkg);
      }
  }
  for(const c of manifest.cases)c.inputSha256=sha(frozenInput(manifest,c));
  return manifest;
}

export function frozenInput(m:Manifest,c:Case):{setup:PlaySetup;history:boolean[]} {
  const formation=clone(m.formations[c.formation]);if(!formation)throw new Error('Missing formation '+c.formation);
  const run=clone(c.direction==='weak'?(m.runs[c.family+':weak']??m.runs[c.family]):m.runs[c.family]);run.direction=c.direction;
  let call:OffensivePlayCall={formation,flip:false,kind:'run',run,label:c.family};
  if(c.arm!=='run') {
    const pass=clone(m.passes[c.package!]);
    if(c.arm==='plain'){pass.family='dropback';delete pass.fake;pass.id+='-no-fake';pass.name+=' no fake';}
    call={formation,flip:false,kind:'pass',pass,label:c.package!+'/'+c.arm};
  }
  const look=clone(m.looks[c.look]),ctx=m.contexts[c.context],r=m.rosters[c.roster];
  return {setup:{offense:clone(r.offense[formation.personnel]),defense:clone(r.defense[look.personnel]),offCall:call,defCall:look,
    los:40,ballY:26.67,firstDownX:40+ctx.distance,down:ctx.down,seed:c.seed,audibles:false,hurry:false,record:false},history:clone(ctx.history)};
}
export function makeSim(m:Manifest,c:Case,record=false):PlaySim {
  const input=frozenInput(m,c);if(c.inputSha256!==sha(input))throw new Error('Input drift '+c.id);
  if(input.history.length) {
    const report=new ScoutingReport(),f=input.setup.offCall.formation;
    const context:SnapContext={down:input.setup.down!,distance:input.setup.firstDownX-input.setup.los,
      yardline:input.setup.los-10,personnel:f.personnel,qb:f.qb,empty:!f.slots.RB,hurry:false};
    for(const pass of input.history)report.observe(context,pass);
    input.setup.scouting=report;
  }
  return new PlaySim({...input.setup,record,recordEvery:2,recordLevel:'full'});
}
export function validateManifest(m:Manifest):void {
  if(m.schema!=='run-action-suite-v1'||new Set(m.cases.map(c=>c.id)).size!==m.cases.length)throw new Error('Invalid manifest');
  for(const c of m.cases) {
    const i=frozenInput(m,c);if(sha(i)!==c.inputSha256)throw new Error('Input drift '+c.id);
    if(!i.setup.defCall.front.personnel.includes(i.setup.defCall.personnel))throw new Error('Incompatible front '+c.id);
    for(const players of [i.setup.offense,i.setup.defense])if(Object.keys(players).length!==11||new Set(Object.values(players).map(p=>p!.id)).size!==11)
      throw new Error('Incomplete/duplicate lineup '+c.id);
  }
}
export function provenance(m:Manifest) {
  const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
  return {source:sourceVersion(),node:process.version,platform:process.platform,arch:process.arch,
    lock:fileSha('package-lock.json'),manifest:sha(m),collector:fileSha('scripts/diag/run-action-suite.ts'),
    sourceHelper:fileSha('scripts/source-version.ts'),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
    worldDefaults:profile.worldDefaults,operator:'run-action-v1'};
}
export const caseKey=(m:Manifest,c:Case,p:ReturnType<typeof provenance>)=>sha({input:c.inputSha256,provenance:p});
function plans(sim:PlaySim) {
  return sim.offense.filter(a=>a.behavior instanceof RunBlocker).map(a=>{
    const p=(a.behavior as RunBlocker).plan;return {slot:a.slot,kind:p.kind,target:p.target?.slot??null,
      climb:p.climbTo?.slot??null,pullRole:p.pullRole??null,combination:p.combination?{members:p.combination.members.map(b=>b.slot),
        target:p.combination.defender.slot,backer:p.combination.backer?.slot??null,released:p.combination.released}:null};
  });
}
export function physicalSignature(sim:PlaySim) {
  const {frames,telemetry,...result}=sim.buildResult();
  return sha({t:sim.t,phase:sim.phase,result,bodies:sim.agents.map(a=>a.body),rng:sim.rng});
}
export function measure(m:Manifest,c:Case,options:{observe?:boolean;record?:boolean;until?:number}={}) {
  const sim=makeSim(m,c,options.record),snap=auditSchematicSnap(sim),initial=sim.agents.map(a=>({slot:a.slot,team:a.team,pos:{...a.pos},
    radius:a.profile.radius,player:a.player.id,behavior:a.behavior.kind,runFit:a.runFit})),installed=plans(sim);
  const frames:any[]=[],loads=new Map<string,any>(),offenseImpacts:any[]=[],readTransitions:any[]=[];
  const previousRead=new Map<number,string>(),original=sim.world.step.bind(sim.world);
  const invariants={momentumResidual:0,workResidual:0,armImpulseExcess:0,armWorkExcess:0,motorWorkExcess:0};
  let contactLoads:any[]=[],firstContactSeen=false,steps=0,maxPenetration=0;
  if(options.observe!==false)sim.world.step=(intents,dt)=>{
    const before=sim.agents.map(a=>({pos:{...a.pos},vel:{...a.vel}}));
    const p0=sim.agents.reduce((v,a)=>({x:v.x+a.profile.massKg*a.vel.x,y:v.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
    const r=original(intents,dt);steps++;
    const ground=r.groundImpulse.reduce((v,j)=>({x:v.x+j.x,y:v.y+j.y}),{x:0,y:0});
    const p1=sim.agents.reduce((v,a)=>({x:v.x+a.profile.massKg*a.vel.x,y:v.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
    invariants.momentumResidual=Math.max(invariants.momentumResidual,Math.hypot(p1.x-p0.x-ground.x,p1.y-p0.y-ground.y));
    invariants.workResidual=Math.max(invariants.workResidual,Math.abs(r.work.residual));maxPenetration=Math.max(maxPenetration,r.maxPenetration);
    for(const a of sim.agents) {
      if(!Number.isFinite(a.pos.x+a.pos.y+a.vel.x+a.vel.y+a.facing+a.body.energy))throw new Error('Nonfinite physical state '+a.slot);
      const i=a.idx;
      invariants.armImpulseExcess=Math.max(invariants.armImpulseExcess,r.armImpulse[i]-r.armImpulseLimit[i]);
      invariants.armWorkExcess=Math.max(invariants.armWorkExcess,r.armWork[i]-r.armWorkLimit[i]);
      invariants.motorWorkExcess=Math.max(invariants.motorWorkExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);
    }
    assertSchematicBudgets(invariants);
    for(const impact of r.contacts)if(impact.impulse>0&&sim.agents[impact.i].team==='O'&&sim.agents[impact.j].team==='O')
      offenseImpacts.push({interval:[sim.t,q(sim.t+dt)],a:sim.agents[impact.i].slot,b:sim.agents[impact.j].slot,impulse:impact.impulse});
    const active:any[]=[];
    for(const e of sim.engagements)for(const [a,h] of [[e.blocker,e.hands] as const,...(e.helperHands?.entries()??[])]) {
      if(!h)continue;const force=Math.hypot(h.normalForce??0,h.tangentForce??0);if(force<=1e-8)continue;
      const key=a.slot+'/'+e.defender.slot,v=loads.get(key)??{blocker:a.slot,defender:e.defender.slot,first:q(sim.t+dt),last:0,duration:0,forceImpulse:0};
      v.last=q(sim.t+dt);v.duration+=dt;v.forceImpulse+=force*dt;loads.set(key,v);
      active.push({blocker:a.slot,defender:e.defender.slot,normal:h.normalForce,tangent:h.tangentForce});
    }
    // Carrier contact is resolved after World in this same tick. Retain the
    // interval's actual loads, then associate them only with its native event.
    if(!firstContactSeen)contactLoads=active;
    if(steps%4===0||steps===1)frames.push({beforeAt:sim.t,afterAt:q(sim.t+dt),ball:sim.ball.kind,carrier:sim.carrier?.slot??null,
      agents:sim.agents.map(a=>({slot:a.slot,kind:a.behavior.kind,entry:before[a.idx],
        raw:clone((Reflect.get(sim,'cmds') as PlaySim['intents'])[a.idx]),final:clone(intents[a.idx]),
        pos:{...a.pos},vel:{...a.vel},facing:a.facing,pose:a.body.support?.state??null,
        read:a.recog?.read??null,pPass:a.recog?.pPass()??null})),jobs:plans(sim),loads:active});
    return r;
  };
  const start=performance.now(),until=options.until??m.budgets.simulationSeconds;
  sim.event('snap',sim.slot('C')??sim.qb);
  let wallCensor=false;
  while(sim.phase==='live'&&sim.t<until) {
    if(performance.now()-start>=m.budgets.caseMs){wallCensor=true;break;}
    sim.tick();
    if(!firstContactSeen&&sim.events.some(e=>e.type==='carrier_contact'))firstContactSeen=true;
    for(const d of sim.defense)if(d.recog&&previousRead.get(d.idx)!==d.recog.read){
      readTransitions.push({t:q(sim.t),slot:d.slot,read:d.recog.read,pPass:d.recog.pPass(),pos:{...d.pos}});previousRead.set(d.idx,d.recog.read);
    }
  }
  const terminal=sim.phase!=='live',r=sim.buildResult(),first=sim.events.find(e=>e.type==='carrier_contact');
  const down=m.contexts[c.context].down,distance=m.contexts[c.context].distance;
  const observation={snap,initial,installed,frames,loads:[...loads.values()],offenseImpacts,readTransitions,invariants,maxPenetration,
    contactLoads:first?contactLoads:[],events:sim.events};
  return {case:c,status:terminal?'native':wallCensor?'censored-wall':'censored-sim',elapsedMs:performance.now()-start,
    metrics:{terminal,outcome:terminal?r.outcome:null,gain:terminal?r.offenseYards:null,fieldGain:terminal?r.yards:null,
      duration:sim.t,success:terminal?!r.turnover&&r.offenseYards>=distance*(down===1?.4:down===2?.6:1):null,
      turnover:r.turnover,penalty:r.penalty?.kind??null,completed:r.stats.completed,attempted:r.stats.attempted,
      sacked:r.stats.sacked,scramble:r.stats.scramble,retainedSnap:r.stats.retainedSnap??false,
      pressured:r.stats.pressured??false,handoff:sim.handoffAt>=0?sim.handoffAt:null,throw:sim.throwAt>=0?sim.throwAt:null,
      catch:sim.catchAt>=0?sim.catchAt:null,firstContact:first??null,contactYards:sim.firstContactX===null?null:sim.firstContactX-sim.los,
      rusher:r.stats.rusher??null,receiver:r.stats.receiver??null,airYards:r.stats.airYards??null,separation:r.stats.separation??null},
    physicalSignature:physicalSignature(sim),observation,film:options.record?{id:c.id,result:r,
      players:sim.agents.map(a=>({slot:a.slot,team:a.team,name:a.name,jersey:a.player.jersey,position:a.player.position,profile:a.profile}))}:null};
}

function writeJSON(path:string,value:unknown) {
  mkdirSync(dirname(path),{recursive:true});const tmp=path+'.tmp';
  const bytes=JSON.stringify(value);writeFileSync(tmp,path.endsWith('.gz')?gzipSync(bytes):bytes+'\n');renameSync(tmp,path);
}
export function readJSON(path:string):any {const b=readFileSync(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(b).toString():b.toString());}
export function validateCache(value:any,key:string,c:Case) {
  if(value.key!==key||value.row.case.inputSha256!==c.inputSha256||sha(value.row)!==value.rowSha256)throw new Error('Corrupt cache '+c.id);
  if(value.row.status==='censored-wall')throw new Error('Wall-censored case requires an explicit new decision, not silent retry');
}
async function main() {
  const [mode='plan',manifestPath='out/run-action-suite/manifest.json.gz',out='out/run-action-suite',...args]=process.argv.slice(2);
  if(mode==='plan') {
    const host=out==='perimeter'?'perimeter':'accepted',m=buildManifest(host);validateManifest(m);writeJSON(manifestPath,m);
    console.log(JSON.stringify({manifestPath,host,cases:m.cases.length,byPhase:Object.fromEntries([...new Set(m.cases.map(c=>c.phase))].map(p=>[p,m.cases.filter(c=>c.phase===p).length])),simulatedSnaps:0}));return;
  }
  const m=readJSON(manifestPath) as Manifest;validateManifest(m);
  if(mode==='inspect') {
    const id=out,target=args[0],c=m.cases.find(c=>c.id===id);if(!c||!target)throw new Error('Missing saved case / output');
    const row=measure(m,c,{record:true,until:Number(args[1]??m.budgets.simulationSeconds)});writeJSON(target,row);console.log(row.metrics);return;
  }
  if(mode!=='run'||args[0]!=='--checkpoint'||!args[1])throw new Error('Broad execution requires run MANIFEST OUT --checkpoint REASON');
  const p=provenance(m),started=performance.now(),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const expectedSource=m.host==='accepted'?'668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac'
    :'ca40378fb18a3285c02031228e0e87190b2b0cb4aeeb70c48b51926816c19a0b';
  if(p.source!==expectedSource)throw new Error('Wrong engine source for declared host; do not mix accepted and prototype evidence');
  const index:any[]=[];let executed=0,cached=0,status='complete',failure:any=null;
  mkdirSync(join(out,'cache'),{recursive:true});
  for(const c of m.cases) {
    if(performance.now()-started>m.budgets.campaignMs){status='budget-exhausted';break;}
    const key=caseKey(m,c,p),path=join(out,'cache',key+'.json.gz');
    try {
      let value:any;
      if(existsSync(path)){value=readJSON(path);validateCache(value,key,c);cached++;}
      else {
        const row=measure(m,c);value={key,row,rowSha256:sha(row)};writeJSON(path,value);executed++;
        if(row.status==='censored-wall')throw new Error('Per-case wall budget exhausted');
      }
      index.push({id:c.id,key,path,metrics:value.row.metrics,status:value.row.status});
    }catch(error){status='failed';failure={id:c.id,error:String(error)};break;}
    if(index.length%16===0) {
      const progress={done:index.length,total:m.cases.length,executed,cached,seconds:q((performance.now()-started)/1000),last:c.id};
      writeJSON(join(out,'progress.json'),progress);console.log(JSON.stringify(progress));
    }
  }
  if(sha(p)!==sha(provenance(m))){status='failed';failure={error:'Source/input/operator/settings drift during collection'};}
  const report={schema:'run-action-index-v1',head,provenance:p,checkpoint:args[1],startedAt:new Date(Date.now()-(performance.now()-started)).toISOString(),
    status,failure,planned:m.cases.length,executed,cached,elapsedSeconds:(performance.now()-started)/1000,
    censored:index.filter(r=>r.status!=='native').length,skipped:m.cases.slice(index.length).map(c=>c.id),rows:index};
  writeJSON(join(out,'index.json'),report);console.log(JSON.stringify({...report,rows:undefined,skipped:report.skipped.length}));
  if(status!=='complete')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
