/** Trace selected clips on their exact film source, or replay saved isolated setups.
 * node --import tsx scripts/diag/owner-film.ts out/owner-film.json viewer/film-room.html
 * node --import tsx scripts/diag/owner-film.ts out/owner-reps.json --reps out/owner-film.json
 * Isolated setups omit game scouting/audibles and must not be called original clips.
 */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Rng} from '../../src/core/rng.js';
import {simulateGame} from '../../src/game/game.js';
import {generateTeam} from '../../src/league/team.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import type {Frame} from '../../src/sim/types.js';
import type {MoveCommand} from '../../src/physics/kinematics.js';
import {ManCoverage} from '../../src/sim/behaviors/defense.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {CoverageDefender} from '../../src/sim/coverage/defender.js';
import {showsBlock} from '../../src/sim/coverage-cues.js';
import {packReplayPlay} from '../replay-data.js';
import {sourceVersion} from '../source-version.js';

const out=process.argv[2]??'out/owner-film.json',sourceSha256=sourceVersion();
const repsArg=process.argv.indexOf('--reps');
type SavedSetup=Omit<PlaySetup,'energy'|'seed'> & {seed:number;energy:[string,number][]};
interface Clip {id:string;game:number;kind:string;los:number;plan:{formation:string};frames:unknown[]}
const wanted=new Set(['G2-P031','G6-P166','G3-P056','G4-P042','G6-P121','G6-P133','G2-P081']);

function trace(sim:PlaySim){
  // The game caller's only current shadow override is CB_S on WR1. Keep
  // that resolved target when replaying the isolated setup; otherwise a
  // replay would silently remove the mismatch this trace is investigating.
  const shadow=sim.defAlign.spots.CB_S?.manTarget;
  const setup:SavedSetup={offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),
    defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),offCall:sim.offCall,defCall:sim.defCall,
    los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,record:true,recordEvery:1,
    down:sim.snapContext.down,hurry:sim.hurry,wind:sim.wind,manPrefs:shadow?{overrides:{CB_S:shadow}}:undefined,
    energy:sim.agents.map(a=>[a.player.id,a.body.energy])};
  const bodies=sim.agents.map(a=>({slot:a.slot,team:a.team,profile:a.profile,
    ratings:{vision:a.r('vision'),elusiveness:a.r('elusiveness'),manCoverage:a.r('manCoverage'),tackling:a.r('tackling')},
    alignment:a.team==='D'?sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots]:undefined}));
  const rows:unknown[]=[];const tick=sim.tick.bind(sim);
  sim.tick=()=>{
    const t=sim.t,events=sim.events.length,ball=sim.ball.kind,carrier=sim.carrier?.slot;
    const before=sim.agents.map(a=>{
      const target=a.behavior instanceof ManCoverage?a.behavior.target:a.behavior instanceof CoverageDefender?a.behavior.target:null;
      return {pos:{...a.pos},vel:{...a.vel},facing:a.facing,behavior:a.behavior.kind,
        target:target?.slot,job:a.behavior instanceof CoverageDefender?a.behavior.job:undefined,
        targetCue:target?sim.see(a,target):undefined,blockingLook:target?showsBlock(a,sim,target):undefined,
        read:a.recog?.read,readLogOdds:a.recog?.logOdds,
        blocker:a.behavior instanceof RunBlocker?{kind:a.behavior.plan.kind,target:a.behavior.target?.slot,drive:a.behavior.plan.drive}:undefined};
    });
    tick();
    const commands=(sim as unknown as {cmds:MoveCommand[]}).cmds;
    rows.push({t,ball,carrier,throwAt:sim.throwAt,catchAt:sim.catchAt,
      agents:sim.agents.map((a,i)=>({...before[i],after:{...a.pos},afterVel:{...a.vel},command:commands[i],intent:sim.intents[i],
        support:a.body.support?{state:a.body.support.state,xi:a.body.support.xi,peak:a.body.support.peak,cause:a.body.support.cause}:null,
        engagement:a.engagement?{blocker:a.engagement.blocker.slot,defender:a.engagement.defender.slot}:null})),
      contacts:sim.lastStep?.contacts,falls:sim.lastStep?.falls,workResidual:sim.lastStep?.work.residual,
      events:sim.events.slice(events)});
  };
  const result=sim.run();
  return {setup,bodies,rows,events:result.events,result:{outcome:result.outcome,yards:result.yards,stats:result.stats}};
}
const clips:Record<string,ReturnType<typeof trace>>={};
let filmSha:string|undefined;
if(repsArg>=0){
  const saved=JSON.parse(readFileSync(process.argv[repsArg+1],'utf8')) as {clips:Record<string,{setup:SavedSetup}>};
  for(const [id,{setup}] of Object.entries(saved.clips))clips[id]=trace(new PlaySim({...setup,energy:new Map(setup.energy)}));
}else{
  const filmPath=process.argv[3]??'viewer/film-room.html';
  const film=JSON.parse(readFileSync(filmPath,'utf8').split('const REPLAY = ')[1].split(';\n')[0]) as {meta:{sourceSha256:string};plays:Clip[]};
  filmSha=film.meta.sourceSha256;
  if(filmSha!==sourceSha256)throw new Error('Reproduce the engine source of the supplied film before tracing old IDs');
  const rng=new Rng(7),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
  for(let game=0;game<6;game++){
    const references=film.plays.filter(p=>wanted.has(p.id)&&p.game===game);
    const traces=new Map<Frame[],ReturnType<typeof trace>>();
    const result=simulateGame(home,away,{seed:7+game,record:true,hooks:{playResult(sim,kind){
      if(kind!=='scrimmage'||!references.some(p=>p.kind===sim.offCall.kind&&p.plan.formation===sim.offCall.formation.id&&Math.abs(p.los-sim.los)<1e-5))return undefined;
      const traced=trace(sim);traces.set(sim.frames,traced);return sim.buildResult();
    }}});
    for(const play of result.log){
      const id=`G${game+1}-P${String(play.index+1).padStart(3,'0')}`;
      if(!wanted.has(id))continue;
      const reference=references.find(p=>p.id===id),packed=packReplayPlay(play,game);
      if(!reference||!('frames' in packed)||JSON.stringify(packed.frames)!==JSON.stringify(reference.frames))throw new Error(`Film path mismatch: ${id}`);
      const traced=traces.get(play.replay!.frames);if(!traced)throw new Error(`Missing trace: ${id}`);clips[id]=traced;
    }
    console.log(`Verified game ${game+1}`);
  }
  if(Object.keys(clips).length!==wanted.size)throw new Error('Missing owner clip');
}
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256,filmSourceSha256:filmSha,
  mode:repsArg>=0?'isolated saved setups, not original game contexts; serialized pressure/call objects stay fixed, CB_S shadow restored':'original games; selected packed film paths verified exactly',clips},null,2)+'\n');
console.log(`Wrote ${Object.keys(clips).length} traces to ${out}`);
