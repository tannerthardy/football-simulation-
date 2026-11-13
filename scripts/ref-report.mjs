/**
 * The standard run-game report: one command, one play set, one table.
 *
 *   npm run ref:report                       # all flags off vs the reference stack
 *   npm run ref:report -- --flag REACH_CLOSE=0 --flag GAP_CLIMB=0   # adds a "candidate" arm: the stack with these changes
 *   npm run ref:report -- --skip-operators   # yards and tackles only (about 4 minutes)
 *   npm run ref:report -- --reuse            # rebuild the tables from the arms already in out/ref (same commit and flags only)
 *   npm run ref:report -- --placebo 4        # adds N placebo arms: the reference stack with one body nudged
 *                                            # (--placebo-size yd, default 0.05) after the first tick, no mechanism
 *                                            # changed; their paired deltas against `ref` are the floor (bias and
 *                                            # spread) a candidate's paired delta must clear. Match the size to the
 *                                            # candidate's share of changed plays (printed by ref-placebo.py)
 *
 * The play set is fixed: config/reference-stack.json `runSet` names the commit
 * that captured it and a digest of its play list. If out/matched-restage does not hold that
 * exact set, it is rebuilt from that commit in a temporary git worktree, so
 * every agent replays the same 1,321 snaps whatever develop looks like.
 * NFL numbers come from scripts/diag/run-operators/nfl-2022.txt (the same
 * operators on 2022 tracking), so no raw data is needed.
 * Writes out/ref/report.md and prints it.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const stack = JSON.parse(readFileSync(join(root, 'config/reference-stack.json'), 'utf8'));
const { commit: setCommit, seeds, digest: setSha } = stack.runSet;
const args = process.argv.slice(2), flags = []; let operators = true, reuse = false, placebos = 0, placeboSize = '0.05';
while (args.length) { const a = args.shift(); if (a === '--flag' && args.length) flags.push(args.shift()); else if (a === '--skip-operators') operators = false; else if (a === '--reuse') reuse = true;
  else if (a === '--placebo' && args.length) placebos = Number(args.shift()); else if (a === '--placebo-size' && args.length) placeboSize = args.shift();
  else throw new Error(`Unknown argument: ${a}`); }
/** Placebo nudges, in order: offensive line first steps, then a linebacker, each sign. */
const PLACEBO = ['C:1', 'LG:1', 'RG:-1', 'LB:1', 'C:-1', 'RT:1', 'LT:-1', 'LB:-1'];
const git = (a, cwd = root) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const node = process.execPath, tsx = ['--import', 'tsx'];
const run = (cmd, argv, opts = {}) => new Promise((resolve, reject) => {
  const out = []; const child = spawn(cmd, argv, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], ...opts });
  child.stdout.on('data', d => out.push(d)); child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(Buffer.concat(out).toString()) : reject(new Error(`${cmd} ${argv.join(' ')} exited ${code}`)));
});
const setFile = s => join(root, `out/matched-restage/seed${s}-run.json`);
/** Identity of the set: every play's id and call, in order. Not the file bytes: the same setup can serialize to
 * different bytes on another run (shared references in the v8 stream) while restoring to an equal setup. */
const setDigest = () => { const h = createHash('sha256'); for (const s of seeds) { if (!existsSync(setFile(s))) return null;
  for (const p of JSON.parse(readFileSync(setFile(s), 'utf8'))) h.update(`${s}|${p.id}|${p.call}\n`); } return h.digest('hex'); };

async function ensureSet() {
  if (setDigest() === setSha) return;
  console.error(`[ref:report] rebuilding the run set from ${setCommit.slice(0, 8)} (about 2 minutes)`);
  const wt = join(root, 'out/ref/run-set-worktree'); rmSync(wt, { recursive: true, force: true });
  try { git(['worktree', 'prune']); git(['worktree', 'add', '--detach', wt, setCommit]); } catch (e) { throw new Error(`Cannot check out ${setCommit}: fetch it first (git fetch origin develop). ${e.message}`); }
  try {
    symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'));
    const queue = [...seeds];
    await Promise.all([0, 1, 2, 3].map(async () => { for (let s; (s = queue.shift()) !== undefined;) await run(node, [...tsx, 'scripts/diag/edge/capture-runs.ts', String(s), '--label', `${s}-run`], { cwd: wt }); }));
    mkdirSync(join(root, 'out/matched-restage'), { recursive: true });
    for (const s of seeds) writeFileSync(setFile(s), readFileSync(join(wt, `out/matched-restage/seed${s}-run.json`)));
  } finally { try { git(['worktree', 'remove', '--force', wt]); } catch {} }
  if (setDigest() !== setSha) throw new Error('The rebuilt run set does not match config/reference-stack.json runSet.digest (Node version? use .nvmrc)');
}

async function arm(name, refArgs, env = {}, ops = operators) {
  const ref = ['scripts/ref.mjs', ...refArgs, '--'];
  for (const f of readdirSync(join(root, 'out/ref'))) if (new RegExp(`^${name}-[0-9_]+\\.jsonl$`).test(f)) rmSync(join(root, 'out/ref', f)); // no stale rows from an earlier grouping
  const groups = [0, 1, 2, 3].map(i => seeds.filter((_, k) => k % 4 === i));
  await Promise.all(groups.map(g => run(node, [...ref, node, ...tsx, 'scripts/diag/ref-replay.mts', name, ...g.map(String)], { env: { ...process.env, ...env } })));
  if (!ops) return;
  const dump = async (script, file) => writeFileSync(join(root, `out/ref/${file}`),
    (await run(node, [...ref, node, ...tsx, `scripts/diag/run-operators/${script}`, root, 'off'])).split('\n').filter(l => l.startsWith('{')).join('\n') + '\n');
  await Promise.all([dump('dump-zone.mts', `zone-${name}.jsonl`), dump('dump-gap.mts', `gap-${name}.jsonl`)]);
  writeFileSync(join(root, `out/ref/all-${name}.jsonl`), readFileSync(join(root, `out/ref/zone-${name}.jsonl`)) + '' + readFileSync(join(root, `out/ref/gap-${name}.jsonl`)));
}

async function main() {
  mkdirSync(join(root, 'out/ref'), { recursive: true });
  await ensureSet();
  const arms = [['off', ['--off']], ['ref', []]];
  if (flags.length) arms.push(['candidate', flags.flatMap(f => ['--flag', f])]);
  if (!reuse) for (const [name, a] of arms) { console.error(`[ref:report] arm ${name}`); await arm(name, a); }
  const placeboArms = PLACEBO.slice(0, placebos).map((p, k) => [`placebo${k + 1}`, p]);
  if (!reuse) for (const [name, p] of placeboArms) { console.error(`[ref:report] arm ${name} (${p})`); await arm(name, [], { REF_PLACEBO: p, REF_PLACEBO_SIZE: placeboSize }, false); }
  const py = (script, ...a) => run('python3', ['-I', script, ...a]);
  const md = [`# Run-game report: ${stack.id} @ ${git(['rev-parse', '--short', 'HEAD'])}${git(['status', '--porcelain', '--', 'src']) ? ' (src modified)' : ''}`, '',
    `Run set ${setSha.slice(0, 12)} (${seeds.length} run-only games captured at ${setCommit.slice(0, 8)}). Yards capped at 20 for means.`,
    ...(flags.length ? [`Candidate = ${stack.id} with ${flags.join(' ')}.`] : []), '', '## Yards and tackles', '', '```',
    (await py('scripts/diag/ref-compare.py', 'off', 'ref')).trimEnd(), ...(flags.length ? ['', (await py('scripts/diag/ref-compare.py', 'ref', 'candidate')).trimEnd()] : []), '```'];
  if (placeboArms.length) md.push('', '## Placebo floor', '',
    `Each placebo arm is the reference stack with one body nudged ${placeboSize} yd after the first tick; nothing else changes. Its paired`,
    'delta against `ref` is divergence alone. Read a candidate against the placebo mean (bias) and RMS (spread), with similar shares', 'of changed plays.', '', '```',
    (await py('scripts/diag/ref-placebo.py', 'ref', ...placeboArms.map(([n]) => n), ...(flags.length ? ['--candidate', 'candidate'] : []))).trimEnd(), '```');
  if (operators) {
    const nfl = Object.fromEntries(readFileSync(join(root, 'scripts/diag/run-operators/nfl-2022.txt'), 'utf8').split(/^=== /m).filter(Boolean).map(b => [b.slice(0, b.indexOf('\n')), b.slice(b.indexOf('\n') + 1).trimEnd()]));
    md.push('', '## Operators (zone runs; mesh: zone and gap)', '');
    for (const op of ['hitblk', 'hitterback', 'frontcourse', 'pile', 'trench2', 'linestep', 'bsend', 'psend', 'mesh']) {
      const kind = op === 'mesh' ? 'all' : 'zone';
      const out = await run('python3', ['-I', `${op}.py`, ...arms.map(([n]) => `../../../out/ref/${kind}-${n}.jsonl`)], { cwd: join(root, 'scripts/diag/run-operators') });
      md.push(`### ${op}`, '', '```', '== NFL 2022', nfl[op] ?? '(no stored NFL output)', out.trimEnd(), '```', '');
    }
  }
  writeFileSync(join(root, 'out/ref/report.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
  console.error('[ref:report] wrote out/ref/report.md');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
