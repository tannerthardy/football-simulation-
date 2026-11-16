// CONCEPT_DROPS=1 QB_FOOTWORK=11 node --import tsx scripts/diag/eyes/grass-plant.ts concept [coverages]
// At his set (the plant) on each staged play: his grass read's depth and speed, and the nearest defender in his picture
// to that man's path to the landing area (along, across, in yards), and whether he judged it readable. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const concept = process.argv[2], covs = (process.argv[3] ?? 'cover1,cover2,cover3,cover4').split(',');
for (const coverage of covs) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
  for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
    sim.tick(); const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass' || b.phase !== 'set') continue;
    const r = b.reads[0], dir = sim.attackDir(sim.qb.team), p = sim.see(sim.qb, r), land = b.grassLanding(sim, r);
    const ux = land.x - p.pos.x, uy = land.y - p.pos.y, L = Math.hypot(ux, uy) || 1;
    let near: any = null;
    for (const d of sim.defense) { const e = b.mind.estimate(d).pos, along = ((e.x - p.pos.x) * ux + (e.y - p.pos.y) * uy) / L, across = Math.abs((e.x - p.pos.x) * uy - (e.y - p.pos.y) * ux) / L;
      if (along > -2 && along < L + 4 && (!near || across < near.across)) near = { slot: d.slot, along: +along.toFixed(1), across: +across.toFixed(1) }; }
    console.log(JSON.stringify({ coverage, roster, seed, t: sim.t, route: r.behavior?.route?.id, depth: +((p.pos.x - sim.los) * dir).toFixed(1), sp: +Math.hypot(p.vel.x, p.vel.y).toFixed(1), L: +L.toFixed(1), near, readable: b.grassRead.has(r) }));
    break;
  }
}
