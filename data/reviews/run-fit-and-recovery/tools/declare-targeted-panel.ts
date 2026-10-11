/** Save the entire finite native cohort before simulating any input. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root='/workspace/football-simulation-',out=root+'/out/run-fit-follow-up';
const {sourceVersion}=await import(pathToFileURL(resolve('scripts/source-version.ts')).href);
const expected='8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942';
if(sourceVersion()!==expected)throw Error('Cohort must be declared with immutable parent archive');
const {Rng}=await import(pathToFileURL(resolve('src/core/rng.ts')).href);
const {CENTER_Y}=await import(pathToFileURL(resolve('src/core/field.ts')).href);
const {generateTeam,pickOffense,pickDefense}=await import(pathToFileURL(resolve('src/league/team.ts')).href);
const {RUN_BY_ID}=await import(pathToFileURL(resolve('src/playbook/concepts.ts')).href);
const {COVERAGE_BY_ID,FRONT_BY_ID,PRESSURE_BY_ID}=await import(pathToFileURL(resolve('src/playbook/defense.ts')).href);
const {FORMATION_BY_ID}=await import(pathToFileURL(resolve('src/playbook/formations.ts')).href);
const hash=(v:any)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const pairs=[[31,32],[41,42]],seeds=[3,11];
const teams=pairs.map(([o,d],i)=>({offense:generateTeam(new Rng(o),`Target offense ${i+1}`,`TO${i+1}`,{strength:.55}),defense:generateTeam(new Rng(d),`Target defense ${i+1}`,`TD${i+1}`,{strength:.55})}));
const rows:any[]=[];
function add(roster:number,run:string,front:string,coverage:string,flip:boolean,family:string){
 const formation=FORMATION_BY_ID[family==='draw'?'ace_11':'gun_trey_11'];
 const personnel=family==='draw'?'base43':'nickel';
 const pressure=coverage==='cover0'?PRESSURE_BY_ID.zero_6:null;
 const setup={offense:pickOffense(teams[roster].offense,formation.personnel),defense:pickDefense(teams[roster].defense,personnel),offCall:{formation,flip,kind:'run',run:RUN_BY_ID[run],label:`${formation.name} · ${RUN_BY_ID[run].name}`},defCall:{personnel,front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID[coverage],pressure,zoneStyle:'match',label:`${FRONT_BY_ID[front].name} · ${COVERAGE_BY_ID[coverage].name}${pressure?' + '+pressure.name:''}`},los:40,ballY:CENTER_Y,firstDownX:50,seed:seeds[roster],audibles:false,down:1};
 if(!setup.offCall.run||!setup.defCall.coverage||!setup.offCall.formation)throw Error('Unknown installed concept');
 rows.push({id:`RFT-R${roster+1}-${run}-${front}-${coverage}-${flip?'L':'R'}-S${seeds[roster]}`,roster,rosterSeeds:pairs[roster],seed:seeds[roster],run,front,coverage,flip,family,selection:'all-predeclared-native-inputs',inputSha256:hash(setup),setup});
}
for(const run of ['duo','iz_strong'])for(const coverage of ['cover1_off','cover0'])for(const flip of [false,true])for(let roster=0;roster<2;roster++)add(roster,run,'over',coverage,flip,'back-man');
for(const front of ['over','under'])for(const flip of [false,true])for(let roster=0;roster<2;roster++)add(roster,'draw',front,'cover3',flip,'draw');
if(rows.length!==24)throw Error('Not exactly24 inputs');
const report={schema:'run-fit-targeted-cohort-v1',declaredAt:new Date().toISOString(),builderSource:expected,builderSha256:createHash('sha256').update(readFileSync(out+'/declare-targeted-panel.ts')).digest('hex'),cohortSha256:hash(rows),rosterSha256:hash(teams),teams,rows,limits:['Predeclared24 balanced native tests, not an NFL call-frequency sample.','Only two fixed generated roster pairs; no post-outcome cohort expansion or seed search.','Cover0Press uses the existing Zero6 pressure package; its assignments may be legitimate non-insert controls.','No fabricated bodies, forced assignments, physics parameters or inspection deadlines. Native run owns natural finishes/timeouts.']};
writeFileSync(out+'/targeted-cohort.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({path:out+'/targeted-cohort.json',declaredAt:report.declaredAt,cohortSha256:report.cohortSha256,rosterSha256:report.rosterSha256,rows:rows.map(r=>({id:r.id,inputSha256:r.inputSha256}))},null,2));
