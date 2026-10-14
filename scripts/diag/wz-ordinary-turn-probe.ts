/** Bounded diagnostic only: acquired samples + public profiles; no native plays. */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
import { World } from '../../src/physics/world.js';
import { newSupport, supportParams } from '../../src/physics/support.js';
import { brakingTeammateForecast } from '../../src/sim/traffic-forecast.js';
import { TEAMMATE_INFORMATION_LIMITS as limits } from '../../src/sim/teammate-information.js';
import { sourceVersion } from '../../scripts/source-version.js';
const fixturePath='data/reviews/current/wz-released-recovery-state.json';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));fixture.body.support.since=-Infinity;
const cap=JSON.parse(gunzipSync(readFileSync('docs/reviews/wide-zone-execution/candidate.json.gz')).toString());
const actors=cap.panel.find((c:any)=>c.input.id==='uc12-wz-weak-s3').actors;
let worldSteps=0;const step=World.prototype.step;
World.prototype.step=function(...args:any[]){worldSteps++;return step.apply(this,args as any)};
const started=performance.now();
function at(path:any[],t:number){const k=path.findIndex(s=>s.t>=t-1e-9),hi=path[k<0?path.length-1:k],lo=path[Math.max(0,(k<0?path.length-1:k)-1)],u=hi.t>lo.t?Math.max(0,Math.min(1,(t-lo.t)/(hi.t-lo.t))):0;return{t,pos:{x:lo.pos.x+(hi.pos.x-lo.pos.x)*u,y:lo.pos.y+(hi.pos.y-lo.pos.y)*u},vel:{x:lo.vel.x+(hi.vel.x-lo.vel.x)*u,y:lo.vel.y+(hi.vel.y-lo.vel.y)*u}}}
function turnForecast(picture:any,profile:any,now:number,horizon:number,sign:number){
 if(!['observed','remembered'].includes(picture.source)||picture.age>limits.prediction+1e-9||Math.hypot(picture.vel.x,picture.vel.y)<1e-6)return undefined;
 const validFor=Math.min(horizon,limits.memory-picture.age);if(validFor<=1e-9)return undefined;
 const speed=Math.hypot(picture.vel.x,picture.vel.y),source={pos:{x:picture.pos.x-picture.vel.x*picture.predictedFor,y:picture.pos.y-picture.vel.y*picture.predictedFor},vel:{...picture.vel},facing:Math.atan2(picture.vel.y,picture.vel.x),energy:1,profile:{...profile},support:newSupport()};
 const request={vel:{x:-sign*picture.vel.y/speed*profile.vmax,y:sign*picture.vel.x/speed*profile.vmax}};
 const duration=picture.age+validFor,path=[{t:0,pos:{...source.pos},vel:{...source.vel}},...previewFreeMovement(source,request,now-picture.age,Math.ceil((duration-1e-9)/.05))];
 return {validFor,request,sourceAtSample:source,age:picture.age,samples:[{...at(path,picture.age),t:0},...path.filter(s=>s.t>picture.age+1e-9&&s.t<duration-1e-9).map(s=>({...s,t:s.t-picture.age})),{...at(path,duration),t:validFor}]};
}
function peerAt(p:any,t:number){return p.forecast?at(p.forecast.samples,t).pos:{x:p.pos.x+p.vel.x*t,y:p.pos.y+p.vel.y*t}}
function safety(body:any,samples:any[],p:any){const init=peerAt(p,0);let previous={t:0,pos:body.pos},px=body.pos.x-init.x,py=body.pos.y-init.y,minimum=Math.hypot(px,py)-p.touch,atMinimum=0,impact=0,contactSeen=false;
 for(const sample of samples){const t=Math.min(sample.t,p.forecast?.validFor??Infinity);if(t<=previous.t+1e-9)break;const u=(t-previous.t)/(sample.t-previous.t),q=peerAt(p,t),rx=previous.pos.x+(sample.pos.x-previous.pos.x)*u-q.x,ry=previous.pos.y+(sample.pos.y-previous.pos.y)*u-q.y,dx=rx-px,dy=ry-py,along=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy))),gap=Math.hypot(px+along*dx,py+along*dy)-p.touch;
 if(gap<minimum){minimum=gap;atMinimum=previous.t+along*(t-previous.t)}
 if(!contactSeen&&gap<=0){const v2=dx*dx+dy*dy,dot=px*dx+py*dy,enter=v2>1e-12?Math.max(0,Math.min(along,(-dot-Math.sqrt(Math.max(0,dot*dot-v2*(px*px+py*py-p.touch*p.touch))))/v2)):0,ex=px+enter*dx,ey=py+enter*dy;impact=Math.max(0,-(ex*dx+ey*dy)/Math.max(1e-12,Math.hypot(ex,ey)*(t-previous.t)));contactSeen=true}
 px=rx;py=ry;previous=sample;if(t<sample.t-1e-9)break;
 }
 return{gap:minimum,atMinimum,impact,initialGap:Math.hypot(body.pos.x-init.x,body.pos.y-init.y)-p.touch};
}
function evaluate(name:string,body:any,request:any,pictures:any[],now:number){
 const start=performance.now(),before=worldSteps,speed=Math.hypot(body.vel.x,body.vel.y),steps=Math.max(12,6+Math.ceil((speed+body.profile.vmax*.3/body.profile.tau)/Math.max(.1,body.profile.brake)*20)+2),horizon=steps*.05,ownReach=speed*horizon+.5*supportParams(body.profile).traction/body.profile.massKg*horizon*horizon;
 const peers=pictures.filter(p=>Math.hypot(p.information.pos.x-body.pos.x,p.information.pos.y-body.pos.y)<=.9*(body.profile.radius+p.profile.radius)+ownReach+Math.hypot(p.information.vel.x,p.information.vel.y)*horizon);
 const routes=peers.flatMap(p=>{const base={slot:p.slot,pos:p.information.pos,vel:p.information.vel,touch:.9*(body.profile.radius+p.profile.radius)};const coast={...base,kind:'coast'};const brake=brakingTeammateForecast(p.information,p.profile,now,horizon);return[coast,...(brake?[{...base,kind:'brake',forecast:brake}]:[]),...[-1,1].flatMap(sign=>{const turn=turnForecast(p.information,p.profile,now,horizon,sign);return turn?[{...base,kind:sign<0?'turnMinus90':'turnPlus90',forecast:turn}]:[]})]});
 const candidates=[1,.5,0].map(scale=>{const command={...request,vel:{x:request.vel.x*scale,y:request.vel.y*scale}},path=previewFreeMovement(body,command,now,steps,'center',6),gaps=routes.map(r=>({slot:r.slot,kind:r.kind,...safety(body,path,r)}));return{scale,command,stable:path.every(s=>s.support==='up')&&Math.hypot(path.at(-1)!.vel.x,path.at(-1)!.vel.y)<.05,finalSpeed:Math.hypot(path.at(-1)!.vel.x,path.at(-1)!.vel.y),worst:Math.min(...gaps.map(g=>g.gap)),impactSquared:gaps.reduce((sum,g)=>sum+g.impact*g.impact,0),gaps,path}});
 let chosen=candidates.find(c=>c.stable&&c.gaps.every(g=>g.gap>=0));let reason='first fully clear route';if(!chosen){const raw=candidates[0],worst=raw.worst,alternatives=candidates.slice(1).filter(c=>c.stable&&c.gaps.every((g,k)=>raw.gaps[k].gap<0||g.gap>=0)).sort((a,b)=>b.worst-a.worst||a.impactSquared-b.impactSquared),best=alternatives[0];chosen=best&&(best.worst>worst+.05||(best.worst>=worst-1e-9&&best.impactSquared<raw.impactSquared-1e-9))?best:raw;reason=chosen===raw?'no compatible improving alternative':'compatible safer alternative'}
 return{name,steps,horizon,routeCount:routes.length,nearPeers:peers.map(p=>p.slot),chosenScale:chosen.scale,reason,candidates,peerTurnRoutes:routes.filter(r=>'forecast'in r&&r.kind.startsWith('turn')).map((r:any)=>({slot:r.slot,kind:r.kind,forecast:r.forecast})),worldSteps:worldSteps-before,seconds:(performance.now()-start)/1000};
}
const weak=evaluate('exact weak acquired state at1.40',fixture.body,fixture.raw,fixture.peers.map((p:any)=>({...p,profile:actors[p.idx].profile})),fixture.entry);
const own={pos:{x:50,y:26},vel:{x:0,y:-2},facing:-Math.PI/2,energy:1,profile:fixture.body.profile,support:newSupport()};
const parallel=evaluate('ordinary parallel lane1.5yd lateral offset',own,{vel:{x:0,y:-5},facing:-Math.PI/2},[{slot:'parallel peer',profile:actors[7].profile,information:{source:'observed',pos:{x:51.5,y:26},vel:{x:0,y:-2},sampledAt:.7,availableAt:1,age:.3,predictedFor:.3}}],1);
const result={protocol:'wz-acquired-ordinary-turn-diagnostic-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),fixtureSha256:createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),assumptions:'Own body exact. Peer source reconstructs acquired sampled COM position and velocity, sampled travel facing, public roster profile, full energy, fresh neutral support. Since sampledAt it holds a request at public vmax rotated plus/minus90deg from sampled travel; default finite body turn follows production World. No actual remote facing/lean/contacts/intent/RNG. These are two nominal possibilities, not an exhaustive uncertainty bound. Existing memory deadline still censors predictions.',cases:[weak,parallel],worldSteps,seconds:(performance.now()-started)/1000,newNativePlays:0};
writeFileSync('out/wz-execution/ordinary-turn-probe.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,cases:result.cases.map(c=>({...c,candidates:c.candidates.map(({path,...v})=>v),peerTurnRoutes:c.peerTurnRoutes.map(p=>({slot:p.slot,kind:p.kind,request:p.forecast.request,atNow:p.forecast.samples[0],last:p.forecast.samples.at(-1)}))}))}));
