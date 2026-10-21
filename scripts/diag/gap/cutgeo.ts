/** Cutoff geometry at +1 s: blocker relative to his man (play-side frame). */
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
for (const id of process.argv.slice(2)) {
  const [concept, dir, formation, look] = id.split('/');
  const sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed: 77 } as never, R);
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const b = sim.offense.find(o => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'cutoff' && !o.behavior.plan.combination)!;
  const d = (b.behavior as RunBlocker).plan.target!;
  let t0 = -1, out = '';
  while (sim.phase === 'live' && sim.t < 3 && !out) {
    sim.tick();
    if (t0 < 0 && b.engagement?.defender === d) t0 = sim.t;
    if (t0 >= 0 && sim.t >= t0 + 1) out = `${id} ${b.slot}>${d.slot} B-D play side ${r2((b.pos.y - d.pos.y) * ps)} upfield ${r2((b.pos.x - d.pos.x) * ad)} engaged ${b.engagement?.defender === d} drive ${JSON.stringify(b.engagement?.drive && { x: r2(b.engagement.drive.x * ad), y: r2(b.engagement.drive.y * ps) })} phi*ps ${r2((b.engagement?.phi ?? NaN) * ps)}`;
  }
  console.log(out || `${id} no rep`);
}
