import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const c: Record<string, Record<string, number>> = {};
(globalThis as any).__KC = (_cl: any, role: string, why: string) => { (c[role] ??= {})[why] = (c[role][why] ?? 0) + 1; };
const fam = process.argv[2];
for (const seed of process.argv.slice(3)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : !/insideZone|splitZone/.test(sch)) { continue; }
  sim.run();
}
for (const [role, v] of Object.entries(c)) { const n = Object.values(v).reduce((a, b) => a + b, 0); console.log(`${fam} ${role}: ${n} reads | ` + Object.entries(v).sort((a, b) => b[1] - a[1]).map(([k, x]) => `${k} ${(100 * x / n).toFixed(0)}%`).join(', ')); }
