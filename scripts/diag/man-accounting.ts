/** Audit advertised pure-man call combinations, independently of game selection.
 * node --import tsx scripts/diag/man-accounting.ts out/man-accounting.json
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CENTER_Y,HASH_LEFT_Y,HASH_RIGHT_Y} from '../../src/core/field.js';
import {alignOffense,alignDefense} from '../../src/playbook/alignment.js';
import {FORMATIONS} from '../../src/playbook/formations.js';
import {COVERAGES,COVERAGE_BY_ID,FRONTS,PRESSURES} from '../../src/playbook/defense.js';
import {DEF_PERSONNEL,type DefPersonnelId,type DefSlot} from '../../src/playbook/types.js';
import {sourceVersion} from '../source-version.js';

let cases=0,missingCases=0,farMarkerCases=0;
const issues:Record<string,{cases:number;missingCases:number;farMarkerCases:number}>={},samples:unknown[]=[];
for(const form of FORMATIONS)for(const flip of [false,true])for(const ballY of [CENTER_Y,HASH_LEFT_Y,HASH_RIGHT_Y]){
  const off=alignOffense(form,flip,40,ballY);
  for(const personnel of Object.keys(DEF_PERSONNEL) as DefPersonnelId[])for(const front of FRONTS.filter(f=>f.personnel.includes(personnel))){
    const present=Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];
    for(const coverage of COVERAGES.filter(c=>c.man))for(const pressure of [null,...PRESSURES.filter(p=>p.coverages.includes(coverage.family??coverage.id)&&Object.keys(p.blitzers).every(s=>present.includes(s as DefSlot)))]){
      const d=alignDefense({personnel,front,coverage,pressure,shown:COVERAGE_BY_ID.cover2,label:'audit'},off,present,{overrides:{CB_S:'X'}});
      const spots=Object.values(d.spots),covered=new Set(spots.map(s=>s!.manTarget));
      const missing=Object.keys(off.refOf).filter(s=>!covered.has(s as never));
      const far=spots.filter(s=>s!.manTarget&&Math.abs(s!.pos.y-off.spots[s!.manTarget].pos.y)>1);
      cases++;missingCases+=missing.length>0?1:0;farMarkerCases+=far.length>0?1:0;
      const key=`${coverage.id}/${pressure?.id??'none'}`;
      const group=issues[key]??={cases:0,missingCases:0,farMarkerCases:0};group.cases++;group.missingCases+=missing.length>0?1:0;group.farMarkerCases+=far.length>0?1:0;
      if((missing.length||far.length)&&samples.length<24)samples.push({formation:form.id,flip,ballY,personnel,front:front.id,coverage:coverage.id,pressure:pressure?.id,missing,far:far.map(s=>s!.slot)});
    }
  }
}
const out=process.argv[2]??'out/man-accounting.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Compatible catalog fronts/personnel and advertised pressure families, all formations/flips/three hashes, Cover 2 presentation with CB_S shadowing X. Required unique targets are every eligible ref, regardless of hidden route/block assignment. Far means >1 yd lateral offset from the assigned man. Static assignment check, not a coverage success or disguise-fidelity test.',cases,missingCases,farMarkerCases,byCall:issues,samples},null,2)+'\n');
console.log({cases,missingCases,farMarkerCases});
