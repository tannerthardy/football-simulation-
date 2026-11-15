// The club under the hand model (Flex, 2026-11-14): per club (RUSH_HANDS clubHand) on an interior or a tackle rep:
// the blocker's lateral displacement and velocity across the rusher's line (toward the club's side) over 0.3 s, the
// leverage (phi x side) before and after, whether a hand came off, whether the rep ended in 'past him' within 1 s.
// usage: RUSH_HANDS=1 [flags] node --import tsx scripts/diag/effective-mass/club-trace.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const open: any[] = [], seenClub = new Set<any>(); const tick = sim.tick.bind(sim); const lastClub = new Map<any, number>();
  const ev0 = sim.event.bind(sim); const sheds: any[] = [];
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed') sheds.push({ a, t: sim.t, note }); return ev0(type, a, b, note); };
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      if (e.club) lastClub.set(e, sim.t);
      const ctrl = !e.club && !(e.moveUntil > sim.t) && !e.rusherHand && sim.t - (lastClub.get(e) ?? -9) > 0.6 && Math.random() < 0.04;
      if (!ctrl && (!e.club || seenClub.has(e.club))) continue;
      if (e.club) seenClub.add(e.club);
      const b = e.blocker, d = e.defender, ax = { x: sim.qb.pos.x - d.pos.x, y: sim.qb.pos.y - d.pos.y }, L = Math.hypot(ax.x, ax.y) || 1;
      const lat = { x: -ax.y / L * e.side, y: ax.x / L * e.side };
      open.push({ e, t: sim.t, b, d, lat, b0: { ...b.pos }, phi0: e.phi * e.side, on0: e.hands ? (e.hands.off ? 0 : e.hands.handsOn ?? 2) : -1, interior: ['LG', 'C', 'RG'].includes(b.slot), ctrl });
    }
    for (const r of open) {
      if (r.done || sim.t - r.t < 0.3) continue;
      r.done = true;
      r.dLat = (r.b.pos.x - r.b0.x) * r.lat.x + (r.b.pos.y - r.b0.y) * r.lat.y;   // + = the blocker moved toward the rusher's working side
      r.vLat = r.b.vel.x * r.lat.x + r.b.vel.y * r.lat.y;
      r.phi1 = r.e.phi * r.e.side; const h = r.e.hands; r.on1 = h ? (h.off ? 0 : h.handsOn ?? 2) : -1;
      rows.push(r);
    }
  };
  const out = sim.run();
  for (const r of rows) if (r.past === undefined) r.past = sheds.some((x) => x.a === r.d && x.t >= r.t && x.t - r.t <= 1 && x.note?.includes('past'));
  return out;
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : 'nan'; };
for (const inter of [true, false]) for (const ctrl of [false, true]) {
  const R = rows.filter((r) => r.interior === inter && !!r.ctrl === ctrl);
  console.log(`${inter ? 'interior' : 'tackle'} ${ctrl ? 'no move (control)' : 'clubs'} ${R.length} | a hand off within 0.3 s ${(100 * R.filter((r) => r.on0 > 0 && r.on1 < r.on0).length / Math.max(1, R.length)).toFixed(0)}% | blocker moved across toward the working side p50 ${q(R.map((r) => r.dLat))} yd, velocity then ${q(R.map((r) => r.vLat))} yd/s | leverage ${q(R.map((r) => r.phi0))} -> ${q(R.map((r) => r.phi1))} | past him within 1 s ${(100 * R.filter((r) => r.past).length / Math.max(1, R.length)).toFixed(0)}%`);
}
