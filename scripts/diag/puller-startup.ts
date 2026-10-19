/** Bounded request/execution comparison, not a game or outcome screen.
 * node --import tsx scripts/diag/puller-startup.ts out/puller-startup/base.json
 * Optional --engine PATH loads a saved source host, with that host's flags.
 */
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const out=process.argv[2]??'out/puller-startup/probe.json';
const aliases:Record<string,string>={'reported-counter':'counter-default','counter-mirror':'counter-flip','power-mirror':'power-flip'};
const selected=process.argv.includes('--case')?process.argv[process.argv.indexOf('--case')+1].split(',').map(id=>aliases[id]??id):null;
const engine=resolve(process.argv.includes('--engine')?process.argv[process.argv.indexOf('--engine')+1]:'.');
const load=(file:string)=>import(pathToFileURL(resolve(engine,file)).href);
const [{Rng},{generateTeam,pickOffense,pickDefense},{RUN_BY_ID},{FORMATION_BY_ID},{FRONT_BY_ID,COVERAGE_BY_ID},{PlaySim},{RunBlocker},{World},{locomotionAccel}, {availability,supportParams}]=await Promise.all([
  load('src/core/rng.ts'),load('src/league/team.ts'),load('src/playbook/concepts.ts'),load('src/playbook/formations.ts'),load('src/playbook/defense.ts'),load('src/sim/playsim.ts'),load('src/sim/behaviors/blocking.ts'),load('src/physics/world.ts'),load('src/physics/kinematics.ts'),load('src/physics/support.ts')]);
const specs=[
  {id:'counter-default',run:'counter',seed:1,os:31,ds:32,formation:'ace_12',front:'over',coverage:'cover2',flip:false},
  {id:'counter-flip',run:'counter',seed:1,os:31,ds:32,formation:'ace_12',front:'over',coverage:'cover2',flip:true},
  {id:'power-control',run:'power',seed:77,os:11,ds:12,formation:'i_pro_21',front:'over',coverage:'cover3',flip:false},
  {id:'power-flip',run:'power',seed:77,os:11,ds:12,formation:'i_pro_21',front:'over',coverage:'cover3',flip:true},
  {id:'fresh-trap',run:'trap',seed:71009,os:31,ds:32,formation:'i_pro_21',front:'under',coverage:'cover3',flip:false},
  {id:'drive-control',run:'iz_strong',seed:77,os:11,ds:12,formation:'ace_12',front:'over',coverage:'cover3',flip:false},
];
const t0=performance.now(),cases:any[]=[],mechanical:any[]=[];
for(const spec of specs.filter(s=>!selected||selected.includes(s.id))){
  const run=structuredClone(RUN_BY_ID[spec.run]);
  if(process.argv.includes('--direction'))run.direction=process.argv[process.argv.indexOf('--direction')+1];
  const formation=FORMATION_BY_ID[spec.formation],setup={offense:pickOffense(generateTeam(new Rng(spec.os),'O','O',{strength:.55}),formation.personnel),
    defense:pickDefense(generateTeam(new Rng(spec.ds),'D','D',{strength:.55}),'base43'),
    offCall:{formation,flip:spec.flip,kind:'run',run,label:spec.run},
    defCall:{personnel:'base43',front:FRONT_BY_ID[spec.front],coverage:COVERAGE_BY_ID[spec.coverage],pressure:null,zoneStyle:'match',runPolicy:{edge:'box',linebacker:'stack'},label:spec.coverage},
    los:40,ballY:26.67,firstDownX:50,down:1,seed:spec.seed,audibles:false,hurry:false};
  const sim=new PlaySim(structuredClone(setup)),rows:any[]=[],requests=new Map();
  const pullers=sim.offense.filter((a:any)=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull');
  const starts=new Map(pullers.map((a:any)=>[a.idx,{...a.pos}]));
  const side=sim.offAlign.strongSign*(run.direction==='weak'?-1:1);
  for(const a of sim.agents){const update=a.behavior.update;a.behavior.update=function(a:any,s:any){const cmd=update.call(this,a,s);requests.set(a.idx,structuredClone(cmd));return cmd;};}
  const step=sim.world.step;sim.world.step=function(intents:any[],dt:number){
    const initial=sim.agents.map((a:any)=>structuredClone(a.body));
    const report=step.call(this,intents,dt);
    for(const a of pullers){const before=initial[a.idx],command=intents[a.idx],b=a.behavior;
      rows.push({t:sim.t,endT:sim.t+dt,slot:a.slot,ready:a.snapReadyAt,phase:b.pullIdx,role:b.plan.pullRole,target:b.plan.target?.slot,
        pos:{...a.pos},vel:{...a.vel},before,raw:requests.get(a.idx),command:structuredClone(command),facing:a.facing,spin:a.body.spin,
        capacity:availability(before.support,supportParams(a.profile),1),engaged:!!a.engagement,
        contacts:report.contacts.filter((c:any)=>c.i===a.idx||c.j===a.idx),groundImpulse:report.groundImpulse[a.idx],workResidual:report.work.residual,
        targetBody:b.plan.target?structuredClone(b.plan.target.body):null,runner:sim.slot('RB')?structuredClone(sim.slot('RB').body):null,
        hand:a.engagement?{normal:a.engagement.hands?.normalForce,tangent:a.engagement.hands?.tangentForce,extension:a.engagement.hands?.extension}:null});
    }
    return report;
  };
  while(sim.phase==='live'&&sim.t<4)sim.tick();
  const result=sim.buildResult();
  const metrics=pullers.map((a:any)=>{const seq=rows.filter(r=>r.slot===a.slot),start=starts.get(a.idx) as any;
    const first=(f:(r:any)=>boolean)=>seq.find(f)?.endT??null;
    const at=(t:number)=>seq.find(r=>Math.abs(r.endT-t)<1e-7);
    return {slot:a.slot,ready:a.snapReadyAt,firstLateral15:first(r=>r.vel.y*side>=1.5),firstLateral06:first(r=>(r.pos.y-start.y)*side>=.6),
      lateral:[.6,1,1.4].map(t=>{const r=at(t);return r?(r.pos.y-start.y)*side:null;}),
      firstEngagement:first(r=>r.engaged),firstPhysicalContact:first(r=>r.contacts.length>0),firstLoadedHands:first(r=>Math.hypot(r.hand?.normal??0,r.hand?.tangent??0)>1e-6),
      requestMax:Math.max(...seq.map(r=>Math.hypot(r.command.vel.x,r.command.vel.y))),
      capacityMin:Math.min(...seq.map(r=>r.capacity)),energy:a.body.energy};});
  cases.push({spec,setup,inputSha256:createHash('sha256').update(JSON.stringify(setup)).digest('hex'),side,metrics,
    stateHash:createHash('sha256').update(JSON.stringify({bodies:sim.agents.map((a:any)=>a.body),events:sim.events,ball:sim.ball.kind,stats:sim.stats})).digest('hex'),
    terminal:sim.phase!=='live',outcome:sim.phase==='live'?null:result.outcome,yards:sim.phase==='live'?null:result.offenseYards,
    censoredAt:sim.phase==='live'?sim.t:null,firstRunnerContact:sim.events.find((e:any)=>e.type==='carrier_contact')??null,events:sim.events,rows});
  if(spec.id==='counter-default'){
    const profile=pullers.find((a:any)=>a.player.position==='OG')?.profile??pullers[0].profile;
    for(const mode of ['ordinary','drive'])for(const request of [2.65,profile.vmax]){
      const body={pos:{x:0,y:0},vel:{x:0,y:0},facing:0,energy:1,profile},world=new World([body]),trace=[];
      for(let k=0;k<20;k++){
        const command={vel:{x:request,y:0},...(mode==='drive'?{propulsion:'full'}:{})},before=structuredClone(body);
        const acceleration=locomotionAccel(before,command,.05),report=world.step([command],.05);
        trace.push({t:(k+1)*.05,acceleration,body:structuredClone(body),workResidual:report.work.residual});
      }
      mechanical.push({mode,request,profile,trace});
    }
  }
}
const profile=JSON.parse(readFileSync(resolve(engine,'config/baseline.json'),'utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const hash=createHash('sha256');
const sourceFiles:string[]=[];
function findSource(dir:string):void{
  for(const entry of readdirSync(resolve(engine,dir),{withFileTypes:true})){
    const file=dir+'/'+entry.name;
    if(entry.isDirectory())findSource(file);else sourceFiles.push(file);
  }
}
findSource('src');
for(const file of sourceFiles.sort())hash.update(file).update('\0').update(readFileSync(resolve(engine,file))).update('\0');
if(!cases.length)throw new Error('No selected cases executed');
const receipt={engine,checkoutCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:engine,encoding:'utf8'}).trim(),
  sourceOrigin:existsSync(resolve(engine,'source-origin.json'))?JSON.parse(readFileSync(resolve(engine,'source-origin.json'),'utf8')):null,
  sourceSha256:hash.digest('hex'),collectorSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),node:process.version,flags,
  seconds:(performance.now()-t0)/1000,operator:'Stored 20 Hz native lateral component (not total-speed threshold); four-second censor explicit; body contacts separate from engagement ownership.',cases,mechanical};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt)+'\n');
console.log(JSON.stringify({out,seconds:receipt.seconds,cases:cases.map(({spec,metrics,terminal,outcome,yards,censoredAt,firstRunnerContact})=>({id:spec.id,metrics,terminal,outcome,yards,censoredAt,firstRunnerContact})),mechanical:mechanical.map(m=>({mode:m.mode,request:m.request,v05:m.trace[9].body.vel.x,d05:m.trace[9].body.pos.x}))},null,2));
