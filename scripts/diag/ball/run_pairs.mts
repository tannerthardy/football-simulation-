/** Do designed runs change with BALL_DRAG? Per-play game log, one arm per process: the snap seed of play n is the same in both arms (one draw per play from the 'snaps' stream), so a play with an identical pre-snap setup
 * (offense, quarter, clock, down, distance, yardline, call, defense and its plan) has the same seed and, if nothing a run reads depends on the drag, the same result.
 *   [BALL_DRAG=1] node --import tsx scripts/diag/ball/run_pairs.mts [--seed 101] [--games 4] [--first 0] [--out out/drag/pairs-0.json]
 * Output: per game, per play: index, setup key, kind, yards, text. Compare two arms with run_pairs.py. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), first = Number(arg('--first', '0')), out = arg('--out', 'out/drag/pairs.json');
mkdirSync(dirname(out), { recursive: true });
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const all: any[] = [];
for (let i = 0; i < games; i++) {
  const res = simulateGame(home, away, { seed: seed + first + i, record: true, recordLevel: 'light' } as any);
  const plays = (res.log as any[]).map((q, n) => ({ n, key: [q.offense, q.quarter, q.clock, q.down, q.distance, q.yardline, q.call, q.defense, q.plan?.family ?? q.plan?.coverage ?? '', q.plan?.concept ?? q.plan?.id ?? ''].join('|'), kind: q.kind, yards: q.yards, text: q.text, call: q.call, duration: q.duration }));
  all.push({ seed: seed + first + i, plays });
  console.error(`game ${i + 1}/${games}: ${plays.length} plays`);
}
writeFileSync(out, JSON.stringify(all));
