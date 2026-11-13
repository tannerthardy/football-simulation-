// TACKLE_SET's floor (the called launch point + 1.0 yd) against where the QB actually is (Integration, 2026-11-13).
// Per non-play-action dropback: alignment, the called drop, the launch point's and the floor's depth behind the line,
// and at 1.5 / 2.0 / 2.5 s (ball still in his hands) the QB's depth and each tackle's depth.
// usage: [flags] node --import tsx scripts/diag/effective-mass/launch-vs-qb.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { calledLaunchX } = await import(`${W}/src/sim/called-drop.ts`);
const first = Number(process.argv[2] ?? 201), games = Number(process.argv[3] ?? 4);
const TS = [1.5, 2.0, 2.5];
const rows: any[] = [];
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass || sim.offCall.pass.fake) return undefined;
    const launch = calledLaunchX(sim);
    const r: any = { gun: sim.offCall.formation.qb !== 'under', drop: sim.offCall.pass.drop, launch: launch === null ? null : launch - sim.los, at: {} };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const t of TS) if (Math.abs(sim.t - t) < 1e-6 && sim.carrier === sim.qb && sim.throwAt < 0)
        r.at[t] = { qb: sim.qb.pos.x - sim.los, tk: sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT').map((a: any) => a.pos.x - sim.los) };
    };
    const res = sim.run();
    rows.push(r);
    return res; } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const gun of [true, false]) {
  const R = rows.filter((r) => r.gun === gun && r.launch !== null);
  const drops: Record<string, number> = {}; for (const r of R) drops[r.drop] = (drops[r.drop] ?? 0) + 1;
  console.log(`${gun ? 'gun' : 'under center'}: dropbacks ${R.length}; drops ${JSON.stringify(drops)}; launch point p50 ${q(R.map((r) => r.launch))} yd, floor (launch + 1.0) ${q(R.map((r) => r.launch + 1))}`);
  for (const t of TS) {
    const A = R.filter((r) => r.at[t]);
    const qbVsLaunch = A.map((r) => r.at[t].qb - r.launch);
    const tkVsFloor = A.flatMap((r) => r.at[t].tk.map((x: number) => x - (r.launch + 1)));
    const tkVsQB = A.flatMap((r) => r.at[t].tk.map((x: number) => x - r.at[t].qb));
    console.log(`  ${t.toFixed(1)} s (n ${A.length}): QB ${q(A.map((r) => r.at[t].qb))} | QB minus launch point p25/50/75 ${q(qbVsLaunch, .25)}/${q(qbVsLaunch)}/${q(qbVsLaunch, .75)} (QB short of it > 0.5 yd: ${(100 * qbVsLaunch.filter((x) => x > 0.5).length / Math.max(1, A.length)).toFixed(0)}%) | tackles minus floor ${q(tkVsFloor)} | tackles over the QB ${q(tkVsQB)}`);
  }
}
