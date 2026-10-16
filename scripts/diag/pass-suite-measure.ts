/** Passive native-play observation. Truth here is diagnostic, never a player input. */
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import type { Agent } from '../../src/sim/agent.js';
import type { GraspJoint } from '../../src/physics/world.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import { QBPass } from '../../src/sim/behaviors/qb.js';
import { auditSchematicSnap, assertSchematicBudgets, assertSchematicFinite } from '../../src/lab/schematic-stress.js';
import { instantiate, sha, type Manifest, type Scenario } from './pass-suite-cases.js';

const copy = <T>(v:T):T => structuredClone(v);
const q=(v:number)=>Math.round(v*1e6)/1e6;
const label=(a:Agent)=>({index:a.idx,id:a.player.id,slot:a.slot,team:a.team});
/** Retain opening context and the latest evidence without unbounded logs or RNG. */
export class EvidenceWindow<T> {
  private first:T[]=[];private recent:T[]=[];private next=0;omitted=0;
  constructor(private readonly opening=600,private readonly latest=1200) {
    if(!Number.isInteger(opening)||!Number.isInteger(latest)||opening<0||latest<1)throw new Error('Invalid evidence window');
  }
  push(value:T) {
    if(this.first.length<this.opening)this.first.push(value);
    else if(this.recent.length<this.latest)this.recent.push(value);
    else{this.recent[this.next]=value;this.next=(this.next+1)%this.latest;this.omitted++;}
  }
  values(){return [...this.first,...this.recent.slice(this.next),...this.recent.slice(0,this.next)];}
}
function state(a:Agent) {
  const job=Reflect.get(a.behavior,'job');
  return {...label(a),pos:{...a.pos},vel:{...a.vel},facing:a.facing,behavior:a.behavior.kind,
    route:(Reflect.get(a.behavior,'route') as {id?:string}|undefined)?.id??null,passOption:a.behavior.passOption??false,
    job:typeof job==='string'?job:null,target:(Reflect.get(a.behavior,'target') as Agent|undefined)?.idx??null,
    support:a.body.support?.state??null,energy:a.body.energy,read:a.recog?.read??null};
}
function geometry(d:Agent,c:Agent) {
  const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),speed=Math.hypot(c.vel.x,c.vel.y);
  const v=Math.hypot(d.vel.x,d.vel.y);
  return {defender:label(d),carrier:label(c),distance:dist,defenderPosition:{...d.pos},carrierPosition:{...c.pos},
    defenderVelocity:{...d.vel},carrierVelocity:{...c.vel},closing:dist?((d.vel.x-c.vel.x)*dx+(d.vel.y-c.vel.y)*dy)/dist:0,
    alongRunner:speed?((d.pos.x-c.pos.x)*c.vel.x+(d.pos.y-c.pos.y)*c.vel.y)/speed:null,
    lateralToRunner:speed?((d.pos.y-c.pos.y)*c.vel.x-(d.pos.x-c.pos.x)*c.vel.y)/speed:null,
    velocityAngleDegrees:speed&&v?Math.acos(Math.max(-1,Math.min(1,(d.vel.x*c.vel.x+d.vel.y*c.vel.y)/(speed*v))))*180/Math.PI:null};
}

/** Live prefixes, physical timeouts, returns and fumbles never become clean terminal YAC. */
export function outcomeMetrics(r:PlayResult,terminal:boolean,t:number,throwAt:number,catchAt:number) {
  const ended=terminal&&r.outcome!=='timeout';
  const clean=ended&&r.stats.completed&&!r.turnover&&!r.stats.fumbledBy&&!r.penalty;
  return {terminal,completedOutcome:ended,outcome:terminal?r.outcome:null,duration:t,
    gain:ended?r.offenseYards:null,yac:clean?r.stats.yac??null:null,
    yacExclusion:clean?null:!ended?'unfinished':!r.stats.completed?'no offensive catch':r.penalty?'penalty':r.stats.fumbledBy?'fumble':'turnover',
    throwAt:throwAt>=0?throwAt:null,catchAt:catchAt>=0?catchAt:null,
    attempted:!!r.stats.attempted,completed:!!r.stats.completed,sacked:!!r.stats.sacked,scramble:!!r.stats.scramble,
    throwaway:!!r.stats.throwaway,pressured:!!r.stats.pressured,turnover:ended?r.turnover:null,
    interception:r.stats.interceptedBy??null,fumble:r.stats.fumbledBy??null,penalty:r.penalty?.kind??null,
    receiver:r.stats.receiver??null,target:r.stats.target??null,tacklers:[...r.stats.tacklers],
    airYards:r.stats.completed?r.stats.completedAirYards??null:null,brokenTackles:r.stats.brokenTackles??0,
    oob:ended?r.outcome==='oob':null,score:ended?r.score:null};
}

export function physicalSignature(sim:PlaySim) {
  const {frames,telemetry,...result}=sim.buildResult();
  return sha({t:sim.t,phase:sim.phase,result,bodies:sim.agents.map(a=>a.body),rng:sim.rng,
    minds:sim.agents.map(a=>a.mind),perception:sim.perception,intents:sim.intents});
}

export function measure(m:Manifest,c:Scenario,options:{observe?:boolean;record?:boolean;until?:number}={}) {
  const start=performance.now(),sim=new PlaySim(instantiate(m,c,options.record));
  const worldSettings=Object.fromEntries(['handContact','handIntegration','supportModel','constraintWork','impactTiming',
    'supportIntegration','boundedAttachment'].map(k=>[k,Reflect.get(sim.world,k)]));
  const initial=sim.agents.map(a=>({...state(a),profile:copy(a.profile),ratings:copy(a.player.ratings),runFit:copy(a.runFit)}));
  const snapshots:unknown[]=[],grasps:Array<Record<string,any>>=[],jointRecords=new Map<GraspJoint,Record<string,any>>();
  const cues=new EvidenceWindow<unknown>(),cueClock=new Map<string,number>();let omittedSamples=0;
  const reads:unknown[]=[],jobs=new Map<number,string>(),falls:unknown[]=[];
  let firstBodyContact:unknown=null,catchPicture:unknown=null,firstWrap:unknown=null,firstLoaded:unknown=null;
  let lastEvents=0,steps=0,nearQBAt:number|null=null,error:string|null=null,wall=false;
  const invariants={momentumResidual:0,workResidual:0,armImpulseExcess:0,armWorkExcess:0,motorWorkExcess:0};
  let maxPenetration=0;
  const picture=(reason:string,interval?:[number,number],before?:unknown,raw?:unknown)=>{
    if(snapshots.length>=80){omittedSamples++;return;}
    snapshots.push({reason,interval:interval??[q(sim.t),q(sim.t)],ball:sim.ball.kind,carrier:sim.carrier?label(sim.carrier):null,
      qb:{state:sim.qb.behavior instanceof QBPass?sim.qb.behavior.recordedState():null,
        belief:copy(sim.qbMind.belief),identified:sim.qbMind.identified,report:copy(sim.qbMind.report)},
      before,raw,final:copy(sim.intents),agents:sim.agents.map(a=>({...state(a),
        coverage:a.behavior instanceof CoverageDefender?a.behavior.recordedRule(interval?.[0]??sim.t):null}))});
  };
  const originalStep=sim.world.step.bind(sim.world),originalSee=sim.see.bind(sim);
  if(options.observe!==false){
    // Observe only calls made by native consumers, exactly once with unchanged arguments/result.
    sim.see=(a,b,delayScale)=>{
      const p=originalSee(a,b,delayScale),key=a.idx+':'+b.idx;
      if(sim.t-(cueClock.get(key)??-Infinity)>=.5){cueClock.set(key,sim.t);
        cues.push({t:q(sim.t),observer:a.idx,target:b.idx,picture:copy(p)});}
      return p;
    };
    sim.world.step=(intents,dt)=>{
      const before=sim.agents.map(state),raw=copy(Reflect.get(sim,'cmds'));
      const p0=sim.agents.reduce((p,a)=>({x:p.x+a.profile.massKg*a.vel.x,y:p.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
      const r=originalStep(intents,dt);steps++;
      const p1=sim.agents.reduce((p,a)=>({x:p.x+a.profile.massKg*a.vel.x,y:p.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
      const ground=r.groundImpulse.reduce((p,j)=>({x:p.x+j.x,y:p.y+j.y}),{x:0,y:0});
      invariants.momentumResidual=Math.max(invariants.momentumResidual,Math.hypot(p1.x-p0.x-ground.x,p1.y-p0.y-ground.y));
      invariants.workResidual=Math.max(invariants.workResidual,Math.abs(r.work.residual));maxPenetration=Math.max(maxPenetration,r.maxPenetration);
      for(const a of sim.agents){const i=a.idx;
        assertSchematicFinite({pos:a.pos,vel:a.vel,facing:a.facing,energy:a.body.energy},a.slot);
        invariants.armImpulseExcess=Math.max(invariants.armImpulseExcess,r.armImpulse[i]-r.armImpulseLimit[i]);
        invariants.armWorkExcess=Math.max(invariants.armWorkExcess,r.armWork[i]-r.armWorkLimit[i]);
        invariants.motorWorkExcess=Math.max(invariants.motorWorkExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);
      }
      assertSchematicBudgets(invariants);
      if(sim.carrier?.player.id===sim.stats.receiver&&sim.carrier&&sim.catchAt>=0&&!firstBodyContact){const hit=r.contacts.find(h=>h.impulse>0&&
        (h.i===sim.carrier!.idx||h.j===sim.carrier!.idx)&&sim.agents[h.i].team!==sim.agents[h.j].team);
        if(hit){const d=sim.agents[hit.i===sim.carrier.idx?hit.j:hit.i];firstBodyContact={interval:[q(sim.t),q(sim.t+dt)],
          impulse:hit.impulse,closing:hit.closing,geometry:geometry(d,sim.carrier)};picture('first-body-contact',[q(sim.t),q(sim.t+dt)],before,raw);}}
      for(const j of sim.world.joints)if(j.kind==='grasp'){
        const a=sim.agents.find(a=>a.body===j.a),b=sim.agents.find(a=>a.body===j.b);
        if(!a||!b||a.team!=='D'||b.player.id!==sim.stats.receiver||sim.carrier!==b||sim.catchAt<0)continue;
        let rec=jointRecords.get(j);
        if(!rec){rec={acquiredInterval:[q(sim.t),q(sim.t+dt)],holder:label(a),held:label(b),origin:j.origin??null,
          geometry:geometry(a,b),capacity:j.capacity,legs:j.legs,firstLoad:null,lastLoad:null,loadedSeconds:0,forceImpulse:0,
          peakForce:0,brokenAt:null,slippingIntervals:0};jointRecords.set(j,rec);grasps.push(rec);}
        if((j.force??0)>1e-8){rec.firstLoad??=q(sim.t+dt);rec.lastLoad=q(sim.t+dt);rec.loadedSeconds+=dt;
          rec.forceImpulse+=(j.force??0)*dt;rec.peakForce=Math.max(rec.peakForce,j.force??0);rec.slippingIntervals+=Number(!!j.slipping);
          if(!firstLoaded){firstLoaded={interval:[q(sim.t),q(sim.t+dt)],holder:label(a),held:label(b),geometry:geometry(a,b),
            origin:j.origin??null,force:j.force,capacity:j.capacity,legs:j.legs,support:b.body.support?.state??null};
            picture('first-loaded-grasp',[q(sim.t),q(sim.t+dt)],before,raw);}}
      }
      for(const [j,rec]of jointRecords)if(j.broken&&rec.brokenAt===null)rec.brokenAt=q(sim.t+dt);
      for(const i of r.falls)falls.push({interval:[q(sim.t),q(sim.t+dt)],player:label(sim.agents[i]),cause:sim.agents[i].body.support?.cause??null});
      if(steps===1||steps%10===0)picture('clock',[q(sim.t),q(sim.t+dt)],before,raw);
      return r;
    };
  }
  let snap:unknown=null;
  try{
    snap=auditSchematicSnap(sim);if(options.observe!==false)picture('installed');sim.event('snap',sim.slot('C')??sim.qb);
    while(sim.phase==='live'&&sim.t+1e-8<(options.until??m.budgets.simulationSeconds)){
      if(performance.now()-start>=m.budgets.caseMs){wall=true;break;}
      sim.tick();
      if(options.observe===false)continue;
      if(nearQBAt===null&&sim.throwAt<0&&sim.defense.some(d=>Math.hypot(d.pos.x-sim.qb.pos.x,d.pos.y-sim.qb.pos.y)<=2))nearQBAt=q(sim.t);
      if(sim.catchAt>=0&&!catchPicture){const catcher=sim.agents.find(a=>a.player.id===sim.stats.receiver);
        if(catcher){catchPicture={t:sim.catchAt,catcher:state(catcher),defenders:sim.defense.map(d=>geometry(d,catcher))};picture('catch');}}
      for(const e of sim.events.slice(lastEvents)){
        if(e.type==='tackle_wrap'&&sim.catchAt>=0&&firstWrap===null&&sim.agents[e.b??-1]?.player.id===sim.stats.receiver)firstWrap=copy(e);
        if(['throw','interception','broken_tackle','tackle_wrap','out_of_bounds'].includes(e.type))picture(e.type);
      }lastEvents=sim.events.length;
      for(const d of sim.defense){const s=state(d),key=JSON.stringify([s.behavior,s.job,s.target,s.read]);
        if(jobs.get(d.idx)!==key){jobs.set(d.idx,key);reads.push({t:q(sim.t),...s,
          coverage:d.behavior instanceof CoverageDefender?d.behavior.recordedRule(q(sim.t-sim.dt)):null});}}
    }
  }catch(e){error=e instanceof Error?e.message:String(e);}
  const terminal=sim.phase!=='live',r=sim.buildResult();
  if(options.observe!==false)picture('final');
  const status=error?'failed':wall?'censored-wall':terminal?(r.outcome==='timeout'?'censored-engine':'native'):'censored-sim';
  return {case:c,status,error,elapsedMs:performance.now()-start,steps,
    metrics:{...outcomeMetrics(r,terminal&&!error,sim.t,sim.throwAt,sim.catchAt),nativePressureAt:sim.events.find(e=>e.type==='pressure')?.t??null,
      geometricTwoYardQBAt:nearQBAt,firstPostCatchContactAt:sim.events.find(e=>e.type==='carrier_contact'&&e.t>=sim.catchAt&&sim.catchAt>=0
        &&sim.agents[e.a??-1]?.player.id===sim.stats.receiver)?.t??null},
    initial,initialSha256:sha(initial),worldSettings,installed:{offCall:copy(sim.offCall),defCall:copy(sim.defCall),
      offense:copy(sim.offAlign),defense:copy(sim.defAlign)},physicalSignature:physicalSignature(sim),
    observation:{snap,snapshots,cues:cues.values(),omittedCues:cues.omitted,cueRetention:{opening:600,latest:1200},omittedSamples,reads,catchPicture,firstBodyContact,firstWrap,firstLoaded,grasps,falls,
      invariants,maxPenetration,events:copy(sim.events),segments:copy(r.segments),
      limits:'Sampled consumed cues/cached rules, not extra observations. Geometry is diagnostic truth. Requests and achieved motion share labeled intervals. Grasp acquisition is interval-censored at the first solved step; brokenAt is first observed broken tick. Collection caps are explicit.'},
    film:options.record?{id:c.id,result:r,players:sim.agents.map(a=>({...label(a),name:a.name,profile:a.profile,jersey:a.player.jersey}))}:null};
}
export type Measurement=ReturnType<typeof measure>;
