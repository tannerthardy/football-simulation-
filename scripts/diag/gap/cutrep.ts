/** Solo cutoff reps: phi/win over the first second, end reason, pair drift (play-side frame). */
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { makeSim, rosters } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const ids = process.argv.slice(2);
const agg = { n: 0, winHi: 0, ends: {} as Record<string, number>, mid: [] as number[], dDepth: [] as number[], phi1: [] as number[] };
for (const id of ids) for (const seed of [77, 71001, 1, 2, 3]) {
  const [concept, dir, formation, look] = id.split('/');
  const sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R);
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const reps = new Map<any, any>();
  runContactObservers.set(sim, (e: any, phase: string, data: any) => {
    if (e.type !== 'run' || e.blocker.team !== 'O' || e.surfaceAxis) return;
    const plan = e.blocker.behavior instanceof RunBlocker ? e.blocker.behavior.plan : null;
    if (plan?.kind !== 'cutoff' || plan.target !== e.defender || plan.combination || e.helpers.length) return;
    let r = reps.get(e);
    if (!r) reps.set(e, r = { t0: e.start, y0: (e.blocker.pos.y + e.defender.pos.y) / 2, phi: [], win: 0, end: null, mid: null, dx: null });
    if (phase === 'end' && !r.end) r.end = data.reason;
    if (phase === 'movement' && sim.t <= e.start + 1.0) { r.phi.push(e.phi * ps); r.win = Math.max(r.win, e.win); }
    if (phase === 'movement' && r.mid === null && sim.t >= e.start + 1.0) { r.mid = ((e.blocker.pos.y + e.defender.pos.y) / 2 - r.y0) * ps; r.dx = (e.defender.pos.x - sim.los) * ad; }
  });
  while (sim.phase === 'live' && sim.t < 3) sim.tick();
  for (const r of reps.values()) {
    agg.n++; if (r.win >= .6) agg.winHi++;
    const end = r.end ?? (r.mid === null ? 'short' : 'held'); agg.ends[end] = (agg.ends[end] ?? 0) + 1;
    if (r.mid !== null) { agg.mid.push(r.mid); agg.dDepth.push(r.dx); }
    if (r.phi.length) agg.phi1.push(r.phi[r.phi.length - 1]);
  }
}
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? r2(b[Math.floor(b.length / 2)]) : null; };
console.log(`reps ${agg.n} | win>=.6 within 1 s ${agg.winHi} | ends ${JSON.stringify(agg.ends)} | pair drift +1 s p50 ${med(agg.mid)} | man depth +1 s p50 ${med(agg.dDepth)} | phi*ps at 1 s p50 ${med(agg.phi1)}`);
