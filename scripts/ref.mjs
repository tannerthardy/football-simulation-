/**
 * Run a command on the shared reference stack (config/reference-stack.json).
 *
 * Since the 2026-11-09 promotion the stack IS the engine's default: every flag
 * the file lists `on` is read as `!== '0'` in src, every `off` or `retired`
 * flag as `=== '1'`. So `npm run ref -- <command>` and a bare `<command>` in a
 * clean shell run the same engine; `ref` exists to guarantee the clean shell.
 *
 *   npm run ref -- <command...>                    # the reference stack (= code defaults), ambient flags reset
 *   npm run ref -- --flag ZONE_RUN=0 -- <command>  # the stack with one change
 *   npm run ref -- --off -- <command>              # the legacy engine: every listed flag off, as before the promotion
 *   npm run ref -- --list
 *
 * Every flag named in the stack file is set explicitly (on -> 1, else 0), so
 * ambient environment never leaks into a measurement.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const stack = JSON.parse(readFileSync(join(root, 'config/reference-stack.json'), 'utf8'));
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
/** How src reads each flag: `off` for `=== '1'` (off unless set), `on` for `!== '0'` (on unless set to 0). */
export const reads = () => { const out = {};
  for (const p of files('src')) for (const m of readFileSync(join(root, p), 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*) (=== '1'|!== '0')/g)) out[m[1]] = m[2] === "=== '1'" ? 'off' : 'on';
  return out; };
/** Flags the source reads as `=== '1'` (off unless set). */
export const experimental = () => Object.entries(reads()).filter(([, v]) => v === 'off').map(([k]) => k).sort();
/** Where the stack file and src disagree; empty when the stack is the code default. */
export function mismatches() {
  const r = reads(), known = Object.keys(stack.flags);
  return { undeclared: experimental().filter(n => !known.includes(n)), notInSrc: known.filter(n => !(n in r)),
    wrongDefault: known.filter(n => n in r && r[n] !== (stack.flags[n] === 'on' ? 'on' : 'off')) };
}

export function environment(ambient, overrides = [], off = false) {
  const env = { ...ambient }, known = Object.keys(stack.flags);
  for (const name of known) env[name] = stack.flags[name] === 'on' && !off ? '1' : '0';
  for (const setting of overrides) {
    const [name, value] = setting.split('=');
    if (!known.includes(name) || !['0', '1'].includes(value)) throw new Error(`Use --flag NAME=0|1 with a flag from the stack file: ${setting}`);
    if (value === '1' && stack.flags[name] === 'retired') throw new Error(`${name} is retired (docs/REFERENCE_STACK.md); it stays off`);
    env[name] = value;
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
  const known = Object.keys(stack.flags), bad = mismatches();
  if (bad.undeclared.length || bad.notInSrc.length || bad.wrongDefault.length)
    throw new Error(`config/reference-stack.json differs from src: undeclared [${bad.undeclared}], not in src [${bad.notInSrc}], default differs from the stack [${bad.wrongDefault}]`);
  if (list) { for (const s of ['on', 'off', 'retired']) console.log(`${s}: ${known.filter(n => stack.flags[n] === s).join(' ')}`); return; }
  if (!command.length) throw new Error('Give a command to run (see the header of scripts/ref.mjs)');
  const env = environment(process.env, overrides, off);
  let commit = 'unknown'; try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch {}
  console.error(`[ref] stack ${stack.id}${off ? ' (legacy: all off)' : ''} @ ${commit}${overrides.length ? `, changed: ${overrides.join(' ')}` : ''}`);
  const child = spawn(command[0], command.slice(1), { cwd: process.cwd(), env, stdio: 'inherit' });
  child.on('error', e => { console.error(e.message); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e.message); process.exitCode = 1; });
