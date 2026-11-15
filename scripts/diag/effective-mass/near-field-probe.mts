// NEAR_FIELD gates: for the gated players (the ball carrier; man and zone defenders) every 0.1 s, for each opponent within 6 yd: how wrong is the picture `sim.see` returns (position error against
// the body's TRUE position now, a diagnostic) and how old, by (a) a touch in the last 0.15 to 0.65 s (the felt window) against none, (b) the eccentricity of the true bearing off his body facing.
//   NEAR_FIELD=0|1|2|3 node --import tsx scripts/diag/effective-mass/near-field-probe.mts [seeds=4]
const R = process.cwd();
const { Rng } = await import(`${R}/src/core/rng.ts`); const { generateTeam, pickDefense, pickOffense } = await import(`${R}/src/league/team.ts`);
const { PASS_BY_ID, RUN_BY_ID } = await import(`${R}/src/playbook/concepts.ts`); const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${R}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${R}/src/playbook/formations.ts`); const { PlaySim } = await import(`${R}/src/sim/playsim.ts`);
const N = Number(process.argv[2] ?? 4);
const offense = generateTeam(new Rng(101), 'O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DTD', { strength: .55 });
type Cell = { n: number; err: number[]; age: number[]; vel: number[] };
const cells = new Map<string, Cell>(); const cell = (k: string) => cells.get(k) ?? cells.set(k, { n: 0, err: [], age: [], vel: [] }).get(k)!;
function watch(sim: any) {
  const lastTouch = new Map<string, number>(); const tick = sim.tick.bind(sim); let last = -1;
  sim.tick = () => { tick();
    if (sim.phase !== 'live') return;
    for (const c of sim.lastStep?.contacts ?? []) { const a = sim.agents[c.i], b = sim.agents[c.j]; if (a && b && a.team !== b.team) { lastTouch.set(`${a.idx}>${b.idx}`, sim.t); lastTouch.set(`${b.idx}>${a.idx}`, sim.t); } }
    const k = Math.floor(sim.t * 10 + 1e-6); if (k === last) return; last = k;
    for (const o of sim.agents) {
      const gated = o === sim.carrier || (o.team === 'D' && (o.behavior?.kind === 'man' || o.behavior?.kind === 'zone')); if (!gated) continue;
      for (const d of sim.agents) { if (d.team === o.team) continue; const dist = Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y); if (dist > 6) continue;
        const p = sim.see(o, d), err = Math.hypot(p.pos.x - d.pos.x, p.pos.y - d.pos.y);
        const e = Math.abs(Math.atan2(Math.sin(Math.atan2(d.pos.y - o.pos.y, d.pos.x - o.pos.x) - o.body.facing), Math.cos(Math.atan2(d.pos.y - o.pos.y, d.pos.x - o.pos.x) - o.body.facing))) * 180 / Math.PI;
        const touched = sim.t - (lastTouch.get(`${o.idx}>${d.idx}`) ?? -9) >= 0.15 && sim.t - (lastTouch.get(`${o.idx}>${d.idx}`) ?? -9) <= 0.65;
        const who = o === sim.carrier ? 'carrier' : 'defender', band = e < 30 ? 'ecc<30' : e < 60 ? 'ecc30-60' : e < 103 ? 'ecc60-103' : 'behind(>103)';
        for (const key of [`${who} ${band}`, `${who} ${touched ? 'touched' : 'not touched'}`]) { const c = cell(key); c.n++; c.err.push(err); c.age.push(p.age ?? 0); c.vel.push(Math.hypot(p.vel.x, p.vel.y)); } } } };
  sim.run();
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'four_verts', 'y_cross', 'flood']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.gun_doubles_11;
  watch(new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never)); }
for (const rn of ['oz_strong', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss']) for (let seed = 1; seed <= N; seed++) { const formation = FORMATION_BY_ID.ace_12;
  watch(new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'), offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[rn], label: rn },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never)); }
const q = (v: number[], p: number) => { v = [...v].sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * (v.length - 1) + .5))] : NaN; };
console.log(`NEAR_FIELD=${process.env.NEAR_FIELD ?? 0}: picture of an opponent within 6 yd; position error vs truth (yd) median / p90, age (s) median, picture speed median`);
for (const [k, c] of [...cells].sort()) console.log(`  ${k.padEnd(26)} n ${String(c.n).padStart(6)} | err ${q(c.err, .5).toFixed(2)} / ${q(c.err, .9).toFixed(2)} | age ${q(c.age, .5).toFixed(2)} | speed ${q(c.vel, .5).toFixed(1)}`);
