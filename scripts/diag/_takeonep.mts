/** BACKER_TAKEON episodes (Flex's check): for each backer brake episode, did the
 * braked-for blocker (or any opponent) touch him within 0.5 s of the brake's
 * start, and how long did he brake with no contact? Same snaps as _takeonpair. */
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { takeOnTrace } from '../../src/sim/behaviors/defense.js';
const N = Number(process.argv[2] ?? 100), S0 = Number(process.argv[3] ?? 5000);
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
  takeOnTrace.rows = [];
  const touch = new Map<any, number[]>(); // backer -> contact times with any opponent / engagement start
  const imp = new Map<any, Array<[number, any, number]>>(); const peakAt = new Map<any, Array<[number, number]>>();
  try { while (!sim.outcome && sim.t < 30) { sim.tick();
    for (const c of sim.lastStep?.contacts ?? []) for (const [x, y] of [[c.i, c.j], [c.j, c.i]]) { const A = sim.agents[x], B = sim.agents[y]; if (/^LB/.test(A?.slot) && A.team !== B.team) (touch.get(A) ?? touch.set(A, []).get(A)!).push(sim.t); }
    for (const c of sim.lastStep?.contacts ?? []) for (const [x, y] of [[c.i, c.j], [c.j, c.i]]) { const A = sim.agents[x], B = sim.agents[y]; if (/^LB/.test(A?.slot) && A.team !== B.team) (imp.get(A) ?? imp.set(A, []).get(A)!).push([sim.t, B, c.impulse ?? 0]); }
    for (const a of sim.defense) if (/^LB/.test(a.slot)) (peakAt.get(a) ?? peakAt.set(a, []).get(a)!).push([sim.t, a.body.support?.peak ?? 0]);
    for (const e of sim.engagements) if (/^LB/.test(e.defender.slot)) (touch.get(e.defender) ?? touch.set(e.defender, []).get(e.defender)!).push(sim.t);
  } } catch { continue; }
  // Episodes: consecutive brake ticks (gap <= 0.1 s) for one backer.
  const by = new Map<any, number[]>(), who = new Map<string, string>(); for (const row of takeOnTrace.rows!) { (by.get(row.a) ?? by.set(row.a, []).get(row.a)!).push(row.t); who.set(`${row.a.slot}@${row.t.toFixed(2)}`, row.o.slot); }
  for (const [a, ts] of by) { let s = ts[0], prev = ts[0];
    const flush = (end: number) => { const T = touch.get(a) ?? []; const o = takeOnTrace.rows!.find((r) => r.a === a && Math.abs(r.t - s) < 1e-6)?.o;
      const I = Math.max(0, ...(imp.get(a) ?? []).filter(([t, B]) => B === o && t >= s && t <= end + 0.5).map(([, , i]) => i));
      const P = peakAt.get(a) ?? []; const p0 = P.filter(([t]) => t <= s).at(-1)?.[1] ?? 0, p1 = P.filter(([t]) => t <= end + 0.5).at(-1)?.[1] ?? 0; const met = T.find((t) => t >= s - 0.05 && t <= end + 0.5);
      console.log(`${seed} ${run} ${a.slot} start=${s.toFixed(2)} dur=${(end - s + 0.05).toFixed(2)} met=${met === undefined ? -1 : (met - s).toFixed(2)} for=${who.get(`${a.slot}@${s.toFixed(2)}`)} handoff=${sim.handoffAt.toFixed(2)} imp=${I.toFixed(0)} peak0=${p0.toFixed(2)} peak1=${p1.toFixed(2)}`); };
    for (const t of ts.slice(1)) { if (t - prev > 0.11) { flush(prev); s = t; } prev = t; } flush(prev); }
}
