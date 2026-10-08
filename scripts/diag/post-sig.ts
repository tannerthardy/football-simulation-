/** Observed post-snap features per coverage at several times (no disguise). */
import { Rng } from '../../src/core/rng.js';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGES, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const rng = new Rng(9);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.6 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.6 });
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_12', 'gun_empty_11'];
for (const c of COVERAGES) {
  const sums: Record<string, number[]> = {};
  let n = 0;
  for (let i = 0; i < 24; i++) {
    const formation = FORMATION_BY_ID[forms[i % forms.length]];
    const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'), offCall: { formation, flip: i % 2 === 1, kind: 'pass', pass: PASS_BY_ID[['smash', 'four_verts', 'mesh', 'curl_flat'][i % 4]], label: '' }, defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: c, pressure: c.id === 'cover0' ? PRESSURE_BY_ID.zero_6 : null, label: '' }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: rng.nextU32() }) as any;
    sim.event('snap', sim.qb);
    while (sim.t < 1.21 && sim.phase === 'live') {
      sim.tick();
      for (const t of [0.5, 0.8, 1.2]) if (Math.abs(sim.t - t) < 0.001) {
        const f = sim.qbMind.postFeaturesObserved();
        const k = String(t);
        sums[k] ??= [0, 0, 0];
        f.forEach((v: number, j: number) => (sums[k][j] += v));
      }
    }
    n++;
  }
  const canon = (globalThis as any).x;
  console.log(c.id.padEnd(10), Object.entries(sums).map(([t, s]) => `t=${t}: ${s.map((v) => (v / n).toFixed(2)).join(' ')}`).join(' | '));
}
