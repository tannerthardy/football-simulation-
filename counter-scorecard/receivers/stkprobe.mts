const root = process.argv[2];
const imp = (p: string) => import(root + p);
const { CENTER_Y } = await imp('/src/core/field.ts');
const { Rng } = await imp('/src/core/rng.ts');
const { generateTeam, pickDefense, pickOffense } = await imp('/src/league/team.ts');
const { RUN_BY_ID } = await imp('/src/playbook/concepts.ts');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await imp('/src/playbook/defense.ts');
const { FORMATION_BY_ID } = await imp('/src/playbook/formations.ts');
const { RunBlocker } = await imp('/src/sim/behaviors/blocking.ts');
const { PlaySim } = await imp('/src/sim/playsim.ts');
const off = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), def = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const forms = Object.keys(FORMATION_BY_ID), runs = ['iz_strong','oz_strong','counter','power','duo','trap'].filter(r=>RUN_BY_ID[r]);
const defs = [['over','base43','cover3'],['wide9','nickel','cover3'],['over','nickel','cover2'],['under','base43','cover1']].filter(d=>FRONT_BY_ID[d[0]]&&COVERAGE_BY_ID[d[2]]);
for (const fid of forms) for (const run of runs) for (const [fr, pers, cov] of defs) for (const flip of [false, true]) {
  const f = FORMATION_BY_ID[fid];
  let sim; try { sim = new PlaySim({ offense: pickOffense(off, f.personnel), defense: pickDefense(def, pers), offCall: { formation: f, flip, kind: 'run', run: RUN_BY_ID[run], label: run }, defCall: { personnel: pers, front: FRONT_BY_ID[fr], coverage: COVERAGE_BY_ID[cov], pressure: null, label: fr }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 }); } catch { continue; }
  for (const a of sim.offense) { const b = a.behavior; if (!(b instanceof RunBlocker) || b.plan.kind !== 'stalk') continue;
    const t = b.plan.target; console.log([fid, run, fr, pers, cov, flip, a.slot, Math.abs(a.pos.y - CENTER_Y).toFixed(1), t?.slot ?? '-', t ? Math.hypot(t.pos.x - a.pos.x, t.pos.y - a.pos.y).toFixed(1) : '-'].join('\t')); }
}
