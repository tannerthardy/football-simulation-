import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
(PlaySim as any).recordedSingleStream = true;
const cases = JSON.parse(readFileSync(root + '/test/fixtures/responsibility-ledger-cases.json', 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(cases.plays.find((p: any) => p.id === 'S8-P005').setup, 'base64')));
(globalThis as any).__SPCLOG = (a: any, before: any, after: any) => {
  if (a.slot === 'LB_W' && sim.t >= 2.5 && sim.t <= 2.66)
    console.log(sim.t.toFixed(3), 'LB_W request', before.x.toFixed(2), before.y.toFixed(2), '-> after spacing', after.x.toFixed(2), after.y.toFixed(2));
};
while (sim.phase === 'live' && sim.t < 2.8) sim.tick();
