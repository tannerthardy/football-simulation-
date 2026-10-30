/** Zone runs on run-only captures (shift 0): per OL, snap job; whether his target ever becomes a defender who starts
 * 2.5+ yd deep (a backer/DB), via which ledger reason; and whether he got 2 yd past the LOS before the carrier. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const fam = process.argv[2]; const seeds = process.argv.slice(3);
const cnt: Record<string, number> = {}; const put = (k: string) => (cnt[k] = (cnt[k] ?? 0) + 1); let runs = 0;
for (const seed of seeds) for (const p of deserialize(readFileSync(`out/run/restage/seed${seed}.bin`)) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const sch = sim.offCall.run?.scheme ?? '';
  if (fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : !/insideZone|splitZone/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  runs++;
  const ledger = sim.recordResponsibility(); const dir = sim.attackDir('O'), los = sim.los;
  sim.tick();
  const ol = sim.offense.filter((o: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  const deep = new Set(sim.defense.filter((d: any) => (d.pos.x - los) * dir >= 2.5).map((d: any) => d.idx));
  const reached = new Map<any, boolean>(); let carrier2 = false;
  while (sim.phase === 'live' && sim.t < 6) {
    sim.tick(); const c = sim.carrier;
    if (c && c !== sim.qb && (c.pos.x - los) * dir >= 2) carrier2 = true;
    if (!carrier2) for (const o of ol) if ((o.pos.x - los) * dir >= 2) reached.set(o, true);
  }
  const D = ledger.data;
  for (const o of ol) {
    const init = D.initialPlans.find((q: any) => q.actor === o.idx)?.plan;
    const job = init?.kind ?? '?';
    const toDeep = D.changes.find((ch: any) => ch.actor === o.idx && ch.after.target != null && deep.has(ch.after.target) && !deep.has(ch.before.target));
    const how = init && init.target != null && deep.has(init.target) ? 'snap job targets him' : init?.combination ? (toDeep ? 'double released' : 'double, never released') : toDeep ? `switched: ${toDeep.reason.split(':')[0]}` : 'never targets a backer';
    put(`${job.padEnd(6)} ${how}${reached.get(o) ? ' -> reached +2' : ''}`);
    if (reached.get(o)) put('ALL reached +2 before carrier');
  }
}
console.log(`${fam} runs ${runs}`);
for (const [k, v] of Object.entries(cnt).sort()) console.log(`  ${k}: ${(v / runs).toFixed(2)} per run`);
