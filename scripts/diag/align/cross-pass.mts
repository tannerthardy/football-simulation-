/** CROSS_PASS staging: the over (route `cross`) and the dig (route `dig`, the control) through match calls, ball held.
 * Nearest non-lineman defender's distance / over / across at 1.5-3.0 s and his technique, per route and coverage.
 *   CUT_WALL=1 CROSS_OVER=1 [CROSS_PASS=1] npx tsx scripts/diag/align/cross-pass.mts [seeds] */
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const N = Number(process.argv[2] ?? 12);
const MARKS = [1.5, 2.0, 2.5, 3.0];
const CONCEPTS = (process.env.CONCEPTS ?? 'y_cross,hitch_cross,post_cross,drive,dig_shallow').split(',');
const COVS = (process.env.COVS ?? 'cover3_match,cover2_match,cover4,cover6').split(',');
const rows: any[] = [];
for (const concept of CONCEPTS) for (const coverage of COVS) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const rid = new Map<any, string>(); for (const o of sim.offense) rid.set(o, String(o.behavior?.route?.id ?? ''));
  const runners = sim.offense.filter((o: any) => ['cross', 'dig'].includes(rid.get(o)!));
  if (!runners.length) continue;
  while (sim.phase !== 'dead' && sim.t < 3.2 && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
    sim.tick();
    for (const m of MARKS) if (Math.abs(sim.t - m) < 1e-6) for (const c of runners) {
      let best: any = null, bd = Infinity;
      for (const d of sim.defense) { if (['DT', 'DE', 'EDGE'].includes(d.player.position)) continue; const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); if (dd < bd) { bd = dd; best = d; } }
      const tech = best?.behavior?.sub?.constructor?.name ?? best?.behavior?.constructor?.name ?? '?';
      rows.push({ route: rid.get(c), coverage, m, dist: bd, depth: (c.pos.x - sim.los) * sim.attackDir('O'), over: (best.pos.x - c.pos.x) * sim.attackDir('O'), across: Math.abs(best.pos.y - c.pos.y), tech, slot: best.slot });
    }
  }
}
const med = (v: number[]) => { v = v.sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)].toFixed(1) : '-'; };
console.log(`== CROSS_PASS=${process.env.CROSS_PASS ?? 0} CUT_WALL=${process.env.CUT_WALL ?? 0} CROSS_OVER=${process.env.CROSS_OVER ?? 0}`);
for (const route of ['cross', 'dig']) for (const cov of ['all', ...COVS]) {
  const R = rows.filter(r => r.route === route && (cov === 'all' || r.coverage === cov));
  if (!R.length) continue;
  const line = MARKS.map(m => { const S = R.filter(r => r.m === m); return `${med(S.map(r => r.dist))}/${med(S.map(r => r.over))}/${med(S.map(r => r.across))}`; }).join('  ');
  const at25 = R.filter(r => r.m === 2.5); const tc: Record<string, number> = {};
  for (const r of at25) tc[`${r.slot}:${r.tech}`] = (tc[`${r.slot}:${r.tech}`] ?? 0) + 1;
  const top = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(100 * v / at25.length)}%`).join(', ');
  console.log(`${route.padEnd(5)} ${cov.padEnd(13)} n ${String(at25.length).padStart(3)}  dist/over/across @1.5/2.0/2.5/3.0: ${line}  | 2.5 s: ${top}`);
}
