const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2]), games = Number(process.argv[3]);
const c: Record<string, number> = {}; const add = (k: string, n = 1) => { c[k] = (c[k] ?? 0) + n; };
const openPress: number[] = [];
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    let pressed = false, minD = Infinity;
    const res = sim.run();
    if (!sim.isPass) return res;
    add('dropbacks');
    const x = sim.__scr;
    if (x) { add('scramble checks', x.checks); add('panic checks', x.panicChecks); if (x.checks) add('dropbacks with a check'); if (x.panicChecks) add('dropbacks with a panic check');
      if (x.fired) add(`scramble (${x.fired})`); for (const o of x.open) add(`lanes open ${o}`); }
    if (sim.stats.scramble) add('scrambles (stats)');
    if (sim.stats.sacked) add('sacks (stats)');
    return res; } } });
}
for (const [k, v] of Object.entries(c).sort()) console.log(`  ${k}: ${v}`);
