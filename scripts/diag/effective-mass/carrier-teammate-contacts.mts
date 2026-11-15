/** The dither-budget panel (test/dither-budget.test.ts) as a script, with chosen stack flags turned off, to find which flag moved a stage's reversed re-aim rate.
 *   OFF=FLAG1,FLAG2 [ONLY_STAGE='carrier / spacing'] node --import tsx scripts/diag/effective-mass/dither-panel.mts
 * The reference stack's `on` flags are set to 1 (as the test does), then OFF's flags to 0. Prints each stage's [rate, moving s, reversed events]. */
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) process.env[k] = '1';
for (const k of (process.env.OFF ?? '').split(',').filter(Boolean)) process.env[k] = '0';
/** Carrier-into-teammate contact episodes on the panel: ticks where the carrier's body is within 0.9 of the radii sum of an offensive teammate (the spacing stage's TOUCH), counted once per teammate per 0.5 s. */
const tot = { plays: 0, episodes: 0, ticks: 0, byPlay: {} as Record<string, number> };
function track(sim: any) {
  const last = new Map<any, number>(); let n = 0; tot.plays++;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || c.team !== sim.offense?.[0]?.team) return;
    for (const m of sim.agents) { if (m === c || m.team !== c.team) continue; const d = Math.hypot(m.pos.x - c.pos.x, m.pos.y - c.pos.y);
      if (d < 0.9 * (m.profile.radius + c.profile.radius)) { tot.ticks++; if (sim.t - (last.get(m) ?? -9) > 0.5) { tot.episodes++; n++; if (process.env.EPISODES) console.log(`ep play#${tot.plays} ${sim.offCall?.label} t ${sim.t.toFixed(2)} carrier ${c.idx} (${c.behavior?.kind}) speed ${Math.hypot(c.vel.x, c.vel.y).toFixed(1)} mate ${m.idx} ${m.profile?.position ?? ''} ${(m.engagement ? 'engaged' : 'free')} mate speed ${Math.hypot(m.vel.x, m.vel.y).toFixed(1)} d ${d.toFixed(2)}`); } last.set(m, sim.t); } } };
  const label = `${sim.offCall?.label ?? '?'}/${sim.seed ?? ''}`; const run = sim.run.bind(sim); sim.run = () => { const r = run(); tot.byPlay[label] = (tot.byPlay[label] ?? 0) + n; return r; };
}
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
  for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= Number(process.env.RUNSEEDS ?? 5); seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    track(sim); sim.run();
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    track(sim); sim.run();
  }
  for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
    for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    track(sim); sim.run();
  }
  return core.rates(acc);
}

await measure();
console.log(`carrier-into-own-teammate contacts on the panel: ${tot.episodes} episodes (${tot.ticks} ticks) in ${tot.plays} plays`);
console.log('by play (nonzero): ' + JSON.stringify(Object.fromEntries(Object.entries(tot.byPlay).filter(([, v]) => v > 0))));
