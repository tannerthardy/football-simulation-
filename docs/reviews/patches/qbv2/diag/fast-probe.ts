// At the throw: each judged driver/lane man running (true speed > 3): believed margin/pArrive, his seen vs true velocity
// toward the catch point, and whether he arrived (within reach + 0.5 of the catch point by the ball's arrival).
import { PlaySim } from '../wt947/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt947/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt947/scripts/diag/command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const TAUGHT: any = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const rows: any[] = [];
for (const [con, cov, form] of [['quick_outs', 'cover3', 'gun_doubles_11'], ['quick_outs', 'cover2', 'gun_doubles_11'], ['slant_flat', 'cover3', 'gun_doubles_11'], ['stick', 'cover3', 'gun_trips_11'], ['stick', 'cover2', 'gun_trips_11'], ['slant_flat', 'cover1', 'gun_doubles_11']]) {
  for (let seed = 1; seed <= 30; seed++) {
    const setup: any = nativeTraceSetup({ concept: con, coverage: cov, seed, roster: 3, formation: form, flip: false });
    if (TAUGHT[con]) setup.offCall.pass = { ...PASS_BY_ID[con], ...TAUGHT[con] };
    for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
    const sim: any = new PlaySim(setup); let rel: any = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (q: any, target: any, v0: any, intended: any, arrT: number, ...rest: any[]) => {
      const b = sim.qb.behavior;
      if (!rel && b?.v2 && target) { const ref = Object.entries(sim.offAlign.numbering).find(([, s]) => s === target.slot)?.[0] as string; const h = b.v2h;
        rel = { arrT, pt: { ...intended }, men: (b.v2.lastRoles.get(ref) ?? []).filter((r: any) => r.role !== 'coverer').map((r: any) => { const d = sim.agents[r.id], e = h.estimate(d);
          const L = Math.hypot(intended.x - d.pos.x, intended.y - d.pos.y) || 1, ux = (intended.x - d.pos.x) / L, uy = (intended.y - d.pos.y) / L;
          return { d, role: r.role, pA: r.pArrive, margin: r.margin, seenTo: e.vel.x * ux + e.vel.y * uy, trueTo: d.vel.x * ux + d.vel.y * uy, trueSpd: Math.hypot(d.vel.x, d.vel.y), seenSpd: Math.hypot(e.vel.x, e.vel.y), age: b.mind?.pictureAge?.(d), arrived: false }; }) }; }
      return tb(q, target, v0, intended, arrT, ...rest);
    };
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); if (rel && sim.t <= rel.arrT + 0.05) for (const m of rel.men) if (Math.hypot(m.d.pos.x - rel.pt.x, m.d.pos.y - rel.pt.y) <= m.d.profile.reach + 0.5) m.arrived = true; if (sim.t > 5) sim.phase = 'dead'; };
    try { sim.run(); } catch {}
    if (rel) for (const m of rel.men) rows.push({ ...m, d: undefined, slot: m.d.slot, con, cov });
  }
}
const grp = (f: (r: any) => boolean, name: string) => { const g = rows.filter(f); const n = g.length; if (!n) return; console.log(name, 'n', n, 'believed', r2(g.reduce((s, r) => s + r.pA, 0) / n), 'arrived', r2(g.filter((r) => r.arrived).length / n), 'seen→pt', r2(g.reduce((s, r) => s + r.seenTo, 0) / n), 'true→pt', r2(g.reduce((s, r) => s + r.trueTo, 0) / n), 'age', r2(g.reduce((s, r) => s + (r.age ?? 0), 0) / n)); };
grp((r) => r.trueTo > 3, 'running at the point (true >3 toward)');
grp((r) => r.trueTo > 3 && r.arrived, '  of which arrived');
grp((r) => r.trueTo <= 3 && r.trueTo > 0.5, 'drifting toward (0.5-3)');
grp((r) => r.trueTo <= 0.5, 'not toward');
for (const r of rows.filter((r) => r.trueTo > 3 && r.arrived).slice(0, 8)) console.log('   ', r.con, r.cov, r.slot, r.role, 'pA', r2(r.pA), 'margin', r2(r.margin), 'seen→', r2(r.seenTo), 'true→', r2(r.trueTo), 'age', r2(r.age));
