/** Reconstruct one recorded native snap without replaying a game prefix. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ScoutingReport} from '../../src/sim/recognition.ts';
import {CoverageScouting} from '../../src/sim/qbmind.ts';
import {overallAt} from '../../src/players/roles.ts';
import {CENTER_Y,HASH_LEFT_Y,HASH_RIGHT_Y} from '../../src/core/field.ts';

const manifest=JSON.parse(readFileSync('data/reviews/current/experimental-game-inputs.json'));
const games=new Map();
const prefixPath='out/exchange-repair/prefix-trace.json.gz';
const prefix=existsSync(prefixPath)?JSON.parse(gunzipSync(readFileSync(prefixPath))):null;
export function savedNativePlay(id,index){
 if(!games.has(id))games.set(id,JSON.parse(gunzipSync(readFileSync(
  `data/reviews/current/experimental-game-checkpoint/experimental/${id}/game.json.gz`))));
 const game=games.get(id),fixture=manifest.fixtures.find(f=>f.id===id);
 const players=new Map(Object.values(fixture.teams).flatMap(t=>t.roster).map(p=>[p.id,p]));
 const reports=Object.fromEntries(Object.keys(fixture.teams).map(s=>[s,{scout:new ScoutingReport(),coverage:new CoverageScouting()}]));
 let j=0;
 for(const play of game.log){
  if(!play.replay)continue;
  const o=game.observations[j++];assert.equal(o.call.label,play.call);
  const side=play.offense===fixture.teams.home.abbr?'home':'away',other=side==='home'?'away':'home';
  const hurry=(play.quarter===2&&play.clock<=120)||(play.quarter>=4&&play.clock<=240&&play.score[side]<play.score[other])
   ||(play.quarter>=4&&play.clock<=600&&play.score[side]-play.score[other]<=-12);
  if(play.index===index){
   assert(!play.plan.audible,'An audible needs its original pre-check call');
   const offense=Object.fromEntries(o.initialPlayers.filter(a=>a.team==='O').map(a=>[a.slot,players.get(a.id)]));
   const defense=Object.fromEntries(o.initialPlayers.filter(a=>a.team==='D').map(a=>[a.slot,players.get(a.id)]));
   const prefs={};
   if(o.defense.coverage.man&&fixture.teams[other].coach.shadow){
    const wr=Object.entries(offense).filter(([,p])=>p.position==='WR').sort((a,b)=>overallAt(b[1])-overallAt(a[1]))[0];
    if(wr)prefs.overrides={CB_S:wr[0]};
   }
   const roundedY=play.replay.frames.find(f=>f.t===0).ball[1];
   const center=o.initialPlayers.find(a=>a.slot==='C').idx;
   // The center's installed home lane equals ballY (outside=0); telemetry
   // preserves this public landmark at full precision, even between hashes.
   const lane=play.replay.telemetry.frames.find(f=>f.agents[center].passSet)?.agents[center].passSet.laneY;
   const precise=lane??prefix?.traces.find(t=>id==='spread-air'&&t.index===index)?.ticks[0]?.actors.find(a=>a.slot==='QB')?.pos.y;
   const ballY=precise??[CENTER_Y,HASH_LEFT_Y,HASH_RIGHT_Y].sort((a,b)=>Math.abs(a-roundedY)-Math.abs(b-roundedY))[0];
   assert(Math.abs(roundedY-ballY)<.051);
   const setup={offense,defense,offCall:structuredClone(o.call),defCall:structuredClone(o.defense),
    los:play.replay.los,ballY,firstDownX:play.replay.firstDownX,seed:o.seedState.key,
    energy:new Map(o.initialPlayers.map(a=>[a.id,a.energy])),manPrefs:prefs,hurry,down:play.down,audibles:true,
    scouting:reports[other].scout,coverageScouting:reports[side].coverage,record:true,recordLevel:'full'};
   // Recorded energies follow staging. Invert the deterministic constructor's
   // small staging cost rather than applying that fatigue a second time.
   let sim,error=Infinity,iterations=0;
   for(;iterations<8;iterations++){
    sim=new PlaySim(setup);
    const errors=sim.agents.map((a,i)=>o.initialPlayers[i].energy-a.body.energy);
    error=Math.max(...errors.map(Math.abs));if(error<1e-14)break;
    for(const a of sim.agents)setup.energy.set(a.player.id,setup.energy.get(a.player.id)+errors[a.idx]);
   }
   assert(error<1e-14);assert.deepEqual({...sim.rng},o.seedState);
   return {sim,play,observation:o,setup,initialization:{error,iterations,seed:o.seedState.key,ballY,
    ballYSource:lane!==undefined?'recorded center installed pass-set lane':precise===undefined?'recorded hash landmark':'saved full prefix first-tick QB coordinate',
    call:setup.offCall,defense:setup.defCall,energy:[...setup.energy],manPrefs:prefs,hurry,
    scouting:{...setup.scouting,cells:[...setup.scouting.cells]},coverageScouting:{...setup.coverageScouting}}};
  }
  reports[other].scout.observe({down:play.down,distance:play.distance,yardline:play.yardline,
   personnel:o.call.formation.personnel,qb:o.call.formation.qb,empty:!o.call.formation.slots.RB,hurry},o.call.kind==='pass');
  if(o.call.kind==='pass')reports[side].coverage.observe(o.defense);
 }
 throw Error(`No saved native play ${id}:${index}`);
}
