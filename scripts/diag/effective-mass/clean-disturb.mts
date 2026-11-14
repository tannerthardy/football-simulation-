// The finish control (Flex, 2026-11-13; THROW_HOLD): a throw no defender came within 2 yd of is untouched by the hold.
// Per throw: nearest defender to the QB from 0.5 s to the release, and sim.throwDisturb / qbHold just before release.
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
// usage: [flags] node --import tsx scripts/diag/effective-mass/clean-disturb.mts [first seed] [games]
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    let near = 99, dist = 0, held = false; const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const pre = sim.throwAt < 0, d0 = sim.throwDisturb ?? 0;
      tick();
      if (pre && sim.carrier === sim.qb && sim.t >= 0.5) for (const d of sim.defense) near = Math.min(near, Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y));
      if (pre && sim.throwAt >= 0) { dist = d0; rows.push({ near, dist }); }
    };
    return sim.run();
  } } });
}
for (const [lab, f] of [['no defender within 2 yd', (r: any) => r.near > 2], ['a defender within 2 yd', (r: any) => r.near <= 2]] as const) {
  const R = rows.filter(f);
  console.log(`${lab}: throws ${R.length} | disturbed at release (throwDisturb > 0) ${R.filter((r) => r.dist > 0).length} | > 0.05 ${R.filter((r) => r.dist > 0.05).length} | max ${Math.max(0, ...R.map((r) => r.dist)).toFixed(3)}`);
}
