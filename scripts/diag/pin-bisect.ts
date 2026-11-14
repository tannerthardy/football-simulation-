/**
 * Which promoted flags must a test file keep pinned to the legacy engine to pass?
 *
 * Every file in test/engine-pin.json `pinned` passes with all promoted flags pinned to 0 and fails with none pinned.
 * For each, this finds a minimal set of flags that, pinned alone, makes the file pass (delta debugging over the flag
 * list; about 8 runs per culprit). Those are the files blocking deletion of each of those flags.
 *
 *   node --import tsx scripts/diag/pin-bisect.ts [--jobs 4] [--files test/a.test.ts,test/b.test.ts] [--out out/pin-bisect]
 *
 * Writes <out>/by-file.json, <out>/by-flag.json and <out>/report.md; probe results are cached in <out>/probes.json,
 * so an interrupted run resumes. Pinned alone is a minimal set, not the only one: a file with two ways to pass
 * reports the first found. Files after the first are searched among the flags earlier files needed first (cheap), and
 * among all promoted flags only when those do not suffice, so a result is minimal within that pool.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** A minimal subset of `all` for which `passes` is true, assuming pinning more flags never hurts. */
export async function minimalPinned(all: string[], passes: (pinned: string[]) => Promise<boolean>): Promise<string[]> {
  let keep = [...all];
  let n = 2;
  while (keep.length >= 2) {
    const size = Math.ceil(keep.length / n);
    let reduced = false;
    for (let i = 0; i < keep.length; i += size) {
      const without = [...keep.slice(0, i), ...keep.slice(i + size)];
      if (without.length < keep.length && await passes(without)) { keep = without; n = Math.max(n - 1, 2); reduced = true; break; }
    }
    if (!reduced) { if (n >= keep.length) break; n = Math.min(keep.length, n * 2); }
  }
  if (keep.length === 1 && await passes([])) return [];
  return keep;
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

async function main() {
  const root = new URL('../..', import.meta.url).pathname;
  const out = join(root, arg('--out', 'out/pin-bisect'));
  mkdirSync(out, { recursive: true });
  const stack: Record<string, string> = JSON.parse(readFileSync(join(root, 'config/reference-stack.json'), 'utf8')).flags;
  const promoted = Object.entries(stack).filter(([, v]) => v === 'on').map(([k]) => k).sort();
  const manifest: { pinned: string[] } = JSON.parse(readFileSync(join(root, 'test/engine-pin.json'), 'utf8'));
  const files = arg('--files', '') ? arg('--files', '').split(',') : manifest.pinned;
  const jobs = Number(arg('--jobs', '4'));
  const cachePath = join(out, 'probes.json');
  const cache: Record<string, boolean> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

  const probe = (file: string, pinned: string[]) => new Promise<boolean>(resolve => {
    const key = `${file}|${[...pinned].sort().join(',')}`;
    if (key in cache) return resolve(cache[key]!);
    const child = spawn('npx', ['vitest', 'run', '--project', 'core', '--project', 'core-defaults', file], {
      cwd: root, env: { ...process.env, TEST_PIN_FLAGS: [...pinned].sort().join(',') }, stdio: 'ignore' });
    child.on('exit', code => { cache[key] = code === 0; writeFileSync(cachePath, JSON.stringify(cache)); resolve(code === 0); });
  });

  const result: Record<string, { pinned: string[]; status: string; probes: number }> = {};
  const known = new Set<string>();
  const queue = [...files];
  await Promise.all(Array.from({ length: jobs }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      let probes = 0;
      const passes = async (p: string[]) => { probes++; return probe(file, p); };
      if (!await passes(promoted)) result[file] = { pinned: [], status: 'fails even fully pinned (environment or a real defect)', probes };
      else if (await passes([])) result[file] = { pinned: [], status: 'passes with nothing pinned', probes };
      else {
        // Most files need flags other files needed: try the flags found so far first, and search the whole list only if they do not suffice.
        const seen = [...known].sort();
        const pool = seen.length && await passes(seen) ? seen : promoted;
        const found = await minimalPinned(pool, passes);
        for (const f of found) known.add(f);
        result[file] = { pinned: found, status: 'ok', probes };
      }
      console.log(file, result[file]!.status, result[file]!.pinned.join(','), `(${probes} runs)`);
    }
  }));

  const byFlag: Record<string, string[]> = {};
  for (const [file, r] of Object.entries(result)) for (const f of r.pinned) (byFlag[f] ??= []).push(file);
  writeFileSync(join(out, 'by-file.json'), JSON.stringify(result, null, 1));
  writeFileSync(join(out, 'by-flag.json'), JSON.stringify(byFlag, null, 1));
  const lines = ['# Pinned flags and the files that need them', '',
    `${Object.keys(result).length} files; ${Object.keys(byFlag).length} flags are still needed by at least one.`, '',
    '## By flag (files blocking its deletion)', ''];
  for (const [flag, fs] of Object.entries(byFlag).sort((a, b) => b[1].length - a[1].length)) lines.push(`- \`${flag}\` (${fs.length}): ${fs.join(', ')}`);
  lines.push('', '## By file', '');
  for (const [file, r] of Object.entries(result).sort()) lines.push(`- \`${file}\`: ${r.status === 'ok' ? r.pinned.join(', ') : r.status}`);
  writeFileSync(join(out, 'report.md'), lines.join('\n') + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
