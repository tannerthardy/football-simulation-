/** Which panel plays carry the carrier / mode-switch reversed re-aims (dither-budget panel, one draw) — DIR_START=0 vs 1. Usage: DIR_START=1 node --import tsx scripts/diag/body/dir-start-dither.ts [shift]
 * Prints per play the reversed carrier re-aims by stage and the carrier's mode-switch events. Read-only. */
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) process.env[k] = '1';
const shift = Number(process.argv[2] ?? 0);
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const core = await import('../effective-mass/dither-core.js');
core.instrument(PlaySim);
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
let tot = 0, totMoving = 0;
function play(label: string, mk: () => InstanceType<typeof PlaySim>) {
  const acc: Record<string, never> = {} as never; const sim = mk(); core.watch(sim, acc as never); sim.run();
  const c = (acc as any).carrier; const ms = c?.src?.['mode switch']; totMoving += c?.moving ?? 0;
  if (ms?.reversed) { tot += ms.reversed; console.log(`${label}: carrier mode-switch reversed ${ms.reversed} (carrier moving ${c.moving.toFixed(1)} s, carrier reversed total ${c.reversed})`); }
}
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.ace_12;
  play(`${run} s${seed}`, () => new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: seed + shift } as never));
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  play(`${pass} s${seed}`, () => new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: seed + shift } as never));
}
for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
  for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    play(`${pass} s${seed}`, () => new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + shift } as never));
  }
console.log(`DIR_START=${process.env.DIR_START ?? 0}: carrier mode-switch reversed total ${tot}, carrier moving ${totMoving.toFixed(0)} s`);
