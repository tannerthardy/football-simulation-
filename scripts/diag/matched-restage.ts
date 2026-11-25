/**
 * Matched restage: replay the same saved snaps under different arms, so a
 * physics or decision change is judged play by play instead of on whole-game
 * totals (one changed play cascades into a different game).
 *
 *   node --import tsx scripts/diag/matched-restage.ts capture <seed> [--run-only] [--games N]
 *   <ARM ENV> node --import tsx scripts/diag/matched-restage.ts replay <seed> <armName> [--run-only] [--shifts K] [--trace]
 *   node --import tsx scripts/diag/matched-restage.ts compare <baseArm> <arm> <seed>... [--run-only] [--list N]
 *   node --import tsx scripts/diag/matched-restage.ts tables <arm> <seed>... [--run-only] [--nfl <plays.jsonl.gz>]
 *
 * --run-only (capture) plays the game with every offensive call a designed run (GameOptions.runOnly); the snap set
 *   is stored as seed<N>-run.json and every later mode takes the same flag to find it. --games N plays games with
 *   seeds N, N+1, ... (default 1, the original behavior).
 * --shifts K (replay) replays every snap K more times with the play's whole random stream moved to a different
 *   deterministic fork (shift 0 is the saved stream, so K=0 is the original tool). `compare` then reports, per snap,
 *   in how many of the K+1 matched pairs (same snap, same shift, base vs arm) the result changed, and how far the base arm
 *   moves with the dice alone (median yards, and how many snaps change yards/outcome with a new stream), the noise
 *   floor to read the arm's median yards moved against. A snap that changes at every shift is a mechanism; one that changes
 *   at one is a different roll.
 * --trace (replay) writes a 10 Hz run-play trace per shift (scripts/diag/run-trace-watch.ts); `tables` feeds those
 *   to scripts/mechanics/run_film_reference.py, the same position-only puller/backer/edge/timeline tables NFL and
 *   film use. Tracing only reads state: replay with and without --trace must change 0 plays (see docs/VALIDATION.md).
 *
 * Settings are read once at load, so each arm runs in its own process.
 * Output goes to out/matched-restage/.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam, leagueSample } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';
import { watchRunPlay } from './run-trace-watch.js';

type Result = { y: number; o: string; events: string };
type Row = { pass: boolean; call: string; y: number; o: string; events?: string; sh?: Result[] };
type Snap = { pass: boolean; call: string; setup: string; game?: number };

const { values: v, positionals: [mode, ...rest] } = parseArgs({ allowPositionals: true, options: {
  'run-only': { type: 'boolean', default: false }, games: { type: 'string', default: '1' }, shifts: { type: 'string', default: '0' },
  trace: { type: 'boolean', default: false }, list: { type: 'string', default: '40' }, nfl: { type: 'string' } } });
const dir = 'out/matched-restage'; mkdirSync(dir, { recursive: true });
const key = (seed: string | number) => `seed${seed}${v['run-only'] ? '-run' : ''}`;

/** Shift 0 is the saved stream; shift s > 0 swaps the play's whole stream for a deterministic fork of it. */
function shifted(setup: PlaySetup, shift: number): PlaySetup {
  if (!shift) return setup;
  const base = typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed;
  return { ...setup, seed: base.fork(`shift:${shift}`) };
}
const digest = (events: unknown) => createHash('sha256').update(JSON.stringify(events)).digest('hex').slice(0, 16);
const run = (s: PlaySetup): Result => {
  const r = new PlaySim(s).run();
  // Yards and outcome, plus a digest of the event sequence so equal yards by a different path still count as changed.
  return { y: +r.yards.toFixed(2), o: r.outcome as string, events: digest(r.events) };
};
/** Same run, plus the 10 Hz trace. The trace wrapper only reads. `flagged` = an offensive holding call was made. */
function runTraced(s: PlaySetup, id: string) {
  const sim = new PlaySim(s), get = watchRunPlay(sim), r = sim.run();
  const calls = [...(r.penalties ?? []), ...(r.penalty ? [r.penalty] : [])];
  return { result: { y: +r.yards.toFixed(2), o: r.outcome as string, events: digest(r.events) } as Result,
    trace: { id, yards: r.yards, nullified: calls.some(c => c.against === 'O' && /hold/i.test(String(c.kind))), ...get() } };
}
const median = (v: number[]) => { const s = [...v].sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null; };
const mean = (v: number[]) => +(v.reduce((s, x) => s + x, 0) / Math.max(1, v.length)).toFixed(2);
const same = (a: Result, b: Result) => a.y === b.y && a.o === b.o && a.events === b.events;

if (mode === 'capture') {
  const seed = Number(rest[0]), games = Number(v.games), rng = new Rng(seed);
  // Per-seed league sample (leagueSample): the teams' alignment habits and coordinators sample the league instead
  // of the same IRN/COM pair on every seed (rosters unchanged).
  const home = leagueSample(generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), seed), away = leagueSample(generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }), seed);
  const plays: Snap[] = []; let setup: PlaySetup | null = null;
  for (let g = 0; g < games; g++) {
    simulateGame(home, away, { seed: seed + g, ...(v['run-only'] ? { runOnly: true } : {}), hooks: { playSetup: s => { setup = s; }, playResult: (sim, kind) => {
      if (kind !== 'scrimmage' || !setup) return undefined;
      plays.push({ pass: !!sim.isPass, call: sim.offCall.label, setup: captureSetup(setup).toString('base64'), ...(games > 1 ? { game: g + 1 } : {}) }); return undefined; } } });
  }
  writeFileSync(`${dir}/${key(seed)}.json`, JSON.stringify(plays));
  console.log(`captured ${plays.length} snaps (${plays.filter(p => !p.pass).length} runs) -> ${dir}/${key(seed)}.json`);
} else if (mode === 'replay') {
  const [seed, arm = 'x'] = rest, shifts = Number(v.shifts);
  const plays = JSON.parse(readFileSync(`${dir}/${key(seed)}.json`, 'utf8')) as Snap[];
  const traces: unknown[] = [];
  const rows: Row[] = plays.map((p, i) => {
    const all: Result[] = [];
    for (let s = 0; s <= shifts; s++) {
      const setup = shifted(restoreSetup(Buffer.from(p.setup, 'base64')), s);
      if (v.trace && !p.pass) { const t = runTraced(setup, `${key(seed)}#${i}.s${s}`); all.push(t.result); traces.push(t.trace); }
      else all.push(run(setup));
    }
    return { pass: p.pass, call: p.call, ...all[0], ...(shifts ? { sh: all.slice(1) } : {}) };
  });
  writeFileSync(`${dir}/${key(seed)}-${arm}.json`, JSON.stringify(rows));
  if (v.trace) writeFileSync(`${dir}/trace-${key(seed)}-${arm}.json`, JSON.stringify(traces));
  console.log(`replayed ${rows.length} snaps x ${shifts + 1} stream(s)${v.trace ? `, ${traces.length} run traces` : ''}`);
} else if (mode === 'compare') {
  const [base, arm, ...seeds] = rest;
  const load = (a: string) => seeds.flatMap(s => JSON.parse(readFileSync(`${dir}/${key(s)}-${a}.json`, 'utf8')) as Row[]);
  const A = load(base), B = load(arm);
  const stats = (rows: Row[]) => {
    const runs = rows.filter(r => !r.pass), passes = rows.filter(r => r.pass);
    const ypp = (rs: Row[]) => +(rs.reduce((s, r) => s + r.y, 0) / Math.max(1, rs.length)).toFixed(2);
    return { runYd: ypp(runs), passYd: ypp(passes), incomplete: rows.filter(r => r.o === 'incomplete').length };
  };
  const at = (r: Row, s: number): Result => s === 0 ? { y: r.y, o: r.o, events: r.events ?? '' } : r.sh![s - 1];
  const pairs = (r: Row) => 1 + (r.sh?.length ?? 0);
  const withShifts = A.some(r => r.sh) && B.some(r => r.sh);
  const K = withShifts ? Math.min(...A.map(pairs), ...B.map(pairs)) - 1 : 0;
  const rows = A.map((a, i) => {
    const b = B[i];
    const changedAt = Array.from({ length: K + 1 }, (_, s) => s).filter(s => !same(at(a, s), at(b, s)));
    // Dice alone moves the event digest of nearly every play, so "moves with dice" asks about yards and outcome.
    const yardsMove = (x: Result, y: Result) => x.y !== y.y || x.o !== y.o;
    const diceMoves = Array.from({ length: K }, (_, s) => s + 1).some(s => yardsMove(at(a, 0), at(a, s)));
    const yardsChangedAt = changedAt.filter(s => yardsMove(at(a, s), at(b, s)));
    const diceYd = Array.from({ length: K }, (_, s) => Math.abs(at(a, s + 1).y - at(a, 0).y));
    const armYd = Array.from({ length: K + 1 }, (_, s) => Math.abs(at(a, s).y - at(b, s).y));
    return { i, a, b, changedAt, yardsChangedAt, diceMoves, diceYd, armYd };
  });
  const changed = rows.filter(d => d.changedAt.includes(0));
  const summary: Record<string, unknown> = { base, arm, snaps: A.length, changed: changed.length, [base]: stats(A), [arm]: stats(B) };
  if (K) {
    const hist: Record<string, number> = {};
    for (const d of rows) hist[d.changedAt.length] = (hist[d.changedAt.length] ?? 0) + 1;
    const diceSnaps = rows.filter(d => d.diceMoves).length;
    Object.assign(summary, { shifts: K, pairsPerSnap: K + 1,
      snapsChangedAtAnyShift: rows.filter(d => d.changedAt.length).length, snapsChangedAtEveryShift: rows.filter(d => d.changedAt.length === K + 1).length,
      changeCountHistogram: hist, runSnapsChangedAtAnyShift: rows.filter(d => !d.a.pass && d.changedAt.length).length, runSnaps: rows.filter(d => !d.a.pass).length,
      snapsYardsOrOutcomeChangedAtEveryShift: rows.filter(d => d.yardsChangedAt.length === K + 1).length,
      baseArmYardsOrOutcomeMoveWithDiceAlone: diceSnaps,
      medianAbsYdMovedByDiceAlone: median(rows.flatMap(d => d.diceYd)), medianAbsYdMovedByArm: median(rows.flatMap(d => d.armYd)),
      meanAbsYdMovedByDiceAlone: mean(rows.flatMap(d => d.diceYd)), meanAbsYdMovedByArm: mean(rows.flatMap(d => d.armYd)) });
  }
  console.log(JSON.stringify(summary));
  const limit = Number(v.list);
  const listed = (K ? rows.filter(d => d.changedAt.length) : changed).slice(0, limit);
  for (const d of listed)
    console.log(`  #${d.i} ${d.a.pass ? 'pass' : 'run '} ${d.a.call.slice(0, 36)}: ${d.a.y} ${d.a.o} -> ${d.b.y} ${d.b.o}${K ? `  [${d.changedAt.length}/${K + 1} shifts${d.diceMoves ? ', base moves with dice' : ''}]` : ''}`);
  const total = K ? rows.filter(d => d.changedAt.length).length : changed.length;
  if (total > listed.length) console.log(`  ... ${total - listed.length} more (--list N)`);
} else if (mode === 'tables') {
  const [arm, ...seeds] = rest;
  const files = seeds.map(s => `${dir}/trace-${key(s)}-${arm}.json`);
  const nfl = v.nfl ?? 'out/mechanics/nfl-plays-w12.jsonl.gz';
  const text = execFileSync('python3', ['-I', 'scripts/mechanics/run_film_reference.py', existsSync(nfl) ? nfl : '-', ...files], { encoding: 'utf8' });
  writeFileSync(`${dir}/tables-${arm}${v['run-only'] ? '-run' : ''}.txt`, text);
  process.stdout.write(`arm ${arm}: ${files.length} trace file(s), NFL ${existsSync(nfl) ? nfl : 'not present (sim only)'}\n${text}`);
} else {
  console.error('usage: capture <seed> [--run-only] [--games N] | replay <seed> <arm> [--run-only] [--shifts K] [--trace] | compare <baseArm> <arm> <seed>... | tables <arm> <seed>...');
  process.exit(1);
}
