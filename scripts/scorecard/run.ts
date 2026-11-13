/**
 * Scorecard: where does our football look unrealistic, and where did a change
 * move it? A diagnosis, not a verdict on any one mechanism (docs/PLAN.md).
 * Timing, compatibility and saved-record contract: docs/reviews/scorecard-provenance.md.
 *
 * Testing should be cheap. Pick the smallest tier that answers the question:
 *     --tier quick   6 games, 2 leagues, no splits    everyday changes (default)
 *     --tier pr      12 games, 2 leagues, key splits  a PR, compared with the trunk
 *     --tier full    48 games, 6 leagues, all splits  big fixes and the weekly review
 * Explicit options below override the tier.
 *
 *   npm run scorecard -- [options]
 *     --games N           games per arm (spread over leagues of 8 teams)
 *     --seed 7            roster and game seed
 *     --leagues N         independently generated leagues (default games/8)
 *     --workers N         parallel processes (default: CPU count)
 *     --arm name:K=V,K=V  an engine-flag arm; repeat for more. The first arm
 *                         is the reference the others are compared with, on
 *                         identical games. Default: one arm, current flags.
 *     --compare base.json compare the first arm with a saved scorecard
 *     --from saved.json   report saved records only; simulate zero games
 *     --splits a,b|all|none  split tables
 *     --metrics a,b       limit tables to these metric ids
 *     --probes a,b|none   mechanism probes to collect (default all)
 *     --min-plays 20      hide split rows with fewer plays
 *     --out file.json     save records for later --compare
 *     --md file.md        also write the report to a file
 */
import { spawn, execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameRec, PlayRec } from './records.js';
import { METRICS, SPLITS, evaluate, interval, penaltyMetrics, status, type Metric } from './metrics.js';
import { PROBES } from './probes.js';
import { eventsFile, overheadLine, watchSection } from './weird/report.js';
import { compatibility, engineSettings, measurementIdentity, provenance, type Arm, type Card } from './provenance.js';
import { changeReading, rateCounts } from './format.js';

const argv = process.argv.slice(2);
const opt = (name: string, dflt?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const opts = (name: string) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []));

const TIERS: Record<string, { games: number; leagues: number; splits: string }> = {
  quick: { games: 6, leagues: 2, splits: 'none' },
  pr: { games: 12, leagues: 2, splits: 'concept,family,down,distance' },
  full: { games: 48, leagues: 6, splits: 'all' },
};
const tier = TIERS[opt('tier', 'quick')!];
if (!tier) throw new Error(`unknown tier; use ${Object.keys(TIERS).join(', ')}`);
const games = Number(opt('games', `${tier.games}`));
const seed = Number(opt('seed', '7'));
const leagues = Math.max(1, Math.min(games, Number(opt('leagues', `${opt('games') ? Math.ceil(games / 8) : tier.leagues}`))));
const workers = Math.max(1, Number(opt('workers', `${cpus().length}`)));
const minPlays = Number(opt('min-plays', '20'));
const probeOpt = opt('probes', 'all')!;
const probeIds = probeOpt === 'all' ? PROBES.map((p) => p.id) : probeOpt === 'none' ? [] : probeOpt.split(',');
const splitOpt = opt('splits', tier.splits)!;
const splits = splitOpt === 'all' ? SPLITS : splitOpt === 'none' ? [] : SPLITS.filter((s) => splitOpt.split(',').includes(s.id));
const metricIds = opt('metrics')?.split(',');
const allMetrics = [...METRICS, ...PROBES.filter((p) => probeIds.includes(p.id)).flatMap((p) => p.metrics)];

const parseArm = (s: string): Omit<Arm, 'games'> => {
  const [name, rest = ''] = s.split(':');
  const env = Object.fromEntries(rest.split(',').filter(Boolean).map((kv) => kv.split('=') as [string, string]));
  const known = engineSettings({});
  for (const [key, value] of Object.entries(env)) {
    if (!Object.hasOwn(known, key)) throw new Error(`Unknown engine switch: ${key}`);
    if (typeof known[key] === 'boolean' && !['0', '1'].includes(value)) throw new Error(`Engine switch requires 0 or 1: ${key}`);
    if (key === 'CF_FLOW' && !['none', 'hold', 'over'].includes(value)) throw new Error('CF_FLOW requires none, hold or over');
  }
  return { name, env };
};
const armSpecs = opt('from') ? [] : opts('arm').map(parseArm);
if (!armSpecs.length) armSpecs.push({ name: 'current', env: {} });

const here = dirname(fileURLToPath(import.meta.url));
const worker = join(here, 'worker.ts');
let activeWorkers = 0;
let peakWorkers = 0;

function runChunk(env: Record<string, string>, only: number[]): Promise<GameRec[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', worker, JSON.stringify({ seed, games, leagues, only, probes: probeIds })], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    child.once('spawn', () => { activeWorkers++; peakWorkers = Math.max(peakWorkers, activeWorkers); });
    child.once('exit', () => { activeWorkers--; });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`worker exited ${code}`));
      resolve(buf.split('\n').filter(Boolean).map((l) => JSON.parse(l) as GameRec));
    });
  });
}

async function simulate(): Promise<Arm[]> {
  const perArm = Math.max(1, Math.floor(workers / armSpecs.length));
  const tasks: Array<() => Promise<{ arm: number; recs: GameRec[] }>> = [];
  armSpecs.forEach((a, ai) => {
    for (let w = 0; w < perArm; w++) {
      const only = Array.from({ length: games }, (_, g) => g).filter((g) => g % perArm === w);
      if (only.length) tasks.push(() => runChunk(a.env, only).then((recs) => ({ arm: ai, recs })));
    }
  });
  const out: GameRec[][] = armSpecs.map(() => []);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, tasks.length) }, async () => {
    while (next < tasks.length) {
      const { arm, recs } = await tasks[next++]();
      out[arm].push(...recs);
    }
  }));
  return armSpecs.map((a, i) => ({ ...a, workerProcesses: Math.min(games, perArm),
    games: out[i].sort((x, y) => x.game - y.game) }));
}

const fmt = (m: Metric, v: number) => (Number.isFinite(v) ? `${v.toFixed(m.scale ? 1 : 2)}${m.unit ?? ''}` : '—');
const fmtDiff = (m: Metric, v: number) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(m.scale ? 1 : 2)}` : '—');
const band = (m: Metric) => (m.band ? `${m.band[0]}–${m.band[1]}${m.unit ?? ''}${m.source ? ` (${m.source})` : ''}` : m.source ?? 'internal');
const secPerGame = (a: Arm) => !a.games.length || a.games.some((g) => !Number.isFinite(g.ms) || g.ms < 0)
  ? NaN : a.games.reduce((s, g) => s + g.ms, 0) / a.games.length / 1000;
const available = (v: unknown) => v === undefined || v === null ? 'unavailable' : `${v}`;

function absoluteTable(a: Arm, metrics: Metric[]): string[] {
  const lines = ['| Metric | Sim | 90% range | NFL band | vs band |', '| --- | --- | --- | --- | --- |'];
  for (const m of metrics) {
    const { value } = evaluate(m, a.games);
    const [lo, hi] = interval(m, a.games);
    lines.push(`| ${m.label} | ${fmt(m, value)}${rateCounts(m, a.games)} | ${fmt(m, lo)} to ${fmt(m, hi)} | ${band(m)} | ${status(m, value)} |`);
  }
  return lines;
}

interface Move { where: string; metric: Metric; base: number; now: number; lo: number; hi: number; n: number; baseCounts: string; nowCounts: string }

function compareTable(base: Arm, now: Arm, label: string, qualified: boolean, metrics: Metric[]): { lines: string[]; moves: Move[] } {
  const lines = [`| Metric | ${label} | ${now.name} | Change | 90% range of change | Reading | NFL band | vs band |`, '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  const moves: Move[] = [];
  for (const m of metrics) {
    const b = evaluate(m, base.games).value;
    const { value: v, n } = evaluate(m, now.games);
    const [lo, hi] = qualified ? interval(m, now.games, base.games) : [NaN, NaN];
    const real = lo > 0 || hi < 0;
    const baseCounts = rateCounts(m, base.games), nowCounts = rateCounts(m, now.games);
    if (real) moves.push({ where: 'all plays', metric: m, base: b, now: v, lo, hi, n, baseCounts, nowCounts });
    const reading = changeReading(b, v, lo, hi, qualified);
    lines.push(`| ${m.label} | ${fmt(m, b)}${baseCounts} | ${fmt(m, v)}${nowCounts} | ${fmtDiff(m, v - b)} | ${fmtDiff(m, lo)} to ${fmtDiff(m, hi)} | ${reading} | ${band(m)} | ${status(m, v)} |`);
  }
  return { lines, moves };
}

function splitTables(now: Arm, metrics: Metric[], base?: Arm, qualified = true): { lines: string[]; moves: Move[] } {
  const lines: string[] = [];
  const moves: Move[] = [];
  for (const s of splits) {
    for (const kind of ['run', 'pass'] as const) {
      const ms = metrics.filter((m) => m.splitKind === kind);
      if (!ms.length) continue;
      const counts = new Map<string, number>();
      for (const g of now.games) for (const p of g.plays) if (p.kind === kind) counts.set(s.key(p), (counts.get(s.key(p)) ?? 0) + 1);
      const keys = [...counts].filter(([, n]) => n >= minPlays).sort((x, y) => y[1] - x[1]).map(([k]) => k);
      if (keys.length < 2) continue;
      lines.push('', `**${kind === 'run' ? 'Runs' : 'Passes'} by ${s.label.toLowerCase()}**`, '');
      lines.push(`| ${s.label} | Plays | ${ms.map((m) => m.label).join(' | ')} |`, `| --- | --- | ${ms.map(() => '---').join(' | ')} |`);
      for (const k of keys) {
        const f = (p: PlayRec) => p.kind === kind && s.key(p) === k;
        const cells = ms.map((m) => {
          const v = evaluate(m, now.games, f).value;
          const nowCounts = rateCounts(m, now.games, f);
          if (!base) return `${fmt(m, v)}${nowCounts} ${status(m, v) === 'OK' ? '' : status(m, v).toLowerCase()}`.trim();
          const b = evaluate(m, base.games, f).value;
          const [lo, hi] = qualified ? interval(m, now.games, base.games, f, 200) : [NaN, NaN];
          const real = lo > 0 || hi < 0;
          const baseCounts = rateCounts(m, base.games, f);
          if (real) moves.push({ where: `${s.label.toLowerCase()} = ${k}`, metric: m, base: b, now: v, lo, hi, n: counts.get(k)!, baseCounts, nowCounts });
          return `${fmt(m, b)}${baseCounts} → ${fmt(m, v)}${nowCounts}${real ? ' **◆**' : ''}`;
        });
        lines.push(`| ${k} | ${counts.get(k)} | ${cells.join(' | ')} |`);
      }
    }
  }
  return { lines, moves };
}

function report(card: Card, baseCard?: Card): string {
  const out: string[] = [];
  const availableMetrics = [...allMetrics, ...penaltyMetrics([...card.arms, ...(baseCard?.arms ?? [])].flatMap(a => a.games))];
  const metrics = metricIds ? availableMetrics.filter(m => metricIds.includes(m.id)) : availableMetrics;
  const { meta } = card;
  out.push(`# Scorecard`, '');
  out.push(`Commit \`${meta.commit}\` · ${meta.games} games per arm over ${meta.leagues} leagues · seed ${meta.seed} · ${meta.date}`, '');
  out.push(`Rendering measurement SHA256: \`${measurementIdentity()}\`. Tables use this checkout's metric definitions; producer metadata below is preserved.`, '');
  out.push('Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.', '');
  out.push('Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.', '');
  out.push('## Timing and provenance', '');
  out.push('Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.', '');
  for (const [label, producer] of (baseCard ? [['saved base', baseCard], ['candidate', card]] : [['producer', card]]) as Array<[string, Card]>) {
    const p = producer.meta;
    out.push(`**${label}**: commit \`${p.commit}\`; Node: ${available(p.node)}; probes: ${p.probes ? p.probes.join(', ') || 'none' : 'unavailable'}.`, '');
    out.push(`Workers requested: ${available(p.workersRequested)}; peak concurrent worker processes: ${available(p.workersUsed)}.`, '');
    out.push(`Collection elapsed: ${p.wallMs === undefined ? 'unavailable' : `${(p.wallMs / 1000).toFixed(1)} s`}. CPU time: not collected in scorecard records.`, '');
    for (const a of producer.arms) out.push(`- ${a.name}: ${Number.isFinite(secPerGame(a)) ? `${secPerGame(a).toFixed(1)} s elapsed per game` : 'elapsed time unavailable'}; worker processes: ${available(a.workerProcesses)}`);
    for (const a of producer.arms) { const line = overheadLine(a.name, a.games); if (line) out.push(line); }
    for (const key of ['engineSha256', 'measurementSha256', 'lockfileSha256', 'platform', 'arch', 'cpuModel', 'cpuQuotaCores', 'execution'] as const)
      out.push(`- ${key}: ${available(p.provenance?.[key])}`);
    for (const a of producer.arms) out.push(`- ${a.name} resolved engine switches: ${a.settings ? `\`${JSON.stringify(a.settings)}\`` : 'unavailable (legacy overrides do not establish resolved defaults)'}`);
    out.push('');
  }
  const ref = baseCard?.arms[0] ?? (card.arms.length > 1 ? card.arms[0] : undefined);
  if (ref) {
    for (const a of baseCard ? card.arms.slice(0, 1) : card.arms.slice(1)) {
      const ratio = secPerGame(a) / secPerGame(ref);
      const check = compatibility(baseCard ?? card, card, ref, a);
      if (check.measurements.length || check.timing.length) out.push(`- Elapsed slowdown guardrail unverified for ${a.name}: ${[...check.measurements, ...check.timing].join('; ')}.`);
      else if (ratio > 1.1) out.push(`- **Guardrail:** ${a.name} has ${((ratio - 1) * 100).toFixed(0)}% more elapsed time per game than ${baseCard ? 'the base' : ref.name}. This is not measured CPU savings; machine load is uncontrolled.`);
    }
  }
  const allMoves: Move[] = [];
  const pairs: Array<[Arm, Arm, string]> = baseCard
    ? [[baseCard.arms[0], card.arms[0], 'base']]
    : card.arms.slice(1).map((a) => [card.arms[0], a, card.arms[0].name] as [Arm, Arm, string]);
  if (!pairs.length) {
    out.push('', '## Metrics', '', ...absoluteTable(card.arms[0], metrics));
    const st = splitTables(card.arms[0], metrics);
    if (st.lines.length) out.push('', '## Splits', ...st.lines);
  }
  for (const [b, n, label] of pairs) {
    out.push('', `## ${n.name} vs ${label}`, '');
    const check = compatibility(baseCard ?? card, card, b, n);
    const qualified = check.measurements.length === 0;
    out.push(qualified ? 'Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.'
      : `Comparison unverified: ${check.measurements.join('; ')}. Descriptive values remain visible; no change inference.`, '');
    const ct = compareTable(b, n, label, qualified, metrics);
    out.push(...ct.lines);
    const st = splitTables(n, metrics, b, qualified);
    allMoves.push(...ct.moves, ...st.moves);
    if (st.lines.length) out.push('', '### Splits', ...(qualified ? ['', '◆ marks a cell whose 90% change interval excludes zero.'] : []), ...st.lines);
  }
  out.push(...watchSection(card.arms));
  if (allMoves.length) {
    const size = (m: Move) => Math.abs(m.now - m.base) / Math.max(1e-9, (m.metric.band ? m.metric.band[1] - m.metric.band[0] : Math.abs(m.base)) || 1);
    out.push('', '## Largest estimated changes', '');
    for (const m of [...allMoves].sort((x, y) => size(y) - size(x)).slice(0, 8)) {
      out.push(`- ${m.metric.label}, ${m.where} (n=${m.n}): ${fmt(m.metric, m.base)}${m.baseCounts} → ${fmt(m.metric, m.now)}${m.nowCounts}`);
    }
  }
  return `${out.join('\n')}\n`;
}

const fromPath = opt('from');
const comparePath = opt('compare');
for (const output of [opt('out'), opt('md')].filter(Boolean) as string[])
  if ([fromPath, comparePath].some((p) => p && resolve(output) === resolve(p))) throw new Error('Cannot overwrite a saved scorecard input');
const baseCard = comparePath ? (JSON.parse(readFileSync(comparePath, 'utf8')) as Card) : undefined;
let card: Card;
if (fromPath) {
  process.stderr.write('Metric values are recomputed from saved records using this checkout; producer metadata is preserved.\n');
  card = JSON.parse(readFileSync(fromPath, 'utf8')) as Card;
} else {
  if (![games, leagues, workers].every((v) => Number.isInteger(v) && v > 0)) throw new Error('Games, leagues and workers must be positive integers');
  const before = provenance();
  for (const a of armSpecs) a.settings = engineSettings({ ...process.env, ...a.env });
  const commit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();
  const t0 = performance.now();
  const arms = await simulate();
  const wallMs = performance.now() - t0;
  if (JSON.stringify(before) !== JSON.stringify(provenance())) throw new Error('Scorecard source or measurement changed during collection');
  card = { meta: { commit, date: new Date().toISOString().slice(0, 10), seed, games, leagues, node: process.version,
    provenance: before, probes: probeIds, workersRequested: workers,
    workersUsed: peakWorkers, wallMs,
    timing: { gameMs: 'simulateGame-elapsed', wallMs: 'collection-elapsed', cpu: 'not-collected' } }, arms };
  process.stderr.write(`scorecard: ${arms.length} arm(s) × ${games} games in ${(wallMs / 1000).toFixed(0)} s elapsed, ${card.meta.workersUsed} concurrent workers (${workers} requested)\n`);
}
if (!card.arms.length) throw new Error('Saved scorecard has no arms');
const text = report(card, baseCard);
process.stdout.write(text);
if (fromPath) process.stderr.write('scorecard: saved records only; zero games simulated; unavailable producer metadata was not reconstructed\n');
for (const [flag, data] of [['out', JSON.stringify(card)], ['md', text]] as const) {
  const path = opt(flag);
  if (!path) continue;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}
// The film weirdness events, in full, next to the saved card (`--weird` names the file).
{
  const explicit = opt('weird');
  const beside = (p: string) => `${p.replace(/\.(json|md)$/, '')}.weird-events.json`;
  const path = explicit ?? (fromPath ? undefined : opt('out') ? beside(opt('out')!) : opt('md') ? beside(opt('md')!) : 'out/scorecard/weird-events.json');
  const file = eventsFile({ commit: card.meta.commit, date: card.meta.date, seed: card.meta.seed, games: card.meta.games, leagues: card.meta.leagues }, card.arms);
  if (path && file.arms.length) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(file));
    process.stderr.write(`scorecard: film weirdness events -> ${path}\n`);
  }
}
