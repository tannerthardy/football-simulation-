/** Exact scorecard seed7/game5 prefix: two scrimmage attempts, stop before the
 * third. Diagnoses carry-over between snaps; not an independent matched-pass
 * experiment. Queries are passthrough only; no additional senses or RNG.
 * node --import tsx scripts/diag/g1/pass-prefix.ts
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sourceVersion} from '../../source-version.js';
import {engineSettings} from '../../scorecard/provenance.js';
import {simulateGame} from '../../../src/game/game.js';
import {gameSpecs,makeLeague} from '../../../scripts/scorecard/records.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
const spec=gameSpecs(7,6,2)[5],teams=makeLeague(7,spec.league),rows:unknown[]=[];
const stop={};let index=0;
try{simulateGame(teams[spec.home],teams[spec.away],{seed:spec.seed,record:false,hooks:{playResult(sim,kind){
 if(kind!=='scrimmage')return;
 if(index>=2)throw stop;
 const initial=sim.agents.map(a=>({idx:a.idx,id:a.player.id,energy:a.body.energy,mindRng:JSON.stringify((a.mind as any).rng)}));
 const seen:unknown[]=[],requests:unknown[]=[];
 const see=sim.see.bind(sim);sim.see=(observer,target,...rest)=>{const cue=see(observer,target,...rest);
  if(observer.team==='D'&&(observer.runFit?.kind==='interior'||observer.runFit?.kind==='edge')&&(target===sim.qb||target.slot==='RB'))seen.push({t:sim.t,observer:observer.idx,target:target.idx,cue:structuredClone(cue)});
  return cue;
 };
 runContactObservers.set(sim,(rep,phase,data)=>{if(phase==='defender-movement')requests.push({t:sim.t,defender:rep.defender.idx,blocker:rep.blocker.idx,runFit:rep.defender.runFit,recog:structuredClone(rep.defender.recog),qb:{...sim.qb.pos},ball:sim.ball.kind,throwAt:sim.throwAt,data:structuredClone(data)});});
 const result=sim.run();rows.push({initial,finalEnergy:sim.agents.map(a=>({idx:a.idx,id:a.player.id,energy:a.body.energy})),index:index++,los:sim.los,call:sim.offCall,coverage:sim.defCall,actors:sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,runFit:a.runFit})),events:result.events,result:{yards:result.offenseYards,stats:result.stats,outcome:result.outcome,duration:result.duration},seen,requests});
 runContactObservers.delete(sim);return result;
}}});}catch(e){if(e!==stop)throw e;}
mkdirSync('out/g1/current',{recursive:true});
writeFileSync('out/g1/current/pass-prefix.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engineSha256:sourceVersion(),settings:engineSettings(process.env),spec,rows}));
console.log(rows.map((r:any)=>({index:r.index,yards:r.result.yards,outcome:r.result.outcome,call:r.call.label,throwAt:r.events.find((e:any)=>e.type==='throw')?.t,requests:r.requests.length})));
