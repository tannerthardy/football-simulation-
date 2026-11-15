// How much of the game is the near field? Per role, over the dropback and run panels of test/dither-budget (engine-67 defaults, 0.1 s samples from the snap to the whistle): the share of player-seconds with an opponent within
// 2 yd, and of those the share with the nearest such opponent inside the visual field about the body's facing (+-95 deg, Coverage's field half-width; the sim has no head by default so the body facing stands in) and outside it.
// usage: node --import tsx scripts/diag/effective-mass/near-field-reach.mts [seeds=5]
const R = process.cwd();
const { Rng } = await import(`${R}/src/core/rng.ts`); const { generateTeam, pickDefense, pickOffense } = await import(`${R}/src/league/team.ts`);
const { PASS_BY_ID, RUN_BY_ID } = await import(`${R}/src/playbook/concepts.ts`); const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${R}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${R}/src/playbook/formations.ts`); const { PlaySim } = await import(`${R}/src/sim/playsim.ts`);
const N = Number(process.argv[2] ?? 5);
const offense = generateTeam(new Rng(101), 'O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DTD', { strength: .55 });
const acc = new Map<string, { sec: number; near: number; inField: number; outField: number; engaged: number }>();
const role = (a: any, sim: any) => a === sim.carrier ? (a === sim.qb ? 'QB holding/running' : 'ball carrier') : a === sim.qb ? 'QB' : a.team === sim.offense[0].team ? (['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'offensive line' : ['X', 'Z', 'Y', 'H', 'RB', 'F', 'W'].includes(a.slot) ? (a.slot === 'RB' ? 'back' : 'receiver/TE') : 'other offense') : (['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(a.slot) ? 'defensive line' : 'back seven');
function run(sim: any) {
  const tick = sim.tick.bind(sim); let last = -1;
  sim.tick = () => { tick(); if (sim.phase !== 'live') return; const k = Math.floor(sim.t * 10 + 1e-6); if (k === last) return; last = k;
    for (const a of sim.agents) { const r = role(a, sim); const s = acc.get(r) ?? acc.set(r, { sec: 0, near: 0, inField: 0, outField: 0, engaged: 0 }).get(r)!; s.sec += 0.1;
      let best: any = null, bd = 2; for (const o of sim.agents) { if (o.team === a.team) continue; const d = Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y); if (d < bd) { bd = d; best = o; } }
      if (!best) continue; s.near += 0.1;
      if (a.engagement || best.engagement?.blocker === a || best.engagement?.defender === a) { s.engaged += 0.1; continue; }
      const brg = Math.atan2(best.pos.y - a.pos.y, best.pos.x - a.pos.x) - a.body.facing, off = Math.abs(Math.atan2(Math.sin(brg), Math.cos(brg)));
      if (off <= 95 * Math.PI / 180) s.inField += 0.1; else s.outField += 0.1; } };
  sim.run();
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'four_verts', 'y_cross', 'flood']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.gun_doubles_11;
  run(new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never)); }
for (const rn of ['oz_strong', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.ace_12;
  run(new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'), offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[rn], label: rn },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never)); }
console.log('role                 player-s | opponent within 2 yd: share | of those: engaged (blocking/tackling) | free, inside the field | free, outside the field');
for (const [r, s] of [...acc].sort()) console.log(`${r.padEnd(20)} ${s.sec.toFixed(0).padStart(7)} | ${(100 * s.near / s.sec).toFixed(1).padStart(5)}% | ${(100 * s.engaged / Math.max(1e-9, s.near)).toFixed(0).padStart(3)}% | ${(100 * s.inField / Math.max(1e-9, s.near)).toFixed(0).padStart(3)}% | ${(100 * s.outField / Math.max(1e-9, s.near)).toFixed(0).padStart(3)}%   (free outside the field: ${s.outField.toFixed(1)} s)`);
