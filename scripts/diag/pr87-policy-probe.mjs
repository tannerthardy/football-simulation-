/** Review exact #87 composition and its accepted #89 input. Unit poses are
 * labelled synthetic; optional native mode restores only the saved setup. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const started=performance.now(),root=new URL('../../out/pr87-policy-review/',import.meta.url);
const [mode='unit',arm='candidate']=process.argv.slice(2);
const moduleAt=p=>import(new URL(`hosts/${arm}/${p}`,root).href);
const [{Agent},{PlaySim},{World},{spaceTeammates},{previewFreeMovement},{executeRunFit}]=await Promise.all([
 moduleAt('src/sim/agent.ts'),moduleAt('src/sim/playsim.ts'),moduleAt('src/physics/world.ts'),
 moduleAt('src/sim/spacing.ts'),moduleAt('src/physics/movement-preview.ts'),moduleAt('src/sim/run-fits.ts')]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('static.json',root))),input=JSON.parse(readFileSync(new URL('A042-setup.json',root)));
const source=manifest.sources[arm==='reference'?'base':'composed'];
const objective=arm==='candidate'?await moduleAt('src/sim/movement-objective.ts'):null;
const goalOf=c=>objective?.movementObjective(c);

function clearance(body,path,peers){
 return Math.min(...peers.map(p=>{
  const touch=.9*(body.profile.radius+p.profile.radius);let px=body.pos.x-p.seen.pos.x,py=body.pos.y-p.seen.pos.y;
  let best=Math.hypot(px,py)-touch;
  for(const s of path){
   const x=s.pos.x-p.seen.pos.x-p.seen.vel.x*s.t,y=s.pos.y-p.seen.pos.y-p.seen.vel.y*s.t;
   const dx=x-px,dy=y-py,u=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy)));
   best=Math.min(best,Math.hypot(px+u*dx,py+u*dy)-touch);px=x;py=y;
  }return best;
 }));
}

if(mode==='unit'){
 assert.equal(arm,'candidate');
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('traffic-step.json.gz',root))));
 function sequence(kind,withGoal){
  const sim=new PlaySim(structuredClone(input.setup)),first=fixture.rows[0];
  const a=kind==='alley'?sim.slot('SS'):new Agent(fixture.actor,'D','SS',fixture.player,first.body.profile,
   structuredClone(first.body),{kind:'man',update(){throw Error('No repeated controller');}});
  const installed=structuredClone(sim.slot('SS').runFit),rows=[];
  for(const row of fixture.rows){
   Object.assign(a.body,structuredClone(row.body));sim.t=row.t;
   const pictures=new Map(row.peers.map(p=>[p.idx,structuredClone(p.seen)]));
   const peers=row.peers.map(p=>({idx:p.idx,team:'D',profile:p.profile,
    get pos(){throw Error('private peer position');},get vel(){throw Error('private peer velocity');}}));
   let raw;
   if(kind==='alley'){
    // Same saved body/peer encounter, installed native alley job, and a
    // controlled already-acquired back picture. This is a component probe,
    // not a naturally occurring A042/A044 shared football state.
    const cue={pos:{x:input.setup.los-6,y:26.537342460364858},vel:{x:.9980594540782393,y:-.3920947855307422},
     facing:0,stance:null,pose:'up',carrying:false,age:.2};
    raw=executeRunFit(a,sim,installed.gap,installed.side,{target:sim.slot('RB'),cue});
    const goal=goalOf(raw);assert.equal(goal.kind,'moving');assert.equal(goal.velocity.x,0);assert.equal(goal.velocity.y,cue.vel.y);
    assert.equal(goal.point.x,input.setup.los+Math.max(5,Math.min(8,(sim.defAlign.spots.SS.pos.x-input.setup.los)*.65)));
   }else raw=objective.withMovementObjective(structuredClone(row.command),structuredClone(row.goal));
   const goal=structuredClone(goalOf(raw));
   if(!withGoal)raw={vel:{...raw.vel},facing:raw.facing,cutSkill:raw.cutSkill,posture:raw.posture};
   const before=structuredClone(a.body),intents=[raw,...peers.map(()=>({vel:{x:0,y:0},free:true}))];let reads=0;
   spaceTeammates([a,...peers],intents,(_actor,peer)=>{reads++;return pictures.get(peer.idx);},{now:row.t});
   assert.equal(reads,10);assert.deepEqual(a.body,before);
   const final=intents[0],path=previewFreeMovement(a.body,final,row.t,12),end=path.at(-1);
   const error=p=>Math.hypot(p.x-goal.point.x-(goal.velocity?.x??0)*.6,p.y-goal.point.y-(goal.velocity?.y??0)*.6);
   const body=structuredClone(a.body),world=new World([body]);world.time=row.t;const result=world.step([final],.05);
   assert.deepEqual(body.pos,path[0].pos);assert.deepEqual(body.vel,path[0].vel);assert(Math.abs(result.work.residual)<1e-8);
   rows.push({t:row.t,raw:{vel:raw.vel,facing:raw.facing},goal,final:{vel:final.vel,facing:final.facing},
    clearance:clearance(before,path,row.peers),endPos:end.pos,goalError:error(end.pos),stationaryError:error(before.pos),
    supportUp:path.every(p=>p.support==='up'),requestedSpeed:Math.hypot(raw.vel.x,raw.vel.y),
    selectedSpeed:Math.hypot(final.vel.x,final.vel.y),exactFirstWorldStep:true});
  }return rows;
 }
 const result={schema:'pr87-policy-unit-v1',source,qualification:'Synthetic acquired-picture component controls; no PlaySim.tick/native continuation.',
  ordinary:{policy:sequence('ordinary',true),nativeChoice:sequence('ordinary',false)},
  alley:{policy:sequence('alley',true),nativeChoice:sequence('alley',false)},seconds:(performance.now()-started)/1000};
 assert(result.ordinary.policy.at(-1).clearance>.25);
 for(const rows of [result.ordinary.policy,result.alley.policy])for(const r of rows){assert(r.supportUp);assert(r.selectedSpeed<=r.requestedSpeed+1e-10);}
 writeFileSync(new URL('unit.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({ordinaryLast:result.ordinary.policy.at(-1),alleyLast:result.alley.policy.at(-1),seconds:result.seconds}));
}else{
 assert.equal(mode,'native');
 const sim=new PlaySim(structuredClone(input.setup)),ticks=[],events=sim.events;
 const draw=sim.rng.chance.bind(sim.rng);let chance=[];
 sim.rng.chance=p=>{const before={...sim.rng},value=draw(p);chance.push({p,before,after:{...sim.rng},value});return value;};
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,id:a.player.id,body:structuredClone(a.body),runFit:a.runFit}));
 const see=sim.see.bind(sim),pictures=new Map(),raw=new Map();
 sim.see=(a,b,...args)=>{const picture=see(a,b,...args);pictures.set(`${a.idx}:${b.idx}`,structuredClone(picture));return picture;};
 for(const a of sim.agents){
  const update=a.behavior.update.bind(a.behavior);
  a.behavior.update=(actor,s)=>{const command=update(actor,s);raw.set(a.idx,{command:structuredClone(command),goal:structuredClone(goalOf(command)),
   belief:a.recog?.read,runFit:structuredClone(a.runFit),job:a.behavior.job??a.behavior.kind});return command;};
 }
 const step=sim.world.step.bind(sim.world);let before,commands;
 sim.world.step=(intents,dt)=>{before=sim.agents.map(a=>structuredClone(a.body));commands=structuredClone([...intents]);return step(intents,dt);};
 sim.event('snap',sim.slot('C')??sim.qb);
 while(sim.phase==='live'&&sim.t<3.8){
  assert(performance.now()-started<10000,'Bounded interaction prefix');
  const t=sim.t,rngBefore={...sim.rng};pictures.clear();raw.clear();chance=[];sim.tick();
  ticks.push({t,before,commands,raw:[...raw],pictures:[...pictures],after:sim.agents.map(a=>structuredClone(a.body)),
   contacts:structuredClone(sim.lastStep.contacts),work:sim.lastStep.work,blocks:sim.engagements.map(e=>({b:e.blocker.idx,d:e.defender.idx,
    normal:e.hands?.normalForce,tangent:e.hands?.tangentForce})),rngBefore,rngAfter:{...sim.rng},chance});
 }
 const result={schema:'pr87-accepted-alley-native-v1',arm,source,tree:arm==='reference'?manifest.base:manifest.composedTree,
  inputSha256:input.inputSha256,originalCaseSha256:input.originalCaseSha256,node:process.version,initial,ticks,events,
  end:sim.t,phase:sim.phase,censored:sim.phase==='live',nativeExecutions:1,
  elapsedSeconds:(performance.now()-started)/1000,operatorSha256:hash(readFileSync(import.meta.filename)),
  flags:JSON.parse(readFileSync(new URL('hosts/reference/config/baseline.json',root))).flags,
  qualification:'Read-only wrappers, original setup/all22 native reactions. Symbol metadata is recorded separately and never read by World. No altered draws, future path, ratings or contact law.'};
 writeFileSync(new URL(`${arm}-A042.json.gz`,root),gzipSync(JSON.stringify(result)));
 console.log(JSON.stringify({arm,source,end:result.end,phase:result.phase,elapsedSeconds:result.elapsedSeconds,
  events:events.filter(e=>['carrier_contact','tackle_wrap','broken_tackle','tackle'].includes(e.type))}));
}
