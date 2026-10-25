/** Runtime guard for a physics change, with CPU time to reduce scheduling noise.
 * node --import tsx scripts/diag/physics-cost.ts [out.json] [games=2] [seed=9]
 * Compare identical arguments in separate source snapshots. Changed trajectories
 * can change the number of plays, so report both time/game and time/play.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import { sourceVersion } from '../source-version.js';

const path = process.argv[2] ?? 'out/physics-cost.json';
const games = Number(process.argv[3] ?? 2), seed = Number(process.argv[4] ?? 9);
const rng = new Rng(seed);
const sourceSha256 = sourceVersion();
const started = performance.now(), cpuStarted = process.cpuUsage();
const playsPerGame: number[] = [];
for (let game = 0; game < games; game++) {
  playsPerGame.push(simulateGame(
    generateTeam(rng, 'H', 'HHH', { strength: 0.55 }),
    generateTeam(rng, 'A', 'AAA', { strength: 0.55 }),
    { seed: rng.nextU32() },
  ).log.length);
}
const cpu = process.cpuUsage(cpuStarted);
const wallSeconds = (performance.now() - started) / 1000;
const cpuSeconds = (cpu.user + cpu.system) / 1e6;
const plays = playsPerGame.reduce((sum, count) => sum + count, 0);
const report = {
  sourceSha256, node: process.version, games, seed, plays, playsPerGame,
  wallSeconds, cpuSeconds,
  wallSecondsPerGame: wallSeconds / games, cpuSecondsPerGame: cpuSeconds / games,
  wallMillisecondsPerPlay: wallSeconds / plays * 1000,
  cpuMillisecondsPerPlay: cpuSeconds / plays * 1000,
};
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
console.log(report);
