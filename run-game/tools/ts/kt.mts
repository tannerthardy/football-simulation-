import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const rows: any[] = []; (globalThis as any).__KT = (r: any) => rows.push(r);
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|splitZone|outsideZone|wideZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  sim.run();
}
const md = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
const not = rows.filter(r => !r.touching), ok = rows.filter(r => r.ok);
console.log(`helper-as-keeper reads ${rows.length}: ok ${ok.length}, not touching ${not.length}`);
for (const [nm, set] of [['not touching', not], ['ok', ok]] as const)
  console.log(`  ${nm}: distance ${md(set.map(r => r.distance))} vs working reach ${md(set.map(r => r.workingReach))} | hand extension ${md(set.filter(r => r.ext != null).map(r => r.ext))} | hand force ${md(set.map(r => r.force))} | depth off the man ${md(set.map(r => r.depth))} | lateral ${md(set.map(r => Math.abs(r.side)))} | support ${md(set.map(r => r.support))}`);
