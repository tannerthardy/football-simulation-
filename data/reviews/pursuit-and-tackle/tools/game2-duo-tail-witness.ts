/** Reproduce only exact game2; observe one previously selected untouched Duo tail. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {simulateGame} from './final-source/src/game/game.js';
import {sourceVersion} from './final-source/scripts/source-version.js';
const base='/workspace/football-simulation-/out/tackle-breakthrough/';
const old=JSON.parse(gunzipSync(readFileSync(base+'games-final-tail-audit.json.gz')).toString());
const game=old.rows.find((g:any)=>g.gameIndex===2),teams=old.leagueInputs.find((l:any)=>l.league===game.league).teams;
const home=teams.find((t:any)=>t.id===game.home.id),away=teams.find((t:any)=>t.id===game.away.id);
const sourceBefore=sourceVersion();if(sourceBefore!==old.sourceBefore)throw Error('Wrong source');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
if(hash([home,away])!==game.beforeRosterSha256)throw Error('Starting roster mismatch');
const targetSeed=3438958840,samples:any[]=[],pictures:any[]=[];let targetResult:any=null,initial:any=null;
const result=simulateGame(home,away,{seed:game.seed,hooks:{playResult(sim:any){
 if(sim.rng.key!==targetSeed)return sim.run();
 const state=(a:any)=>({slot:a.slot,team:a.team,id:a.player.id,pos:{...a.pos},vel:{...a.vel},facing:a.facing,energy:a.body.energy,job:a.behavior.kind,target:a.behavior.target?.slot??a.behavior.plan?.target?.slot??null,fit:a.runFit?{...a.runFit}:null,read:a.recog?.read??null,focus:a.mind.focus,stress:a.mind.stress,stance:a.stance,engagement:a.engagement?{blocker:a.engagement.blocker.slot,defender:a.engagement.defender.slot,helpers:a.engagement.helpers.map((x:any)=>x.slot),win:a.engagement.win,phi:a.engagement.phi,control:a.engagement.control,load:a.engagement.hands?.normalForce??0}:null,support:structuredClone(a.body.support),tags:[...a.tags]});
 initial={seed:sim.rng.key,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,offCall:structuredClone(sim.offCall),defCall:structuredClone(sim.defCall),snapContext:{...sim.snapContext},agents:sim.agents.map(state)};
 const step=sim.world.step,see=sim.see;
 sim.see=function(a:any,b:any,scale=1){const pic=see.call(this,a,b,scale);if(a.team==='D'&&(b.slot==='RB'||b.slot==='QB'))pictures.push({t:sim.t,observer:a.slot,target:b.slot,scale,picture:structuredClone(pic)});return pic;};
 sim.world.step=function(intents:any,dt:number){const before={t:sim.t,worldTime:sim.world.time,carrier:sim.carrier?.slot,ball:sim.ball.kind,agents:sim.agents.map(state),intents:structuredClone(intents)};const report=step.call(this,intents,dt);samples.push({...before,after:sim.agents.map(state),contacts:structuredClone(report.contacts),firstContactX:sim.firstContactX});return report;};
 try{targetResult=sim.run();return targetResult;}finally{sim.world.step=step;sim.see=see;}
}}});
const signature=hash({score:result.score,log:result.log,quarterScores:result.quarterScores});if(signature!==game.signature)throw Error('Observer changed complete game log');
if(!targetResult)throw Error('Target seed never reached');const prior=game.log.find((p:any)=>p.nativeInput?.seed===targetSeed);const raw={offenseYards:targetResult.offenseYards,outcome:targetResult.outcome,duration:targetResult.duration,turnover:targetResult.turnover};if(hash(raw)!==hash(prior.nativeInput.raw))throw Error('Raw target result mismatch');
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw Error('Source changed');
const report={schema:'game-run-tail-native-witness-v1',sourceBefore,sourceAfter,toolSha256:createHash('sha256').update(readFileSync(base+'game2-duo-tail-witness.ts')).digest('hex'),inputFileSha256:createHash('sha256').update(readFileSync(base+'games-final-tail-audit.json.gz')).digest('hex'),gameIndex:2,gameSeed:game.seed,targetSeed,initial,result:{...targetResult,frames:undefined,telemetry:undefined},samples,pictures,completeGameLogMatches:true,rawTargetResultMatches:true,limits:['Outcome-selected witness, not a football rate.','Only actually consumed QB/RB pictures copied; no extra cues or RNG requests.','Game-log/raw-result neutrality verified; full hidden final game RNG/body state not exported by GameResult.']};
writeFileSync(base+'game2-duo-tail-witness.json.gz',gzipSync(JSON.stringify(report)));console.log(JSON.stringify({sourceBefore,sourceAfter,gameIndex:2,gameSeed:game.seed,targetSeed,completeGameLogMatches:true,rawTargetResultMatches:true,raw,samples:samples.length,pictures:pictures.length},null,2));
