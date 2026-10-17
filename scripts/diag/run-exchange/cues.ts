/** Available delayed teammate pictures and emitted/executed requests. Passive. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {makeSaved,savedInputs} from './saved.js';
import {sourceVersion} from '../../source-version.js';
import {handoffReach} from '../../../src/sim/ball-transfer.js';
const start=performance.now(),rows=[];
for(const c of savedInputs().cases){
 const sim=makeSaved(c),qb=sim.qb,rb=sim.slot('RB')!,hand=qb.behavior as any,rows0:any[]=[];
 const update=hand.update.bind(hand);let closing=false;
 hand.update=(a:any,s:any)=>{
  const seen=s.perception.perceive(rb.idx,.05),dx=seen.pos.x-a.pos.x,dy=seen.pos.y-a.pos.y;
  const rv={x:seen.vel.x-a.vel.x,y:seen.vel.y-a.vel.y},range=Math.hypot(dx,dy),speed=Math.hypot(seen.vel.x,seen.vel.y),reach=handoffReach(a,rb);
  const radial=dx*rv.x+dy*rv.y,along=(dx*seen.vel.x+dy*seen.vel.y)/Math.max(1e-12,speed);
  const pastMesh=((seen.pos.x-hand.mesh.x)*seen.vel.x+(seen.pos.y-hand.mesh.y)*seen.vel.y)/Math.max(1e-12,speed);
  if(s.t>=hand.meshTime-.15&&radial<0)closing=true;
  const ownsBall=s.carrier===a;
  const cue=ownsBall&&s.t>=hand.meshTime-.15&&closing&&range>reach&&radial>0&&along>0&&pastMesh>reach;
  const input=structuredClone({t:s.t,own:a.body,seen,mesh:hand.mesh,range,reach,radial,along,pastMesh,closing,cue,ownsBall});
  const request=update(a,s);rows0.push({...input,raw:structuredClone(request),kindAfter:a.behavior.kind});return request;
 };
 const frames=[];
 while(sim.phase==='live'&&sim.t<3.5){sim.tick();frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},kind:a.behavior.kind,intent:structuredClone(sim.intents[a.idx])})),impacts:sim.lastStep!.contacts.filter(c=>c.impulse>0&&sim.agents[c.i].team==='O'&&sim.agents[c.j].team==='O')});}
 rows.push({id:c.id,firstCue:rows0.find(r=>r.cue)?.t??null,firstCueState:rows0.find(r=>r.cue)??null,handoffAt:sim.handoffAt,rows:rows0,events:sim.events,frames});
}
const output=process.argv[2];if(!output)throw Error('explicit output required');writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,qualification:'See report for native reconstruction limits; hypothetical cue is available teammate channel, not consumed by old QB controller',rows})));console.log(JSON.stringify(rows.map(({rows,frames,events,firstCueState,...r})=>r)));
