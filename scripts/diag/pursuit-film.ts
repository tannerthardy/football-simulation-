/** Source-pinned owner-film trace; does not change decisions or random draws.
 * node --import tsx scripts/diag/pursuit-film.ts out/pursuit-film.json
 * Trace all passes, retain only selected clips, and verify their packed paths
 * against the existing film before attributing an observation to this source.
 */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Rng} from '../../src/core/rng.js';
import {simulateGame} from '../../src/game/game.js';
import {generateTeam} from '../../src/league/team.js';
import type {PlaySim} from '../../src/sim/playsim.js';
import type {Frame} from '../../src/sim/types.js';
import type {MoveCommand} from '../../src/physics/kinematics.js';
import {packReplayPlay} from '../replay-data.js';
import {sourceVersion} from '../source-version.js';

const out=process.argv[2]??'out/pursuit-film.json';
const filmPath=process.argv[3]??'viewer/film-room.html';
const text=readFileSync(filmPath,'utf8');
const film=JSON.parse(text.split('const REPLAY = ')[1].split(';\n')[0]);
const sourceSha256=sourceVersion();
const ownerSourceSha256='92eb1ea66cfffd94732d7eb2dc8132212a135fdf8a2cf17a595f7d1674632e63';
if(sourceSha256!==ownerSourceSha256)throw new Error('These owner clip IDs belong to 2c2c250; run from its archived source and film');
if(film.meta.sourceSha256!==sourceSha256)throw new Error('Trace the source used by the supplied film before editing it');
const wanted=new Set(['G4-P135','G5-P106','G6-P053','G6-P096']);

function trace(sim:PlaySim){
  const agents=sim.agents.map(a=>({slot:a.slot,team:a.team,profile:a.profile,
    ratings:{pursuit:a.r('pursuit'),tackling:a.r('tackling'),awareness:a.r('awareness')}}));
  const rows:unknown[]=[];
  const tick=sim.tick.bind(sim);
  sim.tick=()=>{
    const carrier=sim.carrier,t=sim.t;
    const before=sim.agents.map(a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,
      state:a.body.support?.state,behavior:a.behavior.kind}));
    const events=sim.events.length;
    tick();
    if(sim.catchAt<0)return;
    const commands=(sim as unknown as {cmds:MoveCommand[]}).cmds;
    rows.push({t,carrier:(carrier??sim.carrier)?.idx,
      agents:sim.agents.map((a,i)=>({...before[i],after:{...a.pos},afterVel:{...a.vel},
        command:commands[i],intent:sim.intents[i],
        support:a.body.support?{state:a.body.support.state,xi:a.body.support.xi,peak:a.body.support.peak,
          cause:a.body.support.cause,lean:a.body.support.lean,feetLock:a.body.support.feetLock}:null,
        engagement:a.engagement?{blocker:a.engagement.blocker.idx,defender:a.engagement.defender.idx}:null,
        nextTackleAt:a.nextTackleAt})),
      contacts:sim.lastStep?.contacts,falls:sim.lastStep?.falls,
      workResidual:sim.lastStep?.work.residual,events:sim.events.slice(events)});
  };
  const result=sim.run();
  return {agents,rows,events:result.events,result:{outcome:result.outcome,yards:result.yards}};
}

const rng=new Rng(7),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
const clips:Record<string,unknown>={};
for(let game=0;game<6;game++){
  const traces=new Map<Frame[],ReturnType<typeof trace>>();
  const result=simulateGame(home,away,{seed:7+game,record:true,hooks:{playResult(sim){
    if(sim.offCall.kind!=='pass')return undefined;
    const traced=trace(sim);traces.set(sim.frames,traced);return sim.buildResult();
  }}});
  for(const play of result.log){
    const id=`G${game+1}-P${String(play.index+1).padStart(3,'0')}`;
    if(!wanted.has(id))continue;
    const reference=film.plays.find((p:{id:string})=>p.id===id),packed=packReplayPlay(play,game);
    if(!reference||!('frames' in packed)||JSON.stringify(packed.frames)!==JSON.stringify(reference.frames))
      throw new Error(`Film path mismatch for ${id}`);
    const traced=traces.get(play.replay!.frames);
    if(!traced)throw new Error(`Missing pass trace ${id}`);
    clips[id]={call:play.call,defense:play.defense,...traced};
  }
  console.log(`Verified/traced game ${game+1}`);
}
if(Object.keys(clips).length!==wanted.size)throw new Error('Missing owner clip');
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256,filmPath,
  note:'Original game contexts, unmodified decisions/random draws; selected packed film paths verified exactly. Post-catch states at 20 Hz. Diagnostics use actual state only after commands are executed.',clips},null,2)+'\n');
console.log(`Saved ${Object.keys(clips).length} source-verified clips to ${out}`);
