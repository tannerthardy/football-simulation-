/** Declare four fresh native inputs before outcomes; no simulation or tuning.
 * REFERENCE_INPUTS.json OUTPUT.json
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Rng} from '../../src/core/rng.ts';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.ts';
import {PASS_BY_ID} from '../../src/playbook/concepts.ts';
import {COVERAGE_BY_ID} from '../../src/playbook/defense.ts';
import {sourceVersion} from '../source-version.ts';
const [input,out]=process.argv.slice(2),read=p=>JSON.parse(readFileSync(p,'utf8')),
 sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),reference=read(input),
 specs=[
  {id:'fresh-y-cross',base:'spread-air/P45',off:43101,def:43102,seed:8801,pass:'y_cross',coverage:'cover4',flip:false,ballY:80/3},
  {id:'fresh-levels',base:'spread-air/P10',off:43103,def:43104,seed:8802,pass:'levels',coverage:'cover1_off',flip:false,ballY:80/3},
  {id:'fresh-smash-man',base:'spread-air/P45',off:43105,def:43106,seed:8803,pass:'smash',coverage:'cover1',flip:false,ballY:80/3},
  {id:'fresh-y-cross-boundary',base:'spread-air/P45',off:43107,def:43108,seed:8804,pass:'y_cross',coverage:'cover4',flip:true,ballY:8},
 ];
assert.ok(!existsSync(out),'Preserve declared inputs');
const clips=specs.map((spec,i)=>{
 const original=reference.clips.find(c=>c.id===spec.base).setup,
  ot=generateTeam(new Rng(spec.off),`Fresh offense ${i}`,`F${i}O`,{strength:.55}),
  dt=generateTeam(new Rng(spec.def),`Fresh defense ${i}`,`F${i}D`,{strength:.55}),
  offense=pickOffense(ot,original.offCall.formation.personnel),defense=pickDefense(dt,original.defCall.personnel),
  setup={...structuredClone(original),offense,defense,
   offCall:{...structuredClone(original.offCall),pass:PASS_BY_ID[spec.pass],flip:spec.flip,label:spec.id},
   defCall:{...structuredClone(original.defCall),coverage:COVERAGE_BY_ID[spec.coverage],label:spec.id},
   los:40,firstDownX:50,ballY:spec.ballY,seed:spec.seed,hurry:false,down:1,
   energy:Object.values({...offense,...Object.fromEntries(Object.entries(defense).map(([k,v])=>['D-'+k,v]))}).map(p=>[p.id,1]),
   scouting:{strength:.55,cells:[]},coverageScouting:{}};
 assert.ok(setup.offCall.pass&&setup.defCall.coverage,'Unknown declared concept/coverage');
 return{id:spec.id,declaration:spec,setup};
});
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({schema:'p045-assigned-man-fresh-inputs-v1',
 provenance:{fixtureGenerationCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  fixtureGenerationSourceSha256:sourceVersion(),collectorSha256:sha(import.meta.filename),referenceSha256:sha(input)},
 selection:'Four fixed inputs declared before baseline/candidate outcomes. Fresh generated players on all four; levels, smash and boundary placement oppose the Y-Cross case. No selection by target, activation or result; no game prefix.',
 newSimulations:0,clips},null,2)+'\n');console.log(JSON.stringify({out,clips:clips.map(c=>c.declaration)}));
