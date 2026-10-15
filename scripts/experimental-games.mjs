/** Bounded user-requested checkpoint. Each declared full game executes once.
 * prepare INPUT; run INPUT ID ARM OUT. Reporting/film never reruns simulation.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {Rng} from '../src/core/rng.ts';
import {generateTeam} from '../src/league/team.ts';
import {Game} from '../src/game/game.ts';
import {packReplayPlay} from './replay-data.ts';
import {compactReplayPlays} from './replay-telemetry-packing.ts';
import {sourceVersion} from './source-version.ts';

const [mode,input,id,arm,out]=process.argv.slice(2);
const hash=x=>createHash('sha256').update(x).digest('hex');
const jsonHash=x=>hash(JSON.stringify(x));
const fileHash=p=>hash(readFileSync(p));
const base='a1b16e666a9ee7d1bc1d2aecba141fc535863b24';
const baseSource='e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54';
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const save=(p,x)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(x,null,2)+'\n');};
if(mode==='prepare'){
  assert.ok(input&&!existsSync(input),'Prepare must not overwrite a manifest');
  const declarations=[
    {id:'zone-reference',rosterSeeds:[31,32],seed:701,home:['wide-zone','4-3'],away:['west-coast','nickel-heavy'],scope:'Known Ace roster seeds; normal full-game coaching and fatigue.'},
    {id:'spread-air',rosterSeeds:[27101,27102],seed:702,home:['spread','3-4'],away:['air-raid','nickel-heavy'],scope:'Fresh spread and pass-heavy offenses.'},
    {id:'power-zone',rosterSeeds:[28101,28102],seed:703,home:['power','4-3'],away:['wide-zone','3-4'],scope:'Fresh power and wide-zone with odd/even defenses.'},
    {id:'west-spread',rosterSeeds:[29101,29102],seed:704,home:['west-coast','nickel-heavy'],away:['spread','4-3'],scope:'Fresh short passing and spread offenses.'},
  ];
  const fixtures=declarations.map((d,i)=>{
    const home=generateTeam(new Rng(d.rosterSeeds[0]),`Checkpoint Home ${i+1}`,`H${i+1}`,{strength:.55,offScheme:d.home[0],defScheme:d.home[1]});
    const away=generateTeam(new Rng(d.rosterSeeds[1]),`Checkpoint Away ${i+1}`,`A${i+1}`,{strength:.55,offScheme:d.away[0],defScheme:d.away[1]});
    return {...d,teamsSha256:jsonHash({home,away}),teams:{home,away}};
  });
  save(input,{schema:'experimental-game-inputs-v1',preparedBeforeOutcomes:true,acceptedDevelop:base,historicalComparison:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',sources:{accepted:baseSource,experimental:sourceVersion()},node:'v22.23.3',flags:profile.flags,worldDefaults:profile.worldDefaults,strength:.55,fixtures,budget:{gamesPerArm:4,totalGames:8,maxGameSeconds:240,maxCombinedGameSeconds:1200,maxGameSteps:600},settings:{record:true,recordLevel:'standard',handContact:'center',rules:'unchanged regular season, including native overtime'},question:'What does the supported recent run/information/Stick stack achieve across four fixed full-game matchups versus accepted develop? Exploratory checkpoint, not league certification or isolated mechanism attribution.'});
  console.log(JSON.stringify({input,fixtures:fixtures.length,players:fixtures.reduce((n,f)=>n+f.teams.home.roster.length+f.teams.away.roster.length,0),simulations:0}));
}else if(mode==='run'){
  assert.ok(input&&id&&['accepted','experimental'].includes(arm)&&out,'INPUT ID accepted|experimental OUT required');
  const manifest=JSON.parse(readFileSync(input,'utf8')),fixture=manifest.fixtures.find(f=>f.id===id);
  assert.ok(fixture,'Unknown predeclared game');assert.equal(process.version,manifest.node);
  assert.deepEqual(flags,manifest.flags);assert.equal(Object.keys(flags).length,44);assert.equal(flags.RUN_CONTACT_COMPONENTS,'1');
  assert.equal(sourceVersion(),manifest.sources[arm]);assert.deepEqual(profile.worldDefaults,manifest.worldDefaults);
  assert.equal(jsonHash(fixture.teams),fixture.teamsSha256);
  const destination=join(out,arm,id);assert.ok(!existsSync(join(destination,'summary.json')),'Never repeat/overwrite a completed game');
  assert.ok(!existsSync(join(destination,'started.json')),'A previous attempt exists; inspect it before resuming');
  mkdirSync(destination,{recursive:true});
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const provenance={commit,sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),inputSha256:fileHash(input),fixtureSha256:jsonHash(fixture),teamsSha256:fixture.teamsSha256,profileSha256:fileHash('config/baseline.json'),lockSha256:fileHash('package-lock.json'),flags,worldDefaults:profile.worldDefaults,node:process.version,platform:process.platform,arch:process.arch,startedAt:new Date().toISOString(),arm,id,gameSeed:fixture.seed};
  save(join(destination,'started.json'),provenance);
  const {home,away}=structuredClone(fixture.teams),observations=[];
  // Read only completed World reports. No extra sensing, decisions, forces or RNG.
  const observe=(sim,kind)=>{
    const row={kind,seedState:structuredClone(sim.rng),call:structuredClone(sim.offCall),defense:structuredClone(sim.defCall),initialPlayers:sim.agents.map(a=>({idx:a.idx,id:a.player.id,listedPosition:a.player.position,slot:a.slot,team:a.team,energy:a.body.energy,vmax:a.profile.vmax,massKg:a.profile.massKg,brake:a.profile.brake,balance:a.profile.balance})),worldSteps:0,teammateContacts:[],teammateImpulse:0};
    observations.push(row);const step=sim.world.step.bind(sim.world);
    sim.world.step=(intents,dt)=>{
      const report=step(intents,dt);row.worldSteps++;
      for(const c of report.contacts){
        const a=sim.agents[c.i],b=sim.agents[c.j];
        if(a.team===b.team&&c.impulse>1e-8){row.teammateImpulse+=c.impulse;row.teammateContacts.push({t:sim.t+dt,i:c.i,j:c.j,slots:[a.slot,b.slot],team:a.team,impulse:c.impulse});}
      }
      return report;
    };
    return undefined;
  };
  const game=new Game(home,away,{seed:fixture.seed,record:true,recordLevel:'standard',hooks:{playResult:observe}});
  const start=performance.now();let steps=0;
  game.kickoffToStart();
  try{
    while(!game.state.over){
      assert.ok(steps<manifest.budget.maxGameSteps,'Game step budget exhausted');
      assert.ok(performance.now()-start<manifest.budget.maxGameSeconds*1000,'Game wall budget exhausted');
      game.step();steps++;
      if(steps%20===0)console.log(JSON.stringify({progress:true,arm,id,steps,quarter:game.state.quarter,clock:game.state.clock,score:game.state.score,elapsedSeconds:(performance.now()-start)/1000}));
    }
  }catch(error){
    save(join(destination,'failed.json'),{provenance,complete:false,state:game.state,steps,elapsedSeconds:(performance.now()-start)/1000,error:String(error)});throw error;
  }
  const elapsedSeconds=(performance.now()-start)/1000,result=game.result();
  assert.equal(jsonHash({home,away}),fixture.teamsSha256,'Game mutated frozen teams');
  assert.equal(sourceVersion(),provenance.sourceSha256);assert.equal(fileHash(input),provenance.inputSha256);
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
  for(const p of result.log)for(const f of p.replay?.frames??[]){
    assert.ok(Number.isFinite(f.t)&&f.agents.length===66&&[...f.agents,...f.ball].every(Number.isFinite),'Nonfinite/malformed native film');
  }
  const packed=result.log.map(p=>packReplayPlay(p,0)),quarters=[...result.quarterScores];
  if(!quarters.length||jsonHash(quarters.at(-1))!==jsonHash(result.score))quarters.push({...result.score});
  const meta={title:`${arm==='experimental'?'Experimental':'Accepted develop'} · ${id}`,seed:fixture.seed,final:result.score,quarters,sourceSha256:provenance.sourceSha256,telemetryLevel:'standard',home:{name:home.name,abbr:home.abbr,color:'#1d4f91',text:'#ffffff'},away:{name:away.name,abbr:away.abbr,color:'#a3302a',text:'#ffffff'}};
  const catalog={coverage:{},front:{},formation:{}};
  for(const p of result.log){if(p.plan?.coverage)catalog.coverage[p.plan.coverage]=p.plan.coverage;if(p.plan?.front)catalog.front[p.plan.front]=p.plan.front;if(p.plan?.formation)catalog.formation[p.plan.formation]=p.plan.formation;}
  const film={meta,games:[{seed:fixture.seed,final:result.score,quarters}],plays:compactReplayPlays(packed),catalog};
  const template=readFileSync('viewer/replay.template.html','utf8'),marker='/*__REPLAY_DATA__*/null';assert.ok(template.includes(marker));
  writeFileSync(join(destination,'film.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'+template.replace(marker,()=>JSON.stringify(film).replace(/<\//g,'<\\/'))+'\n</body></html>\n');
  const teams=[home,away].map(t=>({abbr:t.abbr,name:t.name,scheme:t.offScheme,defScheme:t.defScheme,coach:t.coach,box:result.box.team(t.abbr),players:result.box.teamPlayers(t.abbr)}));
  const log=result.log.map(({replay,...p})=>({...p,filmFrames:replay?.frames.length??0,events:replay?.events}));
  const raw={schema:'experimental-full-game-v1',provenance,complete:game.state.over,finalState:game.state,score:result.score,quarters,teams,log:result.log,observations,elapsedSeconds,steps};
  writeFileSync(join(destination,'game.json.gz'),gzipSync(JSON.stringify(raw)));
  const summary={schema:raw.schema,provenance,complete:raw.complete,finalState:game.state,score:result.score,quarters,teams,log,elapsedSeconds,steps,filmedPlays:packed.filter(p=>'frames'in p).length,teammateContacts:observations.reduce((n,o)=>n+o.teammateContacts.length,0),teammateImpulse:observations.reduce((n,o)=>n+o.teammateImpulse,0),physicalScrimmages:observations.length,worldSteps:observations.reduce((n,o)=>n+o.worldSteps,0),artifacts:['game.json.gz','film.html'].map(p=>({path:p,sha256:fileHash(join(destination,p))}))};
  save(join(destination,'summary.json'),summary);
  console.log(JSON.stringify({complete:true,arm,id,score:result.score,steps,filmedPlays:summary.filmedPlays,elapsedSeconds,artifactSeconds:(performance.now()-start)/1000-elapsedSeconds}));
}else throw Error('Use prepare INPUT or run INPUT ID ARM OUT');
