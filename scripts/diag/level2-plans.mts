// LEVEL2_TRACK gate (Run Game, 2026-11-16): every staged zone run's line plan at the snap: who doubles, who climbs to
// whom, and which box backers are left free (by front). One JSON line per case; run once per arm and compare.
//   node scripts/ref.mjs [--flag LEVEL2_TRACK=1] -- npx tsx scripts/diag/level2-plans.mts out.jsonl
import { writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONTS, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { planRunBlocking } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';
const runs = ['iz_strong', 'iz_weak', 'oz_strong', 'oz_weak', 'wz_strong', 'wz_weak', 'split_zone'];
const forms = ['gun_doubles_11', 'gun_trips_11', 'gun_bunch_11', 'singleback_11', 'i_form_21', 'singleback_12'].filter((f) => FORMATION_BY_ID[f]);
const covs = ['cover3', 'cover1', 'cover2', 'cover4', 'cover0'];
const press = [null, 'zero_6'];
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const out: string[] = [];
for (const r of runs) for (const fId of forms) for (const front of FRONTS) for (const cov of covs) for (const pr of press) for (const flip of [false, true]) {
  if (pr && cov !== 'cover0') continue;
  const formation = FORMATION_BY_ID[fId];
  let sim: any;
  try {
    sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, (Array.isArray(front.personnel) ? front.personnel[0] : front.personnel) ?? 'nickel'),
      offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[r], label: r },
      defCall: { personnel: (Array.isArray(front.personnel) ? front.personnel[0] : front.personnel) ?? 'nickel', front, coverage: COVERAGE_BY_ID[cov], pressure: pr ? PRESSURE_BY_ID[pr] : null, label: 'x' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11, audibles: false } as any);
  } catch { continue; }
  let plans: Map<any, any>;
  try { plans = planRunBlocking(sim, RUN_BY_ID[r]); } catch { continue; }
  const lb = sim.defense.filter((d: any) => /^LB/.test(d.slot) || ((d.pos.x - sim.los) > 2 && (d.pos.x - sim.los) < 7 && Math.abs(d.pos.y - sim.ballY) < 6));
  const owned = new Set<string>();
  const line: string[] = [];
  for (const [b, p] of plans) {
    for (const t of [p.target, p.climbTo, p.combination?.backer]) if (t) owned.add(t.slot);
    if (['LT', 'LG', 'C', 'RG', 'RT'].includes(b.slot) || p.kind === 'climb' || p.combination) line.push(`${b.slot}:${p.kind}>${p.target?.slot ?? '-'}^${p.climbTo?.slot ?? p.combination?.backer?.slot ?? '-'}`);
  }
  const free = lb.filter((d: any) => !owned.has(d.slot)).map((d: any) => d.slot).sort();
  out.push(JSON.stringify({ key: `${r}|${fId}|${front.id}|${cov}|${pr ?? '-'}|${flip}`, front: front.id, run: r, plan: line.sort().join(' '), free,
    lbs: Object.fromEntries(lb.map((d: any) => [d.slot, [+(d.pos.x - sim.los).toFixed(2), +((d.pos.y - sim.ballY) * sim.offAlign.strongSign).toFixed(2)]])) }));
}
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(`${out.length} cases -> ${process.argv[2]}`);
