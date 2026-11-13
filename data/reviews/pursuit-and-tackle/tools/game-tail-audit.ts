/** Exact final calibrate 8/7/2 algorithm; copy existing logs and initial run metadata only. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {Rng} from './final-source/src/core/rng.js';
import {generateTeam,type Team} from './final-source/src/league/team.js';
import {simulateGame} from './final-source/src/game/game.js';
import {PlaySim} from './final-source/src/sim/playsim.js';
import {sourceVersion} from './final-source/scripts/source-version.js';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const output='/workspace/football-simulation-/out/tackle-breakthrough/games-final-tail-audit.json.gz';
const toolPath='/workspace/football-simulation-/out/tackle-breakthrough/game-tail-audit.ts';
const sourceBefore=sourceVersion();if(sourceBefore!=='8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942')throw Error('Wrong final archive');
const games=8,leagues=2,rng=new Rng(7),names=['Ironmen','Comets','Wolves','Rangers','Pilots','Barons','Hornets','Mariners'];
const makeLeague=(n:number):Team[]=>{const lr=rng.fork(`league-${n}`);return names.map(name=>{const tr=lr.fork(name);return generateTeam(tr,name,name.slice(0,3).toUpperCase(),{strength:tr.range(.35,.75)});});};
let teams=makeLeague(0),league=0;const perLeagueGames=Math.ceil(games/leagues),leagueInputs:any[]=[{league,teams:structuredClone(teams),rosterSha256:hash(teams)}];
const rows:any[]=[];const run=PlaySim.prototype.run;const inputs=new WeakMap<object,any>();let gameIndex=0,snapIndex=0;
PlaySim.prototype.run=function(...args:any[]){
 const input={gameIndex,nativeSnapIndex:snapIndex++,seed:this.rng.key,initialRng:{...this.rng},offCall:structuredClone(this.offCall),defCall:structuredClone(this.defCall),los:this.los,ballY:this.ballY,firstDownX:this.firstDownX,hurry:this.hurry,wind:{...this.wind},snapContext:structuredClone(this.snapContext),players:this.agents.map(a=>({slot:a.slot,team:a.team,id:a.player.id,energy:a.body.energy,profile:structuredClone(a.profile),initialPosition:{...a.pos},initialVelocity:{...a.vel}}))};
 const result=run.apply(this,args);inputs.set(result.stats,{...input,raw:{offenseYards:result.offenseYards,outcome:result.outcome,duration:result.duration,turnover:result.turnover}});return result;
};
const started=performance.now();
try{
 for(let g=0;g<games;g++){
  gameIndex=g;snapIndex=0;
  if(g>0&&g%perLeagueGames===0){league++;teams=makeLeague(league);leagueInputs.push({league,teams:structuredClone(teams),rosterSha256:hash(teams)});}
  const i=rng.int(0,teams.length-1);let j=rng.int(0,teams.length-2);if(j>=i)j++;
  const seed=rng.nextU32(),home=teams[i],away=teams[j];const beforeRosterSha256=hash([home,away]);const result=simulateGame(home,away,{seed});
  const log=result.log.map(p=>({...structuredClone(p),nativeInput:p.stats?inputs.get(p.stats)??null:null}));
  rows.push({gameIndex:g,league,seed,home:{id:home.id,name:home.name,abbr:home.abbr},away:{id:away.id,name:away.name,abbr:away.abbr},beforeRosterSha256,afterRosterSha256:hash([home,away]),score:{...result.score},log,quarterScores:result.quarterScores,signature:hash({score:result.score,log:result.log,quarterScores:result.quarterScores})});
  console.log(JSON.stringify({gameIndex:g,league,seed,home:home.abbr,away:away.abbr,score:result.score,runLog:log.filter(p=>p.kind==='run'&&!p.nullified).length,nativeInputMapped:log.filter(p=>!!p.nativeInput).length,elapsedSeconds:(performance.now()-started)/1000}));
 }
}finally{PlaySim.prototype.run=run;}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw Error('Source changed');
const report={schema:'full-game-tail-read-only-v1',sourceBefore,sourceAfter,toolSha256:createHash('sha256').update(readFileSync(toolPath)).digest('hex'),calibrateToolSha256:createHash('sha256').update(readFileSync('scripts/calibrate.ts')).digest('hex'),node:process.version,config:{games,seed:7,leagues,perLeagueGames,names},limits:['Exact calibration game/league/roster/seed selection; populations diverge across source phases and are not paired snaps.','Wrappers copy existing pre-run metadata and existing post-game logs; no extra see/RNG/behavior calls.','Native input metadata records effective calls/seed/energies, not complete original scouting or pre-audible constructor context; exact full-game replay uses game seed plus initial generated league.','Raw gain and official/nullified play-log yards differ; official stats follow existing calibrate filters.','Prior plain final aggregate will be checked to its printed precision; no duplicate eight-game full endpoint/RNG observer control.'],leagueInputs,rows,outerRng:{...rng},wallMs:performance.now()-started};
writeFileSync(output,gzipSync(JSON.stringify(report),{level:9}));console.log(JSON.stringify({output,sourceBefore,sourceAfter,games:rows.length,wallMs:report.wallMs},null,2));
