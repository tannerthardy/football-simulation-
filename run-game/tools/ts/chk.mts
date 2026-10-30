/** IZ helper check path: per check read, the gate result; split by combo defender (end vs interior). args: seeds */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
let simRef: any;
(globalThis as any).__CHK = (obs: any, combo: any, why: string) => {
  const end = /^DE|EDGE/.test(combo.defender.slot) ? 'END' : 'INT';
  const tb = simRef.t < .5 ? '<.5' : simRef.t < 1 ? '.5-1' : simRef.t < 1.5 ? '1-1.5' : '1.5+';
  add(`${end} ${tb} ${why}`); add(`${end} ALL ${why.replace(/:.*/, '')}`);
};
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); simRef = sim;
  if (sim.offCall.run?.scheme !== 'insideZone' || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  while (sim.phase === 'live' && sim.t < 3) sim.tick();
}
for (const k of Object.keys(tally).sort()) console.log(k.padEnd(80), tally[k]);
