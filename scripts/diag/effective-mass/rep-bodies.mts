// Do pass-rep outcomes follow the bodies or the dice? (Integration, 2026-11-14, CONTROL_HANDS's prediction rows.)
// Per pass rep (a DL/LB rusher engaged by an OL), from the rep's start over 1.5 s (ball still in): the outcome = how far
// the rusher closed on the QB (yd, + = closer; his distance at the start minus at the end of the window). Bodies: the
// rusher's mass minus the blocker's (kg), arm length minus (in), the rusher's speed at the start (yd/s); the rep's
// control at the start (the roll, for comparison). Reports by rep class (edge = against a tackle, interior otherwise):
// the outcome's mean and SD, and its correlation with each.
// usage: [flags] node --import tsx scripts/diag/effective-mass/rep-bodies.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const reps = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const qb = sim.qb;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || reps.has(e)) continue;
      const d = e.defender, b = e.blocker;
      if (!/^(DE|DT|NT|OLB|ILB|MLB|LB)/.test(d.slot) || !['LT', 'LG', 'C', 'RG', 'RT'].includes(b.slot) || sim.throwAt >= 0) continue;
      reps.set(e, { t0: sim.t, q0: Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y), edge: b.slot === 'LT' || b.slot === 'RT',
        dm: d.profile.massKg - b.profile.massKg, da: d.player.measurables.armIn - b.player.measurables.armIn,
        v0: Math.hypot(d.vel.x, d.vel.y), c0: e.control ?? 0, d });
    }
    for (const r of reps.values()) {
      if (r.done) continue;
      if (sim.t - r.t0 >= 1.5 || sim.throwAt >= 0 || sim.phase !== 'live') {
        r.done = true; if (sim.t - r.t0 >= 1.0) { r.out = r.q0 - Math.hypot(r.d.pos.x - qb.pos.x, r.d.pos.y - qb.pos.y); r.d = undefined; rows.push(r); }
      }
    }
  };
  return sim.run();
} } });
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const sd = (v: number[]) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };
const corr = (x: number[], y: number[]) => { const mx = mean(x), my = mean(y); let n = 0, a = 0, b = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); a += (x[i] - mx) ** 2; b += (y[i] - my) ** 2; } return n / Math.sqrt(a * b || 1); };
for (const [lab, f] of [['edge (against a tackle)', (r: any) => r.edge], ['interior', (r: any) => !r.edge]] as const) {
  const R = rows.filter(f); if (R.length < 10) continue;
  const o = R.map((r) => r.out);
  console.log(`${lab.padEnd(24)} n ${String(R.length).padStart(4)} | closed on the QB in the rep's first 1.5 s: mean ${mean(o).toFixed(2)} yd, SD ${sd(o).toFixed(2)} | correlation with mass diff ${corr(R.map((r) => r.dm), o).toFixed(2)}, arm diff ${corr(R.map((r) => r.da), o).toFixed(2)}, speed at the start ${corr(R.map((r) => r.v0), o).toFixed(2)}, the rolled control at the start ${corr(R.map((r) => r.c0), o).toFixed(2)}`);
}
