// When does a judged defender start toward the throw's point? His speed toward the intended point, from the decision
// (V2 commits) to the release + 0.6 s, on the stage cells. Engine truth, measurement only.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const [concept, coverage, seedArg, formation, slot] = process.argv.slice(2);
const [s0, s1] = seedArg.split('-').map(Number);
for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let dec = -1, rel = -1, pt: any = null, decPt: any = null, decD: any = null, decQB: any = null; const samples: any[] = [];
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (q === sim.qb && rel < 0) { rel = sim.t; pt = intended; } return tb(q, target, v0, intended, ...rest); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const v2 = sim.qb.behavior?.v2;
    if (dec < 0 && v2?.cycle?.state === 'throw') {
      dec = sim.t; const h = sim.qb.behavior.v2h, j = v2.cycle.decision?.intent?.judged, ref = j?.option?.ref;
      const r = ref ? sim.slot(sim.offAlign.numbering[ref]) : null, m = r ? h.mechanics(r, h.felt) : null;
      decPt = m ? { x: m.point.x, y: m.point.y, T: m.T, ref, P: j.P } : null; const dd = sim.defense.find((x: any) => x.slot === slot);
      decD = dd ? { ...h.estimate(dd).pos, true: { ...dd.pos } } : null; decQB = { ...sim.qb.pos };
    }
    const d = sim.defense.find((x: any) => x.slot === slot);
    if (dec >= 0 && d) samples.push({ t: sim.t, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y });
    if (rel >= 0 && sim.t > rel + 0.65) sim.phase = 'dead';
    if (sim.t > 5) sim.phase = 'dead';
  };
  try { sim.run(); } catch {}
  if (!pt || rel < 0) { console.log(seed, 'no throw'); continue; }
  const row = samples.filter((s) => Math.round((s.t - rel) * 20) % 2 === 0).map((s) => { const dx = pt.x - s.x, dy = pt.y - s.y, L = Math.hypot(dx, dy); return `${r2(s.t - rel)}:${r2((s.vx * dx + s.vy * dy) / Math.max(L, 1e-6))}@${r2(L)}`; });
  const dd = (a: any, b: any) => a && b ? r2(Math.hypot(a.x - b.x, a.y - b.y)) : null;
  console.log(seed, 'judged pt', decPt && `${decPt.ref} P ${r2(decPt.P)} (${r2(decPt.x - sim.los)},${r2(decPt.y)}) T ${r2(decPt.T)}`, 'thrown pt', `(${r2(pt.x - sim.los)},${r2(pt.y)})`, 'pt shift', dd(decPt, pt), 'def->judged pt (seen)', dd(decD, decPt), 'def->thrown pt (true, at release)', samples.length ? dd(samples.find((x) => x.t >= rel), pt) : null);
  console.log(seed, 'decision', r2(dec - rel), 'rel', r2(rel), 'speed toward the point @ distance:', row.join(' '));
}
