// Stage 2 ordering: how often would an offensive consumer be blind without a head want of its own? Per relation, over the dropback and run panels (engine defaults, 0.1 s samples, snap to the throw / whistle): the
// share of samples in which the thing it reads lies OUTSIDE +-95 deg of his body facing (the sim's head by default; HEAD=1 would turn it). Only the relation, not the read's value.
// usage: node --import tsx scripts/diag/effective-mass/near-field-blind.mts [seeds=4]
const R = process.cwd();
const { Rng } = await import(`${R}/src/core/rng.ts`); const { generateTeam, pickDefense, pickOffense } = await import(`${R}/src/league/team.ts`);
const { PASS_BY_ID, RUN_BY_ID } = await import(`${R}/src/playbook/concepts.ts`); const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${R}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${R}/src/playbook/formations.ts`); const { PlaySim } = await import(`${R}/src/sim/playsim.ts`);
const N = Number(process.argv[2] ?? 4);
const offense = generateTeam(new Rng(101), 'O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DTD', { strength: .55 });
const acc = new Map<string, { n: number; out: number }>(); const add = (k: string, o: boolean) => { const c = acc.get(k) ?? acc.set(k, { n: 0, out: 0 }).get(k)!; c.n++; if (o) c.out++; };
const outside = (a: any, b: any) => { const d = Math.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x) - a.body.facing; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) > 95 * Math.PI / 180; };
const OL = ['LT', 'LG', 'C', 'RG', 'RT'], DL = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
function watch(sim: any, kind: 'pass' | 'run') {
  const tick = sim.tick.bind(sim); let last = -1;
  sim.tick = () => { tick(); if (sim.phase !== 'live') return; const k = Math.floor(sim.t * 10 + 1e-6); if (k === last) return; last = k;
    const held = sim.ball?.kind === 'held', qb = sim.qb;
    const near = (a: any, list: any[], r: number) => list.map((d: any) => ({ d, x: Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) })).filter((e) => e.x <= r).sort((p, q) => p.x - q.x)[0]?.d;
    for (const a of sim.offense) {
      if (kind === 'pass' && held) {
        if (['X', 'Z', 'Y', 'H'].includes(a.slot)) { add('receiver -> the QB (on his route, ball held)', outside(a, qb)); const d = near(a, sim.defense, 12); if (d) add('receiver -> nearest defender within 12 yd', outside(a, d)); }
        if (OL.includes(a.slot)) { const d = near(a, sim.defense.filter((x: any) => DL.includes(x.slot)), 4); if (d) add('pass blocker -> nearest rusher within 4 yd (free of a block)', outside(a, d)); }
        if (a === qb) { for (const r of sim.offense) if (r !== qb && ['X', 'Z', 'Y', 'H', 'RB'].includes(r.slot)) add('QB -> each other receiver (every sample)', outside(qb, r)); const d = near(qb, sim.defense, 6); if (d) add('QB -> nearest defender within 6 yd', outside(qb, d)); }
        if (a.slot === 'RB') { const d = near(a, sim.defense, 6); if (d) add('back -> nearest defender within 6 yd', outside(a, d)); }
      }
      if (kind === 'run' && a !== sim.carrier) {
        if (OL.includes(a.slot)) { const lb = near(a, sim.defense.filter((x: any) => !DL.includes(x.slot) && x.pos.x > sim.los - 1), 9); if (lb) add('run blocker -> nearest linebacker/second-level man within 9 yd', outside(a, lb)); const d = near(a, sim.defense.filter((x: any) => DL.includes(x.slot)), 3); if (d) add('run blocker -> nearest down lineman within 3 yd', outside(a, d)); const m = near(a, sim.offense.filter((x: any) => x !== a && OL.includes(x.slot)), 3.5); if (m) add('run blocker -> nearest lineman teammate within 3.5 yd', outside(a, m)); }
      } } };
  sim.run();
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'four_verts', 'y_cross', 'flood']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.gun_doubles_11;
  watch(new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never), 'pass'); }
for (const rn of ['oz_strong', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.ace_12;
  watch(new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'), offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[rn], label: rn },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never), 'run'); }
for (const [k, c] of [...acc].sort((x, y) => y[1].out / y[1].n - x[1].out / x[1].n)) console.log(`  ${(100 * c.out / c.n).toFixed(0).padStart(3)}% outside the field  n ${String(c.n).padStart(6)}  ${k}`);
