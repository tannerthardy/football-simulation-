const root = process.cwd();
const { Rng } = await import(root + '/src/core/rng.ts');
const { simulateGame } = await import(root + '/src/game/game.ts');
const { generateTeam } = await import(root + '/src/league/team.ts');
const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: 0.6 });
for (const seed of process.argv.slice(2).map(Number)) { const t = Date.now(); const r: any = simulateGame(home, away, { seed }); console.log(`seed ${seed}: ${((Date.now() - t) / 1000).toFixed(1)} s, plays ${r.plays?.length ?? r.log?.length ?? '?'}`); }
