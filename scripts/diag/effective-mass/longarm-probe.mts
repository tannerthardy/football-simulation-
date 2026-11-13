// RUSH_HANDS stage 2: long-arms in games -- how they end (swiped off by the blocker or held to his next decision),
// how long they last, how often the blocker is out of reach while one is on, and the pair's gap.
// usage: RUSH_HANDS=1 node --import tsx scripts/diag/effective-mass/longarm-probe.mts [first seed] [games]
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
    const open = new Map<any, any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const live = new Set();
      for (const e of sim.engagements) {
        if (e.type !== 'pass') continue;
        const j = e.rusherHand;
        if (j) {
          live.add(e);
          let r = open.get(e);
          if (!r) { r = { t0: sim.t, ticks: 0, cut: 0, gap: 0, swiped: false, edge: ['LT', 'RT'].includes(e.blocker.slot), armDiff: (e.defender.player.measurables.armIn - e.blocker.player.measurables.armIn) }; open.set(e, r); }
          r.ticks++;
          const gap = Math.hypot(e.blocker.pos.x - e.defender.pos.x, e.blocker.pos.y - e.defender.pos.y) - e.blocker.profile.radius - e.defender.profile.radius;
          r.gap += gap; if (e.hands && e.hands.push === 0) r.cut++;
          if (j.off) r.swiped = true;
        }
      }
      for (const [e, r] of open) if (!live.has(e)) { r.t1 = sim.t; rows.push(r); open.delete(e); }
    };
    const res = sim.run();
    for (const r of open.values()) { r.t1 = r.t0 + r.ticks * 0.05; rows.push(r); }
    return res; } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`long-arms ${rows.length}: swiped off ${pc(rows.filter((r) => r.swiped).length, rows.length)} | lasted p50 ${q(rows.map((r) => r.t1 - r.t0))} s | blocker out of reach p50 ${q(rows.map((r) => r.cut / r.ticks))} of ticks | gap p50 ${q(rows.map((r) => r.gap / r.ticks))} yd`);
for (const [lab, f] of [['rusher arm longer', (r: any) => r.armDiff > 0], ['not longer', (r: any) => r.armDiff <= 0]] as const) {
  const R = rows.filter(f);
  console.log(`  ${lab}: ${R.length} | blocker out of reach ${q(R.map((r) => r.cut / r.ticks))} | swiped ${pc(R.filter((r) => r.swiped).length, R.length)}`);
}
