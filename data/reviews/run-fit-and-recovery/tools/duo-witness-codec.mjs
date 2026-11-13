/** Lossless JSON deltas for archived observation only; no engine imports. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';

export function delta(current, prior) {
  if (current === prior) return [0];
  if (current === null || prior === null || typeof current !== 'object' || typeof prior !== 'object'
      || Array.isArray(current) !== Array.isArray(prior)) return [1, current];
  const changed = [];
  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      const d = delta(current[i], prior[i]);
      if (d[0] !== 0) changed.push([i, d]);
    }
    return changed.length || current.length !== prior.length ? [2, current.length, changed] : [0];
  }
  const keys = Object.keys(current), removed = Object.keys(prior).filter(k => !Object.hasOwn(current, k));
  for (const key of keys) {
    const d = delta(current[key], prior[key]);
    if (d[0] !== 0) changed.push([key, d]);
  }
  const reconstructedOrder = Object.keys(prior).filter(k => !removed.includes(k));
  for (const key of keys) if (!Object.hasOwn(prior, key)) reconstructedOrder.push(key);
  const orderChanged = JSON.stringify(keys) !== JSON.stringify(reconstructedOrder);
  if (!changed.length && !removed.length && !orderChanged) return [0];
  return [3, changed, removed, orderChanged ? keys : null];
}

export function apply(prior, d) {
  if (d[0] === 0) return prior;
  if (d[0] === 1) return d[1];
  if (d[0] === 2) {
    const value = Array.isArray(prior) ? prior.slice(0, d[1]) : [];
    value.length = d[1];
    for (const [key, patch] of d[2]) value[key] = apply(prior?.[key], patch);
    return value;
  }
  const value = { ...prior };
  for (const key of d[2]) delete value[key];
  for (const [key, patch] of d[1]) value[key] = apply(prior?.[key], patch);
  return d[3] ? Object.fromEntries(d[3].map(k => [k, value[k]])) : value;
}

function sequence(values, keyOf) {
  const last = new Map();
  return values.map(value => {
    const key = keyOf(value), patch = delta(value, last.get(key));
    last.set(key, value);
    return [key, patch];
  });
}
function unsequence(values) {
  const last = new Map();
  return values.map(([key, patch]) => {
    const value = apply(last.get(key), patch);
    last.set(key, value);
    return value;
  });
}

export function encode(data) {
  const { rows, ...header } = data;
  const encoded = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index], { pictures, commands, samples, ...meta } = row;
    const previous = index ? rows[0] : null;
    const previousMeta = previous ? Object.fromEntries(Object.entries(previous).filter(([k]) => !['pictures', 'commands', 'samples'].includes(k))) : null;
    const metaDelta = previous ? delta(meta, previousMeta) : [1, meta];
    const identicalCommands = previous && delta(commands, previous.commands)[0] === 0;
    const identicalSamples = previous && delta(samples, previous.samples)[0] === 0;
    let previousAfter = row.initial.state, previousReport;
    encoded.push({ keys: Object.keys(row), meta: metaDelta,
      pictures: sequence(pictures, v => `${v.observer}|${v.target}|${v.scale}`),
      commands: identicalCommands ? { row: 0 } : sequence(commands, v => `${v.observer}|${v.target}`),
      samples: identicalSamples ? { row: 0 } : samples.map(sample => {
        const value = { keys: Object.keys(sample), t: sample.t,
          beforeTick: delta(sample.beforeTick, previousAfter),
          before: delta(sample.before, sample.beforeTick), after: delta(sample.after, sample.before),
          report: delta(sample.report, previousReport) };
        previousAfter = sample.after; previousReport = sample.report;
        return value;
      }),
    });
  }
  return { schema: 'lossless-selected-snap-witness-delta-v1', keys: Object.keys(data), header, rows: encoded };
}

export function decode(encoded) {
  const rows = [];
  for (const row of encoded.rows) {
    const priorMeta = rows.length ? Object.fromEntries(Object.entries(rows[0]).filter(([k]) => !['pictures', 'commands', 'samples'].includes(k))) : null;
    const meta = apply(priorMeta, row.meta);
    const pictures = unsequence(row.pictures);
    const commands = Array.isArray(row.commands) ? unsequence(row.commands) : rows[row.commands.row].commands;
    let previousAfter = meta.initial.state, previousReport;
    const samples = Array.isArray(row.samples) ? row.samples.map(sample => {
      const beforeTick = apply(previousAfter, sample.beforeTick), before = apply(beforeTick, sample.before), after = apply(before, sample.after);
      const report = apply(previousReport, sample.report), value = { t: sample.t, beforeTick, before, after, report };
      previousAfter = after; previousReport = report;
      return Object.fromEntries(sample.keys.map(k => [k, value[k]]));
    }) : rows[row.samples.row].samples;
    rows.push(Object.fromEntries(row.keys.map(k => [k, k === 'pictures' ? pictures : k === 'commands' ? commands : k === 'samples' ? samples : meta[k]])));
  }
  return Object.fromEntries(encoded.keys.map(k => [k, k === 'rows' ? rows : encoded.header[k]]));
}

if (process.argv[1]?.endsWith('duo-witness-codec.mjs')) {
  const sha = value => createHash('sha256').update(value).digest('hex');
  const [mode, input, output] = process.argv.slice(2);
  if (!['encode', 'decode'].includes(mode) || !input || !output) throw Error('Usage: node duo-witness-codec.mjs encode|decode input.json.gz output.json.gz');
  const inputBytes = readFileSync(input), jsonBytes = gunzipSync(inputBytes), data = JSON.parse(jsonBytes.toString());
  const transformed = mode === 'encode' ? encode(data) : decode(data);
  if (mode === 'encode') {
    const restored = Buffer.from(JSON.stringify(decode(transformed)));
    if (sha(restored) !== sha(jsonBytes)) throw Error('Lossless expanded-byte hash mismatch');
    transformed.rawExpandedSha256 = sha(jsonBytes);
    transformed.rawFileSha256 = sha(inputBytes);
    transformed.rawExpandedBytes = jsonBytes.length;
    transformed.codecSha256 = sha(readFileSync(new URL(import.meta.url)));
  } else if (sha(JSON.stringify(transformed)) !== data.rawExpandedSha256) throw Error('Decoded expanded-byte hash mismatch');
  const outputBytes = gzipSync(JSON.stringify(transformed), { level: 9 });
  writeFileSync(output, outputBytes);
  console.log(JSON.stringify({ mode, input, output, inputBytes: inputBytes.length, outputBytes: outputBytes.length,
    expandedRawSha256: mode === 'encode' ? transformed.rawExpandedSha256 : data.rawExpandedSha256,
    losslessExpandedBytesVerified: true, source: mode === 'encode' ? data.candidateMethodSource : transformed.candidateMethodSource }, null, 2));
}
