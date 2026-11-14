// After a club that leaves both of the blocker's hands on (Flex, 2026-11-14; Integration: separate what the hand's
// slide does from what the blocker does about it). Per club whose hands stay on through 0.3 s: the struck hand's offset
// across the man's chest and handEdge (the share of push, hold and steer left, 1 - (offset / his radius)^2) over 1 s;
// when the slide stops (hand velocity under 0.05 yd/s, the walk-back's gate), when the walk-back brings the edge back
// over 0.9; the minimum edge; whether 'past him' came while the edge was under 0.8, and its time from the club.
// usage: RUSH_HANDS=1 [flags] node --import tsx scripts/diag/effective-mass/club-slide.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const open: any[] = [], mine: any[] = [], seen = new Set<any>(); const tick = sim.tick.bind(sim); const sheds: any[] = [];
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && note?.includes('past')) sheds.push({ a, t: sim.t }); return ev0(type, a, b, note); };
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) if (e.type === 'pass' && e.club && !seen.has(e.club) && e.hands && !e.hands.off) {
      seen.add(e.club); open.push({ e, t: sim.t, on0: e.hands.handsOn ?? 2, minEdge: 1, stopAt: -1, backAt: -1, lowFrom: -1, lowTo: -1, interior: ['LG', 'C', 'RG'].includes(e.blocker.slot) });
    }
    for (const r of open) {
      if (r.done) continue;
      const h = r.e.hands;
      if (!sim.engagements.includes(r.e)) { r.done = true; r.ended = true; rows.push(r); mine.push(r); continue; }
      if (!h || h.off || (h.handsOn ?? 2) < r.on0) { r.done = true; r.lost = true; continue; }
      const edge = sim.world.handEdge(h), v = Math.abs(h.handVel ?? 0);
      r.minEdge = Math.min(r.minEdge, edge);
      if (edge < 0.8 && r.lowFrom < 0) r.lowFrom = sim.t;
      if (edge < 0.8) r.lowTo = sim.t;
      if (r.stopAt < 0 && r.minEdge < 0.99 && v < 0.05) r.stopAt = sim.t;
      if (r.backAt < 0 && r.minEdge < 0.9 && edge >= 0.9) r.backAt = sim.t;
      if (sim.t - r.t >= 1) { r.done = true; rows.push(r); mine.push(r); }
    }
  };
  const out = sim.run();
  for (const r of mine) {
    const s = sheds.find((x) => x.a === r.e.defender && x.t >= r.t && x.t <= r.t + 1);
    r.pastT = s ? s.t - r.t : null; r.pastLow = !!s && r.lowFrom >= 0 && s.t >= r.lowFrom && s.t <= r.lowTo + 0.05;
  }
  return out;
} } });
const q = (v: (number | null)[], f = .5) => { const s = v.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const inter of [true, false]) {
  const R = rows.filter((r) => r.interior === inter), slid = R.filter((r) => r.minEdge < 0.8);
  console.log(`${inter ? 'interior' : 'tackle'}: clubs with both hands kept (to 1 s or the rep's end) ${R.length} | the hand slid (edge under 0.8) ${(100 * slid.length / Math.max(1, R.length)).toFixed(0)}%, min edge p50 ${q(slid.map((r) => r.minEdge))}`
    + ` | slide stopped at +${q(slid.map((r) => r.stopAt >= 0 ? r.stopAt - r.t : null))} s, edge back over 0.9 at +${q(slid.map((r) => r.backAt >= 0 ? r.backAt - r.t : null))} s (not within 1 s ${(100 * slid.filter((r) => r.backAt < 0).length / Math.max(1, slid.length)).toFixed(0)}%), under 0.8 for ${q(slid.map((r) => r.lowTo - r.lowFrom + 0.05))} s`
    + ` | past him within 1 s: slid ${(100 * slid.filter((r) => r.pastT !== null).length / Math.max(1, slid.length)).toFixed(0)}% (inside the low window ${(100 * slid.filter((r) => r.pastLow).length / Math.max(1, slid.length)).toFixed(0)}%), not slid ${(100 * R.filter((r) => r.minEdge >= 0.8 && r.pastT !== null).length / Math.max(1, R.filter((r) => r.minEdge >= 0.8).length)).toFixed(0)}%`);
}
