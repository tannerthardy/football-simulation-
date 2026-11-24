// The passer's receiver forecast against the truth: every 0.1 s from the secure to 2.5 s, his forecast of each route
// runner 0.5 s ahead against where the runner is 0.5 s later (along-route lag and lateral error), by route.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seedArg, formation] = process.argv.slice(2);
const [s0, s1] = seedArg.split('-').map(Number);
const TAUGHT: Record<string, { back?: string }> = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const rows: Record<string, { lag: number[]; err: number[]; byT: Record<string, number[]> }> = {};
for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  const t = TAUGHT[concept]; if (t) setup.offCall.pass = { ...PASS_BY_ID[concept], ...t };
  const sim: any = new PlaySim(setup); const pend: any[] = []; sim.throwBall = () => {};
  const t0 = sim.tick.bind(sim); let last = -1;
  sim.tick = () => {
    t0(); const h = sim.qb.behavior?.v2h;
    for (const p of pend.filter((p) => !p.done && sim.t >= p.due - 1e-6)) {
      p.done = true; const a = sim.agents[p.idx].pos, v = p.v, sp = Math.hypot(v.x, v.y) || 1;
      const dx = a.x - p.f.x, dy = a.y - p.f.y, along = (dx * v.x + dy * v.y) / sp, lat = Math.abs((-dx * v.y + dy * v.x) / sp);
      const R = (rows[p.rid] ??= { lag: [], err: [], byT: {} }); R.lag.push(along); R.err.push(Math.hypot(dx, dy));
      (R.byT[p.tb] ??= []).push(along); void lat;
    }
    if (h && sim.t >= h.snapAt && sim.t - last >= 0.099 && sim.t <= 2.5) {
      last = sim.t;
      for (const r of sim.offense) { if (r.behavior?.kind !== 'route') continue; const f = h.predict(r, 0.5); if (!f) continue;
        pend.push({ idx: r.idx, rid: r.behavior.route?.id ?? '?', f: { x: f.x, y: f.y }, v: { ...r.vel }, due: sim.t + 0.5, tb: sim.t < 1.0 ? '<1.0' : sim.t < 1.6 ? '1.0-1.6' : '1.6+' }); }
    }
    if (sim.t > 3.1) sim.phase = 'dead';
  };
  try { sim.run(); } catch {}
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? Math.round(s[Math.floor(s.length / 2)] * 100) / 100 : null; };
for (const [rid, R] of Object.entries(rows)) console.log(rid.padEnd(12), 'n', R.lag.length, 'truth ahead of forecast (along his motion) p50', med(R.lag), 'err p50', med(R.err), Object.entries(R.byT).map(([k, v]) => `${k}: ${med(v)}`).join(' '));
