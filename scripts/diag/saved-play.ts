/** Constructor-input restoration only. No live PlaySim/brain serializer. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { Rng } from '../../src/core/rng.js';
import type { PlayLog, PlaySetupContext } from '../../src/game/game.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { CoverageScouting } from '../../src/sim/qbmind.js';
import { ScoutingReport } from '../../src/sim/recognition.js';
import type { PlayResult } from '../../src/sim/types.js';
import type { CommandTraceSelection } from '../../src/sim/command-trace.js';
import { engineSettings } from '../scorecard/provenance.js';
import { sourceVersion } from '../source-version.js';

export const copySaved = <T>(value: T): T => deserialize(serialize(value));
export const bytesHash = (value: Buffer) => createHash('sha256').update(value).digest('hex');

export function executionIdentity() {
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    engineSha256: sourceVersion(), settings: engineSettings(process.env), node: process.version,
    lockfileSha256: bytesHash(readFileSync('package-lock.json')) };
}

/** V8 keeps Maps, undefined, nonfinite numbers, property order and shared references.
 * Refuse unknown prototypes/functions instead of silently losing their behavior. */
export function captureSetup(setup: Readonly<PlaySetup>): Buffer {
  const visited = new WeakSet<object>();
  function check(value: unknown): void {
    if (typeof value === 'function' || typeof value === 'symbol') throw new Error('Unsupported callable/symbol in PlaySetup');
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    const proto = Object.getPrototypeOf(value);
    if (![Object.prototype, null, Array.prototype, Map.prototype, Rng.prototype, ScoutingReport.prototype, CoverageScouting.prototype].includes(proto))
      throw new Error(`Unsupported PlaySetup prototype: ${proto?.constructor?.name}`);
    if (value instanceof Map) for (const [k, v] of value) { check(k); check(v); }
    else for (const v of Object.values(value)) check(v);
  }
  check(setup);
  return serialize(setup);
}

/** Same known-class rehydration as saved-exchange.ts; V8 already restored Maps.
 * Assign the entire RNG state, including spareNormal, rather than reseeding by key. */
export function restoreSetup(bytes: Buffer): PlaySetup {
  const setup = deserialize(bytes) as PlaySetup;
  if (setup.energy !== undefined && !(setup.energy instanceof Map)) throw new Error('Saved energy is not a Map');
  if (typeof setup.seed !== 'number') setup.seed = Object.assign(new Rng(0), setup.seed);
  if (setup.scouting) {
    if (!((setup.scouting as unknown as { cells: unknown }).cells instanceof Map)) throw new Error('Saved scouting cells are not a Map');
    setup.scouting = Object.assign(new ScoutingReport(), setup.scouting);
  }
  if (setup.coverageScouting) setup.coverageScouting = Object.assign(new CoverageScouting(), setup.coverageScouting);
  return setup;
}

export function initialState(sim: PlaySim) {
  return copySaved({ rng: { ...sim.rng }, offCall: sim.offCall, defCall: sim.defCall, snapContext: sim.snapContext,
    snapAssessment: sim.snapAssessment, qbRead: sim.stats.qbRead,
    actors: sim.agents.map(a => ({ playerId: a.player.id, team: a.team, slot: a.slot, energy: a.body.energy, snapReadyAt: a.snapReadyAt })) });
}

/** Game replay envelope, using the original game-side presentation context.
 * Frames/events/telemetry are the independently executed play's own data. */
export function replayState(sim: PlaySim, result: PlayResult, context: PlaySetupContext): PlayLog['replay'] {
  if (!result.frames) return undefined;
  return { frames: result.frames,
    players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      pos: a.player.position, weightLb: a.player.measurables.weightLb })),
    los: sim.los, firstDownX: sim.firstDownX, flip: context.state.possession === 'away',
    events: result.events, telemetry: result.telemetry,
    profiles: result.telemetry ? sim.agents.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
      weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) : undefined };
}

export interface SavedPlay {
  format: 'constructor-play-v1';
  identity: ReturnType<typeof executionIdentity>;
  game: { seed: number; steps: number; complete: boolean; playId: string };
  context: PlaySetupContext;
  setup: Buffer;
  setupSha256: string;
  original: { initial: ReturnType<typeof initialState>; result: PlayResult; replay: PlayLog['replay'] };
  film: PlayLog;
}

export function readSavedPlay(path: string): SavedPlay {
  const saved = deserialize(readFileSync(path)) as SavedPlay;
  if (saved.format !== 'constructor-play-v1' || !Buffer.isBuffer(saved.setup)) throw new Error('Unsupported saved play format');
  if (bytesHash(saved.setup) !== saved.setupSha256) throw new Error('Saved setup checksum mismatch');
  return saved;
}

export function runRestoredPlay(saved: SavedPlay, selection?: CommandTraceSelection) {
  const sim = new PlaySim(restoreSetup(saved.setup));
  const initial = initialState(sim);
  const trace = selection && sim.recordCommands(selection);
  const result = sim.run();
  const execution = { initial, result, replay: replayState(sim, result, saved.context) };
  return { sim, trace, execution, difference: compareExecution(saved.original, execution) };
}

export interface ExecutionDifference {
  path: string;
  time: number;
  timeBasis: 'initialization' | 'recorded' | 'result-end';
  expected: unknown;
  actual: unknown;
}

/** Exact values and property presence, not a hash of selected statistics. */
export function firstDifference(expected: unknown, actual: unknown, path = '$', time = 0,
  timeBasis: ExecutionDifference['timeBasis'] = 'initialization'): ExecutionDifference | null {
  if (Object.is(expected, actual)) return null;
  const difference = (e: unknown, a: unknown): ExecutionDifference => ({ path, time, timeBasis,
    expected: e === undefined ? '<undefined>' : e, actual: a === undefined ? '<undefined>' : a });
  if (Array.isArray(expected) && Array.isArray(actual)) {
    for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
      const d = firstDifference(expected[i], actual[i], `${path}[${i}]`, time, timeBasis);
      if (d) return d;
    }
    if (expected.length !== actual.length) {
      const i = Math.min(expected.length, actual.length), row = expected[i] ?? actual[i];
      return { path: `${path}[${i}]`, time: typeof row?.t === 'number' ? row.t : time,
        timeBasis: typeof row?.t === 'number' ? 'recorded' : timeBasis,
        expected: i >= expected.length ? '<absent>' : expected[i] === undefined ? '<undefined>' : expected[i],
        actual: i >= actual.length ? '<absent>' : actual[i] === undefined ? '<undefined>' : actual[i] };
    }
    return null;
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const e = expected as Record<string, unknown>, a = actual as Record<string, unknown>;
    if (typeof e.t === 'number' || typeof a.t === 'number') {
      time = Math.min(typeof e.t === 'number' ? e.t : Infinity, typeof a.t === 'number' ? a.t : Infinity);
      timeBasis = 'recorded';
    }
    for (const key of new Set([...Object.keys(e), ...Object.keys(a)])) {
      if (Object.hasOwn(e, key) !== Object.hasOwn(a, key)) return { path: `${path}.${key}`, time, timeBasis,
        expected: Object.hasOwn(e, key) ? e[key] === undefined ? '<undefined>' : e[key] : '<absent>',
        actual: Object.hasOwn(a, key) ? a[key] === undefined ? '<undefined>' : a[key] : '<absent>' };
      const d = firstDifference(e[key], a[key], `${path}.${key}`, time, timeBasis);
      if (d) return d;
    }
    return null;
  }
  return difference(expected, actual);
}

/** Earliest recorded disagreement across streams; summary-only differences are endpoint facts.
 * This identifies the first saved witness, not an unrecorded substep or causal decision. */
export function compareExecution(expected: SavedPlay['original'], actual: SavedPlay['original']): ExecutionDifference | null {
  const initialization = firstDifference(expected.initial, actual.initial, '$.initial');
  const differences: ExecutionDifference[] = [];
  if (initialization) differences.push(initialization);
  for (const [path, e, a] of [
    ['$.result.frames', expected.result.frames, actual.result.frames],
    ['$.result.events', expected.result.events, actual.result.events],
    ['$.result.telemetry.frames', expected.result.telemetry?.frames, actual.result.telemetry?.frames],
    ['$.result.telemetry.decisions', expected.result.telemetry?.decisions, actual.result.telemetry?.decisions],
  ] as const) {
    const d = firstDifference(e, a, path, Math.min(expected.result.duration, actual.result.duration), 'result-end');
    if (d) differences.push(d);
  }
  const complete = firstDifference(expected, actual, '$', Math.min(expected.result.duration, actual.result.duration), 'result-end');
  if (complete) differences.push(complete);
  return differences.sort((a, b) => a.time - b.time)[0] ?? null;
}

export function identityDifference(saved: SavedPlay): ExecutionDifference | null {
  const { commit: oldCommit, ...before } = saved.identity;
  const { commit: newCommit, ...now } = executionIdentity();
  return firstDifference(before, now, '$.identity');
}
