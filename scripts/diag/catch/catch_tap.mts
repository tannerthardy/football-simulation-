/** Read-only tap on every receiver catch roll (src/sim/catching.ts receiverContest, `__catchTap`; no RNG draw, no behavior change; the tap is a local patch, not in develop).
 *   node --import tsx scripts/diag/catch/catch_tap.mts [--seed 101] [--games 4] [--first 0] [--out out/catch/rows.jsonl]
 * One row per catch roll of a receiver (target or not): the terms catching.ts adds to the difficulty, the hands and tracking ratings, the placement (the ball's distance to his centre
 * and the horizontal distance dh to his hands' closest approach), his speed and the ball's direction against his run, the nearest defender, and whether the roll was won.
 * `first` marks the target's first roll of that pass; `n` its place in the game. */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), first = Number(arg('--first', '0')), out = arg('--out', 'out/catch/rows.jsonl');
mkdirSync(dirname(out), { recursive: true });
const ws = createWriteStream(out);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
let game = 0;
const seen = new WeakMap<object, Set<number>>();
(globalThis as any).__catchTap = (t: any) => {
  const key = t.sim.ball.releaseT as number;
  let s = seen.get(t.sim); if (!s) { s = new Set(); seen.set(t.sim, s); }
  const isFirst = t.isTarget && !s.has(key); if (t.isTarget) s.add(key);
  const sim = t.sim, R = t.R;
  ws.write(JSON.stringify({ game, t: r3(sim.t), first: isFirst, target: t.isTarget, pos: R.player?.position ?? '?', slot: R.slot, tAir: r3(t.tAir), dh: r3(t.dh), reach: r3(t.reach), stretch: r3(t.stretch), z: r3(t.z), chest: r3(t.chest), high: r3(t.high), low: r3(t.low),
    ballSpeed: r3(t.ballSpeed), trackPen: r3(t.trackPen), shoulder: r3(t.shoulder), rs: r3(t.rs), fromBehind: r3(t.fromBehind), cosRun: r3(t.fromBehindRun), hands: r3(t.hands), tracking: r3(t.tracking), diff: r3(t.diff), pCatch: r3(t.pCatch),
    diffHands: r3(t.diffHands), deflected: t.deflected, sep: r3(t.sep), dBall: r3(t.dBall), won: t.won, contested: t.bestQ > 0.05 }) + '\n');
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) {
  game = seed * 100 + first + i;
  simulateGame(home, away, { seed: seed + first + i });
  console.error(`game ${i + 1}/${games} (seed ${seed + first + i})`);
}
ws.end();
