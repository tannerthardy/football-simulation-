// Why an engaged pass blocker gets about half his lateral request (Flex, 2026-11-14; Integration: asks 1.77, gets 0.98,
// shuffle top 3.89). Per engaged pass-rep tick (OL), with t the unit lateral (perpendicular to the line to his man, the
// way his request points) and n along the line: his requested and achieved lateral speed, and over the tick his mass x
// achieved lateral acceleration split into the constraint load he received (support.load: contacts and joints) and the
// rest (his legs' and lean's ground force); the ground force he used along n (anchor) and what traction leaves for t.
// Lagging ticks: request ahead of achieved by > 0.5 yd/s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/engaged-lateral.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const pre = new Map<any, any>();
    for (const e of sim.engagements) if (e.type === 'pass' && sim.carrier === sim.qb && sim.throwAt < 0) pre.set(e, { v: { ...e.blocker.vel } });
    tick();
    for (const e of sim.engagements) {
      const p = pre.get(e); if (!p) continue;
      const b = e.blocker, d = e.defender, iv = sim.intents?.[b.idx]?.vel; if (!iv || b.body.support?.state !== 'up') continue;
      const nx = d.pos.x - b.pos.x, ny = d.pos.y - b.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      let t = { x: -n.y, y: n.x }; const rq = iv.x * t.x + iv.y * t.y; if (rq < 0) t = { x: -t.x, y: -t.y };
      const req = Math.abs(rq); if (req < 0.3) continue;
      const m = b.profile.massKg, dt = sim.dt;
      const at = ((b.vel.x - p.v.x) * t.x + (b.vel.y - p.v.y) * t.y) / dt, an = ((b.vel.x - p.v.x) * n.x + (b.vel.y - p.v.y) * n.y) / dt;
      const L2 = b.body.support.load ?? { x: 0, y: 0 }, lt = L2.x * t.x + L2.y * t.y, ln = L2.x * n.x + L2.y * n.y;
      const gt = m * at - lt, gn = m * an - ln, T = supportParams(b.profile).traction;
      rows.push({ interior: ['LG', 'C', 'RG'].includes(b.slot), req, got: b.vel.x * t.x + b.vel.y * t.y, lt, gt, gn, T, lag: req - (b.vel.x * t.x + b.vel.y * t.y) > 0.5, left: Math.sqrt(Math.max(0, T * T - gn * gn)), shuffle: b.profile.vmax * b.profile.shuffle });
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(0) : 'nan'; };
const q2 = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const inter of [true, false]) {
  const R = rows.filter((r) => r.interior === inter), G = R.filter((r) => r.lag);
  console.log(`${inter ? 'interior' : 'tackle'}: engaged ticks with a lateral request ${R.length} | asked p50 ${q2(R.map((r) => r.req))}, got ${q2(R.map((r) => r.got))} yd/s | lagging (asked - got > 0.5) ${(100 * G.length / Math.max(1, R.length)).toFixed(0)}%`);
  console.log(`   lagging ticks: constraint load along his request (- = against him) p25/50/75 ${q(G.map((r) => r.lt), .25)}/${q(G.map((r) => r.lt))}/${q(G.map((r) => r.lt), .75)} N | his ground force along it ${q(G.map((r) => r.gt))} N | his ground force along the line to his man (anchor) |${q(G.map((r) => Math.abs(r.gn)))}| N | traction ${q(G.map((r) => r.T))} N, left for lateral after the anchor ${q(G.map((r) => r.left))} N | lateral ground force / what is left p50 ${q2(G.map((r) => r.gt / Math.max(1, r.left)))} | load against him larger than his own lateral force ${(100 * G.filter((r) => -r.lt > Math.abs(r.gt)).length / Math.max(1, G.length)).toFixed(0)}%`);
}
