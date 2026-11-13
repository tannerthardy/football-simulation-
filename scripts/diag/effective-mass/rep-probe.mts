const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const reps = new Map<any, any>();
const done: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.carrier !== sim.qb || sim.throwAt >= 0) return;
      const live = new Set();
      for (const e of sim.engagements) {
        if (e.type !== 'pass') continue;
        const b = e.blocker, d = e.defender; live.add(e);
        const edge = (b.slot === 'LT' || b.slot === 'RT');
        let r = reps.get(e);
        if (!r) { r = { edge, interior: ['LG', 'C', 'RG'].includes(b.slot), t0: sim.t, ticks: 0, ctl: 0, moves: 0, ok: 0, lastMoveUntil: -1, gapSum: 0, lock: 0, endQB: 0 }; reps.set(e, r); }
        r.ticks++; if (e.control >= 0) r.ctl++;
        if (e.moveUntil !== r.lastMoveUntil && e.moveUntil > sim.t - 1e-9) { r.moves++; if (e.moveOk) r.ok++; r.lastMoveUntil = e.moveUntil; }
        const bodies = b.profile.radius + d.profile.radius, gap = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - bodies;
        r.gapSum += gap; if (e.hands && e.hands.extension - bodies >= 0.8 * b.player.measurables.armIn / 36) r.lock++;
        r.endQB = Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y); r.t1 = sim.t;
      }
      for (const [e, r] of reps) if (!live.has(e)) { const ev = [...sim.events].reverse().find((x: any) => x.type === 'shed' && sim.agents[x.a] === e.defender); r.why = ev?.note ?? 'other'; done.push(r); reps.delete(e); }
    };
    const res = sim.run();
    for (const [e, r] of reps) { r.why = 'play over'; done.push(r); } reps.clear();
    return res; } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, f] of [['edge (tackle)', (r: any) => r.edge], ['interior (G/C)', (r: any) => r.interior]] as const) {
  const R = done.filter(f);
  const why: Record<string, number> = {}; for (const r of R) why[r.why] = (why[r.why] ?? 0) + 1;
  const top = Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${(100 * v / R.length).toFixed(0)}%`).join(', ');
  const moves = R.reduce((s, r) => s + r.moves, 0), ok = R.reduce((s, r) => s + r.ok, 0);
  console.log(`${lab}: reps ${R.length} | duration p50 ${q(R.map((r) => (r.t1 ?? r.t0) - r.t0))} s | blocker in control ${q(R.map((r) => r.ctl / r.ticks))} of ticks | moves per rep ${(moves / R.length).toFixed(2)}, success ${(100 * ok / Math.max(1, moves)).toFixed(0)}% | body gap p50 ${q(R.map((r) => r.gapSum / r.ticks))} | hands at lockout ${q(R.map((r) => r.lock / r.ticks))} of ticks | rusher to QB at the end ${q(R.map((r) => r.endQB))} | ends: ${top}`);
}
