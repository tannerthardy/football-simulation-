// The blocker's refit after a club takes a hand off (Flex, 2026-11-14; Integration: the club wins in the window before
// the refit; is the refit slow by construction?). Per club that takes a hand off (handsOn falls within 0.3 s): time
// until the hand is back (handsOn restored, the joint on), the blocker's and the rusher's lateral speed across the
// rusher's line to the QB over that window, whether the rusher got 'past him' before the refit, interior vs tackle.
// usage: RUSH_HANDS=1 [flags] node --import tsx scripts/diag/effective-mass/refit.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const onOf = (e: any) => !e.hands ? -1 : e.hands.off ? 0 : e.hands.handsOn ?? 2;
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const open: any[] = [], seen = new Set<any>(); const tick = sim.tick.bind(sim);
  const ev0 = sim.event.bind(sim); const sheds: any[] = [];
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && note?.includes('past')) sheds.push({ a, t: sim.t }); return ev0(type, a, b, note); };
  sim.tick = () => {
    const pre = new Map<any, number>(); for (const e of sim.engagements) if (e.type === 'pass') pre.set(e, onOf(e));
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      if (e.club && !seen.has(e.club)) { seen.add(e.club); open.push({ e, t: sim.t, on0: pre.get(e) ?? onOf(e), lostAt: -1, backAt: -1, lb: 0, ld: 0, k: 0, interior: ['LG', 'C', 'RG'].includes(e.blocker.slot) }); }
    }
    for (const r of open) {
      if (r.done) continue;
      const e = r.e, on = sim.engagements.includes(e) ? onOf(e) : -2;
      if (on === -2) { r.done = true; r.ended = sim.t; rows.push(r); continue; }
      if (r.lostAt < 0 && on >= 0 && on < r.on0) r.lostAt = sim.t;
      if (r.lostAt < 0 && sim.t - r.t > 0.3) { r.done = true; rows.push(r); continue; }
      if (r.lostAt >= 0) {
        const d = e.defender, b = e.blocker, ax = { x: sim.qb.pos.x - d.pos.x, y: sim.qb.pos.y - d.pos.y }, L = Math.hypot(ax.x, ax.y) || 1;
        const lat = { x: -ax.y / L * e.side, y: ax.x / L * e.side };
        r.lb += b.vel.x * lat.x + b.vel.y * lat.y; r.ld += d.vel.x * lat.x + d.vel.y * lat.y; r.k++;
        if (on >= r.on0) { r.backAt = sim.t; r.done = true; rows.push(r); }
        else if (sim.t - r.lostAt > 1.5) { r.done = true; rows.push(r); }
      }
    }
  };
  const out = sim.run();
  for (const r of rows) if (r.past === undefined) r.past = sheds.some((x) => x.a === r.e.defender && x.t >= (r.lostAt >= 0 ? r.lostAt : r.t) && (r.backAt < 0 || x.t <= r.backAt));
  return out;
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const inter of [true, false]) {
  const R = rows.filter((r) => r.interior === inter && r.lostAt >= 0);
  const back = R.filter((r) => r.backAt >= 0);
  console.log(`${inter ? 'interior' : 'tackle'}: clubs that took a hand off ${R.length} | refit p25/50/75 ${q(back.map((r) => r.backAt - r.lostAt), .25)}/${q(back.map((r) => r.backAt - r.lostAt))}/${q(back.map((r) => r.backAt - r.lostAt), .75)} s (${back.length} refit, ${R.filter((r) => r.backAt < 0).length} not within 1.5 s or the rep ended) | lateral speed toward his working side while the hand is off: blocker ${q(R.map((r) => r.lb / Math.max(1, r.k)))}, rusher ${q(R.map((r) => r.ld / Math.max(1, r.k)))} yd/s | past him before the refit ${(100 * R.filter((r) => r.past).length / Math.max(1, R.length)).toFixed(0)}%`);
}
