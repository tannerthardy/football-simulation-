/**
 * Paired snap replay: what does a flag change on the same snaps?
 *
 * An unpaired card (games with the flag on vs off) also measures the games taking different paths: one changed snap
 * changes the down, distance, field position and every later snap seed. This tool removes the path. It captures each
 * scrimmage snap's PlaySetup from N games played on one flag set (the path), then replays every snap under flag set A
 * and flag set B on the same bodies, seed and situation, and compares them play by play.
 *
 *   npx tsx scripts/diag/paired/replay.ts --games 8 --kind run --key personnel,scheme \
 *     --path "FIT_RULES=0,FOLD_HOLD=0,GUARD_KEY=0" --a "FIT_RULES=0,FOLD_HOLD=0,GUARD_KEY=0" --b ""
 *
 * Flags are module constants read at import, so each flag set runs in its own child process.
 * Options:
 *   --games N      games (seeds 1..N, the scripts/sim-game.ts teams at strength 0.55); default 8
 *   --path ENV     the flag set the captured games are played on (comma-separated K=V; "" = engine defaults); repeat
 *                  --path to capture several paths (each reported separately). Default: A's set, then B's set.
 *   --a ENV, --b ENV  the two flag sets to replay (B minus A is reported)
 *   --kind run|pass|all   which snaps to report, by the play's result (`r.kind`); default all
 *   --key k1,k2    bucket keys: personnel (defense: base/nickel/dime/other), scheme (run scheme or pass concept),
 *                  coverage, formation, down, backs (post-motion backfield count), or `module:path.ts` (a module whose
 *                  default export maps a row to a key; rows carry setup and result fields, see `Row`)
 *   --out DIR      work directory; default out/paired
 *   --jobs N       parallel children; default 4
 *
 * Captured setups and replayed rows are cached under DIR by a hash of the flag set, so a second comparison on the same
 * path reuses them (delete DIR after changing engine code).
 *
 * Output per path and bucket: plays, how many plays differ between A and B (per-play event hash), and per outcome
 * the mean under A and B with the paired standard error of B - A (sd of the per-play differences / sqrt(n)).
 *
 * Caveats:
 * - The setup round trip is close but not exact. Setups are v8 snapshots taken at the snap; the scouting classes'
 *   prototypes are restored by hand and the game's belief store is dropped (BELIEVED_BODY is off). Replayed means
 *   come within a few tenths of a yard of the games' own (step 6: replay YAC 6.46 vs the game's 6.75). The A/B
 *   comparison is exact: both arms replay the same snapshot.
 * - Motion is already applied in PlaySim's constructor: the alignment a row reports (`backs`) is the snap's, after
 *   motion, not the formation's.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';

const SELF = fileURLToPath(import.meta.url);

export interface Row {
  game: number; index: number;
  kind: 'run' | 'pass'; callKind?: 'run' | 'pass'; call: string; formation: string; scheme: string; personnel: string; coverage: string;
  down: number; distance: number; backs: number;
  yards: number; attempted: boolean; completed: boolean; sacked: boolean; yac: number | null; rusher: boolean;
  hash: string;
}

function arg(name: string, all = false): string[] {
  const out: string[] = []; const argv = process.argv;
  for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1] ?? '');
  return all ? out : out.slice(-1);
}
function envOf(spec: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const kv of spec.split(',').map((s) => s.trim()).filter(Boolean)) { const [k, v] = kv.split('='); env[k] = v ?? '1'; }
  return env;
}
const idOf = (spec: string) => createHash('sha256').update(spec).digest('hex').slice(0, 8);

async function teams(seed: number) {
  const { Rng } = await import('../../../src/core/rng.js');
  const { generateTeam } = await import('../../../src/league/team.js');
  const rng = new Rng(seed);
  return [generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), generateTeam(rng, 'Comets', 'COM', { strength: 0.55 })] as const;
}

/** Child: play one game on the current environment and snapshot every scrimmage snap's setup. */
async function capture(seed: number, file: string) {
  const { simulateGame } = await import('../../../src/game/game.js');
  const [home, away] = await teams(seed);
  const setups: Buffer[] = [];
  simulateGame(home, away, { seed, hooks: { playSetup: (s: any, c: any) => {
    if (c.kind !== 'scrimmage') return;
    const { beliefs: _beliefs, ...rest } = s; setups.push(serialize(rest));
  } } } as any);
  writeFileSync(file, serialize(setups));
}

/** Child: replay one game's snaps on the current environment. */
async function replay(seed: number, file: string, out: string) {
  const { PlaySim } = await import('../../../src/sim/playsim.js');
  const { ScoutingReport } = await import('../../../src/sim/recognition.js');
  const { CoverageScouting } = await import('../../../src/sim/qbmind.js');
  const rows: Row[] = [];
  (deserialize(readFileSync(file)) as Buffer[]).forEach((buf, index) => {
    const s = deserialize(buf);
    if (s.scouting) Object.setPrototypeOf(s.scouting, ScoutingReport.prototype);
    if (s.coverageScouting) Object.setPrototypeOf(s.coverageScouting, CoverageScouting.prototype);
    const sim = new PlaySim(s);
    const backs = sim.offense.filter((o: any) => o !== sim.qb && sim.offAlign.spots[o.slot]?.backfield).length;
    const r = sim.run(), st = r.stats, call = s.offCall;
    rows.push({ game: seed, index, kind: r.kind, callKind: call.kind, call: call.label, formation: call.formation.id,
      scheme: call.kind === 'run' ? (call.run?.scheme ?? call.label) : (call.pass?.id ?? call.label),
      personnel: s.defCall.personnel, coverage: s.defCall.coverage?.id ?? '-', down: s.down ?? 0,
      distance: s.firstDownX - s.los, backs, yards: r.offenseYards, attempted: st.attempted, completed: st.completed,
      sacked: st.sacked, yac: st.yac ?? null, rusher: !!st.rusher,
      hash: createHash('sha256').update(JSON.stringify(r.events.map((e: any) => [e.t, e.type, e.a, e.b])) + r.yards).digest('hex').slice(0, 12) });
  });
  writeFileSync(out, JSON.stringify(rows));
}

function child(args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((done, fail) => {
    const p = spawn(process.execPath, ['--import', 'tsx', SELF, ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', (code) => (code === 0 ? done() : fail(new Error(`child ${args.join(' ')} exited ${code}`))));
  });
}
async function pool<T>(jobs: Array<() => Promise<T>>, n: number) {
  let next = 0; await Promise.all(Array.from({ length: n }, async () => { while (next < jobs.length) await jobs[next++](); }));
}

const PERSONNEL = (p: string) => (p.startsWith('base') ? 'base' : p === 'nickel' || p === 'dime' ? p : 'other');
async function keyFn(spec: string): Promise<(r: Row) => string> {
  const parts = await Promise.all(spec.split(',').filter(Boolean).map(async (k): Promise<(r: Row) => string> => {
    if (k.startsWith('module:')) return (await import(new URL(k.slice(7), `file://${process.cwd()}/`).href)).default;
    switch (k) {
      case 'personnel': return (r) => PERSONNEL(r.personnel);
      case 'scheme': return (r) => r.scheme;
      case 'coverage': return (r) => r.coverage;
      case 'formation': return (r) => r.formation;
      case 'down': return (r) => `down ${r.down}`;
      case 'backs': return (r) => `${r.backs} backs`;
      default: throw new Error(`unknown key ${k}`);
    }
  }));
  return (r) => parts.map((f) => f(r)).join(' / ') || 'all';
}

/** Outcomes: runs by carry, passes by attempt. Each returns a number per play or null (not counted). */
const OUTCOMES: Record<'run' | 'pass', Array<[string, (r: Row) => number | null]>> = {
  run: [
    ['yd/carry', (r) => r.yards], ['yd/carry cap 20', (r) => Math.min(20, r.yards)],
    ['10+', (r) => +(r.yards >= 10)], ['20+', (r) => +(r.yards >= 20)], ['stuff (<=0)', (r) => +(r.yards <= 0)],
  ],
  pass: [
    ['yd/att', (r) => (r.attempted ? r.yards : null)], ['comp', (r) => (r.attempted ? +r.completed : null)],
    ['sack', (r) => +r.sacked], ['YAC', (r) => (r.completed ? r.yac ?? 0 : null)],
  ],
};

function report(pairs: Array<[Row, Row]>, kind: string, key: (r: Row) => string) {
  const kinds = kind === 'all' ? (['run', 'pass'] as const) : ([kind] as Array<'run' | 'pass'>);
  for (const k of kinds) {
    const buckets = new Map<string, Array<[Row, Row]>>();
    for (const p of pairs) {
      // A snap is a run or a pass by arm A's result; a play whose kind differs between arms is counted in A's kind.
      // Runs are called runs with a rusher (a passer's scramble on a pass call is left out; rows cached before
      // callKind existed keep it).
      if (p[0].kind !== k || (k === 'run' && (!p[0].rusher || (p[0].callKind && p[0].callKind !== 'run')))) continue;
      const b = key(p[0]); if (!buckets.has(b)) buckets.set(b, []); buckets.get(b)!.push(p);
    }
    const all = [...buckets.values()].flat(); if (all.length) buckets.set('ALL', all);
    console.log(`\n${k} snaps`);
    for (const [b, ps] of [...buckets.entries()].sort((x, y) => (x[0] === 'ALL' ? 1 : y[0] === 'ALL' ? -1 : y[1].length - x[1].length))) {
      const cells = OUTCOMES[k].map(([name, f]) => {
        const d: number[] = [], av: number[] = [], bv: number[] = [];
        for (const [a, bb] of ps) { const x = f(a), y = f(bb); if (x == null || y == null) continue; av.push(x); bv.push(y); d.push(y - x); }
        if (!d.length) return `${name} -`;
        const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length, md = mean(d);
        const se = d.length > 1 ? Math.sqrt(d.reduce((s, x) => s + (x - md) ** 2, 0) / (d.length - 1) / d.length) : 0;
        const pct = name === '10+' || name === '20+' || name.startsWith('stuff') || name === 'comp' || name === 'sack';
        const fmt = (v: number) => (pct ? `${(100 * v).toFixed(1)}%` : v.toFixed(2));
        return `${name} ${fmt(mean(av))} -> ${fmt(mean(bv))} (${md >= 0 ? '+' : ''}${fmt(md)} ± ${fmt(se)})`;
      });
      console.log(`  ${b}: plays ${ps.length}, differ ${ps.filter(([a, bb]) => a.hash !== bb.hash).length}; ${cells.join('; ')}`);
    }
  }
}

async function main() {
  const mode = arg('child')[0];
  if (mode === 'capture') return capture(Number(arg('seed')[0]), arg('file')[0]);
  if (mode === 'replay') return replay(Number(arg('seed')[0]), arg('file')[0], arg('rows')[0]);
  const games = Number(arg('games')[0] ?? 8), jobs = Number(arg('jobs')[0] ?? 4), dir = arg('out')[0] ?? 'out/paired';
  const A = arg('a')[0] ?? '', B = arg('b')[0] ?? '', kind = arg('kind')[0] ?? 'all';
  const paths = arg('path', true); if (!paths.length) paths.push(A, B);
  const key = await keyFn(arg('key')[0] ?? '');
  console.log(`A: ${A || '(defaults)'}\nB: ${B || '(defaults)'}`);
  for (const path of [...new Set(paths)]) {
    const pdir = `${dir}/path-${idOf(path)}`; mkdirSync(pdir, { recursive: true });
    const seeds = Array.from({ length: games }, (_, i) => i + 1), setFile = (g: number) => `${pdir}/setups-${g}.bin`;
    await pool(seeds.filter((g) => !existsSync(setFile(g))).map((g) => () => child(['--child', 'capture', '--seed', `${g}`, '--file', setFile(g)], envOf(path))), jobs);
    const rowFile = (arm: string, g: number) => `${pdir}/rows-${idOf(arm)}-${g}.json`;
    await pool([...new Set([A, B])].flatMap((arm) => seeds.filter((g) => !existsSync(rowFile(arm, g))).map((g) => () => child(['--child', 'replay', '--seed', `${g}`, '--file', setFile(g), '--rows', rowFile(arm, g)], envOf(arm)))), jobs);
    const pairs: Array<[Row, Row]> = [];
    for (const g of seeds) {
      const ra: Row[] = JSON.parse(readFileSync(rowFile(A, g), 'utf8')), rb: Row[] = JSON.parse(readFileSync(rowFile(B, g), 'utf8'));
      ra.forEach((r, i) => pairs.push([r, rb[i]]));
    }
    console.log(`\n=== path: games played on ${path || '(defaults)'}; ${pairs.length} scrimmage snaps`);
    report(pairs, kind, key);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
