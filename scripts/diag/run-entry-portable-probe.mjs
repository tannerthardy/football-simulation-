// Same-body before/after consumer probe. No PlaySim ticks or new football snaps.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chooseRunApproach} from '../../src/sim/run-approach.js';
const start=performance.now(),out='out/run-entry-portable';mkdirSync(out,{recursive:true});
const prior='cfcb7db0ba17c978fd02fb179c61f4e8b1d66752';
const bytes=execFileSync('git',['show',prior+':src/sim/run-approach.ts']);
writeFileSync(out+'/legacy-run-approach.ts',bytes.toString().replaceAll("'../core/","'../../src/core/")
  .replaceAll("'../physics/","'../../src/physics/").replace("'./teammate-information.js'","'../../src/sim/teammate-information.js'"));
const {chooseRunApproach:before}=await import(pathToFileURL(resolve(out+'/legacy-run-approach.ts')).href);
const fixture='test/fixtures/run-entry-approach.json',saved=JSON.parse(readFileSync(fixture,'utf8'));
const compact=r=>({kind:r.kind,status:r.status??'implicit numeric clearance',minimumGap:Number.isFinite(r.minimumGap)?r.minimumGap:null,
  knownMinimumGap:r.knownMinimumGap??null,
  unknownPeers:r.unknownPeers??[],command:r.command,
  choices:r.choices.map(c=>({kind:c.kind,status:c.status??'implicit numeric clearance',minimumGap:c.minimumGap,
    finalPos:c.path.at(-1).pos,finalVel:c.path.at(-1).vel,gaps:c.gaps}))});
const rows=[];
function compare(name,s){
  const old=before(s.body,s.command,s.peers,s.t,'center'),next=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  assert.deepEqual(next.choices.map(c=>c.path),old.choices.map(c=>c.path));
  rows.push({name,before:compact(old),after:compact(next)});return{old,next};
}
const obstruction=compare('saved P032 obstruction',structuredClone(saved.failing));
assert.equal(obstruction.next.kind,'gather');assert.equal(obstruction.next.status,'unknown');
assert.deepEqual(obstruction.next.unknownPeers,[0,8]);
const clear=compare('saved P019 clear route',structuredClone(saved.clear));
assert.equal(clear.next.kind,'fast');assert.deepEqual(clear.old.command,clear.next.command);
assert.equal(clear.next.status,'unknown');assert.deepEqual(clear.next.unknownPeers,[0]);
const s=structuredClone(saved.failing),rg=s.peers.find(p=>p.id===5);
s.body.vel={x:0,y:0};s.body.facing=0;s.body.spin=0;s.command.vel={x:s.body.profile.vmax,y:0};
rg.picture.vel={x:0,y:0};rg.picture.age=.30;rg.picture.predictedFor=.30;
rg.picture.pos={x:s.body.pos.x+1,y:s.body.pos.y+.9*(s.body.profile.radius+rg.radius)+.02};s.peers=[rg];
const stationary=compare('known stationary, 0.02 yd outside physical contact',s);
assert.equal(stationary.next.status,'clear');assert.equal(stationary.next.kind,'fast');
for(const source of ['observed','remembered']){
  const stale=structuredClone(s);stale.peers[0].picture.source=source;stale.peers[0].picture.age=.35;
  const r=compare('same body and zero velocity, stale '+source,stale);
  assert.ok(r.old.minimumGap>0);assert.equal(r.next.minimumGap,null);assert.equal(r.next.status,'unknown');
  assert.deepEqual(r.next.command,stationary.next.command);
}
const missing=structuredClone(saved.clear);missing.peers=[{id:99,picture:{source:'unavailable'},radius:.4,brake:4}];
const unavailable=compare('unavailable has no motion fields',missing);assert.equal(unavailable.next.status,'unknown');
const result={schema:'run-entry-portable-consumer-v1',acceptedBase:'8c891f4cf887b54297efbbc4c7993ba5e2f318b5',
  priorConsumer:prior,priorModuleSha256:createHash('sha256').update(bytes).digest('hex'),
  fixtureSha256:createHash('sha256').update(readFileSync(fixture)).digest('hex'),
  ownPreviewPathsIdentical:true,rows,node:process.version,elapsedSeconds:(performance.now()-start)/1000,
  newNativeTicks:0,newFullSnaps:0,completedGames:0};
writeFileSync(out+'/probe.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(r=>({name:r.name,beforeGap:r.before.minimumGap,
  afterGap:r.after.minimumGap,afterStatus:r.after.status,choice:r.after.kind})),elapsedSeconds:result.elapsedSeconds}));
