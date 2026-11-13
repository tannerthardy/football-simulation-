/** Logical JS state, independent of V8's packed/holey-array wire encoding.
 * Finite Number.toString is an exact double round trip; -0/nonfinite values,
 * missing entries, insertion order, container types and aliases stay distinct.
 * This reads saved values only; it does not invoke simulation methods. */
export function stateBytes(value) {
  const seen = new Map(), symbols = new Map(), chunks = [];
  function visit(v) {
    if (v === null) { chunks.push('null;'); return; }
    switch (typeof v) {
      case 'number': chunks.push('number:', Object.is(v, -0) ? '-0' : String(v), ';'); return;
      case 'string': chunks.push('string:', JSON.stringify(v), ';'); return;
      case 'boolean': chunks.push(v ? 'true;' : 'false;'); return;
      case 'undefined': chunks.push('undefined;'); return;
      case 'bigint': chunks.push('bigint:', String(v), ';'); return;
      case 'symbol':
        if (!symbols.has(v)) symbols.set(v, symbols.size);
        chunks.push('symbol:', String(symbols.get(v)), ':', JSON.stringify(Symbol.keyFor(v) ?? null),
          ':', JSON.stringify(v.description ?? null), ';'); return;
      case 'object': break;
      default: throw new Error(`Unsupported state type ${typeof v}`);
    }
    if (seen.has(v)) { chunks.push('ref:', String(seen.get(v)), ';'); return; }
    seen.set(v, seen.size);
    if (v instanceof Map) {
      chunks.push('map[');
      for (const [key, entry] of v) { visit(key); visit(entry); }
    } else if (v instanceof Set) {
      chunks.push('set[');
      for (const entry of v) visit(entry);
    } else if (ArrayBuffer.isView(v)) {
      chunks.push('view:', v.constructor.name, ':', String(v.byteOffset), ':',
        Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex'), '[');
    } else if (v instanceof ArrayBuffer) {
      chunks.push('buffer:', Buffer.from(v).toString('hex'), '[');
    } else {
      if (v instanceof WeakMap || v instanceof WeakSet || v instanceof Date)
        throw new Error('Unsupported state container');
      chunks.push(Array.isArray(v) ? `array:${v.length}[` : 'object[');
      // Include present keys, so an array hole differs from present undefined.
      for (const key of Object.keys(v)) { visit(key); visit(v[key]); }
      for (const key of Object.getOwnPropertySymbols(v)) { visit(key); visit(v[key]); }
    }
    chunks.push(']');
  }
  visit(value);
  return chunks.join('');
}
