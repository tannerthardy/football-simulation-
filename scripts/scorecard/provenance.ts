/** Scorecard identities and timing conditions; never inspect unrelated environment values. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import type { GameRec, GameSpec } from './records.js';
import type { Team } from '../../src/league/team.js';

export type Settings = Record<string, boolean | number | string | null>;
export interface Provenance {
  engineSha256: string;
  measurementSha256: string;
  lockfileSha256: string;
  platform: string;
  arch: string;
  cpuModel: string | null;
  cpuQuotaCores: number | 'unlimited' | null;
  execution: 'node --import tsx';
}
export interface Arm {
  name: string;
  env: Record<string, string>;
  games: GameRec[];
  settings?: Settings;
  workerProcesses?: number;
}
export interface Card {
  meta: {
    commit: string; date: string; seed: number; games: number; leagues: number; node: string;
    provenance?: Provenance;
    probes?: string[];
    workersRequested?: number;
    workersUsed?: number;
    wallMs?: number;
    timing?: { gameMs: 'simulateGame-elapsed'; wallMs: 'collection-elapsed'; cpu: 'not-collected' };
  };
  arms: Arm[];
}

const paths = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? paths(join(dir, e.name)) : [join(dir, e.name)]).sort();
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const digest = (files: string[]) => {
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
};
export const measurementIdentity = () => digest(paths('scripts/scorecard'));

/** Resolve the switches actually read in this source, including inherited values and source defaults.
 * New unsupported read forms fail rather than silently omitting a setting. This
 * does not apply config/baseline.json or change the worker's environment.
 */
export function engineSettings(env: NodeJS.ProcessEnv,
  source = paths('src').map((f) => readFileSync(f, 'utf8')).join('\n')): Settings {
  if (/process\.env(?!\.[A-Z][A-Z0-9_]*\b)/.test(source)) throw new Error('Unsupported engine environment access');
  const names = [...new Set([...source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]))].sort();
  return Object.fromEntries(names.map((name) => {
    const read = `process\\.env\\.${name}\\b`;
    const uses = [...source.matchAll(new RegExp(read, 'g'))].length;
    const numeric = [...source.matchAll(new RegExp(`Number\\(${read} \\?\\? (\\d+)\\)`, 'g'))];
    const off = [...source.matchAll(new RegExp(`${read} === '1'`, 'g'))].length;
    const on = [...source.matchAll(new RegExp(`${read} !== '0'`, 'g'))].length
      + (name === 'LIVE_AIM' ? [...source.matchAll(new RegExp(`${read} === '0'`, 'g'))].length : 0);
    let value: Settings[string];
    if (numeric.length === uses && numeric.every((m) => m[1] === numeric[0][1])) {
      value = Number(env[name] ?? numeric[0][1]);
      if (!Number.isFinite(value)) throw new Error(`Nonfinite engine setting: ${name}`);
    } else if (name === 'CF_FLOW') {
      if (uses !== 3 || !source.includes("process.env.CF_FLOW === 'hold' || process.env.CF_FLOW === 'over' ? process.env.CF_FLOW : null"))
        throw new Error('Unsupported CF_FLOW setting read');
      value = env[name] === 'hold' || env[name] === 'over' ? env[name]! : null;
    } else if (off === uses) value = env[name] === '1';
    else if (on === uses) value = env[name] !== '0';
    else throw new Error(`Unsupported engine setting read: ${name}`);
    return [name, value];
  }));
}

export function provenance(): Provenance {
  let cpuQuotaCores: Provenance['cpuQuotaCores'] = null;
  try {
    const [quota, period] = readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(/\s+/);
    if (quota === 'max') cpuQuotaCores = 'unlimited';
    else if (Number(period) > 0 && Number.isFinite(Number(quota))) cpuQuotaCores = Number(quota) / Number(period);
  } catch { /* Quota metadata is unavailable on some supported hosts. */ }
  return {
    engineSha256: digest(paths('src')),
    measurementSha256: measurementIdentity(),
    lockfileSha256: sha256(readFileSync('package-lock.json', 'utf8')),
    platform: process.platform, arch: process.arch, cpuModel: cpus()[0]?.model ?? null,
    cpuQuotaCores, execution: 'node --import tsx',
  };
}

/** Actual pre-simulation inputs, outside the game's elapsed timer; no simulation or RNG draw. */
export function inputIdentity(spec: GameSpec, home: Team, away: Team, record: boolean): string {
  return sha256(JSON.stringify({ spec, home, away, record }));
}

export function compatibility(base: Card, now: Card, b: Arm, n: Arm): { measurements: string[]; timing: string[] } {
  const measurements: string[] = [];
  const timing: string[] = [];
  if (!base.meta.provenance?.engineSha256 || !now.meta.provenance?.engineSha256) measurements.push('engine source identity unavailable');
  for (const key of ['measurementSha256', 'lockfileSha256'] as const) {
    const x = base.meta.provenance?.[key], y = now.meta.provenance?.[key];
    if (!x || !y) measurements.push(`${key} unavailable`);
    else if (x !== y) measurements.push(`${key} differs`);
  }
  if (!base.meta.node || !now.meta.node) measurements.push('Node runtime unavailable');
  else if (base.meta.node !== now.meta.node) measurements.push('Node runtime differs');
  for (const key of ['platform', 'arch', 'execution'] as const) {
    const x = base.meta.provenance?.[key], y = now.meta.provenance?.[key];
    if (!x || !y) measurements.push(`${key} unavailable`);
    else if (x !== y) measurements.push(`${key} differs`);
  }
  if (!base.meta.probes || !now.meta.probes) measurements.push('probe selection unavailable');
  else if (JSON.stringify([...base.meta.probes].sort()) !== JSON.stringify([...now.meta.probes].sort())) measurements.push('probe selection differs');
  if (b.games.length !== n.games.length) measurements.push('game count differs');
  else if (b.games.some((g, i) => !g.inputSha256 || !n.games[i].inputSha256)) measurements.push('actual input identity unavailable');
  else if (b.games.some((g, i) => g.inputSha256 !== n.games[i].inputSha256)) measurements.push('actual game inputs differ');
  if (!b.settings || !n.settings) measurements.push('resolved engine settings unavailable');
  // Settings and engine source may differ intentionally; report both as the treatment, not a mismatch.
  if (!base.meta.timing || !now.meta.timing) timing.push('timing definition unavailable');
  else if (JSON.stringify(base.meta.timing) !== JSON.stringify(now.meta.timing)) timing.push('timing definition differs');
  for (const key of ['workersUsed'] as const) {
    if (base.meta[key] === undefined || now.meta[key] === undefined) timing.push(`${key} unavailable`);
    else if (base.meta[key] !== now.meta[key]) timing.push(`${key} differs`);
  }
  if (b.workerProcesses === undefined || n.workerProcesses === undefined) timing.push('arm worker count unavailable');
  else if (b.workerProcesses !== n.workerProcesses) timing.push('arm worker count differs');
  for (const key of ['cpuModel', 'cpuQuotaCores'] as const) {
    // Arms in one card share the captured host even when its metadata is unavailable.
    if (base === now) continue;
    const x = base.meta.provenance?.[key], y = now.meta.provenance?.[key];
    if (x == null || y == null) timing.push(`${key} unavailable`);
    else if (x !== y) timing.push(`${key} differs`);
  }
  return { measurements, timing };
}
