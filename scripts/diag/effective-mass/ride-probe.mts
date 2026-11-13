// The ride before a pass rep ends 'past him' (Integration, 2026-11-13: "the block becomes a ride"). Per rep that ends
// with PAST's out-of-reach beat: the ticks it spent riding (the man past along his path, within reach), the blocker's
// and the rusher's speeds and the rusher's speed toward the QB during them, the hands' press and grip, the distance
// at the ride's start and at the end, and the man's distance to the QB at the end. Interior (G/C) and tackles.
// usage: [flags] node --import tsx scripts/diag/effective-mass/ride-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { pastAlongPath } = await import(`${W}/src/sim/engagement.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const track = new Map<any, any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = new Set<any>(sim.engagements);
      tick();
      for (const e of sim.engagements) {
        if (e.type !== 'pass') continue;
        const b = e.blocker, d = e.defender;
        let r = track.get(e); if (!r) { r = { interior: ['LG', 'C', 'RG'].includes(b.slot), ride: [] }; track.set(e, r); }
        if (pastAlongPath(b, d, Math.abs(e.phi))) {
          const qb = sim.qb, tq = Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y) || 1;
          r.ride.push({ bs: Math.hypot(b.vel.x, b.vel.y), ds: Math.hypot(d.vel.x, d.vel.y), dq: (d.vel.x * (qb.pos.x - d.pos.x) + d.vel.y * (qb.pos.y - d.pos.y)) / tq,
            N: e.hands?.normalForce ?? 0, req: Math.hypot(sim.intents[b.idx]?.vel.x ?? 0, sim.intents[b.idx]?.vel.y ?? 0), turn: (() => { const v = Math.atan2(b.vel.y, b.vel.x); const iv = sim.intents[b.idx]?.vel; const a = iv ? Math.atan2(iv.y, iv.x) : v; const f = b.body.facing; const w = (x: number) => Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 180 / Math.PI; return w(a - f); })(), grip: !!e.hands?.grip, dist: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - b.profile.radius - d.profile.radius });
        }
      }
      for (const e of before) if (!sim.engagements.includes(e)) {
        const r = track.get(e); if (!r) continue;
        const ev = [...sim.events].reverse().find((x: any) => x.type === 'shed' && sim.agents[x.a] === e.defender);
        if (ev?.note === 'pass: past him') rows.push({ ...r, toQB: Math.hypot(sim.qb.pos.x - e.defender.pos.x, sim.qb.pos.y - e.defender.pos.y) });
        track.delete(e);
      }
    };
    return sim.run(); } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, f] of [['guards/center', (r: any) => r.interior], ['tackles', (r: any) => !r.interior]] as const) {
  const R = rows.filter(f); const T = R.flatMap((r) => r.ride);
  console.log(`${lab}: reps ending 'past him' ${R.length} | riding ticks before the end p50 ${q(R.map((r) => r.ride.length))} (none ${(100 * R.filter((r) => !r.ride.length).length / Math.max(1, R.length)).toFixed(0)}%) | while riding: blocker speed ${q(T.map((x) => x.bs))}, rusher ${q(T.map((x) => x.ds))} (toward the QB ${q(T.map((x) => x.dq))}) | request ${q(T.map((x) => x.req))}, request vs facing ${q(T.map((x) => x.turn))} deg | press N ${q(T.map((x) => x.N))}, grip ${(100 * T.filter((x) => x.grip).length / Math.max(1, T.length)).toFixed(0)}% | gap at the ride's start ${q(R.filter((r) => r.ride.length).map((r) => r.ride[0].dist))} -> end ${q(R.filter((r) => r.ride.length).map((r) => r.ride[r.ride.length - 1].dist))} | man to QB at the end ${q(R.map((r) => r.toQB))}`);
}
