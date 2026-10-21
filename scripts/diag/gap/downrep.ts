/** Gap down blocks: defender/blocker lateral (+ toward the play) 1 s after contact; center at 1.5 s; gains. */
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const D: number[] = [], B: number[] = [], Dx: number[] = [], C: number[] = [], G: number[] = [];
let plays = 0;
for (const seed of (process.argv[2] ?? '77,71001').split(',').map(Number)) for (const concept of ['power', 'counter', 'trap'])
for (const formation of ['i_pro_21', 'ace_12']) for (const dir of ['strong', 'weak']) for (const [look] of LOOK_SPECS) {
  let sim; try { sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R); } catch { continue; }
  plays++;
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const downs = sim.offense.filter(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.kind === 'down');
  const c = sim.slot('C')!, c0 = c.pos.y;
  const st = new Map<any, any>();
  let cAt: number | null = null;
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    if (cAt === null && sim.t >= 1.5) cAt = (c.pos.y - c0) * ps;
    for (const b of downs) {
      const p = (b.behavior as RunBlocker).plan; const d = p?.target; if (!d) continue;
      let s = st.get(b);
      if (!s && b.engagement?.defender === d && b.engagement.blocker === b) st.set(b, s = { t: sim.t, by: b.pos.y, dy: d.pos.y });
      if (s && s.done === undefined && sim.t >= s.t + 1) { s.done = 1; B.push((b.pos.y - s.by) * ps); D.push((d.pos.y - s.dy) * ps); Dx.push((d.pos.x - sim.los) * ad); }
    }
  }
  if (cAt !== null) C.push(cAt);
  G.push(sim.buildResult().offenseYards);
}
const q = (a: number[], f = .5) => { const b = [...a].sort((x, y) => x - y); return b.length ? r2(b[Math.floor(f * (b.length - 1))]) : null; };
const mean = (a: number[]) => r2(a.reduce((s, x) => s + x, 0) / a.length);
console.log(`plays ${plays} | down reps ${D.length}: defender lat +1 s p50 ${q(D)} blocker ${q(B)} | defender depth +1 s p50 ${q(Dx)} | center lat 1.5 s p50 ${q(C)} | gain p50 ${q(G)} mean ${mean(G)} <0 ${G.filter(x => x < 0).length} <=2 ${G.filter(x => x <= 2).length}`);
