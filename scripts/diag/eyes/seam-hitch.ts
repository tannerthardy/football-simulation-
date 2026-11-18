// node --import tsx scripts/diag/eyes/seam-hitch.ts > rows.jsonl   (QB lane, 2026-11-18: seams by 2.9 s)
// Staged vertical-peek concepts: each vertical's depth from the snap line at 2.0 / 2.5 / 3.0 s after the snap (true
// position), and at his second hitch (set + 2 strides) his window on each vertical (P, pOpen, intRisk) with the
// defenders the window counted (slot, zone, margin, depth, behind the receiver or not). Passive except his evaluate.
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
    const dir = sim.attackDir(sim.offense[0].team); const depth: any = {}; let hitch: any = null; const start = new Map<any, number>();
    const verts = () => sim.offense.filter((o: any) => ['go', 'seam', 'fade', 'seam_read'].includes(o.behavior?.route?.id));
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => { tick0(); for (const o of verts()) { const k = `${o.slot}:${o.behavior.route.id}`;
        for (const T of [2.0, 2.5, 3.0]) if (sim.t >= T - 1e-9 && (depth[k]?.[T] === undefined)) (depth[k] ??= {})[T] = +(((o.pos.x - sim.los) * dir)).toFixed(1); }
      const b: any = sim.qb.behavior;
      if (!hitch && b?.kind === 'qb-pass' && b.setAt >= 0 && sim.t >= b.setAt + 2 * b.stride() - 1e-9) {
        hitch = { t: +sim.t.toFixed(2), u: null as any, v: [] as any[] };
        for (const o of verts()) { b.marginProbe = true; let ev: any = null; try { ev = b.ready(o, sim) ? b.evaluate(sim.qb, sim, o, 0) : null; } catch {} b.marginProbe = false;
          const rd = (o.pos.x - sim.los) * dir;
          hitch.v.push({ r: `${o.slot}:${o.behavior.route.id}`, d: +rd.toFixed(1), ready: !!ev, P: ev ? +ev.P.toFixed(3) : null, pOpen: ev?.parts ? +ev.parts.pOpen.toFixed(3) : null, iR: ev ? +ev.intRisk.toFixed(3) : null,
            aimD: ev ? +((ev.point.x - sim.los) * dir).toFixed(1) : null, T: ev ? +ev.T.toFixed(2) : null,
            defs: (b.marginLast ?? []).map((m: any) => { const d = sim.defense.find((x: any) => x.slot === m.slot); const dd = (d.pos.x - sim.los) * dir;
              return { s: m.slot, z: d.behavior?.zone ?? d.behavior?.kind ?? null, m: m.m, c: m.contest, first: m.first, touch: m.touch, dd: +dd.toFixed(1), over: dd > rd + 1 }; }) }); } }
    };
    let thr: any = null; const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), route: target?.behavior?.route?.id ?? null, air: intended ? +((intended.x - sim.los) * dir).toFixed(1) : null }; return tb(p, target, v0, intended, ...rest); };
    let res: any; try { res = sim.run(); } catch { continue; }
    console.log(JSON.stringify({ concept: id, formation, coverage, roster, seed, depth, hitch, thr, cmp: !!res.stats.completed, yards: res.yards ?? 0 }));
  }
}
