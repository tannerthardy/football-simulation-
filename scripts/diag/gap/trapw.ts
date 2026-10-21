/** Trap pullers: engagement time with the trap target and lateral reversals on the last leg. */
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const rows: string[] = [];
for (const dir of ['strong', 'weak']) for (const formation of ['i_pro_21', 'ace_12']) for (const [look] of LOOK_SPECS) {
  const id = `trap/${dir}/${formation}/${look}`;
  let sim; try { sim = makeSim({ concept: 'trap', dir, formation, look, roster: 'pair11', seed: Number(process.env.SEED ?? 77) } as never, R); } catch { continue; }
  const ps = playSideSign(sim, sim.offCall.run!);
  const tr = sim.offense.find(o => o.behavior instanceof RunBlocker && o.behavior.plan.pullRole === 'trap');
  if (!tr) continue;
  const tgt = (tr.behavior as RunBlocker).plan.target!;
  let eng: number | null = null, rev = 0, last = 0;
  while (sim.phase === 'live' && sim.t < 3 && eng === null) {
    sim.tick();
    if (tr.engagement?.defender === tgt) eng = sim.t;
    const vy = tr.vel.y * ps;
    if (sim.t > .4 && Math.abs(vy) > .3) { if (last && Math.sign(vy) !== last) rev++; last = Math.sign(vy); }
  }
  rows.push(`${id} ${tr.slot}>${tgt.slot} engage ${eng === null ? '-' : r2(eng)} reversals ${rev}`);
}
console.log(rows.join('\n'));
