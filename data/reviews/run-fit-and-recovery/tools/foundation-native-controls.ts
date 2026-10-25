/** Small declared metadata-only possession-channel guard. No extra see,
 * controller decision or RNG calls. Copy unchanged into scripts/diag/ in each
 * source archive and run from that archive's root. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const inputs = [
  {id:'FC-inside-zone', formation:'ace_11', concept:'iz_strong', personnel:'base43', coverage:'cover3', seed:3},
  {id:'FC-play-action', formation:'gun_doubles_11', concept:'pa_post_dig', personnel:'nickel', coverage:'cover4', seed:3},
  {id:'FC-dropback', formation:'gun_doubles_11', concept:'four_verts', personnel:'nickel', coverage:'cover3', seed:3},
  {id:'FC-pitch', formation:'i_pro_21', concept:'toss', personnel:'base43', coverage:'cover3', seed:3},
] as const;
const encode = (value: unknown) => JSON.stringify(value, (_key,v) => v instanceof Map ? {map:[...v]} : v instanceof Set ? {set:[...v]}
  : typeof v === 'number' && !Number.isFinite(v) ? String(v) : v);
const digest = (value: unknown) => createHash('sha256').update(encode(value)).digest('hex');
const sourceBefore=sourceVersion();
const profileSeeds=[31,32] as const;
const offense=generateTeam(new Rng(profileSeeds[0]),'Foundation offense','FO',{strength:.55});
const defense=generateTeam(new Rng(profileSeeds[1]),'Foundation defense','FD',{strength:.55});
const removeRecordedPossession = (value: unknown) => JSON.parse(JSON.stringify(value, (key,v)=>key==='carrying'?undefined:v));
const cases=inputs.map(input=>{
  const formation=FORMATION_BY_ID[input.formation],pass=PASS_BY_ID[input.concept];
  const sim=new PlaySim({offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,input.personnel),
    offCall:{formation,flip:false,kind:pass?'pass':'run',pass,run:pass?undefined:RUN_BY_ID[input.concept],label:input.id},
    defCall:{personnel:input.personnel,front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[input.coverage],pressure:null,zoneStyle:'match',label:input.id},
    seed:input.seed,los:40,ballY:CENTER_Y,firstDownX:50,record:true,recordLevel:'full',recordEvery:1,audibles:false});
  const initial={players:sim.agents.map(a=>({team:a.team,slot:a.slot,player:a.player,profile:a.profile})),
    bodies:sim.agents.map(a=>a.body),minds:sim.agents.map(a=>a.mind),intents:sim.intents,rng:sim.rng};
  const initialHash=digest(initial);
  const ticks:Array<{t:number;bodies:string;intents:string;minds:string;rng:string}>=[];
  const tick=sim.tick.bind(sim);
  sim.tick=()=>{tick();ticks.push({t:sim.t,bodies:digest(sim.agents.map(a=>a.body)),intents:digest(sim.intents),
    minds:digest(sim.agents.map(a=>a.mind)),rng:digest(sim.rng)});};
  const result=sim.run(),{telemetry,...plain}=result;
  return {input,initialHash,result:plain,resultHash:digest(plain),telemetryWithoutCarryingHash:digest(removeRecordedPossession(telemetry)),
    finalBodiesHash:digest(sim.agents.map(a=>a.body)),finalIntentsHash:digest(sim.intents),finalMindsHash:digest(sim.agents.map(a=>a.mind)),
    ticks,ticksHash:digest(ticks),nextRandom:sim.rng.nextU32(),
    knownCarryingEntries:telemetry?.frames.flatMap(f=>f.perception??[]).filter(p=>(p as {carrying?:unknown}).carrying!==undefined && (p as {carrying?:unknown}).carrying!==null).length??0};
});
const sourceAfter=sourceVersion();
if(sourceBefore!==sourceAfter)throw new Error('Source changed during collection');
const output=process.argv[2];
if(!output||process.argv.length!==3)throw new Error('Usage: foundation-native-controls.ts output.json');
writeFileSync(output,JSON.stringify({version:1,sourceBefore,sourceAfter,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  inputSha256:digest({inputs,profileSeeds,strength:.55,los:40,ballY:CENTER_Y,firstDownX:50,record:'full/every tick'}),
  scope:'Four predeclared native controls, not football calibration. Bodies/intents/SnapMinds/RNG copied after the existing tick, with no additional perception call. Only added telemetry carrying property excluded for metadata comparison.',cases},null,2)+'\n');
