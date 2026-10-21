// LB lateral path on one lab case: y relative to snap (toward the run's side +),
// depth past LOS, tags, and the back's lateral position. Diagnostic only.
import { makeSim, rosters } from '../zone-lab/lab.js';
const [concept, dir, look, seed] = [process.argv[2] ?? 'power', (process.argv[3] ?? 'strong') as 'strong', process.argv[4] ?? 'over3', Number(process.argv[5] ?? 77)];
const sim = makeSim({ concept, dir, look, roster: 'pair11', seed, formation: process.argv[6] ?? 'ace_12' }, rosters());
const lbs = sim.defense.filter(d => d.slot.startsWith('LB'));
const y0 = new Map(lbs.map(d => [d, d.pos.y]));
const rb = sim.slot('RB')!, rby0 = rb.pos.y, s = Math.sign((sim.offAlign.strongSign) * (dir === 'strong' ? 1 : -1)) || 1;
let next = 0;
while (sim.phase === 'live' && sim.t < 4) {
  for (const d of lbs) d.tags.clear?.();
  sim.tick();
  if (sim.t + 1e-9 < next) continue; next += .25;
  const dirX = sim.attackDir('O');
  console.log(`t ${sim.t.toFixed(2)} RB dy ${((rb.pos.y - rby0) * s).toFixed(1)} vy ${(rb.vel.y * s).toFixed(1)} x ${((rb.pos.x - sim.los) * dirX).toFixed(1)} | ` + lbs.map(d =>
    `${d.slot}(${d.runFit?.kind}/${d.runFit?.gap}${d.runFit?.side === s ? '+' : '-'}) dy ${((d.pos.y - y0.get(d)!) * s).toFixed(1)} aim ${(((d.mind as any).aims.get('run-fit')?.pos.y ?? NaN) - y0.get(d)!) * s >= 0 ? '+' : ''}${((((d.mind as any).aims.get('run-fit')?.pos.y ?? NaN) - y0.get(d)!) * s).toFixed(1)} vy ${(d.vel.y * s).toFixed(1)} x ${((d.pos.x - sim.los) * dirX).toFixed(1)} ${d.engagement ? 'ENG ' : ''}${[...d.tags].filter(t => t.startsWith('fit')).join(',')}`).join(' | '));
}
