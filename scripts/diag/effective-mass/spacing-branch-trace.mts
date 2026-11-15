// The carrier's spacing branch per tick on one panel play (clear / bend off / slow): needs docs/reviews/patches/spacing-branch-trace.patch applied to src/sim/spacing.ts (a debug hook, not committed). usage: [SEED=1 RUN=wz_strong] [FLAG=0 ...] node --import tsx scripts/diag/effective-mass/spacing-branch-trace.mts
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) if (process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { RUN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const formation = FORMATION_BY_ID.ace_12, seed = Number(process.env.SEED ?? 1), run = process.env.RUN ?? 'wz_strong';
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
  offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
let t = 0; const seq: string[] = []; let cur: any = null;
(globalThis as any).__sp = (a: any, l: string) => { if (sim.carrier === a) seq.push(`${sim.t.toFixed(2)}:${l}`); };
sim.run();
console.log(`${run}/${seed} carrier spacing branch per tick (${seq.length} ticks):`);
// compress consecutive equal labels
const out: string[] = []; let last = '', n = 0, t0 = '';
for (const s of seq) { const [tt, l] = s.split(':'); if (l === last) n++; else { if (last) out.push(`${t0} ${last}x${n}`); last = l; n = 1; t0 = tt; } } out.push(`${t0} ${last}x${n}`);
console.log(out.join(' | '));
