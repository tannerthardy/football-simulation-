/** Run plays, one arm per process (set the flag in the environment): yards and carrier first-tick request turn. Usage: node --import tsx scripts/diag/body/run-yards-pair.ts out.jsonl [seeds=20]
 * 8 run concepts from ace_12 against base 4-3 Under cover 3, the dither panel's recipe, seeds 1..N, stack-on flags from config/reference-stack.json. Read-only. */
import { readFileSync, writeFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) process.env[k] = '1';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { RUN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const out = process.argv[2], N = Number(process.argv[3] ?? 20);
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const rows: string[] = [];
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= N; seed++) {
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
  const res = sim.run();
  rows.push(JSON.stringify({ k: `${run}|${seed}`, yards: res?.yards ?? sim.result?.yards ?? null, missed: res?.missedTackles ?? null }));
}
writeFileSync(out, rows.join('\n') + '\n');
