/** Declare two untouched opposing inputs before outcomes; no simulation or tuning.
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
  {id:'untouched-vertical-trail',base:'spread-air/P45',off:54201,def:54202,seed:9901,pass:'four_verts',coverage:'cover2man',flip:false,ballY:80/3},
  {id:'untouched-comeback-off',base:'spread-air/P45',off:54203,def:54204,seed:9902,pass:'comebacks',coverage:'cover1_off',flip:true,ballY:80/3},
 ];
assert.ok(!existsSync(out),'Preserve declared inputs');
const clips=specs.map((spec,i)=>{
 const original=reference.clips.find(c=>c.id===spec.base).setup,
  ot=generateTeam(new Rng(spec.off),`Fresh offense ${i}`,`U${i}O`,{strength:.55}),
  dt=generateTeam(new Rng(spec.def),`Fresh defense ${i}`,`U${i}D`,{strength:.55}),
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
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({schema:'man-recognition-fresh-inputs-v1',
 provenance:{fixtureGenerationCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  fixtureGenerationSourceSha256:sourceVersion(),collectorSha256:sha(import.meta.filename),referenceSha256:sha(input)},
 selection:'Two untouched generated player pairs: verticals against installed trail/help and mirrored comebacks against off-man. Selected to expose premature trail/roof abandonment or a delayed drive on an acquired plant. No selection by target, activation or outcome; no game prefix.',
 newSimulations:0,clips},null,2)+'\n');console.log(JSON.stringify({out,clips:clips.map(c=>c.declaration)}));
