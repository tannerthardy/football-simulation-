/** Capture the declared ordinary zone set on the current checkout (base). usage: node --import tsx g2capture.mts out.bin */
import { writeFileSync } from 'node:fs';
import { serialize } from 'node:v8';
const root = process.cwd();
const { Rng } = await import(root + '/src/core/rng.ts');
const { Game } = await import(root + '/src/game/game.ts');
const { generateTeam } = await import(root + '/src/league/team.ts');
const { captureSetup } = await import(root + '/scripts/diag/saved-play.ts');
const FAMILY = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone']), CAP = 10;
const plays: any[] = [];
for (const seed of [7, 8]) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let n = 0;
  const game = new Game(home, away, { seed, hooks: { playSetup(setup: any, ctx: any) {
    if (n >= CAP || ctx.kind !== 'scrimmage' || setup.offCall.kind !== 'run' || !FAMILY.has(setup.offCall.run?.scheme)) return;
    n++; plays.push({ id: `S${seed}-P${String(ctx.index + 1).padStart(3, '0')}`, concept: setup.offCall.run.id, front: setup.defCall.front?.id, setup: captureSetup(setup) });
  } } });
  game.kickoffToStart();
  while (n < CAP && !game.state.over) game.step();
  console.log(`seed ${seed}: ${n} plays`);
}
writeFileSync(process.argv[2], serialize(plays));
console.log(plays.map(p => `${p.id} ${p.concept}/${p.front}`).join('\n'));
