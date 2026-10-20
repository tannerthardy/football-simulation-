/** Small identical-input movement/football experiments; not a game campaign.
 * node --import tsx scripts/diag/gait-intent-lab.ts OUT --mode ordinary|intent|full-old
 *   [--engine DIR] [--nfl out/gait-response/nfl/trajectory-fixtures.json] [--native]
 * Modes describe requested actions. Body capabilities remain identical.
 */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {cpus,platform,arch} from 'node:os';
import {planArrival} from '../../src/sim/arrival-plan.js';

const arg=(name:string,fallback:string)=>{const k=process.argv.indexOf(name);return k<0?fallback:process.argv[k+1];};
const out=process.argv[2],mode=arg('--mode','ordinary'),engine=resolve(arg('--engine','.'));
if(!out||!['ordinary','intent','full-old'].includes(mode))throw new Error('Provide output and valid mode');
const load=(file:string)=>import(pathToFileURL(resolve(engine,file)).href);
const [{Rng},{generatePlayer},{derivePhysical},{World},{arriveVelocity},{supportParams}]=await Promise.all([
  load('src/core/rng.ts'),load('src/players/generator.ts'),load('src/players/physical.ts'),load('src/physics/world.ts'),load('src/physics/kinematics.ts'),load('src/physics/support.ts')]);
const t0=performance.now(),trials:any[]=[],native:any[]=[];
const fingerprint=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function sourceDigest(root:string){
  const paths:string[]=[];
  function visit(dir:string){for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){
    const p=dir+'/'+e.name;if(e.isDirectory())visit(p);else if(e.isFile())paths.push(p);
  }}visit('src');const hash=createHash('sha256');
  for(const p of paths.sort())hash.update(p+'\0').update(readFileSync(resolve(root,p))).update('\0');
  return hash.digest('hex');
}
function run(id:string,profile:any,initial:any,seconds:number,controller:(b:any,t:number)=>any,reference?:(t:number)=>any){
  const body={...structuredClone(initial),profile:structuredClone(profile),energy:1},world=new World([body]),frames=[];
  let maxResidual=0,maxGroundFraction=0,maxError=0,error2=0,maxSpeed=0,maxReverse=0,priorTurn=0,reversals=0;
  for(let k=0;k<Math.round(seconds/.05);k++){
    const t=k*.05,command=controller(body,t),before={pos:{...body.pos},vel:{...body.vel}};
    const report=world.step([command],.05),target=reference?.((k+1)*.05);
    if(target){const error=Math.hypot(body.pos.x-target.x,body.pos.y-target.y);maxError=Math.max(maxError,error);error2+=error**2;}
    maxResidual=Math.max(maxResidual,Math.abs(report.work.residual));
    maxGroundFraction=Math.max(maxGroundFraction,Math.hypot(report.groundImpulse[0].x,report.groundImpulse[0].y)/(supportParams(profile).traction*.05));
    maxSpeed=Math.max(maxSpeed,Math.hypot(body.vel.x,body.vel.y));
    if(Math.hypot(before.vel.x,before.vel.y)>1&&Math.hypot(body.vel.x,body.vel.y)>1){
      const turn=Math.atan2(before.vel.x*body.vel.y-before.vel.y*body.vel.x,before.vel.x*body.vel.x+before.vel.y*body.vel.y);
      if(priorTurn*turn<0&&Math.abs(turn)>.001&&Math.abs(priorTurn)>.001){reversals++;maxReverse=Math.max(maxReverse,Math.min(Math.abs(turn),Math.abs(priorTurn)));}priorTurn=turn;
    }else priorTurn=0;
    frames.push({t:(k+1)*.05,pos:{...body.pos},vel:{...body.vel},facing:body.facing,command,energy:body.energy,support:body.support.state,reference:target??null});
  }
  trials.push({id,profile,initial,inputSha256:fingerprint({id,profile,initial,seconds}),seconds,frames,
    metrics:{rmse:reference?Math.sqrt(error2/frames.length):null,maxError:reference?maxError:null,maxResidual,maxGroundFraction,maxSpeed,reversals,maxReverse,finalEnergy:body.energy}});
}
const goalCommand=(b:any,goal:any,cap:number,through=0)=>({vel:mode==='intent'?planArrival(b,goal,cap,through,.05).velocity:arriveVelocity(b,goal,cap,through),
  ...(mode==='ordinary'?{}:{propulsion:'full'}),facing:0});
if(!process.argv.includes('--native')){
  for(const position of ['OG','LB','CB']){
    const profile=derivePhysical(generatePlayer(new Rng(5),position)),initial={pos:{x:0,y:0},vel:{x:0,y:0},facing:0};
    run(position+'/burst-speed',profile,initial,2,(b,t)=>({vel:{x:2.65,y:0},...(mode==='ordinary'?{}:{propulsion:'full'})}));
    // Controlled cruise is intentionally ordinary even in the intent arm.
    run(position+'/cruise-control',profile,initial,2,()=>({vel:{x:2.65,y:0}}));
    run(position+'/stop',profile,initial,3,b=>goalCommand(b,{x:2,y:0},3));
    run(position+'/late-stop',profile,{...initial,vel:{x:5,y:0}},1,b=>goalCommand(b,{x:.3,y:0},3));
    run(position+'/through-transition',profile,initial,4,b=>goalCommand(b,{x:b.pos.x>=2.85?6:3,y:0},3,b.pos.x>=2.85?0:2));
  }
  const nfl=arg('--nfl','');
  if(nfl){
    const packet=JSON.parse(readFileSync(nfl,'utf8'));
    for(const [index,f] of packet.fixtures.entries()){
      const player=generatePlayer(new Rng(100+index),({OL:'OG',DL:'DT',LB:'LB',DB:'CB',RB:'RB'} as Record<string,string>)[f.player.group]);
      for(const key of Object.keys(player.ratings))player.ratings[key]=50;
      player.measurables.weightLb=f.player.weightLb;
      const profile=derivePhysical(player),points=f.points;
      function sample(t:number){
        const k=Math.min(points.length-2,Math.max(0,Math.floor(t/.1))),a=points[k],b=points[k+1],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
        return {x:a[1]+u*(b[1]-a[1]),y:a[2]+u*(b[2]-a[2]),vx:a[3]+u*(b[3]-a[3]),vy:a[4]+u*(b[4]-a[4])};
      }
      const first=sample(0),initial={pos:{x:first.x,y:first.y},vel:{x:first.vx,y:first.vy},facing:Math.atan2(first.vy,first.vx)};
      // Laboratory tracking: the whole recorded trajectory is supplied. This
      // diagnoses request feasibility, never a player's information/decision.
      // The2.2 position gain is the existing track() gain, unchanged across arms.
      run('NFL/'+f.id,profile,initial,2,(b,t)=>{
        const target=sample(t+.05),vel={x:target.vx+2.2*(target.x-b.pos.x),y:target.vy+2.2*(target.y-b.pos.y)};
        return {vel,...(mode==='ordinary'?{}:{propulsion:'full'})};
      },sample);
      Object.assign(trials[trials.length-1],{nfl:{id:f.id,split:f.split,group:f.player.group,contactUnknown:true,effortUnknown:true,
        minOpponent:Math.min(...f.nearestOpponentYd),profileIsProxy:true,positionGain:2.2,trajectorySha256:fingerprint(f.points)}});
    }
  }
}else{
  if(mode==='full-old')throw new Error('Native full-old is not implemented; use the mechanical opposing control');
  const [{generateTeam,pickOffense,pickDefense},{PlaySim},{RUN_BY_ID},{FORMATION_BY_ID},{FRONT_BY_ID,COVERAGE_BY_ID},{RunBlocker}]=await Promise.all([
    load('src/league/team.ts'),load('src/sim/playsim.ts'),load('src/playbook/concepts.ts'),load('src/playbook/formations.ts'),load('src/playbook/defense.ts'),load('src/sim/behaviors/blocking.ts')]);
  const specs=[['counter','ace_12',31,32,1],['power','i_pro_21',11,12,77],['trap','i_pro_21',31,32,71009],['oz_strong','ace_12',11,12,77]] as const;
  for(const [concept,formationId,os,ds,seed] of specs){
    if(arg('--case',concept)!==concept)continue;
    const formation=FORMATION_BY_ID[formationId],run=structuredClone(RUN_BY_ID[concept]);run.direction='strong';
    const setup={offense:pickOffense(generateTeam(new Rng(os),'O','O',{strength:.55}),formation.personnel),defense:pickDefense(generateTeam(new Rng(ds),'D','D',{strength:.55}),'base43'),
      offCall:{formation,flip:false,kind:'run',run,label:concept},defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover2,pressure:null,zoneStyle:'match',runPolicy:{edge:'box',linebacker:'stack'},label:'over2'},
      los:40,ballY:26.67,firstDownX:50,down:1,seed,audibles:false,hurry:false};
    const sim=new PlaySim(structuredClone(setup)),pullers=sim.offense.filter((a:any)=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull'),frames:any[]=[];
    const start=new Map(pullers.map((a:any)=>[a.idx,{...a.pos}]));
    const initialActors=sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,playerId:a.player.id,body:structuredClone(a.body)}));
    if(mode==='intent')for(const a of pullers)a.behavior.plan.pullPropulsion='full';
    // A final intent cannot recover a request replaced by contact/spacing.
    // Optional observation copies actual producer returns and World inputs;
    // it adds no sensing, random draw, request replacement or actor state.
    const detail=process.argv.includes('--detail'),wrapped=new WeakSet<object>(),raw=new Map<number,unknown>();
    let worldInputs:unknown=null;
    if(detail){const step=sim.world.step.bind(sim.world);sim.world.step=(intents:any[],dt:number)=>{
      worldInputs=sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,body:structuredClone(a.body),intent:structuredClone(intents[a.idx])}));
      return step(intents,dt);
    };}
    while(sim.phase==='live'&&sim.t<4){
      const commandTime=sim.t;raw.clear();worldInputs=null;
      if(detail)for(const a of sim.agents)if(!wrapped.has(a.behavior)){
        const behavior=a.behavior,update=behavior.update;wrapped.add(behavior);
        behavior.update=function(actor:any,play:any){const request=update.call(this,actor,play);
          raw.set(actor.idx,{idx:actor.idx,slot:actor.slot,behavior:this.kind,request:structuredClone(request),body:structuredClone(actor.body)});return request;};
      }
      sim.tick();frames.push({t:sim.t,commandTime,pullers:pullers.map((a:any)=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
      command:structuredClone(sim.intents[a.idx]),phase:a.behavior.pullIdx,engaged:!!a.engagement,support:a.body.support.state,energy:a.body.energy})),
      runner:{pos:{...sim.slot('RB').pos},vel:{...sim.slot('RB').vel}},contacts:sim.lastStep?.contacts,
      ...(detail?{rawRequests:[...raw.values()],worldInputs,actors:sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
        command:structuredClone(sim.intents[a.idx]),support:structuredClone(a.body.support),engaged:!!a.engagement})),pullPlans:pullers.map((a:any)=>({slot:a.slot,plan:structuredClone({...a.behavior.plan,target:a.behavior.plan.target?.idx})}))}:{} )});}
    const result=sim.buildResult(),side=sim.offAlign.strongSign;
    native.push({id:concept+'/'+formationId+'/'+seed,setup,initialActors,inputSha256:fingerprint(setup),frames,terminal:sim.phase!=='live',ending:sim.phase==='live'?null:{outcome:result.outcome,yards:result.offenseYards},
      censoredAt:sim.phase==='live'?sim.t:null,events:sim.events,bodyStateSha256:fingerprint(sim.agents.map((a:any)=>a.body)),
      metrics:pullers.map((a:any)=>{const rows=frames.map(f=>({t:f.t,...f.pullers.find((p:any)=>p.slot===a.slot)})),origin:any=start.get(a.idx);
        return {slot:a.slot,firstLateral15:rows.find(r=>r.vel.y*side>=1.5)?.t??null,lateral1:rows.find(r=>r.t===1)?.pos.y-origin.y,
          lateral1Toward:((rows.find(r=>r.t===1)?.pos.y??origin.y)-origin.y)*side,firstEngagement:rows.find(r=>r.engaged)?.t??null};})});
  }
}
const profile=JSON.parse(readFileSync(resolve(engine,'config/baseline.json'),'utf8'));
const result={schemaVersion:1,mode,engine,engineSourceSha256:sourceDigest(engine),collectorSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  nflPacketSha256:arg('--nfl','')?createHash('sha256').update(readFileSync(arg('--nfl',''))).digest('hex'):null,
  node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0].model,dependencyLockSha256:createHash('sha256').update(readFileSync(new URL('../../package-lock.json',import.meta.url))).digest('hex'),
  worldDefaults:profile.worldDefaults,flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),seconds:(performance.now()-t0)/1000,
  trials,native,note:'Capabilities fixed across arms. NFL trajectories are laboratory targets with proxy athlete profiles, not inferred live requests or matched actual ability. Native endings are censored at4s. No physical law/default activation.'};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result)+'\n');
console.log(JSON.stringify({out,mode,seconds:result.seconds,trials:trials.length,native:native.map(n=>({id:n.id,ending:n.ending,censoredAt:n.censoredAt,metrics:n.metrics}))},null,2));
