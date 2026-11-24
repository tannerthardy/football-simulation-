// Staged pick / rub (Integration, Rules' matrix, 2026-11-24): mesh (or another concept) vs a man call. For every man
// defender, his man, and each other offensive skill player who passes within 1.5 yd of him: the closest approach (body
// centres, and the gap between the bodies), whether that body crossed his path ahead of him (between him and his man),
// his speed 0.3 s before and the lowest in the 0.3 s after, the side he went round it (over: on the far side from the
// line; under: the line side), and his separation from his man 0.5 s later. Read-only.
//   node --import tsx scripts/diag/coverage/pick-stage.mts [seeds] [concept] [coverage]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 12), concept = process.argv[3] ?? 'mesh', coverage = process.argv[4] ?? 'cover1';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: any[] = [];
for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: seed, formation: 'gun_doubles_11', flip }));
  const H: any[] = []; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.ball?.kind === 'held' && sim.ball.carrier === sim.qb) H.push({ t: sim.t, p: sim.agents.map((a: any) => ({ x: a.pos.x, y: a.pos.y, vx: a.vel.x, vy: a.vel.y })) }); };
  sim.run();
  const men = sim.defense.filter((d: any) => d.behavior?.kind === 'man' && (d.behavior as any).target);
  const skill = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  for (const d of men) { const man = (d.behavior as any).target; const di = sim.agents.indexOf(d), mi = sim.agents.indexOf(man);
    for (const o of skill) { if (o === man) continue; const oi = sim.agents.indexOf(o);
      let best = Infinity, k = -1; H.forEach((h, i) => { const s = Math.hypot(h.p[di].x - h.p[oi].x, h.p[di].y - h.p[oi].y); if (s < best) { best = s; k = i; } });
      if (best > 1.5 || k < 0) continue;
      const at = (dt: number) => H[Math.max(0, Math.min(H.length - 1, k + Math.round(dt / sim.dt)))];
      const sp = (h: any) => Math.hypot(h.p[di].vx, h.p[di].vy);
      let low = Infinity; for (let j = k; j < Math.min(H.length, k + Math.round(0.3 / sim.dt)); j++) low = Math.min(low, sp(H[j]));
      const h = H[k], toMan = { x: h.p[mi].x - h.p[di].x, y: h.p[mi].y - h.p[di].y }, toO = { x: h.p[oi].x - h.p[di].x, y: h.p[oi].y - h.p[di].y };
      const between = (toMan.x * toO.x + toMan.y * toO.y) > 0;
      const later = at(0.5);
      rows.push({ seed, flip, d: d.slot, man: man.slot, o: o.slot, t: +h.t.toFixed(2), centres: +best.toFixed(2), gap: +(best - d.profile.radius - o.profile.radius).toFixed(2),
        between, side: h.p[di].x > h.p[oi].x ? 'over' : 'under', vBefore: +sp(at(-0.3)).toFixed(1), vLow: +low.toFixed(1),
        sep05: +Math.hypot(later.p[di].x - later.p[mi].x, later.p[di].y - later.p[mi].y).toFixed(2), sepAt: +Math.hypot(toMan.x, toMan.y).toFixed(2) });
    } }
}
for (const r of rows) console.log(JSON.stringify(r));
const bins = [[-9, 0.3], [0.3, 0.6], [0.6, 0.9], [0.9, 9]];
for (const [lo, hi] of bins) { const b = rows.filter((r) => r.between && r.gap > lo && r.gap <= hi); if (!b.length) continue;
  const m = (f: (r: any) => number) => +(b.map(f).reduce((a, c) => a + c, 0) / b.length).toFixed(2);
  console.log(`gap ${lo}-${hi} yd (body between him and his man): n ${b.length}, speed ${m((r) => r.vBefore)} -> low ${m((r) => r.vLow)}, sep at ${m((r) => r.sepAt)} -> +0.5 s ${m((r) => r.sep05)}, over ${b.filter((r) => r.side === 'over').length}`); }
