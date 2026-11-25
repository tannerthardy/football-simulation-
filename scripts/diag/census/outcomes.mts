/** Pass outcomes per throw by coverage family from the game log (no tap on the play): completion, incompletion, pass breakup, interception, sack. One arm = the same 24 games as the census.
 *   [FLAGS] node --import tsx scripts/diag/census/outcomes.mts [--seed 101] [--games 4] [--first 0] [--out out/census/outcomes-X.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), first = Number(arg('--first', '0')), out = arg('--out', 'out/census/outcomes.json');
mkdirSync(dirname(out), { recursive: true });
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const tally: Record<string, Record<string, number>> = {};
let printed = false;
for (let i = 0; i < games; i++) {
  const res = simulateGame(home, away, { seed: seed + first + i, record: true, recordLevel: 'light' } as any);
  for (const q of res.log as any[]) {
    if (!q.plan || q.kind !== 'pass' && !(q.stats && (q.stats.completed !== undefined || q.stats.target))) continue;
    if (!printed) { printed = true; console.error('keys', Object.keys(q).join(','), 'stats', Object.keys(q.stats ?? {}).join(',')); }
    const fam = q.plan.family ?? q.plan.coverage ?? '?'; const t = (tally[fam] ??= {});
    const s = q.stats ?? {};
    const k = s.sacked ? 'sack' : s.interceptedBy ? 'int' : s.completed ? 'comp' : s.passDefendedBy ? 'pbu' : /broken up|defended/.test(q.text ?? '') ? 'pbu' : /incomplete/.test(q.text ?? '') ? 'inc' : /scramble/.test(q.text ?? '') ? 'scr' : 'other';
    t[k] = (t[k] ?? 0) + 1;
  }
  console.error(`game ${i + 1}/${games}`);
}
writeFileSync(out, JSON.stringify(tally));
