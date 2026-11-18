// SEAM_PICK=key|other node --import tsx scripts/diag/eyes/seam-staged.ts > rows.jsonl   (QB lane, 2026-11-18)
// The vertical peek's seam thrown at his second hitch (staged: his own motion, aim and accuracy; nothing else thrown):
// the key's seam (QB_MOF_READ) or the other one. Per throw: his price and its factors (pOpen, pClear, pAcc, hands) at the
// decision, the window's margin for each defender it counted, and the truth: the ball's fate (caught, defended, picked,
// dropped, missed), the ball's miss from the aimed point, and each counted defender's distance to the ball at its arrival.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { installedPlan } from '../../../src/playbook/read-compiler/runtime.js';
const COVS = 'cover1 cover2man cover2 cover2_match tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const PICK = process.env.SEAM_PICK ?? 'key';
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const [id, c] of Object.entries(PASS_BY_ID) as [string, any][]) {
  let plan: any = null; try { plan = installedPlan(c, formation); } catch { plan = null; }
  if (plan?.style !== 'vertical_peek') continue;
  for (const coverage of COVS) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: id, seed, roster, formation, flip: false })); } catch { continue; }
    sim.stagedThrow = { at: 99, slot: 'Y' };
    let pick: any = null, rec: any = null, arr: any = null;
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => { tick0(); const b: any = sim.qb.behavior;
      if (!pick && b?.kind === 'qb-pass' && b.setAt >= 0 && sim.t >= b.setAt + 2 * b.stride() - 1e-9 && b.keyRead && b.plan?.key) {
        const k = b.plan.key, keyT = b.keyRead.throwTo === 'low' ? k.low : k.high, other = keyT === k.low ? k.high : k.low;
        const t = PICK === 'key' ? keyT : other;
        pick = { slot: t.slot, role: k.role, at: +sim.t.toFixed(2) }; sim.stagedThrow = { at: sim.t, slot: t.slot }; }
      if (rec && !arr && sim.ball.kind === 'air' && sim.t >= sim.ball.arrivalT - 1e-9) {
        const bp = sim.ball.flight.pos; arr = { miss: +Math.hypot(bp.x - rec.aim.x, bp.y - rec.aim.y).toFixed(2),
          defs: rec.slots.map((s: string) => { const d = sim.defense.find((x: any) => x.slot === s); return [s, +Math.hypot(d.pos.x - bp.x, d.pos.y - bp.y).toFixed(1)]; }) }; } };
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !rec && intended) { const b: any = p.behavior, r = b.throwRec;
      b.marginProbe = true; try { b.evaluate(p, sim, target, 0); } catch {} b.marginProbe = false;
      rec = { t: +sim.t.toFixed(2), slot: target?.slot, aim: { x: intended.x, y: intended.y }, P: r ? +r.P.toFixed(3) : null, parts: r?.parts ? Object.fromEntries(Object.entries(r.parts).map(([k2, v]) => [k2, +(+(v as number)).toFixed(3)])) : null, iR: r ? +r.intRisk.toFixed(3) : null,
        margins: (b.marginLast ?? []).map((m: any) => {
          // His picture of the man at the decision: moving away from the catch point, occupied with another receiver
          // (within 2.5 yd of one and moving with him), or set (neither), facing him or not.
          const d = sim.defense.find((x: any) => x.slot === m.slot), e = b.mind.estimate(d), sp = Math.hypot(e.vel.x, e.vel.y);
          const tx = intended.x - e.pos.x, ty = intended.y - e.pos.y, tl = Math.hypot(tx, ty) || 1, toward = sp > 1e-6 ? (e.vel.x * tx + e.vel.y * ty) / (sp * tl) : 0;
          const others = sim.offense.filter((o: any) => o !== target && o.behavior?.route).map((o: any) => { const so = sim.see(p, o); const ds = Math.hypot(so.pos.x - e.pos.x, so.pos.y - e.pos.y); const vs = Math.hypot(so.vel.x, so.vel.y);
            return { ds, with: sp > 1 && vs > 1 ? (so.vel.x * e.vel.x + so.vel.y * e.vel.y) / (sp * vs) : 0 }; });
          const occupied = others.some((o: any) => o.ds < 2.5 && o.with > 0.7);
          const state = occupied ? 'occupied' : sp > 1 && toward < -0.2 ? 'away' : m.facingQB ? 'set-eyes' : 'set-not-facing';
          return { s: m.slot, m: m.m, c: m.contest, first: m.first, touch: m.touch, blind: m.blind, react: m.react, facing: m.facingQB, state, sp: +sp.toFixed(1), toward: +toward.toFixed(2) }; }), slots: (b.marginLast ?? []).map((m: any) => m.slot) }; }
      return tb(p, target, v0, intended, ...rest); };
    let res: any; try { res = sim.run(); } catch { continue; }
    const ev = sim.events.map((e: any) => e.type), has = (k: string) => ev.includes(k);
    const fate = !rec ? 'none' : has('interception') ? 'int' : res.stats?.completed ? 'catch' : has('pbu') || has('deflection') ? 'defended' : has('drop') ? 'drop' : 'miss';
    console.log(JSON.stringify({ concept: id, formation, coverage, roster, seed, pick, rec: rec ? { ...rec, slots: undefined } : null, arr, fate }));
  }
}
