// Why interior pass blockers' hands carry no press (RUSH_HANDS keys read, 2026-11-13). Guards/center vs tackles in
// pass reps, every tick while the QB holds the ball: control, the gap between the bodies, the joint's extension past
// the bodies, its mode (c = distance - extension: < 0 compression, 0..HANDS_SLACK slack, beyond tension), N.
// usage: [flags] node --import tsx scripts/diag/effective-mass/interior-hands.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.carrier !== sim.qb || sim.throwAt >= 0) return;
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !e.hands) continue;
        const b = e.blocker, d = e.defender, j = e.hands;
        const bodies = b.profile.radius + d.profile.radius, dist = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y);
        const c = dist - j.extension;
        rows.push({ interior: ['LG', 'C', 'RG'].includes(b.slot), edge: ['LT', 'RT'].includes(b.slot), ctl: e.control, gap: dist - bodies,
          ext: j.extension - bodies, mode: c < 0 ? 'compression' : c <= 0.06 ? 'slack' : 'tension', N: j.normalForce ?? 0, push: j.push, helpers: e.helpers.length,
          t: sim.t - e.start });
      }
    };
    return sim.run(); } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, f] of [['tackles', (r: any) => r.edge], ['guards/center', (r: any) => r.interior]] as const) {
  const R = rows.filter(f);
  const m: Record<string, number> = {}; for (const r of R) m[r.mode] = (m[r.mode] ?? 0) + 1;
  console.log(`${lab}: ticks ${R.length} | control >= 0 ${(100 * R.filter((r) => r.ctl >= 0).length / R.length).toFixed(0)}% | gap p25/50/75 ${q(R.map((r) => r.gap), .25)}/${q(R.map((r) => r.gap))}/${q(R.map((r) => r.gap), .75)} | extension past bodies p50 ${q(R.map((r) => r.ext))} | mode ${Object.entries(m).map(([k, v]) => `${k} ${(100 * v / R.length).toFixed(0)}%`).join(', ')} | N p50 ${q(R.map((r) => r.N))} | joint push p50 ${q(R.map((r) => r.push))} | doubled ${(100 * R.filter((r) => r.helpers > 0).length / R.length).toFixed(0)}%`);
  for (const ctl of [true, false]) {
    const C = R.filter((r) => (r.ctl >= 0) === ctl);
    const mm: Record<string, number> = {}; for (const r of C) mm[r.mode] = (mm[r.mode] ?? 0) + 1;
    console.log(`   control ${ctl ? '>= 0' : '< 0'}: ${C.length} | gap ${q(C.map((r) => r.gap))} | ext ${q(C.map((r) => r.ext))} | ${Object.entries(mm).map(([k, v]) => `${k} ${(100 * v / C.length).toFixed(0)}%`).join(', ')} | N ${q(C.map((r) => r.N))}`);
  }
}
