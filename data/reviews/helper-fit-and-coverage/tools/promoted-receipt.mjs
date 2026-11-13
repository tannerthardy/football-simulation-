import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const load=p=>JSON.parse(gunzipSync(readFileSync(p)).toString());
const root='out/helper-fit/';
const pairs=[{name:'original-four',before:'baseline-promoted-metadata.json.gz',after:'promoted.json.gz',oldBefore:'baseline-metadata.json.gz',oldAfter:'final.json.gz',tool:'helper-surface-review.ts'},{name:'selected-power-and-declared-mirror',before:'power-baseline-promoted.json.gz',after:'power-promoted.json.gz',oldBefore:'power-baseline.json.gz',oldAfter:'power-final.json.gz',tool:'power-helper-surface-review.ts'}];
const checks=[];
for(const p of pairs){const [b,f,ob,of]=[p.before,p.after,p.oldBefore,p.oldAfter].map(x=>load(root+x));
 if(b.collectorSha256!==f.collectorSha256||f.collectorSha256!==fileHash(root+p.tool))throw Error('Collector byte hash mismatch');
 if(f.sourceBefore!=='601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b'||f.sourceAfter!==f.sourceBefore||b.sourceBefore!=='c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8'||b.sourceAfter!==b.sourceBefore)throw Error('Source pin mismatch');
 for(let i=0;i<b.rows.length;i++){const [a,z,oa,oz]=[b.rows[i],f.rows[i],ob.rows[i],of.rows[i]];
  if(a.id!==z.id||a.physicalInitialSha256!==z.physicalInitialSha256||hash(a.physicalInitial)!==a.physicalInitialSha256||hash(z.physicalInitial)!==z.physicalInitialSha256||hash(a.physicalInitial)!==hash(z.physicalInitial))throw Error('Saved initial bytes cannot be recomputed/matched');
  for(const [current,prior] of [[a,oa],[z,oz]])if(hash(current.observed)!==hash(prior.observed)||hash(current.plain)!==hash(prior.plain)||hash(current.checkpoints)!==hash(prior.checkpoints))throw Error('Serialization/type-guard altered native signatures');
  let maxGroundRatio=0,maxArmImpulseRatio=0,maxArmWorkRatio=0,maxWorkResidual=0;
  for(const s of z.steps){const r=s.report;
   for(let j=0;j<r.groundImpulse.length;j++){const v=r.groundImpulse[j],cap=1.1*z.physicalInitial[j].profile.massKg*(9.80665/.9144)*.05;const ratio=Math.hypot(v.x,v.y)/cap;if(ratio>1+1e-7)throw Error(`Absolute ground-traction bound ${z.id} ${s.t}`);maxGroundRatio=Math.max(maxGroundRatio,ratio);}
   for(let j=0;j<r.armImpulse.length;j++){if(r.armImpulse[j]>r.armImpulseLimit[j]+1e-7)throw Error('Arm impulse budget exceeded');maxArmImpulseRatio=Math.max(maxArmImpulseRatio,r.armImpulseLimit[j]?r.armImpulse[j]/r.armImpulseLimit[j]:0);}
   for(let j=0;j<r.armWork.length;j++){if(r.armWork[j]>r.armWorkLimit[j]+1e-7)throw Error('Arm work budget exceeded');maxArmWorkRatio=Math.max(maxArmWorkRatio,r.armWorkLimit[j]?r.armWork[j]/r.armWorkLimit[j]:0);}
   maxWorkResidual=Math.max(maxWorkResidual,Math.abs(r.work.residual));
  }
  const end=z.result.telemetry.frames.at(-1),carrier=z.result.frames.toReversed().find(x=>x.carrier!==null&&x.carrier!==undefined&&x.carrier>=0)?.carrier;
  checks.push({cohort:p.name,id:z.id,gainBefore:a.result.offenseYards,gainAfter:z.result.offenseYards,sourceBefore:b.sourceBefore,sourceAfter:f.sourceBefore,physicalInitialSha256:a.physicalInitialSha256,savedHashRecomputed:true,sourceAndCollectorGuarded:true,oldExecutionUnchanged:true,observerNeutralEveryTick:true,observerSignature:z.observed.sha256,plainSignature:z.plain.sha256,nextRng:z.observed.nextRng,groundBound:'Absolute 1.1 m g dt traction envelope; not proof of every instantaneous support-reduced bound.',maxGroundRatio,maxArmImpulseRatio,maxArmWorkRatio,maxWorkResidual,finish:{t:end.t,carrier,state:end.agents[carrier].body.state,tackle:end.tackle}});
 }
}
const out={schema:'promoted-helper-native-receipt-v1',method:'Saved-only byte/source/collector/hash validation of canonical Map/Set serialization. Recomputed initial physical/mind bytes match exactly. Each refreshed baseline and promoted final execution matches prior native bodies/controllers/reports/RNG signatures and all per-tick checkpoints; observational/plain equality enforced in original collector. Absolute ground-traction envelope and shared arm impulse/work bounds audited from achieved reports. Natural carrier-down/grip endings retained.',files:pairs.flatMap(p=>[p.before,p.after,p.tool]).map(p=>({path:root+p,sha256:fileHash(root+p)})),checks};writeFileSync(root+'promoted-receipt.json',JSON.stringify(out,null,2));console.log(JSON.stringify({output:root+'promoted-receipt.json',checks:checks.map(c=>({id:c.id,gainBefore:c.gainBefore,gainAfter:c.gainAfter,savedHashRecomputed:c.savedHashRecomputed,groundRatio:c.maxGroundRatio,armImpulseRatio:c.maxArmImpulseRatio,armWorkRatio:c.maxArmWorkRatio,workResidual:c.maxWorkResidual,finish:c.finish.state}))}));
