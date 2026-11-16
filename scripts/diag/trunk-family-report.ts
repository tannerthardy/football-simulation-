// Pools per-game rows from trunk-family-witness.ts: completion and open-catch rate by route family, with Wilson 95% intervals.
// open = the nearest defender is 2+ yd from the target at the ball's arrival; the open catch rate is caught / open targets.
import { readFileSync } from 'node:fs';
const rows: any[] = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
const wilson = (k: number, n: number) => { if (!n) return '-'; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return `${(100 * p).toFixed(0)}% (${(100 * (c - m) / d).toFixed(0)}-${(100 * (c + m) / d).toFixed(0)}) n ${n}`; };
const fams = [...new Set(rows.map((r) => r.fam))].sort();
console.log(`targets ${rows.length}; all: completion ${wilson(rows.filter((r) => r.cmp).length, rows.length)}; open (nearest defender 2+ yd at the arrival) catch ${wilson(rows.filter((r) => r.cmp && r.sepA >= 2).length, rows.filter((r) => r.sepA >= 2).length)}`);
for (const f of fams) { const V = rows.filter((r) => r.fam === f), O = V.filter((r) => r.sepA >= 2); console.log(`  ${f.padEnd(10)} completion ${wilson(V.filter((r) => r.cmp).length, V.length)} | open catch ${wilson(O.filter((r) => r.cmp).length, O.length)}`); }
