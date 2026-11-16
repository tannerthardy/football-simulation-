// four_verts from 2x2: the read timeline and the second seam (W2) when his eyes reach it.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team), ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  const reads: any[] = []; let w2: any = null, last: string | null = null, target: string | null = null, thrT: number | null = null;
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick0();
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && b.reads?.length) {
      const r = b.reads[b.readIdx]; const ag = r ? (r.target ?? sim.agents[r.idx]) : null; const rf = ag ? ref(ag) : null;
      if (rf && rf !== last && b.phase !== 'snap') { reads.push(`${rf}@${sim.t.toFixed(2)}`); last = rf; }
      if (rf === 'W2' && !w2) {
        const ds = sim.defense.map((d: any) => ({ d, dist: Math.hypot(d.pos.x - ag.pos.x, d.pos.y - ag.pos.y) })).sort((a: any, c: any) => a.dist - c.dist);
        const n = ds[0];
        w2 = { t: +sim.t.toFixed(2), depth: +((ag.pos.x - sim.los) * dir).toFixed(1), sep: +n.dist.toFixed(1), by: n.d.slot, over: +(((n.d.pos.x - ag.pos.x) * dir)).toFixed(1),
          under: ds.filter((x: any) => (x.d.pos.x - ag.pos.x) * dir < -1 && Math.abs(x.d.pos.y - ag.pos.y) < 4).map((x: any) => x.d.slot).join('/') || null, phase: b.phase };
      }
    }
    if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ? ref(sim.ball.target) : null; thrT = +sim.t.toFixed(2); }
  };
  const res = sim.run();
  console.log(JSON.stringify({ coverage, roster, seed, reads: reads.join(' '), w2, target, thrT, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? null }));
}
