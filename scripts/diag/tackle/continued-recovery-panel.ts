/** Small unchanged ordinary panel, plus native endings of the pinned witnesses.
 * node --import tsx scripts/diag/tackle/continued-recovery-panel.ts [out/file.json]
 */
import {mkdirSync,writeFileSync}from 'node:fs';
import {dirname}from 'node:path';
import {CASES,native,PIN}from './grip-refinement.js';
import {sourceVersion}from '../../source-version.js';
const out=process.argv[2]??'out/continued-recovery/native-controls.json';
const source=sourceVersion();if(source!==PIN)throw Error('Pinned source mismatch');
const ordinary:any[]=[],witnesses:any[]=[];
for(const mode of ['center','patch']as const)for(const side of [1,-1]as const)
  for(const angle of [0,45,90])for(const speed of [3,6]){
    const cell={angle,speed,cut:false,difficulty:'ordinary' as const};
    const baseline=native(cell,mode,side,12,false),candidate=native(cell,mode,side,12,true,'continued-recovery');
    ordinary.push({mode,side,angle,speed,baseline:baseline.result,candidate:candidate.result,
      profiles:baseline.profiles,profileParity:baseline.profiles===candidate.profiles,
      maxCouplingResidual:Math.max(0,...candidate.trace.map(r=>r.coupling?.residual??0))});
    console.log(JSON.stringify({mode,side,angle,speed,baseline:(baseline.result as any).ending,candidate:(candidate.result as any).ending}));
  }
for(const c of CASES)for(const side of [1,-1]as const)for(const n of [12,24,48,96]){
  const cell={angle:c.angle,speed:c.speed,cut:false,difficulty:'difficult' as const};
  const candidate=native(cell,c.mode,side,n,true,'continued-recovery');
  witnesses.push({...c,side,n,result:candidate.result,profiles:candidate.profiles,decisions:candidate.decisions});
  console.log(JSON.stringify({...c,side,n,ending:(candidate.result as any).ending}));
}
if(sourceVersion()!==source)throw Error('Source changed during native controls');
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({source,ordinary,witnesses},null,2)+'\n');
