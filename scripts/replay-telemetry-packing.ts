/** Per-play lossless compression. Browsing metadata and positional paths stay
 * synchronous; the browser expands only selected telemetry, in a bounded cache.
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import type { ReplayTelemetry } from '../src/sim/types.js';
import type { packReplayPlay } from './replay-data.js';

export interface PackedTelemetry {
  encoding: 'gzip-base64';
  version: 1;
  level: ReplayTelemetry['level'];
  sampleEvery: number;
  sampleSeconds?: number;
  unavailable: string[];
  data: string;
}

export function packTelemetry(telemetry: ReplayTelemetry): PackedTelemetry {
  return { encoding: 'gzip-base64', version: 1, level: telemetry.level,
    sampleEvery: telemetry.sampleEvery, sampleSeconds: telemetry.sampleSeconds,
    unavailable: telemetry.unavailable.slice(),
    data: gzipSync(JSON.stringify(telemetry), { level: 9 }).toString('base64') };
}

/** Also used by offline tools/tests. Browser uses the same gzip JSON contract. */
export function unpackTelemetry(telemetry: PackedTelemetry): ReplayTelemetry {
  if (telemetry.encoding !== 'gzip-base64' || telemetry.version !== 1) throw new Error('Unsupported replay telemetry encoding');
  const decoded = JSON.parse(gunzipSync(Buffer.from(telemetry.data, 'base64')).toString('utf8')) as ReplayTelemetry;
  if (decoded.version !== 1 || decoded.level !== telemetry.level || !Array.isArray(decoded.frames) || !Array.isArray(decoded.decisions)) {
    throw new Error('Invalid decoded replay telemetry');
  }
  return decoded;
}

export function compactReplayPlays(plays: Array<ReturnType<typeof packReplayPlay>>) {
  return plays.map(p => 'telemetry' in p && p.telemetry ? { ...p, telemetry: packTelemetry(p.telemetry) } : p);
}
