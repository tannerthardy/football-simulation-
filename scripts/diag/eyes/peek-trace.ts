// node --import tsx scripts/diag/eyes/peek-trace.ts concept coverage formation seed flip(0/1) [roster=7]
// QB lane, 2026-11-18 (item v): the vertical peek's hold, every 0.1 s from the set until he leaves it: each vertical's
// depth in his picture and his price of it, the peek's declare (shown), processed and close states, and the checkdown's
// price. Passive except his own ready/evaluate.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, formation, seedS, flipS, rosterS] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, formation, seed: Number(seedS), flip: flipS === '1', roster: Number(rosterS ?? 7) }));
const dir = sim.attackDir(sim.offense[0].team); let next = 0; const rows: any[] = [];
const tick = sim.tick.bind(sim);
sim.tick = () => { tick(); const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass' || !b.plan?.peek || sim.t < next || b.phase === 'windup') return; next = sim.t + 0.1;
  const tri = b.plan.triangle ?? []; const rid = (r: any) => r?.behavior?.route?.id ?? r?.slot;
  const ev = (r: any) => { try { if (!b.ready(r, sim)) return '-'; const e = b.evaluate(sim.qb, sim, r, 0); return e ? `${e.P.toFixed(2)}/${e.intRisk.toFixed(3)}` : 'x'; } catch { return 'err'; } };
  const out = b.reads.filter((r: any) => !tri.includes(r));
  rows.push({ t: +sim.t.toFixed(2), phase: b.phase, triDone: !!b.triDone, setAt: +(b.setAt ?? -1).toFixed(2), readStart: +(b.readStart ?? -1).toFixed(2), peekDeclared: +(b.peekDeclared ?? -1).toFixed(2),
    tri: tri.map((r: any) => `${r.slot}:${rid(r)} d${((b.has(sim, r).x - sim.los) * dir).toFixed(1)} ${ev(r)}`).join(' | '), outlet: out.map((r: any) => `${rid(r)} ${ev(r)}`).join(' | '), press: (() => { try { return +b.pressure(sim.qb, sim).time.toFixed(2); } catch { return null; } })() }); };
let thr: any = null; const tb = sim.throwBall.bind(sim);
sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), to: target?.behavior?.route?.id }; return tb(p, target, ...rest); };
const res = sim.run();
for (const r of rows) console.log(JSON.stringify(r));
console.log(JSON.stringify({ thr, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy }));
