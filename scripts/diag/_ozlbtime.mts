/** OZ box backers, lateral speed toward the run side by time relative to the
 * handoff (Coverage's NFL operator: run side = carrier's lateral direction over
 * the 1 s after the handoff; a hindsight label). Same snaps as _takeonpair, OZ only. */
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
const N = Number(process.argv[2] ?? 400), S0 = Number(process.argv[3] ?? 5000);
const runs = ['oz_strong', 'iz', 'power', 'counter', 'duo'].filter((r) => RUN_BY_ID[r]);
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_11', 'pistol_11', 'ace_12', 'i_pro_21'].filter((f) => FORMATION_BY_ID[f]);
const covs = ['cover1', 'cover2man', 'cover3', 'cover4', 'cover2'], fronts = ['over', 'under'];
const OFF = [-0.5, -0.25, 0, 0.25, 0.5, 1.0];
for (let k = 0; k < N; k++) {
  const seed = S0 + k, r = new Rng(seed * 7 + 1);
  const run = r.pick(runs), form = r.pick(forms), cov = r.pick(covs), front = r.pick(fronts), flip = r.chance(.5), team = Math.floor(r.next() * 3);
  const los = r.pick([25, 35, 45, 55]), ballY = r.pick([23.6, 26.65, 29.7]);
  if (run !== 'oz_strong') continue;
  const o = generateTeam(new Rng(100 + team + 1), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(200 + team + 1), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID[form]; const pers: any = /12|21/.test(formation.personnel) ? 'base43' : 'nickel';
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel as any), defense: pickDefense(d, pers),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run } as any,
    defCall: { personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
    los, ballY, firstDownX: 55, seed, audibles: false } as any);
  const lbs = sim.defense.filter((a: any) => /^LB/.test(a.slot));
  const hist: Array<{ t: number; y: number[]; cy: number | null }> = [];
  try { while (!sim.outcome && sim.t < 6) { sim.tick(); hist.push({ t: sim.t, y: lbs.map((a: any) => a.pos.y), cy: sim.carrier?.pos.y ?? null }); } } catch { continue; }
  const h = sim.handoffAt; if (h < 0) continue;
  const at = (t: number) => hist.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, hist[0]);
  const c0 = at(h).cy, c1 = at(h + 1).cy; if (c0 == null || c1 == null || Math.abs(c1 - c0) < 0.5) continue;
  const side = Math.sign(c1 - c0);
  lbs.forEach((a: any, i: number) => {
    const v = OFF.map((dt) => { const t = h + dt; if (t - 0.1 < 0) return NaN; const p = at(t - 0.1), q = at(t + 0.1); return side * (q.y[i] - p.y[i]) / (q.t - p.t); });
    console.log(`${seed} ${a.slot} h=${h.toFixed(2)} ${v.map((x) => x.toFixed(2)).join(' ')}`);
  });
}
