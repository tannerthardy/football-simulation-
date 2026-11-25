// Quick outs vs Cover 2, the out to #1: the corner over him as the judge priced him at the throw (role, margin, pArrive,
// pNear, pPlay) against what he did: his closest approach to the ball in flight, when (fraction of the flight), the ball's
// height then, his distance to the catch point at the ball's arrival, and the result.
import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const rows: any[] = [];
for (let seed = 1; seed <= 30; seed++) {
  const setup: any = nativeTraceSetup({ concept: 'quick_outs', coverage: 'cover2', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.quick_outs, back: 'back_flat' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let th: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, t: any, v0: any, intended: any, arrT: number, ...rest: any[]) => {
    const b = sim.qb.behavior;
    if (!th && b?.v2 && t && /out/.test(String(t.behavior?.route?.id))) {
      const ref = Object.entries(sim.offAlign.numbering).find(([, s]) => s === t.slot)?.[0] as string;
      const side = Math.sign(t.pos.y - sim.ballY); const cb = sim.defense.filter((d: any) => /^CB/.test(d.slot)).sort((a: any, c: any) => Math.abs(a.pos.y - t.pos.y) - Math.abs(c.pos.y - t.pos.y))[0];
      const role = (b.v2.lastRoles.get(ref) ?? []).find((r: any) => r.id === cb.idx);
      th = { t0: sim.t, arrT, pt: { ...intended }, cb, role, side, min: Infinity, minT: 0, minZ: 0, atArr: null };
    }
    return tb(q, t, v0, intended, arrT, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (th && sim.t <= th.arrT + 0.02 && sim.ball?.state !== 'held') { const bp = sim.ballPos(); const dd = Math.hypot(bp.x - th.cb.pos.x, bp.y - th.cb.pos.y); if (dd < th.min) { th.min = dd; th.minT = sim.t; th.minZ = bp.z; } if (!th.atArr && sim.t >= th.arrT) th.atArr = Math.hypot(th.cb.pos.x - th.pt.x, th.cb.pos.y - th.pt.y); } if (sim.t > 4.5) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  if (!th) continue;
  const ev = (sim.events as any[]); const played = ev.some((e) => ['pbu', 'deflection', 'interception'].includes(e.type) && e.a === th.cb.idx);
  rows.push({ seed, role: th.role?.role ?? 'none', margin: th.role ? r2(th.role.margin) : null, pA: th.role ? r2(th.role.pArrive) : null, pPlay: th.role ? r2(th.role.pPlay) : null,
    minDist: r2(th.min), frac: r2((th.minT - th.t0) / Math.max(0.01, th.arrT - th.t0)), z: r2(th.minZ), cbToPt: th.atArr !== null ? r2(th.atArr) : null, played, complete: !!sim.stats.completed });
}
for (const r of rows) console.log(JSON.stringify(r));
const pl = rows.filter((r) => r.played); console.log('n', rows.length, 'played', pl.length, 'mean pPlay', r2(rows.reduce((s, r) => s + (r.pPlay ?? 0), 0) / rows.length), 'played: frac', pl.map((r) => r.frac).join(','), 'z', pl.map((r) => r.z).join(','));
