/** Coverage's 22 snaps: backer falls before 2.5 s, first defender within 1 yd, and play yards. */
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
const rows = readFileSync('scripts/diag/_cfit.mts', 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).map((r) => r.map((x) => x.replace(/^.*`/, '').replace(/`.*$/, ''))).filter((r) => r.length >= 9 && /^cover/.test(r[0]));
for (const r0 of rows) { const r = r0.map((x) => x.replace(/^.*`/, '')); const [cov, form, run, front, flip, team, seed, los, ballY] = r;
  const i = Number(team) + 1;
  const o = generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID[form]; const pers: any = /12|21/.test(formation.personnel) ? 'base43' : 'nickel';
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel as any), defense: pickDefense(d, pers),
    offCall: { formation, flip: flip === 'true', kind: 'run', run: RUN_BY_ID[run], label: run } as any,
    defCall: { personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
    los: Number(los), ballY: Number(ballY), firstDownX: 55, seed: Number(seed), audibles: false } as any);
  const dir = sim.attackDir(sim.offense[0].team); const falls: string[] = []; const seen = new Set();
  let first = '-', g = 0;
  while (!sim.outcome && g++ < 3000) { sim.tick();
    for (const a of sim.defense) if (/^LB/.test(a.slot) && sim.t < 2.5 && !seen.has(a) && a.body.support?.state !== 'up') { seen.add(a); falls.push(`${a.slot}@${sim.t.toFixed(2)}`); }
    const c = sim.carrier; if (first === '-' && c && sim.handoffAt >= 0) { const n = sim.defense.find((x: any) => Math.hypot(x.pos.x - c.pos.x, x.pos.y - c.pos.y) < 1); if (n) first = `${n.slot}@${((c.pos.x - sim.los) * dir).toFixed(1)}`; } }
  const c = sim.carrier ?? sim.offense.find((x: any) => x.slot === 'RB');
  const res: any = sim.buildResult(); const yds = Number(res.yards ?? res.gain ?? NaN);
  console.log(`${seed} ${cov} ${run} yds=${yds.toFixed(1)} first=${first} lbFalls<2.5=${falls.join(',') || '-'}`);
}
