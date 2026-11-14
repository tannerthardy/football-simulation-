// Pools per-game rows from trunk-deep-witness.ts and prints the same summary.
import { readFileSync } from 'node:fs';
const rows: any[] = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
const sh = (v: any[]) => { const w = v.filter((x) => x !== undefined); return w.length ? (100 * w.filter(Boolean).length / w.length).toFixed(0) + '%' : '-'; };
console.log(`files ${process.argv.length - 2}: deep targets n ${rows.length}, caught ${rows.filter(r => r.cmp).length} (${sh(rows.map(r => r.cmp))})`);
console.log(`   speed at release ${q(rows.map(r => r.spRel))} -> 0.5 s out ${q(rows.map(r => r.spM5))} -> arrival ${q(rows.map(r => r.spA))} (quartiles; NFL turned receivers 7.5 -> 7.0 -> 6.4, 6.7 at the arrival)`);
console.log(`   at the arrival: hips off the path ${q(rows.map(r => r.hipsA))} deg | shoulders off the path ${q(rows.map(r => r.shouldersA))} deg | trunk ${q(rows.map(r => r.trunkA))} deg | trunk max ${q(rows.map(r => r.trunkMax))} | nearest defender ${q(rows.map(r => r.sepA))} yd`);
console.log(`   hips turned >60 deg at the arrival ${sh(rows.map(r => r.hipsA > 60))} | shoulders turned >60 deg ${sh(rows.map(r => r.shouldersA > 60))}`);
