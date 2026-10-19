/** One lab arm with bound provenance. Applies the pinned baseline profile
 * (config/baseline.json) plus the listed overrides instead of inheriting
 * ambient flags, runs the open-field tracer in shards, and writes
 * out/open-field/LABEL.manifest.json: commit, dirty patch hash and changed
 * files, runtime source digest, every resolved profile flag, Node version,
 * tracer arguments, tracer/lab/measurement script hashes, per-shard play
 * counts and output checksums. Unrelated environment values are not recorded.
 * usage: node scripts/diag/open-field/arm.mjs LABEL [FLAG=VALUE ...] [-- trace args]
 * DEF_GETOFF (diagnostic scale) accepts a non-negative number. */
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { environment, profile } from '../../baseline.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const SHARDS = 4;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const digest = paths => {
  const hash = createHash('sha256');
  for (const path of paths) hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0');
  return hash.digest('hex');
};
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

if (process.versions.node !== profile.nodeVersion) throw new Error(`Use Node ${profile.nodeVersion}; current ${process.versions.node}`);
const argv = process.argv.slice(2);
const label = argv.shift();
if (!label || !/^[A-Za-z0-9_.-]+$/.test(label)) throw new Error('usage: arm.mjs LABEL [FLAG=VALUE ...] [-- trace args]');
const overrides = [], diagnostic = {};
while (argv.length && argv[0] !== '--') {
  const setting = argv.shift(), [key, value] = [setting.slice(0, setting.indexOf('=')), setting.slice(setting.indexOf('=') + 1)];
  if (key === 'DEF_GETOFF') {
    if (!value.trim() || !(Number(value) >= 0)) throw new Error(`Invalid DEF_GETOFF: ${value}`);
    diagnostic[key] = value;
  } else overrides.push(setting);
}
if (argv[0] === '--') argv.shift();
const traceArgs = argv;
const env = { ...environment(process.env, overrides), ...diagnostic };
env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ''}`;

const out = join(root, 'out/open-field');
mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) if (name.startsWith(`${label}-`) && /-\d+\.(jsonl\.gz|log)$/.test(name)) rmSync(join(out, name));
const patch = git(['diff', 'HEAD']);
const untracked = git(['ls-files', '--others', '--exclude-standard', '--', 'src', 'scripts', 'config']).split('\n').filter(Boolean);
const startedAt = new Date().toISOString();
const shards = await Promise.all([...Array(SHARDS).keys()].map(i => new Promise(resolve => {
  const file = `out/open-field/${label}-${i}.jsonl.gz`, log = `out/open-field/${label}-${i}.log`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/diag/open-field/trace.ts', '--shard', `${i}/${SHARDS}`, '--out', file, ...traceArgs],
    { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let text = '';
  child.stdout.on('data', d => { text += d; }); child.stderr.on('data', d => { text += d; });
  child.on('exit', code => {
    writeFileSync(join(root, log), text);
    resolve({ shard: i, exitCode: code, file, sha256: existsSync(join(root, file)) ? sha(readFileSync(join(root, file))) : null,
      summary: text.trim().split('\n').at(-1) ?? '' });
  });
})));
const hashOf = path => sha(readFileSync(join(root, path)));
const manifest = {
  label, startedAt, finishedAt: new Date().toISOString(),
  commit: git(['rev-parse', 'HEAD']).trim(), branch: git(['branch', '--show-current']).trim(),
  dirty: { trackedFiles: git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean), patchSha256: patch ? sha(patch) : null, untracked },
  sourceSha256: digest(files('src')), node: process.version, baseline: profile.id,
  flags: Object.fromEntries(Object.keys(profile.flags).map(key => [key, env[key] ?? null])), overrides, diagnostic,
  traceArgs, shards,
  tools: Object.fromEntries(['scripts/diag/open-field/trace.ts', 'scripts/diag/zone-lab/lab.ts', 'scripts/diag/open-field/common.sh',
    'scripts/diag/open-field/report.py', 'scripts/mechanics/metrics.py'].map(p => [p, hashOf(p)])),
};
writeFileSync(join(out, `${label}.manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
for (const s of shards) console.log(`shard ${s.shard}: exit ${s.exitCode} ${s.summary}`);
console.log(`manifest out/open-field/${label}.manifest.json (commit ${manifest.commit.slice(0, 8)}${patch ? ', dirty' : ''})`);
process.exitCode = shards.every(s => s.exitCode === 0) ? 0 : 1;
