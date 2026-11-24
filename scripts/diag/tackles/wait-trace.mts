// Reach-decision waits (Run Game, 2026-11-24), measurement only; REACH_TIME=1. For every tackler who has the carrier
// inside his arms: how long until he starts a reach, how far the carrier advanced meanwhile, why he held (the window's
// 'better shot coming', 'not his last reach', or the reach decision's 'reach would not meet'), and whether he reached.
// Usage: REACH_TIME=1 node --import tsx wait-trace.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { reachDiag, flushWaits } = await import(`${W}/src/sim/tackle.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const proto = PlaySim.prototype as any, run = proto.run;
proto.run = function (this: any) { const r = run.call(this); flushWaits(this); return r; };
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${reachDiag.waits.length} waits`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, waits: reachDiag.waits }));
console.log('waits', reachDiag.waits.length);
