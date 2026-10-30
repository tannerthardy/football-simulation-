import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const p = (JSON.parse(readFileSync('out/matched-restage/seed7-run.json', 'utf8')) as any[]);
for (const i of [75, 83]) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p[i].setup, 'base64'))); console.log(i, sim.offCall.run?.id, sim.defCall.front?.id ?? null); }
