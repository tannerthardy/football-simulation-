/** The dither-budget panel (test/dither-budget.test.ts) as a script, with chosen stack flags turned off, to find which flag moved a stage's reversed re-aim rate.
 *   OFF=FLAG1,FLAG2 [ONLY_STAGE='carrier / spacing'] node --import tsx scripts/diag/effective-mass/dither-panel.mts
 * The reference stack's `on` flags are set to 1 (as the test does), then OFF's flags to 0. Prints each stage's [rate, moving s, reversed events]. */
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) process.env[k] = '1';
for (const k of (process.env.OFF ?? '').split(',').filter(Boolean)) process.env[k] = '0';
async function measure() {
  
  const { Rng } = await import('../../../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import('../../../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
  const { PlaySim } = await import('../../../src/sim/playsim.js');
  const core = await import('./dither-core.js');
  core.instrument(PlaySim);
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
  const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const acc: import('./dither-core.js').Acc = {};
  for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
    for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    core.watch(sim, acc); sim.run();
  }
  return core.rates(acc);
}

const now = await measure();
const want = process.env.ONLY_STAGE;
for (const kind of ['controller', 'stage'] as const) for (const [k, r] of Object.entries(now[kind])) if ((!want || k === want) && r.reversed >= 1) console.log(`${kind} '${k}': rate ${r.rate.toFixed(4)} moving ${r.moving.toFixed(0)} s reversed ${r.reversed}`);
