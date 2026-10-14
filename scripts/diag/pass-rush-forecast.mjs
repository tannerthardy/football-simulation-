/** Static same-picture decomposition, not a changed controller or full play.
 * OUT native-summary... . Keeps the actual chosen pressure actor and held
 * penalty; changes only the radius supplied to the pure reach estimate.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
import {timeToReach} from '../../src/physics/reach.ts';
import {sourceVersion} from '../source-version.ts';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),[out,...inputs]=process.argv.slice(2),rows=[];
for(const input of inputs){const packet=JSON.parse(readFileSync(input,'utf8'));assert.equal(packet.provenance.sourceSha256,sourceVersion());
 for(const r of packet.rows){
  if(r.result.penalty||r.gameDisposition.nullified)continue;
  if(r.measurement.kind!=='sack'&&(r.measurement.release??0)<3.7&&r.id!=='R4202-S2001-P67')continue;
  const f=JSON.parse(gunzipSync(readFileSync(r.film.path))),qb=f.players.find(a=>a.slot==='QB');
  const firstContact=r.result.events.find(e=>e.type==='carrier_contact'&&(e.a===qb.i||e.b===qb.i));
  const samples=[];
  for(const s of f.steps)for(const p of s.pressure){
   if(p.i===null||p.time===null)continue;
   const pic=p.pictures.find(x=>x.i===p.i)?.picture;if(!pic)throw Error('Actual pressure picture absent');
   const d=f.players[p.i],a=s.before[p.i],q=s.before[qb.i],m={pos:pic.pos,vel:pic.vel,profile:d.profile,speedScale:a.speedScale};
   const oldTravel=timeToReach(m,q.pos,.8),held=p.time-oldTravel;
   assert.ok(held>=-1e-9,'Decomposition must not manufacture negative held time');
   const radius=qb.profile.radius+d.profile.radius+d.profile.reach;
   const travel=timeToReach(m,q.pos,radius),dx=q.pos.x-pic.pos.x,dy=q.pos.y-pic.pos.y,D=Math.hypot(dx,dy),
    parallel=(pic.vel.x*dx+pic.vel.y*dy)/D,lateral=Math.hypot(pic.vel.x-parallel*dx/D,pic.vel.y-parallel*dy/D);
   samples.push({t:s.t,phase:p.phase,i:p.i,id:d.id,actorUnchanged:true,actualDistance:p.dist,
    observedDistance:D,age:pic.age,held,oldTravel,oldTotal:p.time,radius,travel,total:travel+held,
    redirectPenalty:.5*lateral/d.profile.lateral,picture:pic,actualFirstContactTick:firstContact?.t??null});
  }
  const before=samples.filter(s=>firstContact===undefined||s.t<=firstContact.t);
  rows.push({id:r.id,kind:r.measurement.kind,endpoint:r.measurement.pocketEnd,firstContact:firstContact??null,
   baselineFirstImminent:before.find(s=>s.oldTotal<.45)??null,diagnosticFirstImminent:before.find(s=>s.total<.45)??null,
   nativeHoldAtFirstPressure:r.measurement.first2Strict?.engagement??null,samples});
 }
}
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({schema:'same-picture-pressure-radius-diagnostic-v1',
 sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),inputs:inputs.map(path=>({path,sha256:hash(path)})),
 question:'Does the existing center-radius reach forecast hide attainable hand contact in the same consumed picture?',
 limits:'Not a candidate or reach-law change. The geometry envelope is a diagnostic bound, not a guaranteed wrap/fall. Actual pressure actor, observed picture/profile/held penalty are fixed. No changed policy, observations, calls, execution or physical capabilities. Does not reselect another pressure actor or simulate an offensive response.',rows})+'\n');
console.log(JSON.stringify({out,rows:rows.length,newSimulations:0,newObservations:0}));
