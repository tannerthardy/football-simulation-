/**
 * QB read lab: how often quarterbacks identify the coverage before and after
 * the snap, how much disguise costs them, how often they check at the line,
 * and what wrong reads do to the passing game.
 *   npx tsx scripts/qb-read-lab.ts [games] [seed]
 */
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { bestAt } from '../src/game/playcaller.js';
import { generateTeam, type Team } from '../src/league/team.js';
import { r01 } from '../src/players/types.js';

const [gamesStr = '12', seedStr = '3'] = process.argv.slice(2);
const rng = new Rng(Number(seedStr));

// Coverage family: what most QBs actually need — shell and man/zone.
const FAMILY: Record<string, string> = { cover0: '0-high man', cover1: '1-high man', cover3: '1-high zone', cover2: '2-high zone', tampa2: '2-high zone', cover4: '2-high zone', cover6: '2-high zone', cover2man: '2-high man' };

interface Acc {
  n: number;
  fam: number;
  pre: number;
  post: number;
  postN: number;
  att: number;
  cmp: number;
  ints: number;
  yds: number;
}
const acc = (): Acc => ({ n: 0, fam: 0, pre: 0, post: 0, postN: 0, att: 0, cmp: 0, ints: 0, yds: 0 });
const byTier: Record<string, Acc> = { 'low rec': acc(), 'mid rec': acc(), 'high rec': acc() };
const byDisguise: Record<string, Acc> = { clean: acc(), disguised: acc() };
const byRead: Record<string, Acc> = { 'read right': acc(), 'read wrong': acc() };
const audibles: Record<string, { n: number; yds: number }> = {};
let plays = 0;
let checks = 0;

const recOf = (t: Team) => {
  const qb = bestAt(t, 'QB');
  return 0.7 * r01(qb.ratings.playRecognition) + 0.3 * Math.min(1, qb.experience / 8);
};

for (let g = 0; g < Number(gamesStr); g++) {
  const home = generateTeam(rng, 'Home', 'HOM', { strength: rng.range(0.4, 0.75) });
  const away = generateTeam(rng, 'Away', 'AWY', { strength: rng.range(0.4, 0.75) });
  const rec = { HOM: recOf(home), AWY: recOf(away) } as Record<string, number>;
  const res = simulateGame(home, away, { seed: rng.nextU32() });
  for (const p of res.log) {
    const q = p.stats?.qbRead;
    if (!q || (p.kind !== 'pass' && p.kind !== 'run')) continue;
    plays++;
    if (q.audible) {
      checks++;
      const a = (audibles[q.audible.startsWith('check to') ? `${q.audible} (${p.kind})` : q.audible] ??= { n: 0, yds: 0 });
      a.n++;
      a.yds += p.yards;
    }
    if (p.kind !== 'pass') continue;
    const r = rec[p.offense];
    const tier = r < 0.45 ? 'low rec' : r < 0.62 ? 'mid rec' : 'high rec';
    const right = (q.post ?? q.pre) === q.actual;
    for (const b of [byTier[tier], byDisguise[q.shown ? 'disguised' : 'clean'], byRead[right ? 'read right' : 'read wrong']]) {
      b.n++;
      if (q.pre === q.actual) b.pre++;
      if (FAMILY[q.post ?? q.pre] === FAMILY[q.actual]) b.fam++;
      if (q.post) {
        b.postN++;
        if (q.post === q.actual) b.post++;
      }
      const s = p.stats!;
      if (s.attempted && !s.throwaway) {
        b.att++;
        if (s.completed) b.cmp++;
        if (s.interceptedBy) b.ints++;
        b.yds += s.interceptedBy ? 0 : p.yards;
      }
    }
  }
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
const show = (title: string, m: Record<string, Acc>) => {
  console.log(`\n${title}`);
  for (const [k, b] of Object.entries(m)) {
    console.log(
      `  ${k.padEnd(12)} dropbacks ${String(b.n).padStart(5)}  pre-snap right ${pct(b.pre, b.n).padStart(6)}  post-snap right ${pct(b.post, b.postN).padStart(6)}  family right ${pct(b.fam, b.n).padStart(6)}  comp ${pct(b.cmp, b.att).padStart(6)}  INT ${pct(b.ints, b.att).padStart(5)}  Y/A ${(b.yds / Math.max(1, b.att)).toFixed(2)}`,
    );
  }
};
console.log(`${gamesStr} games, ${plays} scrimmage plays, ${checks} checks at the line (${pct(checks, plays)})`);
show('By QB recognition', byTier);
show('By disguise', byDisguise);
show('By final read', byRead);
console.log('\nChecks at the line');
for (const [k, a] of Object.entries(audibles).sort((x, y) => y[1].n - x[1].n)) console.log(`  ${k.padEnd(34)} ${String(a.n).padStart(4)}  avg ${(a.yds / a.n).toFixed(2)} yds`);
