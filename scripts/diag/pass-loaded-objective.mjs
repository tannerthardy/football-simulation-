/** One diagnostic pass-foot counterfactual. No production controller is patched.
 * Captures/replaces ordinary intents AFTER engagement technique, BEFORE spacing.
 * All bodies, hand forces, capabilities, movement and other decisions stay native.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {clamp,norm,sub} from '../../src/core/vec.ts';
import {traits,passSetDepth} from '../../src/sim/engagement.ts';
import {savedNativePlay} from './saved-native-play.mjs';
import {sourceVersion} from '../source-version.ts';

const [out,arm='qb-axis-lt',indices='39,18',untilText='3.05']=process.argv.slice(2);
assert(out&&['baseline','qb-axis-lt'].includes(arm));
const until=Number(untilText);assert(until>0&&until<=6);
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const dot=(v,w)=>v.x*w.x+v.y*w.y;
const snap=a=>structuredClone(a.body);
function footObjective(sim,e){
 const b=e.blocker,d=e.defender,tb=traits(b);
 const axis=norm(sub(sim.qb.pos,d.pos)),lat={x:-axis.y,y:axis.x};
 const sep=b.profile.radius+d.profile.radius;
 const front={x:d.pos.x+axis.x*(sep+.15),y:d.pos.y+axis.y*(sep+.15)};
 const intent=b.passSet;
 if(intent&&intent.outside!==0&&(d.pos.y-b.pos.y)*intent.outside>.15)
  front.y+=clamp((intent.laneY-front.y)*.5,-.4,.4);
 const lead=.15+.15*tb.read;
 const offLat=(front.x+d.vel.x*lead-b.pos.x)*lat.x+(front.y+d.vel.y*lead-b.pos.y)*lat.y;
 const dLat=dot(d.vel,lat),j=e.hands;
 let felt=0;
 if(j?.tangentForce){
  const dx=d.pos.x-b.pos.x,dy=d.pos.y-b.pos.y,l=Math.hypot(dx,dy)||1;
  felt=-(-dy/l*lat.x+dx/l*lat.y)*j.tangentForce/b.profile.massKg*.3;
 }
 const mirror=tb.lateral*(.75+.35*tb.feet)*(e.helpers.length?1.3:1);
 const vLat=clamp(dLat+felt*(.6+.6*tb.feet)+offLat*(3+3*tb.feet),-mirror,mirror);
 const depth=sim.los-b.pos.x,setDepth=b.passSet?.depth??passSetDepth(sim,b);
 const kick=depth<setDepth?Math.min(b.profile.vmax*b.profile.backpedal*(.75+.25*tb.feet),(setDepth-depth)/.55):0;
 return {axis,lat,dLat,felt,offLat,mirror,vLat,depth,setDepth,kick,
  original:{x:lat.x*vLat-kick,y:lat.y*vLat},
  alternative:{x:lat.x*vLat+axis.x*kick,y:lat.y*vLat+axis.y*kick}};
}
const started=performance.now(),rows=[];
for(const index of indices.split(',').map(Number)){
 assert([39,18].includes(index));
 const {sim,play,initialization}=savedNativePlay('spread-air',index);
 const cachedName=index===39?'baseline':'baseline-p019';
 const cache=JSON.parse(gunzipSync(readFileSync(`data/reviews/current/pass-set-opening/${cachedName}/trace.json.gz`)));
 assert.equal(cache.receipt.sourceSha256,sourceVersion());
 const cached=cache.rows[0];assert(cached.nativeFilmParity&&cached.nativeEventParity);
 let stagedAt=-1,firstChange=null,staged=null;
 const frames=[],actions=[],stageChecks=[],contacts=[];
 const information=sim.teammateInformation.bind(sim);
 sim.teammateInformation=function(a,b){
  if(stagedAt!==sim.t){
   assert(new Error().stack.includes('spaceTeammates'),'Must capture before spacing, after technique');
   stagedAt=sim.t;
   const before=structuredClone(sim.intents);
   for(const e of sim.engagements){
    if(e.type!=='pass'||e.blocker.slot!=='LT')continue;
    // A holding exception may return before the ordinary foot objective.
    if(Math.abs(e.phi)>=1)continue;
    const m=footObjective(sim,e),i=e.blocker.idx,original=sim.intents[i];
    const residual=Math.hypot(original.vel.x-m.original.x,original.vel.y-m.original.y);
    assert(residual<1e-10,`Loaded objective mismatch at ${sim.t}: ${residual}`);
    const action={t:sim.t,blocker:i,defender:e.defender.idx,phi:e.phi,
     before:snap(e.blocker),rusher:snap(e.defender),qb:snap(sim.qb),
     original:structuredClone(original),objective:m,sourceRng:{...sim.rng},
     engagement:{start:e.start,control:e.control,move:e.move,moveOk:e.moveOk,moveUntil:e.moveUntil,
      contactReported:e.contactReported,hands:e.hands?{normalForce:e.hands.normalForce,tangentForce:e.hands.tangentForce,extension:e.hands.extension}:null},
     changed:arm!=='baseline'&&Math.hypot(m.original.x-m.alternative.x,m.original.y-m.alternative.y)>1e-10};
    if(action.changed){
     if(firstChange===null){
      firstChange=sim.t;
      const saved=cached.frames.find(f=>f.t===sim.t);
      if(saved){
       for(let k=0;k<22;k++){
        const current=snap(sim.agents[k]);
        for(const key of ['pos','vel','facing'])assert.deepEqual(current[key],saved.before[k][key]);
        assert.deepEqual(JSON.parse(JSON.stringify(current.support)),saved.before[k].support);
       }
      }
     }
     // Same scalar mirror/retreat terms and all other command attributes.
     sim.intents[i]={...original,vel:m.alternative};
     assert(Math.abs(dot(m.alternative,m.lat)-m.vLat)<1e-10);
     assert(Math.abs(dot(m.alternative,m.axis)-m.kick)<1e-10);
    }
    actions.push(action);
   }
   staged={before,after:structuredClone(sim.intents)};
  }
  return information(a,b);
 };
 const worldStep=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(snap),final=structuredClone(intents),raw=structuredClone(sim.cmds);
  const originalStage=stagedAt===sim.t?staged:null;
  assert(originalStage,'Missing pre-spacing stage');
  const rngBefore={...sim.rng};
  const report=worldStep(intents,dt);
  const frame={t:sim.t,before,raw,technique:originalStage.before,afterCounterfactual:originalStage.after,
   final,after:sim.agents.map(snap),report,rngBefore};
  frames.push(frame);
  const saved=cached.frames.find(f=>f.t===sim.t);
  if(saved&&(firstChange===null||sim.t<firstChange)){
   for(let i=0;i<22;i++){
    assert.deepEqual(JSON.parse(JSON.stringify(frame.final[i])),saved.final[i]);
    for(const key of ['pos','vel','facing'])assert.deepEqual(frame.after[i][key],saved.after[i][key]);
    assert.deepEqual(JSON.parse(JSON.stringify(frame.after[i].support)),saved.after[i].support);
   }
   stageChecks.push(sim.t);
  }
  for(const c of report.contacts)if(c.impulse>1e-8)contacts.push({t:sim.t+dt,...c});
  return report;
 };
 sim.event('snap',sim.slot('C')??sim.qb);
 const start=performance.now();
 while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<5000);sim.tick();}
 const film=sim.frames.filter(f=>f.t>=0),original=play.replay.frames.filter(f=>f.t>=0&&f.t<=film.at(-1).t);
 const firstFilmDifference=original.find((f,i)=>hash(f)!==hash(film[i]));
 if(arm==='baseline'){
  assert(!firstFilmDifference);assert.equal(hash(sim.events),hash(play.replay.events.filter(e=>e.t<=film.at(-1).t+.05)));
 }
 const summary={index,play:index+1,arm,endTime:sim.t,phase:sim.phase,firstChange,
  nativeFilmParity:!firstFilmDifference,firstFilmDifference:firstFilmDifference?.t??null,
  verifiedCachedPrefixTicks:stageChecks.length,events:sim.events,
  teammateImpacts:contacts.filter(c=>(c.i<11)===(c.j<11)),elapsedSeconds:(performance.now()-start)/1000,
  censoring:sim.phase==='live'?`Live at ${sim.t}; no later ending inferred`:'Native dead-ball ending',
  finalQb:{pos:{...sim.qb.pos},vel:{...sim.qb.vel}},
  finalDeDistanceToQb:Math.hypot(sim.slot('DE_W').pos.x-sim.qb.pos.x,sim.slot('DE_W').pos.y-sim.qb.pos.y)};
 rows.push({...summary,initialization,actions,frames});
 console.log(JSON.stringify({...summary,events:summary.events.filter(e=>['block_contact','shed','pressure','throw','sack','tackle','fall'].includes(e.type)),teammateImpacts:summary.teammateImpacts.length}));
}
const baseline=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'pass-loaded-objective-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),node:process.version,
 arm,indices:indices.split(',').map(Number),until,fullGames:0,nativeSnaps:rows.length,
 flags:Object.fromEntries(Object.keys(baseline.flags).map(k=>[k,process.env[k]??null])),worldDefaults:baseline.worldDefaults,
 collectorSha256:hash(readFileSync('scripts/diag/pass-loaded-objective.mjs').toString()),
 inputManifestSha256:hash(readFileSync('data/reviews/current/experimental-game-inputs.json').toString()),
 elapsedSeconds:(performance.now()-started)/1000,
 qualification:'Diagnostic ordinary-intent substitution before spacing. No src patch, contact-law change, capacity change or production adoption.'};
mkdirSync(out,{recursive:true});
writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
