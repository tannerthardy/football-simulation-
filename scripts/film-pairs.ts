/** Matched saved-snap film across pinned refs. No caller checkout modifications. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseArgs, isDeepStrictEqual } from 'node:util';
import { deserialize } from 'node:v8';
import { digest, selections, outcome, executionBytes, type Captured, type ArmRecord } from './film-pairs/model.js';
import { renderPairs, type PairView } from './film-pairs/render.js';
import { PairWorktrees } from './film-pairs/worktrees.js';
import { compareExecution, readSavedPlay } from './diag/saved-play.js';

export interface PairOptions { base: string; head: string; plays: string; out: string }
const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (args: string[], cwd = toolRoot) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function runFilmPairs(options: PairOptions) {
  if (process.version !== 'v22.23.3') throw Error('Use supported Node22.23.3');
  const out = resolve(options.out), allowed = resolve(toolRoot, 'out');
  const rel = relative(allowed, out);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('Output must be a new directory under this checkout/out/');
  if (existsSync(resolve(out, 'batch.json'))) throw Error('Completed batch exists; use a new output directory');
  mkdirSync(out, { recursive: true });
  const inputFile = resolve(options.plays), inputBytes = readFileSync(inputFile);
  const { manifest, plays } = selections(JSON.parse(inputBytes.toString()));
  for (const p of plays) if (p.path) p.path = resolve(dirname(inputFile), p.path);
  const pin = (ref: string) => git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]);
  const base = pin(options.base), head = pin(options.head), capture = pin(manifest.captureRef ?? options.base);
  const scratch = mkdtempSync(resolve(out, 'worktrees-'));
  const worktrees = new PairWorktrees(git);
  let primaryError: unknown;
  const loader = resolve(toolRoot, 'node_modules/tsx/dist/loader.mjs');
  const invoke = (root: string, mode: string, request: unknown, stem: string) => {
    const file = resolve(out, `${stem}-request.json`); writeFileSync(file, JSON.stringify(request));
    execFileSync(process.execPath, ['--import', loader, resolve(toolRoot, 'scripts/film-pairs/worker.ts'), mode, file],
      { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  };
  const worktree = (name: string, sha: string) => {
    const root = resolve(scratch, name); worktrees.create(root, sha);
    if (digest(readFileSync(resolve(root, 'package-lock.json'))) === digest(readFileSync(resolve(toolRoot, 'package-lock.json'))))
      worktrees.shareDependencies(root, resolve(toolRoot, 'node_modules'));
    else execFileSync('npm', ['ci', '--no-audit', '--no-fund', '--cache', resolve(out, 'npm-cache')], { cwd: root, stdio: 'pipe' });
    return root;
  };
  try {
    const beforeRoot = worktree('before', base), afterRoot = worktree('after', head);
    const captureRoot = capture === base ? beforeRoot : capture === head ? afterRoot : worktree('capture', capture);
    const index = resolve(out, 'captured.json');
    invoke(captureRoot, 'capture', { plays, out: resolve(out, 'captures'), index }, 'capture');
    const rows: Captured[] = JSON.parse(readFileSync(index, 'utf8'));
    // Both arms verify the exact input bytes, full restored constructor, personnel
    // and advanced RNG BEFORE either arm begins a PlaySim run.
    for (const [name, root] of [['before', beforeRoot], ['after', afterRoot]])
      invoke(root, 'check', { rows, output: resolve(out, `${name}-preflight.bin`) }, `${name}-check`);
    const preflights = ['before', 'after'].map(name => deserialize(readFileSync(resolve(out, `${name}-preflight.bin`))) as ArmRecord[]);
    for (let i = 0; i < rows.length; i++) for (const key of ['inputSha256', 'inputRngSha256', 'inputPersonnelSha256'] as const)
      if (preflights[0][i][key] !== preflights[1][i][key]) throw Error(`${rows[i].id}: paired ${key} mismatch`);
    for (const [name, root] of [['before', beforeRoot], ['after', afterRoot]])
      invoke(root, 'run', { rows, output: resolve(out, `${name}.bin`) }, `${name}-run`);
    const arms = ['before', 'after'].map(name => deserialize(readFileSync(resolve(out, `${name}.bin`))) as ArmRecord[]);
    const views: PairView[] = [], comparisons = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], before = arms[0][i], after = arms[1][i], saved = readSavedPlay(row.path);
      for (const arm of [before, after]) {
        if (!isDeepStrictEqual(arm.identity, preflights[arm === before ? 0 : 1][i].identity)) throw Error('Source/settings changed after preflight');
        if (arm.identity.engineSha256 === saved.identity.engineSha256 && arm.identity.node === saved.identity.node
          && arm.identity.lockfileSha256 === saved.identity.lockfileSha256 && isDeepStrictEqual(arm.identity.settings, saved.identity.settings)
          && compareExecution(saved.original, arm.execution!)) throw Error(`${row.id}: capture-source replay did not reproduce original`);
      }
      const beforeBytes = executionBytes(before.execution), afterBytes = executionBytes(after.execution);
      const noChange = beforeBytes.equals(afterBytes);
      const difference = compareExecution(before.execution!, after.execution!);
      const view = (arm: ArmRecord) => ({ summary: outcome(arm.execution!.result), frames: arm.execution!.result.frames ?? [],
        players: arm.execution!.initial.actors.map(a => ({ team: a.team, slot: a.slot })), los: saved.film.replay!.los });
      views.push({ id: row.id, note: row.note, noChange, firstDifference: difference, before: view(before), after: view(after) });
      comparisons.push({ id: row.id, note: row.note, setupSha256: row.setupSha256, captureCommit: row.captureCommit,
        noChange, beforeExecutionSha256: digest(beforeBytes), afterExecutionSha256: digest(afterBytes), firstDifference: difference, before: { identity: before.identity, ...outcome(before.execution!.result) },
        after: { identity: after.identity, ...outcome(after.execution!.result) } });
    }
    const html = renderPairs(views, `${options.base} · ${base.slice(0, 8)}`, `${options.head} · ${head.slice(0, 8)}`);
    writeFileSync(resolve(out, 'index.html'), html);
    const batch = { format: 'film-pairs-batch-v1', base, head, captureRef: capture, node: process.version,
      executionEncoding: 'film-pairs-lossless-values-v1 (not raw V8 allocation bytes)', selectionSha256: digest(inputBytes), captureCount: rows.length, htmlBytes: Buffer.byteLength(html), pairs: comparisons };
    writeFileSync(resolve(out, 'batch.json'), JSON.stringify(batch, null, 2) + '\n');
    return batch;
  } catch (error) {
    primaryError = error;
    writeFileSync(resolve(out, 'error.txt'), String(error) + '\n'); throw error;
  } finally {
    try { worktrees.cleanup(); }
    catch (cleanupError) {
      if (primaryError !== undefined) throw new AggregateError([primaryError, cleanupError],
        'Film pairing failed and cleanup preserved unfamiliar worktree data');
      throw cleanupError;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { base: { type: 'string' }, head: { type: 'string' }, plays: { type: 'string' },
    out: { type: 'string', default: 'out/film-pairs/batch' }, help: { type: 'boolean' } } });
  if (values.help) console.log('node --import tsx scripts/film-pairs.ts --base <ref> --head <ref> --plays <film-pairs-v1.json> [--out out/film-pairs/name]');
  else {
    if (!values.base || !values.head || !values.plays) throw Error('--base, --head and --plays are required');
    const batch = runFilmPairs({ base: values.base, head: values.head, plays: values.plays, out: values.out! });
    console.log(JSON.stringify({ out: values.out, htmlBytes: batch.htmlBytes,
      pairs: batch.pairs.map(p => ({ id: p.id, noChange: p.noChange, firstDifference: p.firstDifference })) }, null, 2));
  }
}
