// QB lane 2026-11-18: the "turned" cue (QBMind.postFeaturesObserved) on man coverage: each coverage defender's true speed
// and facing against the QB, and his remembered facing and speed, at 0.8 and 1.2 s.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
for (const coverage of ['cover1', 'cover0', 'cover3']) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  for (let i = 0; i < 30; i++) { sim.tick();
    if (Math.abs(sim.t - 0.8) < 0.026 || Math.abs(sim.t - 1.2) < 0.026) {
      const qb = sim.qb, m = sim.qbMind;
      const rows = sim.defense.filter((d: any) => d.pos.x - sim.los > 2).map((d: any) => { const toQB = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x); const mem = m.memory.get(d);
        return `${d.slot} true v${Math.hypot(d.vel.x, d.vel.y).toFixed(1)} cos${Math.cos(d.body.facing - toQB).toFixed(2)} | mem ${mem ? 'v' + Math.hypot(mem.vel.x, mem.vel.y).toFixed(1) + ' cos' + Math.cos(mem.facing - Math.atan2(qb.pos.y - mem.pos.y, qb.pos.x - mem.pos.x)).toFixed(2) + ' age' + (sim.t - mem.t).toFixed(2) : '-'}`; });
      console.log(coverage, seed, sim.t.toFixed(2), 'turned', m.postFeaturesObserved()[2].toFixed(2)); rows.forEach((r: string) => console.log('   ', r)); } }
}
