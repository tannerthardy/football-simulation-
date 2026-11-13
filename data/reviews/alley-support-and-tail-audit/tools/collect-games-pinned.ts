/** Source-pinned ordinary eight-game seed7/two-league guard; light positions only.
 * No extra decisions, see calls, RNG or physics changes. Selected diagnostics are separate.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { sha, fileSha, sourceSha, canonical, snapshot, rawResult, gameSignature, stripReplay } from './common.js';
const [archiveArg, outputArg, EXPECTED] = process.argv.slice(2);
if (!archiveArg || !outputArg || !EXPECTED || process.argv.length !== 5) throw Error('Usage: collect-games-pinned.ts ARCHIVE OUTPUT_DIR EXPECTED_SOURCE');
const archive = resolve(archiveArg), output = resolve(outputArg);
if (sourceSha(archive) !== EXPECTED) throw Error('Frozen engine hash mismatch');
const { Rng } = await import(pathToFileURL(join(archive, 'src/core/rng.ts')).href);
const { generateTeam } = await import(pathToFileURL(join(archive, 'src/league/team.ts')).href);
const { Game } = await import(pathToFileURL(join(archive, 'src/game/game.ts')).href);
const rng = new Rng(7), names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const leagueInputs: any[] = [], rows: any[] = [];
function league(n: number) {
  const lr = rng.fork(`league-${n}`);
  const teams = names.map(name => { const tr = lr.fork(name); return generateTeam(tr, name, name.slice(0,3).toUpperCase(), {strength: tr.range(.35,.75)}); });
  leagueInputs.push({league:n,teams:structuredClone(teams),rosterSha256:sha(teams)}); return teams;
}
mkdirSync(output, {recursive:true});
let teams = league(0);
const started = performance.now();
for (let g = 0; g < 8; g++) {
  if (g === 4) teams = league(1);
  const i = rng.int(0,7); let j = rng.int(0,6); if (j>=i) j++;
  const seed = rng.nextU32(), home = teams[i], away = teams[j], native: any[] = [];
  let game: any;
  const beforeRosterSha256 = sha([home,away]);
  game = new Game(home, away, {seed,record:true,recordLevel:'light',hooks:{playResult(sim: any, kind: string) {
    const initial = snapshot(sim,Rng);
    const input = {seed:sim.rng.key,logIndex:game.playIndex,snapOrdinal:native.length,kind,state:structuredClone(game.state),
      offCall:canonical(sim,sim.offCall),defCall:canonical(sim,sim.defCall),los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,
      hurry:sim.hurry,wind:sim.wind,snapContext:sim.snapContext,
      initialSha256:sha(initial),initialRng:initial.rng,initialNextRng:initial.nextRng,
      initialPlayersSha256:sha(sim.agents.map((a:any)=>({slot:a.slot,team:a.team,player:a.player,profile:a.profile}))),
      earlierLogSha256:sha(game.result().log.map(stripReplay))};
    const result=sim.run(), final=snapshot(sim,Rng);
    native.push({...input,raw:rawResult(result),finalSha256:sha(final),resultSha256:sha(rawResult(result)),nextRng:final.nextRng});
    return result;
  }}});
  const result=game.play();
  const indexed=new Map(native.map(n=>[n.logIndex,n]));
  const log=result.log.map((row:any)=>({...row,nativeInput:indexed.get(row.index)}));
  const packet={schema:'ordinary-eight-game-light-native-v1',sourceBefore:EXPECTED,sourceAfter:sourceSha(archive),archiveRoot:archive,
    gameIndex:g+1,league:g<4?0:1,seed,home:{id:home.id,abbr:home.abbr,name:home.name},away:{id:away.id,abbr:away.abbr,name:away.name},
    beforeRosterSha256,score:result.score,quarterScores:result.quarterScores,signature:gameSignature(result),log,nativeCalls:native.length};
  if(packet.sourceAfter!==EXPECTED)throw Error('Source changed during game');
  const file=`game-${g+1}.json.gz`;writeFileSync(join(output,file),gzipSync(JSON.stringify(packet),{level:9}));
  const summary={...packet,log:log.map(({replay,...r}:any)=>r),file};rows.push(summary);
  const runs=summary.log.filter((r:any)=>r.kind==='run'&&!r.nullified);
  const catches=summary.log.filter((r:any)=>r.kind==='pass'&&!r.nullified&&r.stats?.completed&&!r.stats?.interceptedBy);
  console.log(JSON.stringify({game:g+1,seed,score:result.score,plays:result.log.length,runs:runs.length,rushYards:runs.reduce((s:number,r:any)=>s+r.yards,0),largestRun:Math.max(...runs.map((r:any)=>r.yards)),largestYac:Math.max(...catches.map((r:any)=>r.stats?.yac??0))}));
}
const packet={schema:'ordinary-eight-game-native-index-v1',sourceBefore:EXPECTED,sourceAfter:sourceSha(archive),archiveRoot:archive,
  seed:7,games:8,leagues:2,leagueInputs,rows,collectorSha256:fileSha(new URL(import.meta.url).pathname),commonSha256:fileSha(new URL('./common.ts',import.meta.url).pathname),
  method:'Same calibration makeLeague/selection streams, eight ordinary Game simulations. Only existing playResult hook runs native PlaySim; light replay frames on every snap. Initial/final native state hashes, copied next RNG, raw outcomes and all log rows retained. No full telemetry, new observations, decisions, RNG, prescribed movement or changed physics.',
  limits:['Light recording parity is established separately on selected native snap reruns, not asserted on every unrecorded full game.','Same generated two-league population; no NFL inference or controller counterfactual.','State snapshots cover enumerable runtime state and native perception, not external module WeakMaps.','Wall time under instrumented collection is not a benchmark.'],wallSeconds:(performance.now()-started)/1000};
if(packet.sourceAfter!==EXPECTED)throw Error('Source changed');
writeFileSync(join(output,'index.json.gz'),gzipSync(JSON.stringify(packet),{level:9}));
console.log(JSON.stringify({output,source:EXPECTED,games:rows.length,wallSeconds:packet.wallSeconds}));
