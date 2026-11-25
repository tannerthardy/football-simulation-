// Per route runner on staged cells: the passer's forecast breakAt/turnAt (asked at 0.9 s, absolute), the receiver's
// planned break (PLAN_BREAK_BODY, receiver.ts breakTime, from the snap), and the true turn from his track (heading change
// > 25 deg over 0.2 s, at speed > 2) and the true stop (speed under half its peak), observer only.
import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r2 = (x: number | null) => x === null ? null : Math.round(x * 100) / 100;
const TAUGHT: any = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const agg: Record<string, number[][]> = {};
for (const [con, cov, form] of [['slant_flat', 'cover3', 'gun_doubles_11'], ['quick_outs', 'cover3', 'gun_doubles_11'], ['stick', 'cover3', 'gun_trips_11']]) {
  for (let seed = 1; seed <= 10; seed++) {
    const setup: any = nativeTraceSetup({ concept: con, coverage: cov, seed, roster: 3, formation: form, flip: false });
    if (TAUGHT[con]) setup.offCall.pass = { ...PASS_BY_ID[con], ...TAUGHT[con] };
    for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
    const sim: any = new PlaySim(setup); const tr: Record<number, number[][]> = {}; const fc: Record<number, any> = {};
    sim.throwBall = () => {}; // the ball never leaves: routes run out
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); for (const a of sim.offense) if (a.behavior?.route) (tr[a.idx] ??= []).push([sim.t, a.vel.x, a.vel.y]);
      if (Math.abs(sim.t - 0.9) < 0.026) { const b = sim.qb.behavior; for (const a of sim.offense) { const f = b?.receiverForecasts?.get?.(a); if (f && a.behavior?.route) fc[a.idx] = { brk: f.breakAt(), turn: f.turnAt?.(), plan: a.behavior.breakTime, id: a.behavior.route.id }; } }
      if (sim.t > 3) sim.phase = 'dead'; };
    try { sim.run(); } catch {}
    for (const [k, f] of Object.entries(fc)) {
      const T = tr[+k] ?? []; let turn: number | null = null, stop: number | null = null, peak = 0;
      const lag = Math.max(1, Math.round(0.15 / sim.dt));
      for (let i = lag; i < T.length; i++) { const a = T[i - lag], b = T[i], sa = Math.hypot(a[1], a[2]), sb = Math.hypot(b[1], b[2]); peak = Math.max(peak, sb);
        if (turn === null && sa > 2 && sb > 2) { const d = Math.abs(Math.atan2(Math.sin(Math.atan2(b[2], b[1]) - Math.atan2(a[2], a[1])), Math.cos(Math.atan2(b[2], b[1]) - Math.atan2(a[2], a[1])))); if (d > 20 * Math.PI / 180) turn = a[0]; }
        if (stop === null && peak > 3 && sb < 0.5 * peak) stop = b[0]; }
      const truth = /hitch|stick|curl|hook/.test(f.id) ? stop : turn;
      (agg[f.id] ??= []).push([f.brk ?? NaN, f.turn ?? NaN, f.plan ?? NaN, truth ?? NaN]);
    }
  }
}
const med = (v: number[]) => { const s = v.filter((x) => !isNaN(x)).sort((a, b) => a - b); return s.length ? r2(s[s.length >> 1]) : null; };
for (const [id, v] of Object.entries(agg)) console.log(id.padEnd(12), 'n', v.length, 'forecast breakAt', med(v.map((r) => r[0])), 'turnAt', med(v.map((r) => r[1])), '| planned (bodyRunTime)', med(v.map((r) => r[2])), '| true', med(v.map((r) => r[3])));
