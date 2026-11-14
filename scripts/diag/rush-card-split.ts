/**
 * Why can the scorecard's "Rush yards / carry" move while the paired run set says nothing moved?
 *
 * Reads saved two-arm scorecards (the first arm is the base) and splits the run row: designed runs by run
 * concept, the same mean with each run capped at 20 yd (what `ref:report` prints), the tail beyond 20 yd,
 * QB scrambles and sacks apart, and the mix of runs by down, distance, field zone, quarter, personnel and
 * the coverage the defence called. Differences are arm minus base with a 90% interval from resampling whole
 * games (the scorecard's unit); the arms share inputs but not plays once the games diverge.
 *
 *   node --import tsx scripts/diag/rush-card-split.ts out/rush-card/seed7.json out/rush-card/seed8.json ... [--md out.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { GameRec, PlayRec } from '../scorecard/records.js';

interface Card { arms: Array<{ name: string; games: GameRec[] }> }
const files = process.argv.slice(2).filter(a => a.endsWith('.json'));
const mdPath = process.argv.includes('--md') ? process.argv[process.argv.indexOf('--md') + 1] : undefined;

const cards = files.map(f => JSON.parse(readFileSync(f, 'utf8')) as Card);
const names = cards[0]!.arms.map(a => a.name);
const games = (arm: number): GameRec[] => cards.flatMap(c => c.arms[arm]!.games);

// Deterministic resampling.
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };

type Stat = (plays: PlayRec[]) => number;
const designed = (p: PlayRec) => p.kind === 'run';
const scramble = (p: PlayRec) => p.kind === 'pass' && p.scramble;
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const ratio = (num: (p: PlayRec) => number, on: (p: PlayRec) => boolean): Stat => ps => {
  let n = 0, d = 0;
  for (const p of ps) if (on(p)) { n += num(p); d += 1; }
  return d ? n / d : NaN;
};
const share = (on: (p: PlayRec) => boolean, of: (p: PlayRec) => boolean): Stat => ps => {
  let a = 0, b = 0;
  for (const p of ps) if (of(p)) { b++; if (on(p)) a++; }
  return b ? a / b : NaN;
};

/** Mean and the arm-minus-base difference with a 90% interval, resampling games within each arm. */
function compare(stat: Stat, B = 600): { base: number; arm: number; diff: number; lo: number; hi: number; nBase: number; nArm: number } {
  const g0 = games(0), g1 = games(1);
  const plays = (gs: GameRec[]) => gs.flatMap(g => g.plays);
  const base = stat(plays(g0)), arm = stat(plays(g1));
  const ds: number[] = [];
  for (let b = 0; b < B; b++) {
    const r0 = Array.from({ length: g0.length }, () => g0[Math.floor(rnd() * g0.length)]!);
    const r1 = Array.from({ length: g1.length }, () => g1[Math.floor(rnd() * g1.length)]!);
    const d = stat(plays(r1)) - stat(plays(r0));
    if (Number.isFinite(d)) ds.push(d);
  }
  ds.sort((a, b) => a - b);
  return { base, arm, diff: arm - base, lo: ds[Math.floor(ds.length * 0.05)] ?? NaN, hi: ds[Math.floor(ds.length * 0.95)] ?? NaN,
    nBase: plays(g0).filter(designed).length, nArm: plays(g1).filter(designed).length };
}

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-');
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '-');
const row = (label: string, c: ReturnType<typeof compare>, asPct = false, n?: [number, number]) => {
  const f = asPct ? pct : f2;
  const mark = Number.isFinite(c.lo) && (c.lo > 0 || c.hi < 0) ? ' ◆' : '';
  return `| ${label} | ${n ? `${n[0]} / ${n[1]}` : `${c.nBase} / ${c.nArm}`} | ${f(c.base)} | ${f(c.arm)} | ${asPct ? `${(c.diff * 100).toFixed(1)}` : f2(c.diff)} [${asPct ? (c.lo * 100).toFixed(1) : f2(c.lo)}, ${asPct ? (c.hi * 100).toFixed(1) : f2(c.hi)}]${mark} |`;
};
const HEAD = (b: string, a: string, unit = '') => ['', `| Row | n ${b} / ${a} | ${b} | ${a} | ${a} − ${b}${unit}, 90% interval |`, '|---|---|---|---|---|'];

const out: string[] = [];
const [b, a] = names as [string, string];
out.push(`# Rush row split: ${a} vs ${b}`, '',
  `${files.length} card(s), ${games(0).length} games an arm. A ◆ marks an interval that excludes zero. Games diverge between arms, so plays are not matched.`, '');

out.push('## 1. What the row counts', '',
  'The card row `Rush yards / carry` is the mean of `yards` over plays logged as `kind: run` (scripts/scorecard/metrics.ts). QB scrambles are logged as passes and kneel-downs as their own kind, so neither is in it; QB sneaks, draws and trick plays are runs. It is uncapped; `ref:report` caps each run at 20 yd.');
const plays0 = games(0).flatMap(g => g.plays), plays1 = games(1).flatMap(g => g.plays);
const concepts = [...new Set([...plays0, ...plays1].filter(designed).map(p => p.concept))].sort();
out.push(...HEAD(b, a, ' yd'));
out.push(row('designed runs, yards / carry (the card row)', compare(ratio(p => p.yards, designed))));
out.push(row('designed runs, each capped at 20 yd (ref:report)', compare(ratio(p => Math.min(20, p.yards), designed))));
out.push(row('designed runs, only the part beyond 20 yd', compare(ratio(p => Math.max(0, p.yards - 20), designed))));
out.push(row('designed runs, 10+ yd share', compare(share(p => p.yards >= 10, designed), 600), true));
out.push(row('designed runs, 20+ yd share', compare(share(p => p.yards >= 20, designed), 600), true));
out.push(row('designed runs, 0 or negative yd share', compare(share(p => p.yards <= 0, designed), 600), true));
out.push(row('designed runs, ending in a TD share', compare(share(p => p.td, designed), 600), true));
const q = (xs: number[], p: number) => { const s = [...xs].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
out.push('', `Longest ten runs, ${b}: ${plays0.filter(designed).map(p => p.yards).sort((x, y) => y - x).slice(0, 10).map(f2).join(', ')}`,
  `Longest ten runs, ${a}: ${plays1.filter(designed).map(p => p.yards).sort((x, y) => y - x).slice(0, 10).map(f2).join(', ')}`,
  `Median / p90 of runs, ${b}: ${f2(q(plays0.filter(designed).map(p => p.yards), .5)!)} / ${f2(q(plays0.filter(designed).map(p => p.yards), .9)!)}; ${a}: ${f2(q(plays1.filter(designed).map(p => p.yards), .5)!)} / ${f2(q(plays1.filter(designed).map(p => p.yards), .9)!)}`);

out.push('', '## 2. Designed runs by concept', ...HEAD(b, a, ' yd'));
for (const c of concepts) {
  const on = (p: PlayRec) => designed(p) && p.concept === c;
  const n0 = plays0.filter(on).length, n1 = plays1.filter(on).length;
  if (n0 + n1 < 30) continue;
  out.push(row(`${c}`, compare(ratio(p => p.yards, on), 300), false, [n0, n1]));
}

out.push('', '## 3. Scrambles and sacks (not in the run row)', ...HEAD(b, a, ' yd'));
out.push(row('QB scrambles, yards / scramble', compare(ratio(p => p.yards, scramble), 300), false,
  [plays0.filter(scramble).length, plays1.filter(scramble).length]));
out.push(row('Scramble rate (per dropback)', compare(share(p => p.scramble, p => p.kind === 'pass'), 300), true,
  [plays0.filter(p => p.kind === 'pass').length, plays1.filter(p => p.kind === 'pass').length]));
out.push(row('Sack rate (per dropback)', compare(share(p => p.sack, p => p.kind === 'pass'), 300), true,
  [plays0.filter(p => p.kind === 'pass').length, plays1.filter(p => p.kind === 'pass').length]));

out.push('', '## 4. Run-situation mix (share of designed runs)', ...HEAD(b, a));
const mixes: Array<[string, (p: PlayRec) => string]> = [
  ['down', p => `${p.down}`],
  ['distance', p => p.dist <= 2 ? '1-2' : p.dist <= 5 ? '3-5' : p.dist <= 9 ? '6-9' : '10+'],
  ['field zone', p => p.yl < 20 ? 'own 0-20' : p.yl < 50 ? 'own 20-50' : p.yl < 80 ? 'opp 50-20' : p.yl < 90 ? 'opp 20-10' : 'opp 10-0'],
  ['quarter', p => `Q${p.quarter}`],
  ['personnel', p => p.personnel],
  ['coverage called', p => p.family],
];
for (const [label, key] of mixes) {
  const cats = [...new Set([...plays0, ...plays1].filter(designed).map(key))].sort();
  out.push(`| **${label}** | | | | |`);
  for (const c of cats) {
    const n0 = plays0.filter(p => designed(p) && key(p) === c).length, n1 = plays1.filter(p => designed(p) && key(p) === c).length;
    if (n0 + n1 < 30) continue;
    out.push(row(`  ${c}`, compare(share(p => key(p) === c, designed), 200), true, [n0, n1]));
  }
}
out.push('', '## 5. Call mix (all scrimmage plays)', ...HEAD(b, a));
out.push(row('Run share of plays', compare(share(designed, () => true), 300), true, [plays0.length, plays1.length]));
for (const d of [1, 2, 3, 4]) out.push(row(`  run share on down ${d}`, compare(share(designed, p => p.down === d), 200), true,
  [plays0.filter(p => p.down === d).length, plays1.filter(p => p.down === d).length]));
out.push('', '## 6. Per-game box score', ...HEAD(b, a));
const gmean = (arm: GameRec[], f: (g: GameRec) => number) => mean(arm.map(f));
out.push(`| plays per game | | ${f2(gmean(games(0), g => g.plays.length))} | ${f2(gmean(games(1), g => g.plays.length))} | |`);
out.push(`| designed runs per game | | ${f2(gmean(games(0), g => g.plays.filter(designed).length))} | ${f2(gmean(games(1), g => g.plays.filter(designed).length))} | |`);
out.push(`| points per game | | ${f2(gmean(games(0), g => g.points))} | ${f2(gmean(games(1), g => g.points))} | |`);

const text = out.join('\n') + '\n';
if (mdPath) writeFileSync(mdPath, text); else process.stdout.write(text);
