import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const c: Record<string, number> = {}; (globalThis as any).__OT = (k: string) => c[k] = (c[k] ?? 0) + 1;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|splitZone|outsideZone|wideZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  sim.run();
}
console.log(JSON.stringify(c, null, 1));
