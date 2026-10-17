/** Reconstruct a saved snap from explicit rosters, calls, snap key and prior
 * scouting. Report native prefix fidelity; do not assume full-state restoration. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PlaySim} from '../../../src/sim/playsim.js';
import {ScoutingReport} from '../../../src/sim/recognition.js';
import {CoverageScouting} from '../../../src/sim/qbmind.js';
export function makeSaved(c:any):PlaySim {
 const o=c.observation,s=o.gameState,scouting=new ScoutingReport(),coverage=new CoverageScouting();
 for(const p of c.history){
  if(p.possession===s.possession)scouting.observe(p.context,p.pass);
  else if(p.pass)coverage.observe(p.defense);
 }
 const diff=s.score[s.possession]-s.score[s.possession==='away'?'home':'away'];
 const hurry=(s.quarter===2&&s.clock<=120)||(s.quarter>=4&&s.clock<=240&&diff<0)||(s.quarter>=4&&s.clock<=600&&diff<=-12);
 const lineup=(side:string)=>Object.fromEntries(o.initialPlayers.filter((a:any)=>a.team===side).map((a:any)=>[a.slot,c.players[a.id]]));
 return new PlaySim({offense:lineup('O'),defense:lineup('D'),offCall:structuredClone(o.call),defCall:structuredClone(o.defense),
  los:10+s.yardline,ballY:s.ballY,firstDownX:Math.min(110,10+s.yardline+s.distance),seed:o.seedState.key,
  // A staged snap's recorded initial energy is after its real pre-snap work.
  // When available, restore the recovered incoming energy before replaying it.
  energy:new Map(o.initialPlayers.map((a:any)=>[a.id,c.preStageEnergy?.[a.id]??a.energy])),scouting,coverageScouting:coverage,
  hurry,down:s.down,audibles:true,record:true,recordLevel:'full'});
}
export function savedInputs(path='test/fixtures/block-lifecycle-inputs.json.gz'){
 const data=JSON.parse(gunzipSync(readFileSync(path)).toString());
 if(data.players)for(const c of data.cases)c.players=data.players;
 return data;
}
