/** Read-only saved-body/cue diagnosis. No PlaySim or new perception/controller calls. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
const [archiveArg, expected, packetArg, outputArg] = process.argv.slice(2);
if (!archiveArg || !expected || !packetArg || !outputArg) throw Error('Usage: diagnose-spacing.ts ARCHIVE SOURCE_SHA WITNESS_JSON_GZ OUTPUT_JSON');
const archive = resolve(archiveArg), packetPath = resolve(packetArg), output = resolve(outputArg);
const sha = (b:any) => createHash('sha256').update(b).digest('hex');
function sourceSha() {
  const walk = (d:string):string[] => readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
  const h=createHash('sha256');
  for(const f of walk(join(archive,'src')).map(f=>relative(archive,f)).sort()) h.update(f).update('\0').update(readFileSync(join(archive,f))).update('\0');
  return h.digest('hex');
}
const before=sourceSha(); if(before!==expected)throw Error('Pinned source differs');
const bytes=readFileSync(packetPath),packet=JSON.parse(gunzipSync(bytes).toString('utf8'));
if(packet.schema!=='retained-passing-tail-command-witnesses-v1'||packet.sourceBefore!==expected||packet.sourceAfter!==expected)throw Error('Saved witness source differs');
const codecPath=resolve('data/reviews/alley-support-and-tail-audit/tools/native-body-codec.mjs');
if(sha(readFileSync(codecPath))!==packet.origin.bodyDecoder.sha256)throw Error('Decoder differs');
const {decodeBody,encodeBody}=await import(pathToFileURL(codecPath).href);
const {World}=await import(pathToFileURL(join(archive,'src/physics/world.ts')).href);
const {previewFreeMovement}=await import(pathToFileURL(join(archive,'src/physics/movement-preview.ts')).href);
const {fatigueFactor,followAccel}=await import(pathToFileURL(join(archive,'src/physics/kinematics.ts')).href);
const {availability,supportParams}=await import(pathToFileURL(join(archive,'src/physics/support.ts')).href);
const {spaceTeammates}=await import(pathToFileURL(join(archive,'src/sim/spacing.ts')).href);
const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
function assert(c:boolean,s:string){if(!c)throw Error(s);}
function cloneBody(encoded:any){const b=decodeBody(encoded);assert(same(encodeBody(b),encoded),'Body decode round-trip differs');return b;}
function actors(step:any){return step.agents.map((state:any)=>{
  const body=cloneBody(state.body);
  return {idx:state.idx,slot:state.slot,team:state.team,body,profile:body.profile,speedScale:state.speedScale,
    engagement:state.engagement,get pos(){return body.pos;},get vel(){return body.vel;},
    isDown:()=>body.support?.state!=='up'};
});}
function clearance(body:any,samples:any[],peer:any){
  let px=body.pos.x-peer.pos.x,py=body.pos.y-peer.pos.y;
  let min=Math.hypot(px,py)-peer.touch,at=0,prev=0;
  for(const sample of samples){
    const rx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t,ry=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
    const ex=rx-px,ey=ry-py,along=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
    const d=Math.hypot(px+along*ex,py+along*ey)-peer.touch;
    if(d<min){min=d;at=prev+(sample.t-prev)*along;} px=rx;py=ry;prev=sample.t;
  }
  return {clearance:min,at};
}
function checked(report:any){
  assert(Math.abs(report.work.residual)<1e-7,'Physical work residual');
  for(let i=0;i<report.supportMotorWork.length;i++) {
    assert(report.supportMotorWork[i]<=report.supportMotorWorkLimit[i]+1e-7,'Motor work limit');
    assert(report.armImpulse[i]<=report.armImpulseLimit[i]+1e-7,'Arm impulse limit');
    assert(report.armWork[i]<=report.armWorkLimit[i]+1e-7,'Arm work limit');
  }
}
function pairRollout(encodedA:any,encodedB:any,cmdA:any,cmdB:any,now:number){
  const a=cloneBody(encodedA),b=cloneBody(encodedB),w=new World([a,b]);w.time=now;
  const trace:any[]=[];let impulse=0,minClear=Infinity,maxPenetration=0;
  const touch=.9*(a.profile.radius+b.profile.radius);
  for(let k=0;k<12;k++){
    const report=w.step([cmdA,cmdB],.05);checked(report);
    const d=Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)-touch;minClear=Math.min(minClear,d);
    impulse+=report.contacts.reduce((sum:number,c:any)=>sum+c.impulse,0);maxPenetration=Math.max(maxPenetration,report.maxPenetration);
    trace.push({t:(k+1)*.05,a:encodeBody(a),b:encodeBody(b),report});
  }
  return {minClearance:minClear,contactImpulse:impulse,maxPenetration,states:[a.support.state,b.support.state],trace};
}
const parityRows:any[]=[],witnesses:any[]=[];
for(const row of packet.rows){
  assert(row.executionSha256===row.plainExecutionSha256&&row.resultSha256===row.plainResultSha256&&same(row.nextRng,row.plainNextRng),`${row.id}: Receipt parity`);
  assert(row.parentExecutionExact&&row.parentResultExact&&row.observerVerified,`${row.id}: Parent/native receipts`);
  for(const b of row.exactInitialBodies)cloneBody(b.body);
  parityRows.push({id:row.id,case:row.case,setup:row.setup,profilesSha256:row.profilesSha256,executionSha256:row.executionSha256,
    plainExecutionSha256:row.plainExecutionSha256,resultSha256:row.resultSha256,plainResultSha256:row.plainResultSha256,
    initialRng:row.initialRng,exactInitialBodiesSha256:sha(JSON.stringify(row.exactInitialBodies)),
    nextRng:row.nextRng,plainNextRng:row.plainNextRng,offenseYards:row.result.offenseYards,outcome:row.result.outcome});
  for(const witness of row.witnesses){
    const step=witness.steps[0].record,aId=witness.selectedActors[0].actor;
    const aa=actors(step),a=aa[aId],command=witness.commands.find((c:any)=>c.record.a===aId)!.record;
    const ownPictures=new Map<number,any>();
    for(const p of witness.pictures)if(p.record.a===aId&&p.record.actor===null)ownPictures.set(p.record.b,p);
    const seenPeers=aa.filter((b:any)=>b.idx!==a.idx&&b.team===a.team).map((b:any)=>{
      const p=ownPictures.get(b.idx);assert(!!p,`Missing existing pipeline teammate picture ${row.id}/${step.t}/${b.idx}`);
      return {idx:b.idx,slot:b.slot,pictureOriginalIndex:p.originalIndex,cue:p.record.cue,pos:p.record.cue.pos,vel:p.record.cue.vel,
        touch:.9*(a.profile.radius+b.profile.radius),actualBody:step.agents[b.idx].body};
    });
    // Replay just this actor; teammate intentions are not consumed by spacing.
    const intents:any[]=Array(22).fill(null);intents[aId]=structuredClone(command.rawCommand);
    spaceTeammates(aa,intents,(_a:any,b:any)=>ownPictures.get(b.idx).record.cue,{now:step.t});
    const replayed=intents[aId];
    const selected:any={id:row.id,t:step.t,actor:aId,slot:a.slot,raw:command.rawCommand,contained:step.containedCommands[aId],applied:step.appliedCommands[aId],
      replayedSpacing:replayed,replayedEqualsApplied:same(replayed,step.appliedCommands[aId]),bodyBefore:command.bodyBefore,
      beforeWorldBody:step.agents[aId].body,afterWorldBody:step.achievedAgents[aId].body};
    if(row.id==='DA-R2-curl_flat-cover2-R'&&step.t>=4.2){
      const capacity=availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy));
      let vx=command.rawCommand.vel.x,vy=command.rawCommand.vel.y;
      const radial=seenPeers.map((peer:any)=>{
        const dx=peer.pos.x-a.pos.x,dy=peer.pos.y-a.pos.y,d=Math.hypot(dx,dy),gap=d-peer.touch,nx=dx/d,ny=dy/d;
        const brake=followAccel(a.body,{x:-nx*1e3,y:-ny*1e3},command.rawCommand.cutSkill??1,capacity),decel=Math.max(.1,-brake.x*nx-brake.y*ny);
        const current=Math.max(0,(a.vel.x-peer.vel.x)*nx+(a.vel.y-peer.vel.y)*ny),stopping=current*.3+current*current/(2*decel);
        const rx=vx-peer.vel.x,ry=vy-peer.vel.y,speed2=rx*rx+ry*ry,closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
        const straightClosest=Math.hypot(dx-rx*closest,dy-ry*closest),closing=rx*nx+ry*ny;
        const eligible=gap<=Math.max(1.2,stopping)&&(gap<=0||straightClosest<=peer.touch);
        const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,gap))-decel*.3;
        const cut=eligible&&closing>allowed?closing-allowed:0;vx-=nx*cut;vy-=ny*cut;
        return {...peer,distance:d,gap,current,stopping,decel,closing,allowed,straightClosest,eligible,cut};
      });
      const spaced={...command.rawCommand,vel:{x:vx,y:vy}};
      const tube=.5*supportParams(a.profile).traction/a.profile.massKg*.6**2;
      const near=seenPeers.filter((peer:any)=>{
        const dx=peer.pos.x-a.pos.x,dy=peer.pos.y-a.pos.y,rx=a.vel.x-peer.vel.x,ry=a.vel.y-peer.vel.y,v2=rx*rx+ry*ry;
        const closest=v2>1e-12?Math.max(0,Math.min(.6,(dx*rx+dy*ry)/v2)):0;
        return Math.hypot(dx-rx*closest,dy-ry*closest)<=peer.touch+tube+1e-9;
      });
      const forecasts=[1,.75,.5,.25,0].map(fraction=>{
        const request={...spaced,vel:{x:spaced.vel.x*fraction,y:spaced.vel.y*fraction}},samples=previewFreeMovement(a.body,request,step.t,12);
        return {fraction,request,samples,observedPeerClearances:seenPeers.map((peer:any)=>({idx:peer.idx,slot:peer.slot,...clearance(a.body,samples,peer)})),
          actualVelocityPeerClearances:seenPeers.map((peer:any)=>({idx:peer.idx,slot:peer.slot,...clearance(a.body,samples,{...peer,pos:decodeBody(peer.actualBody).pos,vel:decodeBody(peer.actualBody).vel})}))};
      });
      const mike=seenPeers.find((p:any)=>p.slot==='LB_M')!;
      const mikeCommand=witness.commands.find((c:any)=>c.record.a===mike.idx)!.record.rawCommand;
      const rollouts=forecasts.map(f=>({fraction:f.fraction,request:f.request,
        pairHeldNativeCommands:pairRollout(step.agents[aId].body,mike.actualBody,f.request,mikeCommand,step.t)}));
      selected.radial=radial;selected.afterRadial=spaced;selected.nearTube=tube;selected.nearPeers=near.map((p:any)=>p.idx);
      selected.forecasts=forecasts;selected.mikeHeldNativeRequest=mikeCommand;selected.pairRollouts=rollouts;
      const original=JSON.stringify(step.agents[aId].body);
      const free=cloneBody(step.agents[aId].body),world=new World([free]);world.time=step.t;world.step([step.appliedCommands[aId]],step.dt);
      selected.freeFirstAppliedEqualsActual=same(encodeBody(free),step.achievedAgents[aId].body);
      selected.freeFirstApplied=encodeBody(free);assert(JSON.stringify(step.agents[aId].body)===original,'Saved body mutated');
    }
    witnesses.push(selected);
  }
}
const after=sourceSha();assert(after===before,'Source changed during diagnosis');
const result={schema:'saved-spacing-diagnosis-v1',sourceBefore:before,sourceAfter:after,
 input:{filename:packetPath,sha256:sha(bytes),rawOrigin:packet.origin.rawPacket,bodyCodecSha256:packet.origin.bodyDecoder.sha256},
 toolSha256:sha(readFileSync(new URL(import.meta.url))),nativeDualExecutionsInherited:true,newNativeSimulations:0,
 definitions:{
  spacingReplay:'Actual production spacing function called once on reconstructed own body with exactly the retained already-consumed teammate pictures. No new see, recognition, random, behavior or ball query.',
  freeForecast:'Production free World movement, 12 ordinary 50ms steps. Same encoded body/profile/support/energy and unchanged raw posture/facing/cutSkill.',
  pairRollout:'Retrospective two-body free World from exact before-World states, no grips/active joints. Each retains its original already-recorded controller request for .6s. Mike request is diagnostic only and never supplied to replayed spacing.',
  originalCases:'All six native identities/initial encoded bodies/profiles/setup and stored full execution/plain/endpoint receipts retained. These are inherited original dual-execution proofs, not new six-play simulations.',
  limits:'Only selected saved diagnosis windows. No claim of a full World/contact checkpoint or exact future native trajectory. Controller cues remain delayed; actual peer bodies and requests are used solely to audit forecast conservatism.'},
 checks:{replayedSelectedCommands:witnesses.length,replayedEqualApplied:witnesses.filter(w=>w.replayedEqualsApplied).length},parityRows,witnesses};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,checks:result.checks,focused:witnesses.filter(w=>w.pairRollouts).map(w=>({t:w.t,replay:w.replayedEqualsApplied,
 radialCuts:w.radial.filter((p:any)=>p.cut).map((p:any)=>({slot:p.slot,cut:p.cut})),near:w.nearPeers,
 forecasts:w.forecasts.map((f:any)=>({fraction:f.fraction,mike:f.observedPeerClearances.find((p:any)=>p.slot==='LB_M')})),
 pair:w.pairRollouts.map((f:any)=>({fraction:f.fraction,clearance:f.pairHeldNativeCommands.minClearance,impulse:f.pairHeldNativeCommands.contactImpulse,states:f.pairHeldNativeCommands.states})),
 freeFirstEqualsActual:w.freeFirstAppliedEqualsActual}))}));
