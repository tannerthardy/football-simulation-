// node --import tsx scripts/diag/eyes/plant-gate.ts > rows.jsonl
// QB_RHYTHM_THROW's plant gate on quick concepts (staged): at the tick his drop ends (the plant), whether read 1 is named
// (a keyed concept's key read), ready, and his price of it against the rhythm bar; and the play's result. Passive except
// his own ready/evaluate at the plant.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = (process.env.PG_CONCEPTS ?? 'stick hitches slant_flat quick_outs curl_flat double_slants').split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const concept of CONCEPTS) for (const coverage of COVS) for (const roster of [3, 7]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  let row: any = null, prev: string | null = null; const tick0 = sim.tick.bind(sim); const dir = sim.attackDir(sim.offense[0].team);
  sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass') return; const ph = b.phase;
    if (!row && prev === 'drop' && ph !== 'drop') { const first = b.reads?.[0]; let ready = null, ev: any = null;
      try { ready = first ? b.ready(first, sim) : null; ev = first && ready ? b.evaluate(sim.qb, sim, first, 0) : null; } catch {}
      const agg = 0.5 + 0.35 * (sim.qb.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * sim.qb.r('decisionMaking');
      const f = first ? b.receiverForecasts.get(first) : null, brk = f?.breakAt?.() ?? null;
      row = { t: +sim.t.toFixed(2), phase: ph, rhythm: b.rhythmThrows, keyed: !!b.plan?.key, keyRead: !!b.keyRead, route: first?.behavior?.route?.id ?? null,
        ready, untilBreak: brk === null ? null : +(brk - sim.t).toFixed(2), P: ev ? +ev.P.toFixed(3) : null, iR: ev ? +ev.intRisk.toFixed(3) : null, bar: +(0.6 - 0.12 * agg).toFixed(3), riskBar: +(0.025 + 0.05 * agg).toFixed(3),
        pOpen: ev?.parts ? +ev.parts.pOpen.toFixed(3) : null, pClear: ev?.parts ? +ev.parts.pClear.toFixed(3) : null, pAcc: ev?.parts ? +ev.parts.pAcc.toFixed(3) : null, depth: ev ? +ev.depth.toFixed(1) : null }; }
    prev = ph; };
  let thr: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), route: target?.behavior?.route?.id ?? null }; return tb(p, target, ...rest); };
  let keyEnd: any = null; const tick1 = sim.tick.bind(sim);
  sim.tick = () => { tick1(); const b: any = sim.qb.behavior; if (!keyEnd && b?.kind === 'qb-pass' && b.keyRead) keyEnd = { mode: b.keyRead.mode ?? null, at: +b.keyRead.at.toFixed(2), to: b.keyRead.throwTo, s: b.keyRead.s }; };
  let res: any; try { res = sim.run(); } catch { continue; }
  console.log(JSON.stringify({ concept, coverage, roster, seed, plant: row, thr, key: keyEnd, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, yards: res.yards }));
}
