import { PlaySim } from '../../../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../../../../../scripts/diag/command-trace.js';
const [concept, coverage, n, form] = [process.argv[2], process.argv[3], Number(process.argv[4] ?? 15), process.argv[5] ?? 'gun_doubles_11'];
const segD = (p: any, a: any, b: any) => { const ux = b.x - a.x, uy = b.y - a.y, L = ux * ux + uy * uy || 1; const u = Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.y - a.y) * uy) / L)); return Math.hypot(p.x - a.x - ux * u, p.y - a.y - uy * u); };
const off = (p: any, pr: any) => { const pts = [pr.start, ...pr.path.map((q: any) => q.p)]; let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, segD(p, pts[i - 1], pts[i])); return m; };
const rows: any[] = [];
for (let seed = 1; seed <= n; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: form, flip: false });
  setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let last = -1; const pend: any[] = [];
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const b = sim.qb.behavior; if (!b?.v2) return;
    for (const q of pend) if (!q.done && sim.t >= q.at - 1e-6) { q.done = true; q.err = Math.hypot(q.px - q.r.pos.x, q.py - q.r.pos.y); q.offAt = off(q.r.pos, q.pr); if (sim.ball?.kind === 'held' && sim.carrier === sim.qb && q.rid0 === q.r.behavior?.route?.id) rows.push(q); }
    if (sim.ball?.kind === 'air' || sim.t < 0.6 || sim.t > 2.0 || sim.t - last < 0.099) return; last = sim.t;
    for (const [r, f] of b.receiverForecasts as Map<any, any>) { if (!f.estimate) continue; const lp = f.lastPicture(); if (!lp || sim.t - lp.sampledAt > 0.6) continue; const p = f.predict(sim.t, .5); if (!p) continue;
      pend.push({ seed, t: sim.t, at: sim.t + .5, r, pr: f.prior, px: p.x, py: p.y, off0: off(r.pos, f.prior), motion: f.estimate.motion, kind0: r.behavior?.kind, rid0: r.behavior?.route?.id }); } };
  try { sim.run(); } catch {}
}
const B = (k: (q: any) => boolean) => { const s = rows.filter(k); const e = s.map(q => q.err).sort((a, b) => a - b); return `${s.length} med ${e[e.length >> 1]?.toFixed(2)} p90 ${e[Math.floor(e.length * .9)]?.toFixed(2)} obs ${(s.filter(q => q.motion === 'observed-motion').length / (s.length || 1)).toFixed(2)}`; };
console.log(concept, coverage, '| on path (<1 yd, now and +0.5):', B(q => q.off0 < 1 && q.offAt < 1), '| off path (>2 yd now and at +0.5):', B(q => q.off0 > 2 && q.offAt > 2), '| leaving (<1 now, >2 at +0.5):', B(q => q.off0 < 1 && q.offAt > 2));
const by = new Map<string, any[]>(); for (const q of rows.filter(q => q.off0 > 2 && q.offAt > 2)) { const k = `${q.r.slot}:${q.r.behavior?.route?.id ?? q.r.behavior?.kind}`; by.set(k, [...(by.get(k) ?? []), q]); }
for (const [k, s] of by) console.log('  ', k, s.length, 'seeds', [...new Set(s.map(q => q.seed))].join(','), 'err med', s.map(q => q.err).sort((a, b) => a - b)[s.length >> 1].toFixed(2), 'obs', s.filter(q => q.motion === 'observed-motion').length, 'off0 med', s.map(q => q.off0).sort((a, b) => a - b)[s.length >> 1].toFixed(2));
