/**
 * The pass rows of a QB_V2 scorecard on V2's own plays.
 *
 * Reads saved two-arm scorecards (`npm run scorecard -- --arm base: --arm v2:QB_V2=1 ... --out card.json`; the first arm
 * is the base) and gives the pass rows on the calls V2 takes (PlayRec.qbV2Call: a staged concept whose read plan fits
 * the call, labelled in both arms), against the same calls in the base arm. The other passes are a control: V2 does not
 * touch them, so a gap there is game divergence (field position, down and distance), not V2.
 *
 * Rows: completion, yards an attempt, sacks a dropback, interceptions an attempt, time to throw, scrambles a dropback,
 * and the call share. Differences are arm minus base with a 90% interval from resampling whole games (the scorecard's
 * unit). The arms share inputs but not plays once the games diverge, so plays are not matched.
 *
 *   node --import tsx scripts/diag/qbv2/card-split.ts card1.json [card2.json ...] [--md out.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { GameRec, PlayRec } from '../../scorecard/records.js';

interface Card { arms: Array<{ name: string; games: GameRec[] }> }
const files = process.argv.slice(2).filter(a => a.endsWith('.json'));
const mdPath = process.argv.includes('--md') ? process.argv[process.argv.indexOf('--md') + 1] : undefined;
if (!files.length) throw new Error('usage: card-split.ts card.json [...] [--md out.md]');
const cards = files.map(f => JSON.parse(readFileSync(f, 'utf8')) as Card);
const names = cards[0]!.arms.map(a => a.name);
if (names.length < 2) throw new Error('needs a two-arm scorecard (base first)');
const games = (arm: number): GameRec[] => cards.flatMap(c => c.arms[arm]!.games);

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };

type Sel = (p: PlayRec) => boolean;
type Stat = (plays: PlayRec[]) => number;
const pass: Sel = p => p.kind === 'pass';
const v2Call: Sel = p => pass(p) && !!p.qbV2Call;
const other: Sel = p => pass(p) && !p.qbV2Call;
const ratio = (on: Sel, num: (p: PlayRec) => number): Stat => ps => {
  let n = 0, d = 0;
  for (const p of ps) if (on(p)) { n += num(p); d++; }
  return d ? n / d : NaN;
};
const count = (on: Sel) => (ps: PlayRec[]) => ps.filter(on).length;

function compare(stat: Stat, B = 600) {
  const g0 = games(0), g1 = games(1), plays = (gs: GameRec[]) => gs.flatMap(g => g.plays);
  const base = stat(plays(g0)), arm = stat(plays(g1)), ds: number[] = [];
  for (let b = 0; b < B; b++) {
    const r0 = Array.from({ length: g0.length }, () => g0[Math.floor(rnd() * g0.length)]!);
    const r1 = Array.from({ length: g1.length }, () => g1[Math.floor(rnd() * g1.length)]!);
    const d = stat(plays(r1)) - stat(plays(r0));
    if (Number.isFinite(d)) ds.push(d);
  }
  ds.sort((a, b) => a - b);
  return { base, arm, diff: arm - base, lo: ds[Math.floor(ds.length * 0.05)] ?? NaN, hi: ds[Math.floor(ds.length * 0.95)] ?? NaN };
}

const fmt = (x: number, pct: boolean) => (Number.isFinite(x) ? (pct ? (x * 100).toFixed(1) : x.toFixed(2)) : '-');
const plays0 = games(0).flatMap(g => g.plays), plays1 = games(1).flatMap(g => g.plays);
const [b, a] = names as [string, string];

/** The rows for one set of plays (sel): n is attempts for the attempt rows, dropbacks for the dropback rows. */
function block(title: string, sel: Sel): string[] {
  const att: Sel = p => sel(p) && p.att, db = sel, thrown: Sel = p => sel(p) && p.ttt !== undefined && p.att;
  const rows: Array<[string, Stat, boolean, Sel]> = [
    ['Completion %', ratio(att, p => +p.comp), true, att],
    ['Yards / attempt', ratio(att, p => (p.comp ? p.yards : 0)), false, att],
    ['Sack rate (per dropback) %', ratio(db, p => +p.sack), true, db],
    ['INT rate (per attempt) %', ratio(att, p => +p.int), true, att],
    ['Scramble rate (per dropback) %', ratio(db, p => +p.scramble), true, db],
    ['Time to throw on attempts (s)', ratio(thrown, p => p.ttt ?? 0), false, thrown],
  ];
  const out = ['', `### ${title}`, '', `| Row | n ${b} / ${a} | ${b} | ${a} | ${a} − ${b}, 90% interval |`, '|---|---|---|---|---|'];
  for (const [label, stat, pct, on] of rows) {
    const c = compare(stat), mark = Number.isFinite(c.lo) && (c.lo > 0 || c.hi < 0) ? ' ◆' : '';
    out.push(`| ${label} | ${count(on)(plays0)} / ${count(on)(plays1)} | ${fmt(c.base, pct)} | ${fmt(c.arm, pct)} | ${fmt(c.diff, pct)} [${fmt(c.lo, pct)}, ${fmt(c.hi, pct)}]${mark} |`);
  }
  return out;
}

const out: string[] = [`# QB_V2 pass rows: ${a} vs ${b}`, '',
  `${files.length} card(s), ${games(0).length} games an arm. A ◆ marks an interval that excludes zero. Games diverge between arms, so plays are not matched.`, ''];
const share = (ps: PlayRec[], on: Sel) => { const n = ps.filter(pass).length; return n ? `${ps.filter(on).length} of ${n} dropbacks (${(100 * ps.filter(on).length / n).toFixed(1)}%)` : '-'; };
out.push('## Labels', '',
  `- V2's calls (PlayRec.qbV2Call): ${b} ${share(plays0, v2Call)}; ${a} ${share(plays1, v2Call)}.`,
  `- V2 read them (PlayRec.qbV2, the tag): ${b} ${plays0.filter(p => p.qbV2).length}; ${a} ${plays1.filter(p => p.qbV2).length} of ${plays1.filter(v2Call).length} V2 calls.`,
  `- A tag off a V2 call (should be 0): ${[...plays0, ...plays1].filter(p => p.qbV2 && !p.qbV2Call).length}.`);
out.push('', '## Pass rows', ...block("V2's calls (the plays V2 takes, and the same calls in the base arm)", v2Call),
  ...block('Other passes (control: V2 does not take them)', other));
const md = out.join('\n') + '\n';
if (mdPath) writeFileSync(mdPath, md);
process.stdout.write(md);
