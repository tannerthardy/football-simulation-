// node --import tsx scripts/diag/coverage/ladder-controls.mts [seeds]
// ZONE_LADDER controls: per concept (drive: shallow under a dig; flood, levels: flow then throwback; slant_flat vs
// cover6 trips: the Book nickel), completion, yards per attempt, YAC, and which route was thrown.
const W = process.cwd(), seeds = Number(process.argv[2] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const sets: Array<[string, string[], string[]]> = [['drive', ['drive'], ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9']],
  ['flood', ['flood'], ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9']], ['levels', ['levels'], ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9']],
  ['book nickel', ['slant_flat'], ['cover6']]];
for (const [name, concepts, covs] of sets) {
  const rows: any[] = [];
  for (const concept of concepts) for (const coverage of covs) for (const formation of name === 'book nickel' ? ['gun_trips_11'] : ['gun_doubles_11', 'gun_trips_11'])
    for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      let route = '?'; const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, tg: any, ...r: any[]) => { if (p === sim.qb && route === '?' && tg) route = tg.behavior?.route?.id ?? '?'; return tb(p, tg, ...r); };
      let res: any; try { res = sim.run(); } catch { continue; }
      if (route === '?') continue;
      rows.push({ route, comp: !!res.stats.completed, yds: res.yards ?? 0, yac: res.stats.yac ?? 0 });
    }
  const by = new Map<string, any[]>(); for (const r of rows) by.set(r.route, [...(by.get(r.route) ?? []), r]);
  const f = (v: any[]) => `n ${v.length} comp ${(100 * v.filter(r => r.comp).length / v.length).toFixed(0)}% yd/att ${(v.reduce((s, r) => s + r.yds, 0) / v.length).toFixed(1)} YAC/c ${(v.filter(r => r.comp).reduce((s, r) => s + r.yac, 0) / Math.max(1, v.filter(r => r.comp).length)).toFixed(1)}`;
  console.log(`${name}: ${f(rows)} | ${[...by].sort((a, b) => b[1].length - a[1].length).slice(0, 4).map(([k, v]) => `${k} ${f(v)}`).join(' ; ')}`);
}
