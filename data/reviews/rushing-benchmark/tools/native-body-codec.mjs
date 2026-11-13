/** Diagnostic Body serialization only; no engine calls or general state codec. */
export function encodeBody(body) {
  return JSON.parse(JSON.stringify(body, (_key, value) =>
    value === undefined ? { $undefined: true }
      : typeof value === 'number' && !Number.isFinite(value) ? { $number: String(value) } : value));
}

export function decodeBody(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(decodeBody);
  if (Object.keys(value).length === 1 && '$number' in value) {
    if (!['NaN', 'Infinity', '-Infinity'].includes(value.$number)) throw Error('Invalid Body number tag');
    return Number(value.$number);
  }
  if (Object.keys(value).length === 1 && value.$undefined === true) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeBody(child)]));
}
