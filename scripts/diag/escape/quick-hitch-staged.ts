// QUICK_HITCH staged: the quick-game concepts that carry a hitch, against 8 coverages x 4 rosters x 6 seeds, off and on
// (same bodies, call and seed). Per play: the outcome and throw; per hitch runner (the route id hitch or quick_hitch):
// his stop (Defense's quarters-corner operator: the first time in 0-3.5 s that, having climbed over 3 yd/s downfield,
// he drops under 1 yd/s downfield; its depth past the line), the cushion then (nearest defender, yd, and how far
// downfield of him that defender is), and whether he was thrown.
// [QUICK_HITCH=1] node --import tsx scripts/diag/escape/quick-hitch-staged.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const CELLS: Array<[string, string]> = [['hitches', 'gun_doubles_11'], ['quick_outs', 'gun_doubles_11'], ['hitch_out', 'gun_doubles_11'],
  ['double_slants', 'gun_doubles_11'], ['seam_slant', 'gun_trips_11'], ['trips_stick', 'gun_trips_11']];
const ONLY = (process.env.QH_CONCEPTS ?? '').split(',').filter(Boolean);
for (const [concept, formation] of CELLS) { if (ONLY.length && !ONLY.includes(concept)) continue;
  for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false }));
    const dir = sim.attackDir(sim.offense[0].team), ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
    const runners = new Map<any, any>(); let target: string | null = null, thrT: number | null = null, key: any = null;
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      const air = sim.ball.kind === 'air'; const before = new Map([...runners.keys()].map((a) => [a, a.pos.x]));
      tick0();
      if (sim.t <= 3.5) for (const o of sim.offense) {
        const id = o.behavior?.route?.id;
        if ((id === 'hitch' || id === 'quick_hitch') && !runners.has(o)) runners.set(o, { ref: ref(o), route: id, climbed: false, stop: null, x0: o.pos.x });
        const r = runners.get(o); if (!r || r.stop || !before.has(o)) continue;
        const v = (o.pos.x - before.get(o)) / sim.dt * dir;
        if (v > 3) r.climbed = true;
        else if (r.climbed && v < 1) {
          const ds = sim.defense.map((d: any) => ({ d, dist: Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) })).sort((p: any, q: any) => p.dist - q.dist)[0];
          r.stop = { t: +sim.t.toFixed(2), depth: +((o.pos.x - sim.los) * dir).toFixed(1), cushion: +ds.dist.toFixed(1), over: +((ds.d.pos.x - o.pos.x) * dir).toFixed(1), by: ds.d.slot, beforeThrow: !air && sim.ball.kind !== 'air' };
        }
      }
      const qb: any = sim.qb.behavior; if (qb?.keyRead && !key) key = { to: qb.keyRead.throwTo, man: qb.plan?.key?.man?.slot ?? null, at: +qb.keyRead.at.toFixed(2) };
      if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ? ref(sim.ball.target) : null; thrT = +sim.t.toFixed(2); }
    };
    const res = sim.run();
    console.log(JSON.stringify({ concept, formation, coverage, roster, seed, target, thrT, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? null, key,
      hitches: [...runners.values()].map((r) => ({ ref: r.ref, route: r.route, stop: r.stop, thrown: r.ref === target })) }));
  }
}
