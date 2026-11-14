// How often each rush move is resolved (PAIR_HANDS sizing: which moves are still rating rolls). Counts each new move a
// pass rep takes (e.move changing, or a new rep's first move), by move and rep class (edge = against a tackle), per 100
// dropbacks. Moves resolved as forces on the engine being read (RUSH_BULL's bull; RUSH_HANDS' club and long-arm;
// RIP_CLEAR / RUSH_RIP's rip on an edge) are marked; the rest go through resolveMove's logistic roll.
// usage: [flags] node --import tsx scripts/diag/effective-mass/move-rolls.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const cnt: Record<string, number> = {}; let dropbacks = 0;
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  dropbacks++;
  const last = new Map<any, { move: string; next: number }>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      const prev = last.get(e);
      if (!prev || prev.next !== e.nextMoveAt) {
        const cls = (e.blocker.slot === 'LT' || e.blocker.slot === 'RT') ? 'edge' : 'interior';
        const k = `${cls} ${e.move}`; cnt[k] = (cnt[k] ?? 0) + 1;
      }
      last.set(e, { move: e.move, next: e.nextMoveAt });
    }
  };
  return sim.run();
} } });
const rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
console.log(`dropbacks ${dropbacks}; move resolutions per 100 dropbacks:`);
for (const [k, v] of rows) console.log(`   ${k.padEnd(20)} ${(100 * v / Math.max(1, dropbacks)).toFixed(1)}`);
