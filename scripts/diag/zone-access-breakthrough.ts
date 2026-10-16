/** Bounded observation of existing blocking requests and native execution. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {PlaySim} from '../../src/sim/playsim.js';
import {runContactObservers} from '../../src/sim/run-contact-observer.js';
import {runReadObservers} from '../../src/sim/run-read-observer.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {sourceVersion} from '../source-version.js';

const args=process.argv.slice(2),arg=(k:string)=>args[args.indexOf(k)+1];
const ids=(arg('--cases')??'A039').split(','),until=Number(arg('--until')??3.1),out=arg('--out'),input=arg('--input');
if(!args.includes('--run')){console.log(JSON.stringify({ids,until,worldSettings:'unchanged',budgetSeconds:20}));process.exit(0);}
if(!out||!input||existsSync(out)||ids.length>4||until>4.5)throw Error('Fresh output, saved input and short scope required');
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
if(process.versions.node!==profile.nodeVersion||Object.entries(profile.flags).some(([k,v])=>(process.env[k]??null)!==v))throw Error('Use pinned launcher');
mkdirSync(out,{recursive:true});const start=performance.now(),results=[];
for(const id of ids){
 const saved=JSON.parse(readFileSync(`${input}/${id}.json`,'utf8')),sim=new PlaySim(structuredClone(saved.setup));
 if(sha(sim.agents.map(a=>({idx:a.idx,id:a.player.id,body:a.body})))!==sha(saved.initialBodies))throw Error('Initial state differs');
 const events:any[]=[],reads:any[]=[],calls:any[]=[],frames:any[]=[],footballReads:any[]=[];
 const earlyAt=args.includes('--early-check-at')?Number(arg('--early-check-at')):null;let intervention:any=null;
 const plain=(p:any)=>p?{kind:p.kind,target:p.target?.idx,drive:p.drive,
  combination:p.combination?{members:p.combination.members.map((a:any)=>a.idx),defender:p.combination.defender.idx,backer:p.combination.backer?.idx,released:p.combination.released}:null,
  departure:p.departure?{defender:p.departure.defender?.idx,keeper:p.departure.keeper?.idx,backer:p.departure.backer?.idx}:null}:null;
 const see=sim.see.bind(sim);sim.see=(a,b,delay)=>{const seen=see(a,b,delay);reads.push({a:a.idx,b:b.idx,delay,seen:structuredClone(seen)});return seen;};
 for(const a of sim.offense){const behavior=a.behavior as any;
  if(earlyAt!==null && a.slot==='RT' && behavior instanceof RunBlocker){
   const update=behavior.update;behavior.update=function(actor:any,world:any){
    const ordinary=update.call(this,actor,world);
    if(world.t!==earlyAt)return ordinary;
    const combo=this.plan.combination;if(!combo||combo.released||actor.engagement||combo.members[1]!==actor||!combo.backer)throw Error('Not a free uncovered helper');
    const keeper=combo.members[0],e=keeper.engagement;
    if(!e||e.blocker!==keeper||e.defender!==combo.defender||e.helpers.length)throw Error('Keeper does not retain solo contact');
    const down=[...reads].reverse().find((r:any)=>r.a===actor.idx&&r.b===combo.defender.idx)?.seen;
    const backer=[...reads].reverse().find((r:any)=>r.a===actor.idx&&r.b===combo.backer!.idx)?.seen;
    // The choice uses the player's ordinary target/backer reads plus one
    // teammate picture on this same decision beat, not private live motion.
    const covered=world.see(actor,keeper);
    if(!down||!backer||covered.pose!=='up'||down.pose!=='up')throw Error('Acquired picture absent');
    const bearing=Math.atan2(down.pos.y-covered.pos.y,down.pos.x-covered.pos.x);
    const off=Math.abs(Math.atan2(Math.sin(bearing-covered.facing),Math.cos(bearing-covered.facing)));
    if(off/(Math.PI/2)>=.65)throw Error('Acquired keeper is not square');
    intervention={at:world.t,kind:'diagnostic existing-job alternative',down,backer,covered,off,
      own:structuredClone(actor.body),ordinary:structuredClone(ordinary),keeperControl:e.control,
      keeperHands:structuredClone({normal:e.hands?.normalForce,tangent:e.hands?.tangentForce})};
    // Ordinary check departure semantics; no body, hands, force, control or
    // capacity changes. The existing approach and World choose what happens.
    this.plan.kind='climb';this.plan.target=combo.backer;this.plan.drive={x:1,y:0};delete this.plan.contactFit;
    combo.released=true;
    for(const member of combo.members){const p=(member.behavior as RunBlocker).plan;
     if(p.combination!==combo)continue;p.combination=undefined;p.climbTo=undefined;
     if(member===keeper)p.kind=combo.soloKind??'drive';
    }
    world.event('diagnostic_check',actor,combo.backer,'first acquired-away scheduled read');
    return (this as any).attack(actor,world,combo.backer,backer);
   };
  }
  if(typeof behavior.calledMotion==='function'){const called=behavior.calledMotion;behavior.calledMotion=function(...values:any[]){const result=called.apply(this,values);const last=reads[reads.length-1];if(last?.b===a.idx)last.called=structuredClone(result);return result;};}
  for(const name of ['zoneFlow','attack','leaveCombination','readZone'])if(typeof behavior[name]==='function'){
   const method=behavior[name];behavior[name]=function(...values:any[]){const result=method.apply(this,values);calls.push({a:a.idx,name,plan:plain(this.plan),returned:structuredClone(result),departureRead:structuredClone(this.departureRead)});return result;};
  }
 }
 runReadObservers.set(sim,e=>{footballReads.push(structuredClone(e));});
 runContactObservers.set(sim,(e,phase,data)=>{events.push({owner:e.blocker.idx,defender:e.defender.idx,helpers:e.helpers.map(a=>a.idx),phase,data:structuredClone(data)});});
 let goals:any=null;const step=sim.world.step.bind(sim.world);sim.world.step=(...values)=>{goals=structuredClone((sim as any).cmds);return step(...values);};
 sim.event('snap',sim.slot('C')??sim.qb);
 while(sim.phase==='live'&&sim.t<until){
  if(performance.now()-start>20000)throw Error('Native budget exhausted');
  events.length=0;reads.length=0;calls.length=0;footballReads.length=0;
  const t=sim.t,before=sim.agents.map(a=>structuredClone(a.body)),jobs=sim.agents.map(a=>plain((a.behavior as any).plan)),rngBefore=JSON.stringify(sim.rng);
  sim.tick();frames.push({t,before,jobs,goals,commands:structuredClone(sim.intents),calls:[...calls],reads:[...reads],movement:[...events],footballReads:[...footballReads],
   after:sim.agents.map(a=>structuredClone(a.body)),contacts:structuredClone(sim.lastStep?.contacts),
   work:sim.lastStep?.work,rngBefore,rngAfter:JSON.stringify(sim.rng),
   blocks:sim.engagements.map(e=>({b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),surfaceAxis:e.surfaceAxis,drive:e.drive,phi:e.phi,control:e.control,
    hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null,
    helperHands:[...(e.helperHands??[])].map(([h,j])=>({a:h.idx,normal:j.normalForce,tangent:j.tangentForce,extension:j.extension}))}))});
 }
 const data={caseId:id,source:sourceVersion(),input:sha(saved.setup),initial:saved.initialBodies,frames,events:sim.events,until:sim.t,phase:sim.phase,flags:profile.flags,node:process.version,world:profile.worldDefaults,
  intervention, savedFramePrefixEqual:sha(sim.frames)===sha(saved.result.frames.filter((f:any)=>f.t<sim.t))};
 writeFileSync(`${out}/${id}.json.gz`,gzipSync(JSON.stringify(data)));results.push({id,source:data.source,until:sim.t,phase:sim.phase,savedFramePrefixEqual:data.savedFramePrefixEqual});
}
writeFileSync(`${out}/summary.json`,JSON.stringify({results,seconds:(performance.now()-start)/1000},null,2)+'\n');console.log(JSON.stringify({results,seconds:(performance.now()-start)/1000}));
