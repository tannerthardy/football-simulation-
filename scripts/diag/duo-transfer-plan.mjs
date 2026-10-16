/** Frozen, purposeful transfer inputs. Constructing this plan runs no plays. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {FRONT_BY_ID} from '../../src/playbook/defense.ts';
import {RUN_BY_ID} from '../../src/playbook/concepts.ts';
const evidence='70ed238a2246cd89d3c4108d647245baf5ff70bb';
const original=JSON.parse(execFileSync('git',['show',`${evidence}:data/reviews/current/second-level-access/inputs.json`],{encoding:'utf8'}));
const sha=b=>createHash('sha256').update(typeof b==='string'?b:JSON.stringify(b)).digest('hex');
const rows=[];
function add(id,base,front,formation,flip,cached=null,concept='duo'){
 const old=original.rows.find(r=>r.id===base),setup=structuredClone(old.setup);
 if(front!==old.setup.defCall.front.id){setup.defCall.front=structuredClone(FRONT_BY_ID[front]);setup.defCall.label=`${setup.defCall.front.name} · ${setup.defCall.coverage.name}`;}
 if(formation!==old.setup.offCall.formation.id||concept!==old.setup.offCall.run.id){
  setup.offCall.formation=structuredClone(FORMATION_BY_ID[formation]);setup.offCall.run=structuredClone(RUN_BY_ID[concept]);
  setup.offCall.label=`${setup.offCall.formation.name} · ${setup.offCall.run.name}`;
 }
 setup.offCall.flip=flip;
 if(!setup.defCall.front.personnel.includes(setup.defCall.personnel))throw Error('Invalid front/personnel');
 if(setup.offCall.formation.personnel!=='11')throw Error('Do not masquerade WR as second TE');
 const row={id,matchup:old.matchup,concept,front,formation,flip,setup,inputSha256:sha(setup),cached};
 if(cached?.id===base&&row.inputSha256!==old.inputSha256)throw Error('Cached input changed');
 rows.push(row);
}
add('A030','A030','wide9','ace_11',false,{id:'A030',candidate:'candidate-a030.json.gz',reference:'current.json.gz'});
add('D02','A030','wide9','ace_11',true);
// Preserve the exact already-selected Under manifest instead of rebuilding its label.
const under=JSON.parse(execFileSync('git',['show',`${evidence}:data/reviews/current/combo-football-surface/transfer-input.json`],{encoding:'utf8'})).rows[0];
rows.push({...under,front:'under',formation:'ace_11',flip:false,cached:{id:'DuoUnder',candidate:'under-candidate.json.gz',reference:'under-baseline.json.gz'}});
add('D04','A030','under','ace_11',true);
add('D05','A030','over','ace_11',false);
add('D06','A030','over','ace_11',true);
add('D07','A030','wide9','ace_trips_11',false);
add('D08','A030','wide9','ace_trips_11',true);
add('D09','A030','over','gun_doubles_11',false);
add('D10','A030','over','gun_doubles_11',true);
add('A018','A018','wide9','ace_11',false,{id:'A018',candidate:'candidate-controls.json.gz',reference:'current-a018.json.gz'});
add('D12','A018','wide9','ace_11',true);
add('A027','A027','wide9','ace_11',false,{id:'A027',candidate:'candidate-controls.json.gz',reference:'current.json.gz'},'wz_strong');
add('IZ','A030','under','ace_11',false,null,'iz_strong');
add('POWER','A030','over','ace_11',false,null,'power');
const flags=JSON.parse(readFileSync('config/baseline.json'));
const manifest={schema:'duo-transfer-inputs-v1',rows,accepted:'86250bb4f0c6f421878c204161864d523c3e30b6',
 reference:'7eb2554f5dbb497cff169f386704a5b0f4cf43fe',cachedEvidence:evidence,
 question:'Does improved Duo member admission transfer across fixed-roster front/orientation/formation changes, and which access/protection contracts generalize?',
 selection:'12 predeclared paired Duo cases: 3 nickel fronts, two native call orientations, Ace/trips/gun; two existing fixed capability lineups. A027 cached WZ, IZ and Power are descriptive mechanism contrasts only.',
 newNativeExecutions:20,maxSimulationSeconds:5,batchWallMs:30000,caseWallMs:5000,
 settings:{node:'22.23.3',flags:flags.flags,worldDefaults:flags.worldDefaults},
 judgments:['actual keeper protection through runner arrival','earned release and actual next-job hand load before runner arrival','runner speed/traffic/first defensive access','adverse and censored cases retained; no gain target'],
 limitations:['selected diagnostic subset, not a league sample','call flips are not perfectly mirrored players','no 12/21 personnel or odd/bear-front validation','execution draws can diverge after changed decisions','other schemes receive no Duo policy; native contrasts do not prove a transferable fix']};
const out='data/reviews/current/duo-transfer';mkdirSync(out,{recursive:true});
writeFileSync(out+'/inputs.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(({setup,cached,...r})=>({...r,cached:!!cached})),newNativeExecutions:20}));
