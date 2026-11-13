/** Root announces source freeze before this tool runs. A single exact retained
 * input, ordinary run(), all state/RNG observations passive. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {CENTER_Y} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {RUN_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {sourceVersion} from '../../scripts/source-version.js';
const output=process.argv[2]??'out/contact-follow-up/recovery-native-final.json.gz',expectedSource=process.argv[3];
if(!expectedSource)throw new Error('Supply the announced frozen whole-src SHA');
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),sourceBefore=sourceVersion();
if(sourceBefore!==expectedSource)throw new Error('Source differs from freeze');
function make(record:boolean){const o=generateTeam(new Rng(41),'Approach offense 2','O2',{strength:.55}),d=generateTeam(new Rng(42),'Approach defense 2','D2',{strength:.55}),formation=FORMATION_BY_ID.ace_11;
 return new PlaySim({offense:pickOffense(o,formation.personnel),defense:pickDefense(d,'base43'),
  offCall:{formation,flip:true,kind:'run',run:RUN_BY_ID.iz_strong,label:'TA-R2-iz_strong-over-L-S3'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,zoneStyle:'match',label:'TA-R2-iz_strong-over-L-S3'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3,audibles:false,record,recordLevel:'full',recordEvery:1});}
const body=(a:any)=>({idx:a.idx,slot:a.slot,pos:{...a.pos},vel:{...a.vel},support:structuredClone(a.body.support)});
const sig=(s:PlaySim,r:any)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,minds:s.agents.map(a=>a.mind),rng:{...s.rng}});
const sim=make(true),samples:any[]=[],choices:any[]=[],terminals:any[]=[],initial={profiles:sim.agents.map(a=>({team:a.team,slot:a.slot,id:a.player.id,profile:a.profile,ratings:a.player.ratings})),bodies:sim.agents.map(a=>structuredClone(a.body)),intents:structuredClone(sim.intents)};
const state=()=>({t:sim.t,worldTime:sim.world.time,phase:sim.phase,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,rng:{...sim.rng},bodies:sim.agents.map(body),
 bond:sim.bond?{start:sim.bond.start,stalled:sim.bond.stalled,carrier:sim.bond.carrier.idx,holders:sim.bond.tacklers.map(a=>({idx:a.idx,quality:sim.bond?.grip?.get(a),joint:(()=>{const j=sim.bond?.holds?.get(a);return j?{...j,a:undefined,b:undefined}:null;})()}))}:null});
const tick=sim.tick,chance=sim.rng.chance,finish=sim.finishCarry,whistle=sim.whistle;
sim.tick=function(){const pre=state(),e=this.events.length;const r=tick.call(this);samples.push({pre,post:state(),events:this.events.slice(e)});return r;};
sim.rng.chance=function(p){const before={...this},value=chance.call(this,p);choices.push({t:sim.t,p,value,before,after:{...this},stack:new Error().stack?.split('\n').slice(1,6)});return value;};
sim.finishCarry=function(kind,spot){terminals.push({entry:'finishCarry',kind,spot:{...spot},state:state(),stack:new Error().stack?.split('\n').slice(1,7)});return finish.call(this,kind,spot);};
sim.whistle=function(kind,spot){terminals.push({entry:'whistle',kind,spot:{...spot},state:state(),stack:new Error().stack?.split('\n').slice(1,7)});return whistle.call(this,kind,spot);};
const result=sim.run(),plain=make(false),control=plain.run(),observerVerified=sig(sim,result)===sig(plain,control);if(!observerVerified)throw new Error('Observer changes execution');
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw new Error('Source changed');
const report={schema:'native-recovery-follow-up-v1',sourceBefore,sourceAfter,toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 id:'TA-R2-iz_strong-over-L-S3',initial,initialSha256:hash(initial),profileSha256:hash(initial.profiles),observerVerified,
 definitions:{input:'Exact retained native TA-R2 Inside Zone/Over/left/seed3, roster41/42, ordinary controllers/full natural run. No recovery, fall, tackle or body state is injected.',
 observation:'Only current state, native chance() inputs/results/RNG before-after, actual tick/finish entrypoints. Every final result/body/intent/mind/RNG matches a plain unrecorded run.',
 limitations:'Final compound source can change early recognition and paths; compare causal repair on otherwise pinned source separately before attributing all native changes to recovery.'},
 result:{...result,frames:undefined,telemetry:undefined},samples,choices,terminals};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify(report),{level:9}));
console.log(JSON.stringify({sourceBefore,sourceAfter,id:report.id,output,observerVerified,outcome:result.outcome,yards:result.offenseYards,duration:result.duration,
 recoveries:result.events.filter(e=>e.type==='recovery'),terminals:terminals.map(t=>({entry:t.entry,kind:t.kind,t:t.state.t,carrier:t.state.carrier,
  body:t.state.carrier===null?null:t.state.bodies[t.state.carrier],bond:t.state.bond}))},null,2));
