/** Run comparisons with one explicit profile; never print unrelated environment values. */
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const profile = JSON.parse(readFileSync(join(root, 'config/baseline.json'), 'utf8'));
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]).sort();
const digest = paths => {
  const hash = createHash('sha256');
  for (const path of [...paths].sort()) hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0');
  return hash.digest('hex');
};

export function environment(ambient, overrides = []) {
  const env = { ...ambient };
  for (const [key, value] of Object.entries(profile.flags)) {
    if (value === null) delete env[key];
    else env[key] = value;
  }
  for (const setting of overrides) {
    const index = setting.indexOf('='), key = setting.slice(0, index), value = setting.slice(index + 1);
    if (index < 1 || !Object.hasOwn(profile.flags, key)) throw new Error(`Unknown baseline flag: ${setting}`);
    if (key === 'CF_FLOW') {
      if (!['none', 'hold', 'over'].includes(value)) throw new Error('CF_FLOW must be none, hold or over');
      if (value === 'none') delete env[key]; else env[key] = value;
    } else if (['GAIT_STEP', 'HOLD_SUBSTEPS', 'DEF_GETOFF'].includes(key)) {
      if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0
        || (key === 'HOLD_SUBSTEPS' && !Number.isInteger(Number(value)))) throw new Error(`Invalid numeric flag: ${setting}`);
      env[key] = value;
    } else {
      if (!['0', '1'].includes(value)) throw new Error(`Flag requires 0 or 1: ${setting}`);
      env[key] = value;
    }
  }
  return env;
}

export function checkFlags(names) {
  const declared = Object.keys(profile.flags);
  // The profile is historical (docs/BASELINE.md): a flag deleted from the engine may stay listed, so only a flag the
  // profile lacks is an error.
  const missing = names.filter(name => !declared.includes(name));
  if (missing.length) throw new Error(`Baseline flag inventory differs: missing [${missing}]`);
}

/** Default preserves all checks; opt-in early exit retains skipped evidence. */
export async function runCommands(commands, run, failFast = false) {
  const results = [], skipped = [];
  for (let i = 0; i < commands.length; i++) {
    const result = await run(commands[i]); results.push(result);
    if (failFast && result.exitCode !== 0) { skipped.push(...commands.slice(i + 1)); break; }
  }
  return { commands: results, skippedCommands: skipped };
}

async function main() {
  if (process.versions.node !== profile.nodeVersion) throw new Error(`Use Node ${profile.nodeVersion} from .nvmrc; current Node is ${process.versions.node}`);
  const args = process.argv.slice(2), overrides = [];
  let info = false, candidate = false, verify = false, failFast = false, receipt, command = [];
  while (args.length) {
    const arg = args.shift();
    if (arg === '--') { command = args.splice(0); break; }
    if (arg === '--info') info = true;
    else if (arg === '--candidate') candidate = true;
    else if (arg === '--verify') verify = true;
    else if (arg === '--fail-fast') failFast = true;
    else if (arg === '--flag' && args.length) overrides.push(args.shift());
    else if (arg === '--receipt' && args.length) receipt = args.shift();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  const sourceFiles = files('src');
  checkFlags([...new Set(sourceFiles.flatMap(path => [...readFileSync(join(root, path), 'utf8')
    .matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(match => match[1])))]);
  const source = digest(sourceFiles);
  if (source !== profile.sourceSha256 && !candidate) throw new Error('Runtime differs from the pinned baseline; use --candidate to record a candidate run');
  const env = environment(process.env, overrides);
  // Child npm/node commands must use the same pinned runtime as this launcher.
  env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ''}`;
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  // Include actual test/diagnostic sources, including new untracked files,
  // while excluding ignored Python caches and generated build/report output.
  const validationFiles = () => git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--',
    'test', 'scripts', 'config', 'vitest.config.ts', 'package.json', 'package-lock.json', '.nvmrc'])
    .split('\0').filter(Boolean);
  const metadata = { baseline: profile.id, branch: git(['branch', '--show-current']), commit: git(['rev-parse', 'HEAD']),
    mode: candidate ? 'candidate' : overrides.length ? 'experiment' : 'baseline', node: process.version, failFast,
    platform: process.platform, arch: process.arch, sourceSha256: source, validationSha256: digest(validationFiles()),
    flags: Object.fromEntries(Object.keys(profile.flags).map(key => [key, env[key] ?? null])),
    worldDefaults: profile.worldDefaults, trackedChanges: git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean) };
  if (info) { console.log(JSON.stringify(metadata, null, 2)); return; }
  if (verify && command.length) throw new Error('--verify does not take a command');
  if (!verify && !command.length) throw new Error('Use --info, --verify, or -- followed by a command');
  const commands = verify ? [['npm', 'run', 'typecheck'], ['npm', 'run', 'build'],
    ['npm', 'run', 'test:all'], ['npm', 'run', 'test:data']] : [command];
  receipt ??= `out/baseline/${verify ? 'verify' : 'run'}-${Date.now()}-${process.pid}.json`;
  const result = { ...metadata, startedAt: new Date().toISOString(), commands: [], skippedCommands: [] };
  console.log(`Profile ${metadata.mode}: ${profile.id}, commit ${metadata.commit}, source ${source}`);
  Object.assign(result, await runCommands(commands, async ([executable, ...args]) => {
    console.log(`Running ${executable} ${args.join(' ')}`);
    const start = performance.now();
    const exitCode = await new Promise(resolve => {
      const child = spawn(executable, args, { cwd: root, env, stdio: 'inherit' });
      child.on('error', error => { console.error(error.message); resolve(1); });
      child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    });
    return { command: [executable, ...args], exitCode, elapsedSeconds: (performance.now() - start) / 1000 };
  }, failFast));
  result.finishedAt = new Date().toISOString();
  result.inputsUnchanged = source === digest(files('src')) && metadata.validationSha256 === digest(validationFiles())
    && metadata.commit === git(['rev-parse', 'HEAD']);
  result.exitCode = result.inputsUnchanged && !result.skippedCommands.length && result.commands.every(row => row.exitCode === 0) ? 0 : 1;
  const destination = join(root, receipt);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
  console.log(`Validation receipt: ${receipt}; exit ${result.exitCode}`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
