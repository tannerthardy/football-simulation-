// node --import tsx scripts/diag/eyes/seam-truth.ts > rows.jsonl   (QB lane, 2026-11-18)
// The vertical peek's routes at his second hitch, priced and then checked against the truth: his throws are held
// (sim.stagedThrow, the staging hook), so the play runs on with no ball; at the hitch each ready vertical's window
// (P, pOpen, intRisk, the aimed point and flight T) and the key's answer, then at the hitch + T the receiver's real
// distance from the aimed point and the nearest defender's distance from the receiver and from the point.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { installedPlan } from '../../../src/playbook/read-compiler/runtime.js';
const COVS = 'cover1 cover2man cover2 cover2_match tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const [id, c] of Object.entries(PASS_BY_ID) as [string, any][]) {
  let plan: any = null; try { plan = installedPlan(c, formation); } catch { plan = null; }
  if (plan?.style !== 'vertical_peek') continue;
  for (const coverage of COVS) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: id, seed, roster, formation, flip: false })); } catch { continue; }
    sim.stagedThrow = { held: true };
    const dir = sim.attackDir(sim.offense[0].team), X = (p: any) => +((p.x - sim.los) * dir).toFixed(1);
    let hitch: any = null; const pend: any[] = [];
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => { tick0(); const b: any = sim.qb.behavior;
      if (!hitch && b?.kind === 'qb-pass' && b.setAt >= 0 && sim.t >= b.setAt + 2 * b.stride() - 1e-9) {
        hitch = { t: +sim.t.toFixed(2), key: b.keyRead ? { to: b.keyRead.throwTo, target: (b.keyRead.throwTo === 'low' ? b.plan.key.low : b.plan.key.high)?.slot, role: b.plan.key.role } : null, v: [] as any[] };
        for (const o of sim.offense.filter((o: any) => ['go', 'seam', 'fade'].includes(o.behavior?.route?.id))) {
          let ev: any = null; try { ev = b.ready(o, sim) ? b.evaluate(sim.qb, sim, o, 0) : null; } catch {}
          if (!ev) continue;
          const row: any = { r: `${o.slot}:${o.behavior.route.id}`, P: +ev.P.toFixed(3), pOpen: +ev.parts.pOpen.toFixed(3), iR: +ev.intRisk.toFixed(3), aim: X(ev.point), T: +ev.T.toFixed(2) };
          hitch.v.push(row); pend.push({ o, row, at: sim.t + ev.T + b.windup(sim.qb), pt: { x: ev.point.x, y: ev.point.y } });
        } }
      for (const p of pend) if (!p.done && sim.t >= p.at - 1e-9) { p.done = true;
        const nd = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - p.o.pos.x, d.pos.y - p.o.pos.y)));
        const np = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - p.pt.x, d.pos.y - p.pt.y)));
        Object.assign(p.row, { recvOff: +Math.hypot(p.o.pos.x - p.pt.x, p.o.pos.y - p.pt.y).toFixed(1), defToRecv: +nd.toFixed(1), defToPt: +np.toFixed(1), sackedBy: sim.phase !== 'live' }); } };
    try { sim.run(); } catch { continue; }
    console.log(JSON.stringify({ concept: id, formation, coverage, roster, seed, hitch }));
  }
}
