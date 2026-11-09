/** BACKER_TAKEON paired check: N random run snaps (Coverage's grid constructor),
 * prints seed, yards and whether the break-down fired. Run once with
 * BACKER_TAKEON=0 and once with =1, then pair by seed. usage: [n] [seed0] */
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { takeOnFired as fired } from '../../src/sim/behaviors/defense.js';
const N = Number(process.argv[2] ?? 300), S0 = Number(process.argv[3] ?? 5000);
const runs = ['oz_strong', 'iz', 'power', 'counter', 'duo'].filter((r) => RUN_BY_ID[r]);
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_11', 'pistol_11', 'ace_12', 'i_pro_21'].filter((f) => FORMATION_BY_ID[f]);
const covs = ['cover1', 'cover2man', 'cover3', 'cover4', 'cover2'], fronts = ['over', 'under'];
for (let k = 0; k < N; k++) {
  const seed = S0 + k, r = new Rng(seed * 7 + 1);
  const run = r.pick(runs), form = r.pick(forms), cov = r.pick(covs), front = r.pick(fronts), flip = r.chance(.5), team = Math.floor(r.next() * 3);
  const los = r.pick([25, 35, 45, 55]), ballY = r.pick([23.6, 26.65, 29.7]);
  const o = generateTeam(new Rng(100 + team + 1), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(200 + team + 1), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID[form]; const pers: any = /12|21/.test(formation.personnel) ? 'base43' : 'nickel';
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel as any), defense: pickDefense(d, pers),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run } as any,
    defCall: { personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
    los, ballY, firstDownX: 55, seed, audibles: false } as any);
  let res: any, falls = 0; const down = new Set();
  try { while (!sim.outcome && sim.t < 30) { sim.tick(); if (sim.t < 3) for (const a of sim.defense) if (/^LB/.test(a.slot) && !down.has(a) && a.body.support?.state !== 'up') { down.add(a); falls++; } } res = sim.buildResult(); } catch { console.log(`${seed} ERR`); continue; }
  console.log(`${seed} ${run} ${cov} yds=${Number(res.yards).toFixed(1)} fired=${fired.has(sim) ? 1 : 0} lbfalls=${falls}`);
}
