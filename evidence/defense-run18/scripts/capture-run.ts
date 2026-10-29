// Run-only capture: matched-restage.ts capture with the coordinators calling runs only.
// Writes out/matched-restage/seed<N>-run.json (constructor inputs only).
import { writeFileSync, mkdirSync } from 'node:fs';
const root = process.cwd();
const { Rng } = await import(root + '/src/core/rng.ts');
const { simulateGame } = await import(root + '/src/game/game.ts');
const { generateTeam } = await import(root + '/src/league/team.ts');
const { captureSetup } = await import(root + '/scripts/diag/saved-play.ts');
const dir = 'out/matched-restage'; mkdirSync(dir, { recursive: true });
for (const s of process.argv.slice(2)) {
  const seed = Number(s), rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: any[] = []; let setup: any = null;
  simulateGame(home, away, { seed, runOnly: true, hooks: { playSetup: (x: any) => { setup = x; }, playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !setup) return undefined;
    plays.push({ pass: !!sim.isPass, call: sim.offCall.label, setup: captureSetup(setup).toString('base64') }); return undefined; } } } as any);
  writeFileSync(`${dir}/seed${seed}-run.json`, JSON.stringify(plays)); console.log('captured', seed, plays.length);
}
