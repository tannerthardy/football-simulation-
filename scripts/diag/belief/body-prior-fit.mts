/** Believed body (Flex, 2026-11-24; docs/reviews/2026-11-24-believed-body.md §3.1): the engine's own population relation between
 * visible build (weight, height) and capacity (in-pads vmax, burst vmax/tau), fitted over a generated league (64 teams).
 * usage: node --import tsx scripts/diag/belief/body-prior-fit.mts */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { derivePhysical } from '../../../src/players/physical.js';
const rows: { pos: string; w: number; h: number; v: number; tau: number; acc: number }[] = [];
for (let t = 0; t < 64; t++) {
  const team: any = generateTeam(new Rng(5000 + t), 'T' + t, 'T' + t, { strength: 0.3 + 0.4 * ((t * 37) % 64) / 64 });
  for (const p of team.roster ?? team.players ?? []) { if (p.position === 'K' || p.position === 'P') continue; const f = derivePhysical(p); rows.push({ pos: p.position, w: p.measurables.weightLb, h: p.measurables.heightIn, v: f.vmax, tau: f.tau, acc: f.vmax / f.tau }); }
}
// OLS v ~ 1 + w + h  (and w^2)
function ols(X: number[][], y: number[]) { const k = X[0].length; const A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array(k).fill(0);
  X.forEach((x, i) => { for (let a = 0; a < k; a++) { b[a] += x[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += x[a] * x[c]; } });
  for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < k; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  return b.map((v, i) => v / A[i][i]); }
for (const [name, key] of [['vmax', 'v'], ['accel v/tau', 'acc']] as const) {
  const X = rows.map(r => [1, (r.w - 250) / 50, ((r.w - 250) / 50) ** 2, (r.h - 74) / 2]), y = rows.map(r => (r as any)[key]);
  const c = ols(X, y); const res = rows.map((r, i) => y[i] - X[i].reduce((s, x, j) => s + x * c[j], 0));
  const sd = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / res.length);
  const tot = Math.sqrt(y.map(v => (v - y.reduce((a, b) => a + b) / y.length) ** 2).reduce((a, b) => a + b) / y.length);
  console.log(name, 'n', rows.length, 'coef [1, (w-250)/50, sq, (h-74)/2]', c.map(v => v.toFixed(3)).join(' '), 'resid sd', sd.toFixed(3), 'total sd', tot.toFixed(3));
  // residual sd by weight band
  for (const [lo, hi] of [[170, 200], [200, 225], [225, 260], [260, 300], [300, 360]]) { const rr = rows.map((r, i) => [r, res[i]] as const).filter(([r]) => r.w >= lo && r.w < hi);
    if (rr.length) console.log(`  w ${lo}-${hi}: n ${rr.length} pred ${(rr.reduce((s, [r]) => s + (r as any)[key], 0) / rr.length).toFixed(2)} resid sd ${Math.sqrt(rr.reduce((s, [, e]) => s + e * e, 0) / rr.length).toFixed(3)}`); }
}
