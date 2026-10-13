/** Bespoke NFL-style route combinations made from existing installed routes.
 * Lab-only call objects; no playbook/controller/physics edits.
 * node --import tsx scripts/diag/route-conflict-lab.ts OUTPUT.json
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CENTER_Y} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {ROUTES} from '../../src/playbook/routes.js';
import type {PassConcept} from '../../src/playbook/types.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {sourceVersion} from '../source-version.js';

export const designs:Array<{call:PassConcept;formation:string;attack:string;control:string;conflict:string}>=[
 {call:{id:'lab_mills',name:'Mills with shallow outlet',family:'dropback',drop:'gun5',
   strong:{1:'post',2:'dig',3:'shallow'},weak:{1:'go'},back:'check',progression:['S1','S2','S3','B'],beats:[]},
  formation:'gun_trips_11',attack:'cover4',control:'cover2man',
  conflict:'Post over dig stresses quarters safety #2 responsibility and post roof; 2-Man tests whether individual trails plus two roofs handle the same stems.'},
 {call:{id:'lab_yankee',name:'Yankee post-over',family:'dropback',drop:'five',
   strong:{1:'post',2:'cross',3:'flat'},weak:{1:'go'},back:'block',progression:['S1','S2','S3','W1'],beats:[]},
  formation:'gun_trips_11',attack:'cover3',control:'cover4_poach',
  conflict:'Post draws middle-third attention while deep over crosses underneath; trips poach supplies an alternative inside roof. No invented play-action or extra run fake.'},
 {call:{id:'lab_mesh_rail',name:'Mesh rail with vertical clears',family:'dropback',drop:'gun5',
   strong:{1:'go',2:'shallow'},weak:{1:'go',2:'shallow_high'},back:'wheel',progression:['S2','W2','B','S1','W1'],beats:[]},
  formation:'gun_doubles_11',attack:'cover1',control:'cover4_palms',
  conflict:'RB wheel threatens a late vertical while opposing #2 unders stress man traffic; Palms is an adverse distribution test, not a guaranteed wheel stop. No scripted pick/contact.'},
 {call:{id:'lab_texas_seam',name:'Texas beneath seam and dig',family:'dropback',drop:'gun5',
   strong:{1:'go',2:'seam'},weak:{1:'dig',2:'flat'},back:'angle',progression:['S2','B','W1','W2'],beats:[]},
  formation:'gun_doubles_11',attack:'tampa2',control:'cover1_robber',
  conflict:'Seam takes Mike deep while back breaks inside and dig arrives behind underneath help; robber is deliberately hostile to the interior throwing window.'},
];
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const d of designs)for(const route of [...Object.values(d.call.strong),...Object.values(d.call.weak),d.call.back])
 if(!['block','check'].includes(route)&&!ROUTES[route])throw Error(`Uninstalled route ${route}`);
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 startedAt:new Date().toISOString()};
const manifest:any[]=[],clips:any[]=[];
for(const roster of [8081,9092]){
 const rng=new Rng(roster),off=generateTeam(rng,'Custom lab offense',`O${roster}`,{strength:.55}),def=generateTeam(rng,'Custom lab defense',`D${roster}`,{strength:.55});
 for(const d of designs)for(const arm of ['attack','control'] as const)for(const seed of [4049,5051,6067])for(const flip of [false,true]){
  const id=`CUSTOM-R${roster}-${d.call.id}-${arm}-S${seed}-${flip?'L':'R'}`,input={id,roster,seed,flip,arm,concept:d.call.id,coverage:d[arm],conflict:d.conflict};
  manifest.push(input);const form=FORMATION_BY_ID[d.formation];
  const setup={offense:pickOffense(off,form.personnel),defense:pickDefense(def,'nickel'),
   offCall:{formation:form,flip,kind:'pass' as const,pass:d.call,label:id},
   defCall:{personnel:'nickel' as const,front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[d[arm]],zoneStyle:'match' as const,pressure:null,label:id},
   los:40,ballY:CENTER_Y,firstDownX:50,seed,audibles:false};
  const sim=new PlaySim(structuredClone(setup));
  const refs=[...Object.keys(d.call.strong).map(k=>`S${k}`),...Object.keys(d.call.weak).map(k=>`W${k}`),...d.call.progression];
  for(const ref of refs)if(ref!=='B'&&!Reflect.get(sim.offAlign.numbering,ref))throw Error(`Uninstalled receiver reference ${id}:${ref}`);
  const result=sim.run();
  const signature=hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});
  clips.push({id,input:{...input,effectiveCoverage:sim.defCall.coverage.id},setup,signature,result});
 }
}
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
const out=process.argv[2];if(!out)throw Error('Supply output.json');mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({protocol:'bespoke-route-conflict-lab-v1',designs,manifest,inputSha256:hash(manifest),clips,
 provenance:{...provenance,finishedAt:new Date().toISOString()}})+'\n');
console.log(JSON.stringify({out,inputs:clips.length,sourceSha256:provenance.sourceSha256,inputSha256:hash(manifest)}));
