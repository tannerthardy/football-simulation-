import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='out/pr153-part5-review',snapshot=root+'/snapshot';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a);
const errors=[],sources=new Map();
function source(pin){if(sources.has(pin))return sources.get(pin);const h=createHash('sha256');for(const p of git('ls-tree','-r','--name-only',pin,'src').toString().trim().split('\n').sort())h.update(p).update('\0').update(git('show',pin+':'+p)).update('\0');const s=h.digest('hex');sources.set(pin,s);return s;}
const bundle=JSON.parse(readFileSync(snapshot+'/data/reviews/current/run-game-v3-part5-witnesses.json'));
const witnesses=bundle.witnesses.map(w=>{const r=w.receipt,x=w.witness;
 if(sha(JSON.stringify(x)+'\n')!==w.sha256)errors.push(w.name+': checksum');
 if(r.exitCode!==0||!r.inputsUnchanged||r.trackedChanges.length)errors.push(w.name+': receipt');
 if(r.commit!==x.commit||JSON.stringify(r.flags)!==JSON.stringify(x.flags))errors.push(w.name+': settings or commit');
 if(source(r.commit)!==r.sourceSha256)errors.push(w.name+': source');
 return {name:w.name,sha256:w.sha256,commit:r.commit,sourceSha256:r.sourceSha256,flags:r.flags,case:x.case,result:x.result,receiptSeconds:r.commands.reduce((a,b)=>a+b.elapsedSeconds,0)};
});
const manifests=readdirSync(snapshot+'/docs/reviews/run-game-v3/v7').filter(p=>p.endsWith('.manifest.json')).map(p=>{
 const m=JSON.parse(readFileSync(snapshot+'/docs/reviews/run-game-v3/v7/'+p));
 const sourceMatches=source(m.commit)===m.sourceSha256;
 const toolsMatch=Object.entries(m.tools).every(([p,h])=>sha(git('show',m.commit+':'+p))===h);
 if(!sourceMatches||!toolsMatch||!m.sourceUnchanged||m.dirty.trackedFiles.some(p=>p.startsWith('src/')||p.startsWith('config/'))||m.shards.some(s=>s.exitCode!==0))errors.push(p+': manifest');
 return {file:p,commit:m.commit,sourceSha256:m.sourceSha256,sourceMatches,toolsMatch,trackedChanges:m.dirty.trackedFiles,patchSha256:m.dirty.patchSha256,overrides:m.overrides,traceArgs:m.traceArgs,seconds:(Date.parse(m.finishedAt)-Date.parse(m.startedAt))/1000,shards:m.shards.length,rawShardsAvailable:false};
});
const unchangedFromResponse=['src/sim/assign.ts','src/sim/behaviors/carrier.ts','src/sim/run-fits.ts'].map(p=>({file:p,unchanged:git('show','8d3c41f2:'+p).equals(git('show','336e8fc:'+p))}));
const a=JSON.parse(readFileSync(root+'/native-off.json')),b=JSON.parse(readFileSync(root+'/native-on.json'));
const ma=a.moves.find(m=>m.kind==='movement'&&b.moves.some(n=>n.kind==='movement'&&n.t===m.t&&n.b===m.b&&n.d===m.d&&JSON.stringify(n.data.command)!==JSON.stringify(m.data.command)));
const mb=b.moves.find(n=>n.kind==='movement'&&n.t===ma.t&&n.b===ma.b&&n.d===ma.d);
const msummary=m=>({t:m.t,blocker:m.b,defender:m.d,blockerPos:m.data.blockerPos,defenderPos:m.data.defenderPos,blockerVel:m.data.blockerVel,defenderVel:m.data.defenderVel,drive:m.data.drive,forward:m.data.forward,seal:m.data.seal,anchored:m.data.anchored,command:m.data.command});
const sample=(arm,t)=>{
 const f=arm.frames.find(f=>Math.abs(f.t-t)<1e-6);if(!f)return null;
 const actor=k=>f.actors.find(a=>a.slot===k),lg=actor('LG'),d=actor('LB_S'),rb=actor('RB');
 return{t,blocker:lg,defender:d,runner:rb,load:f.reps.find(e=>e.b==='LG'&&e.d==='LB_S')?.hands??null};
};
const firstFrame=a.frames.find((f,i)=>JSON.stringify(f)!==JSON.stringify(b.frames[i]));
const native={case:a.case,sameInitialBodiesAndProfiles:JSON.stringify(a.initial)===JSON.stringify(b.initial),firstRequestDifference:{off:msummary(ma),on:msummary(mb)},firstAchievedDifference:firstFrame.t,
 arms:[a,b].map(arm=>({drive:arm.drive,result:arm.result,terminal:arm.terminal,ticks:arm.frames.length,lgLbStart:arm.moves.find(m=>m.b==='LG'&&m.d==='LB_S')?.start,lgLbEnd:arm.moves.filter(m=>m.b==='LG'&&m.d==='LB_S'&&m.kind==='end'),samples:[2.5,2.75,3,3.25,3.5,3.75,4].map(t=>sample(arm,t)).filter(Boolean)}))};
const output={submission:'336e8fc940d08d119926276b7a4c7242eafb437a',sourceSha256:source('336e8fc'),errors,witnesses,manifests,unchangedFromResponse,native,rawChecksums:{off:sha(readFileSync(root+'/native-off.json')),on:sha(readFileSync(root+'/native-on.json'))}};
writeFileSync(root+'/audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({errors,witnesses:witnesses.length,manifests,unchangedFromResponse,native:{...native,arms:native.arms.map(a=>({...a,samples:undefined}))}},null,2));
