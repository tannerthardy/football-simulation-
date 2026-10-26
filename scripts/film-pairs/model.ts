/** Pair-only metadata. Saved constructor binaries remain the input authority. */
import { createHash } from 'node:crypto';
import type { SavedPlay } from '../diag/saved-play.js';
import type { PlayResult } from '../../src/sim/types.js';

export interface Selection {
  id: string;
  note?: string;
  path?: string;
  sha256?: string;
  seed?: number;
  game?: number;
  play?: number;
  maxSteps?: number;
}
export interface PairManifest {
  format: 'film-pairs-v1';
  captureRef?: string;
  sources?: Record<string, { path: string; sha256?: string }>;
  plays: (Selection | string)[];
}
export interface Captured {
  id: string; note: string; path: string; fileSha256: string; setupSha256: string;
  schemaSha256: string; captureCommit: string;
}
export interface ArmRecord {
  identity: SavedPlay['identity']; inputSha256: string; inputRngSha256: string;
  inputPersonnelSha256: string; initialization: SavedPlay['original']['initial'];
  execution?: SavedPlay['original'];
}
export const digest = (v: string | Buffer): string => createHash('sha256').update(v).digest('hex');

/** Conservative compatibility check: don't silently discard a changed setup contract. */
export function setupSchema(source: string): string {
  const begin = source.indexOf('export interface PlaySetup {');
  if (begin < 0) throw Error('Unsupported source: PlaySetup interface missing');
  let depth = 0;
  for (let i = source.indexOf('{', begin); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return digest(source.slice(begin, i + 1));
  }
  throw Error('Unsupported source: incomplete PlaySetup interface');
}
export function selections(input: unknown): { manifest: PairManifest; plays: Selection[] } {
  const m = input as PairManifest;
  if (m?.format !== 'film-pairs-v1' || !Array.isArray(m.plays) || !m.plays.length)
    throw Error('Expected film-pairs-v1 with a nonempty plays array');
  const ids = new Set<string>();
  const plays = m.plays.map(value => {
    const p: Selection = typeof value === 'string' ? { id: value, ...m.sources?.[value] } : { ...value };
    if (!p.id || typeof p.id !== 'string' || ids.has(p.id)) throw Error('Missing or duplicate play id');
    ids.add(p.id);
    if (p.note !== undefined && (typeof p.note !== 'string' || /[\r\n]/.test(p.note))) throw Error('Note must be one line');
    if (p.path !== undefined) {
      if (typeof p.path !== 'string' || !p.path || p.seed !== undefined || p.game !== undefined || p.play !== undefined)
        throw Error(`Ambiguous saved-path selector: ${p.id}`);
    } else if (!Number.isSafeInteger(p.seed) || p.seed! < 0 || p.seed! > 0xffffffff
      || !Number.isSafeInteger(p.game) || p.game! < 1 || p.seed! + p.game! - 1 > 0xffffffff
      || !Number.isSafeInteger(p.play) || p.play! < 1) {
      throw Error(`Unresolved saved id or invalid seed/game/play selector: ${p.id}`);
    }
    if (p.maxSteps !== undefined && (!Number.isSafeInteger(p.maxSteps) || p.maxSteps < 1)) throw Error('Invalid maxSteps');
    if (p.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(p.sha256)) throw Error('Invalid capture SHA256');
    return p;
  });
  return { manifest: m, plays };
}
export function outcome(result: PlayResult) {
  const contact = result.events.filter(e => ['carrier_contact', 'tackle_wrap', 'hit', 'sack'].includes(e.type));
  return { yards: result.yards, outcome: result.outcome,
    firstContact: contact.length ? Math.min(...contact.map(e => e.t)) : null,
    tackles: result.events.filter(e => e.type === 'tackle').length,
    missedTackles: result.events.filter(e => e.type === 'missed_tackle').length };
}

/** Stable, lossless value encoding for recorded executions. Raw V8 buffers may
 * differ for equal numbers because allocation/number representation differs.
 * Constructor authority remains its original untouched V8 bytes. */
export function executionBytes(value: unknown): Buffer {
  const ancestors = new Set<object>();
  const encode = (v: any): unknown => {
    if (v === null) return ['null'];
    if (v === undefined) return ['undefined'];
    if (typeof v === 'number') return ['number', Object.is(v, -0) ? '-0' : String(v)];
    if (typeof v === 'string' || typeof v === 'boolean') return [typeof v, v];
    if (typeof v !== 'object') throw Error('Unsupported callable/symbol/bigint in recorded execution');
    if (ancestors.has(v)) throw Error('Unsupported cyclic recorded execution');
    ancestors.add(v);
    let result: unknown;
    if (Array.isArray(v)) result = ['array', Array.from({ length: v.length }, (_, i) => Object.hasOwn(v, i) ? encode(v[i]) : ['hole'])];
    else if (v instanceof Map) result = ['map', [...v].map(([k, item]) => [encode(k), encode(item)])];
    else if (v instanceof Set) result = ['set', [...v].map(encode)];
    else if (ArrayBuffer.isView(v)) result = ['typed', v.constructor.name, Array.from(v as any).map(encode)];
    else result = ['object', Object.keys(v).sort().map(k => [k, encode(v[k])])];
    ancestors.delete(v); return result;
  };
  return Buffer.from(JSON.stringify(encode(value)));
}
