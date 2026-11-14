/** CARRIER_COMMIT closing-gap episodes on fixed plays (Defense, report only): ticks where a held bend is kept although
 * its swept clearance is below zero (a gap closing on the bend he chose), on the dither-guard panel's runs and
 * screens. Prints counts and the first episodes (play, seed, time, bend, clearances).
 * usage: CARRIER_COMMIT=1 node --import tsx scripts/diag/effective-mass/closing-gap-scan.mts */
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) if (process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { RUN_BY_ID, SCREEN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { carrierCommitTrace } = await import('../../../src/sim/spacing.js');
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
let holds = 0; const eps: string[] = [];
function play(label: string, seed: number, cfg: any) {
  const sim: any = new PlaySim(cfg); let last = -9;
  carrierCommitTrace.onHold = (a, bend, hc, sc) => { holds++; if (hc < 0 && a === sim.carrier && sim.t - last > 0.5) { last = sim.t; eps.push(`${label} seed ${seed} t ${sim.t.toFixed(2)} ${a.slot} bend ${bend} held clearance ${hc.toFixed(3)} straight ${sc.toFixed(3)}`); } };
  sim.run();
}
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++)
  play(run, seed, { offense: pickOffense(offense, FORMATION_BY_ID.ace_12.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_12, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed });
for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen']) for (let seed = 1; seed <= 10; seed++)
  play(pass, seed, { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: seed % 2 === 0, kind: 'pass', pass: SCREEN_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'scr' }, los: 35, ballY: 26.65, firstDownX: 45, seed });
console.log(`held-bend keeps: ${holds}; closing-gap episodes (held clearance < 0, carrier): ${eps.length}`);
for (const e of eps.slice(0, 12)) console.log('  ' + e);
