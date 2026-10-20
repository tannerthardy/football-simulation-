// AFTER-04/14 witness: the playside force defender's lateral margin outside the
// carrier (yd, + = outside) and depth past the line when the carrier first
// crosses, whether any defender is outside him then (edge kept), final gain.
import { makeSim, rosters } from './scripts/diag/zone-lab/lab.js';
const R = rosters();
for (const id of ['oz/strong/ace_12/under3/pair11/7', 'oz/strong/ace_12/wide9/pair31/8']) {
  const [concept, dir, formation, look, roster, seed] = id.split('/');
  const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as any, R);
  let at = '';
  while (sim.phase === 'live' && sim.t < 20) {
    sim.tick();
    const c = sim.carrier;
    if (at || !c || c === sim.qb || c.pos.x < sim.los) continue;
    const side = Math.sign(c.pos.y - sim.ballY);
    const f = sim.defense.find(d => d.runFit?.kind === 'force' && d.runFit.side === side);
    const kept = sim.defense.some(d => (d.pos.y - c.pos.y) * side > 0 && d.pos.x >= sim.los - 1 && d.pos.x <= sim.los + 10);
    at = `cross t ${sim.t.toFixed(2)} force ${f?.slot ?? '-'} margin ${f ? ((f.pos.y - c.pos.y) * side).toFixed(2) : '-'} depth ${f ? (f.pos.x - sim.los).toFixed(1) : '-'} edge ${kept ? 'kept' : 'LOST'}`;
  }
  console.log(`${id} | ${at} | gain ${sim.buildResult().offenseYards.toFixed(2)}`);
}
