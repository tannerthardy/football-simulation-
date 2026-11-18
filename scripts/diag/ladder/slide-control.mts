// Controls for an underneath slide (Coverage, 2026-11-18): staged dig-window and crosser throws. Dig window (Defense):
// drive, dagger, flood, levels, pa_post_dig, throws of 10-16 air yards. Crossers: mesh, drive, y_cross, hitch_cross,
// post_cross, throws to a crossing route (cross, shallow, mesh_*, drag, under). Per group: throws, completion, yards per
// attempt, YAC. usage: [flags] node --import tsx out/slide-control.mts seeds
const W = process.cwd(), seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const groups: Record<string, string[]> = { dig: ['drive', 'dagger', 'flood', 'levels', 'pa_post_dig'], cross: ['mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross'] };
for (const [g, concepts] of Object.entries(groups)) {
  const rows: any[] = [];
  for (const concept of concepts) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      let T: any = null, aimX = 0, route = '?';
      const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; route = target.behavior?.route?.id ?? target.behavior?.fallback?.route?.id ?? '?'; aimX = (intended.x - sim.los) * sim.attackDir(sim.offense[0].team); } return tb(p, target, v0, intended, ...r); };
      let res: any; try { res = sim.run(); } catch { continue; }
      if (!T) continue;
      if (g === 'dig' && !(aimX >= 10 && aimX <= 16)) continue;
      if (g === 'cross' && !/cross|shallow|mesh|drag|under/.test(route)) continue;
      rows.push({ comp: !!res.stats.completed, yds: res.yards ?? 0, yac: res.stats.yac ?? null, route });
    }
  const n = rows.length, c = rows.filter(r => r.comp);
  const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(1)).join('/') : '-'; };
  console.log(`${g}: throws ${n} | complete ${c.length} (${(100 * c.length / Math.max(1, n)).toFixed(1)}%) | yd/att ${(rows.reduce((t, r) => t + r.yds, 0) / Math.max(1, n)).toFixed(2)} | YAC p25/50/75 ${q(c.map(r => r.yac))}`);
}
