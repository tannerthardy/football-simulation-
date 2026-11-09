/**
 * Run a command on the shared reference stack (config/reference-stack.json).
 *
 *   npm run ref -- <command...>                    # the reference stack
 *   npm run ref -- --flag ZONE_RUN=0 -- <command>  # the stack with one change
 *   npm run ref -- --off -- <command>              # every experimental flag at its code default
 *   npm run ref -- --list
 *
 * Every flag named in the stack file is set explicitly (on -> 1, everything
 * else -> unset), so ambient environment never leaks into a measurement.
 * Prints one line naming the stack id, commit and any deviations.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const stack = JSON.parse(readFileSync(join(root, 'config/reference-stack.json'), 'utf8'));
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
/** Flags the source reads as `=== '1'` (off unless set). */
export const experimental = () => [...new Set(files('src').flatMap(p =>
  [...readFileSync(join(root, p), 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*) === '1'/g)].map(m => m[1])))].sort();

export function environment(ambient, overrides = [], off = false) {
  const env = { ...ambient }, known = Object.keys(stack.flags);
  for (const name of known) { if (stack.flags[name] === 'on' && !off) env[name] = '1'; else delete env[name]; }
  for (const setting of overrides) {
    const [name, value] = setting.split('=');
    if (!known.includes(name) || !['0', '1'].includes(value)) throw new Error(`Use --flag NAME=0|1 with a flag from the stack file: ${setting}`);
    if (value === '1' && stack.flags[name] === 'retired') throw new Error(`${name} is retired (docs/REFERENCE_STACK.md); it stays off`);
    if (value === '1') env[name] = '1'; else delete env[name];
  }
  return env;
}

async function main() {
  const args = process.argv.slice(2), overrides = []; let off = false, list = false, command = [];
  while (args.length) {
    const a = args.shift();
    if (a === '--') { command = args.splice(0); break; }
    if (a === '--flag' && args.length) overrides.push(args.shift());
    else if (a === '--off') off = true;
    else if (a === '--list') list = true;
    else { command = [a, ...args.splice(0)]; break; }
  }
  const src = experimental(), known = Object.keys(stack.flags);
  const missing = src.filter(n => !known.includes(n)), stale = known.filter(n => !src.includes(n));
  if (missing.length || stale.length) throw new Error(`config/reference-stack.json differs from src: undeclared [${missing}], not in src [${stale}]`);
  if (list) { for (const s of ['on', 'off', 'retired']) console.log(`${s}: ${known.filter(n => stack.flags[n] === s).join(' ')}`); return; }
  if (!command.length) throw new Error('Give a command to run (see the header of scripts/ref.mjs)');
  const env = environment(process.env, overrides, off);
  let commit = 'unknown'; try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch {}
  console.error(`[ref] stack ${stack.id}${off ? ' (all off)' : ''} @ ${commit}${overrides.length ? `, changed: ${overrides.join(' ')}` : ''}`);
  const child = spawn(command[0], command.slice(1), { cwd: process.cwd(), env, stdio: 'inherit' });
  child.on('error', e => { console.error(e.message); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e.message); process.exitCode = 1; });
