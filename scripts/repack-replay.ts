/** Rebuild a saved replay with the current viewer and lossless per-play gzip.
 * No simulation or source-version substitution. All outer fields and decoded
 * telemetry are checked against the original before writing.
 * node --import tsx scripts/repack-replay.ts saved.html output.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayTelemetry } from '../src/sim/types.js';
import { packTelemetry, unpackTelemetry, type PackedTelemetry } from './replay-telemetry-packing.js';

interface SavedPlay { telemetry?: ReplayTelemetry | PackedTelemetry; [field: string]: unknown }
interface SavedReplay { plays: SavedPlay[]; meta?: { sourceSha256?: string }; [field: string]: unknown }

const [input, output] = process.argv.slice(2);
if (!input || !output || process.argv.length !== 4) throw new Error('Usage: repack-replay.ts saved.html output.html');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalHtml = readFileSync(resolve(root, input), 'utf8');
const payload = originalHtml.match(/const REPLAY = ([\s\S]*?);\n/);
if (!payload) throw new Error('Input does not contain the supported standalone replay data marker');
const data = JSON.parse(payload[1]) as SavedReplay;
if (!data || !Array.isArray(data.plays)) throw new Error('Input does not contain a replay library');
const { plays: originalPlays, ...originalMetadata } = data;
let checked = 0;
const compacted = originalPlays.map(p => {
  if (!p.telemetry) return p;
  const packed = 'encoding' in p.telemetry ? p.telemetry : packTelemetry(p.telemetry);
  const original = 'encoding' in p.telemetry ? unpackTelemetry(p.telemetry) : p.telemetry;
  if (JSON.stringify(unpackTelemetry(packed)) !== JSON.stringify(original)) throw new Error(`Telemetry changed: ${p.id ?? checked}`);
  const out = { ...p, telemetry: packed };
  const { telemetry: _originalTrace, ...originalOuter } = p;
  const { telemetry: _packedTrace, ...packedOuter } = out;
  if (JSON.stringify(originalOuter) !== JSON.stringify(packedOuter)) throw new Error(`Outer play fields changed: ${p.id ?? checked}`);
  checked++;
  return out;
});
const compactData = { ...data, plays: compacted };
const { plays: _compactedPlays, ...compactedMetadata } = compactData;
if (JSON.stringify(originalMetadata) !== JSON.stringify(compactedMetadata)) throw new Error('Library metadata changed');
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Current viewer template has no replay marker');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${template.replace(marker, () => JSON.stringify(compactData).replace(/<\//g, '<\\/'))}\n</body></html>\n`;
const outputPath = resolve(root, output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(JSON.stringify({ input, output, source: data.meta?.sourceSha256,
  entries: data.plays.length, telemetryRoundtrips: checked, originalBytes: Buffer.byteLength(originalHtml),
  compactBytes: Buffer.byteLength(html), outerFieldsUnchanged: true, metadataUnchanged: true }, null, 2));
