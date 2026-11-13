/** Restore one exact component packet from its verified shared rows.
 * Usage: node restore-component.mjs final.json.gz receipt.json output.json.gz
 * No engine imports, simulation, generic delta format or inferred metadata.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const [input, receiptPath, output] = process.argv.slice(2);
if (!input || !receiptPath || !output || process.argv.length !== 5)
  throw new Error('Usage: node restore-component.mjs final.json.gz receipt.json output.json.gz');
if (resolve(input) === resolve(output) || resolve(receiptPath) === resolve(output))
  throw new Error('Output must differ from the input and receipt');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireEqual = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label} does not match the receipt`);
};
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
requireEqual(receipt.schema, 'passing-component-shared-rows-v1', 'Receipt schema');
const compressed = readFileSync(input);
requireEqual(hash(compressed), receipt.payload.gzipSha256, 'Input gzip SHA-256');
requireEqual(compressed.length, receipt.payload.gzipBytes, 'Input gzip size');
const decoded = gunzipSync(compressed);
requireEqual(hash(decoded), receipt.payload.decodedSha256, 'Input decoded SHA-256');
requireEqual(decoded.length, receipt.payload.decodedBytes, 'Input decoded size');
const packet = JSON.parse(decoded.toString('utf8'));
requireEqual(packet.schema, receipt.packetSchema, 'Packet schema');
for (const key of ['sourceBefore', 'sourceAfter', 'archiveRoot', 'toolSha256'])
  requireEqual(packet[key], receipt.payload[key], `Input ${key}`);
const rows = Buffer.from(JSON.stringify(packet.rows), 'utf8');
requireEqual(hash(rows), receipt.sharedRows.sha256, 'Shared rows SHA-256');
requireEqual(rows.length, receipt.sharedRows.bytes, 'Shared rows size');
requireEqual(packet.rows.length, receipt.sharedRows.count, 'Shared row count');
const replacements = receipt.headerReplacements;
requireEqual(Object.keys(replacements).sort().join(','), 'archiveRoot,sourceAfter,sourceBefore', 'Header replacement keys');
const restored = {
  ...packet,
  sourceBefore: replacements.sourceBefore,
  sourceAfter: replacements.sourceAfter,
  archiveRoot: replacements.archiveRoot,
};
for (const key of ['sourceBefore', 'sourceAfter', 'archiveRoot', 'toolSha256'])
  requireEqual(restored[key], receipt.component[key], `Component ${key}`);
const original = Buffer.from(JSON.stringify(restored), 'utf8');
requireEqual(hash(original), receipt.component.decodedSha256, 'Restored original UTF-8 SHA-256');
requireEqual(original.length, receipt.component.decodedBytes, 'Restored original UTF-8 size');
const encoded = gzipSync(original, { level: 9 });
const outputHash = hash(encoded);
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, encoded, { flag: 'wx' });
console.log(JSON.stringify({ output, decodedBytes: original.length,
  decodedSha256: receipt.component.decodedSha256, decodedOriginalBytesExact: true,
  gzipBytes: encoded.length, gzipSha256: outputHash,
  originalGzipBytesExact: outputHash === receipt.component.gzipSha256,
  node: process.version, zlib: process.versions.zlib }));
