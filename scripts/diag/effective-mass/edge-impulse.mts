// The edge collision (Flex, 2026-11-14; Integration: is 3400-6100 N in one or two ticks a real two-body impulse or a
// stiff-contact artifact?). For every edge DL's first pass-rep contact (engagement start, before the throw): the two
// masses, the closing speed along their line the tick before, the inelastic impulse that closing allows (reduced mass
// x closing), the felt press on the rusher tick by tick over the next 0.25 s, its integral, and the rusher's own
// momentum change along the line; whether he fell within 0.4 s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-impulse.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const prev = new Map<any, any>(), open: any[] = [], seen = new Set<any>(); const tick = sim.tick.bind(sim);
  const strikes: any[] = []; const st0 = sim.world.strike.bind(sim.world);
  sim.world.strike = (a: any, b: any, j: any, ...rest: any[]) => { strikes.push({ t: sim.t, a, b, j: Math.hypot(j.x, j.y) * 0.9144 }); return st0(a, b, j, ...rest); };
  sim.tick = () => {
    for (const a of sim.agents) prev.set(a, { pos: { ...a.pos }, vel: { ...a.vel } });
    const held = sim.carrier === sim.qb && sim.throwAt < 0;
    tick();
    for (const e of sim.engagements) {
      const d = e.defender, b = e.blocker;
      if (e.type !== 'pass' || !/^DE/.test(d.slot) || seen.has(e) || !held) continue;
      seen.add(e);
      const pd = prev.get(d), pb = prev.get(b); if (!pd || !pb) continue;
      const nx = pb.pos.x - pd.pos.x, ny = pb.pos.y - pd.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      const close = (pd.vel.x - pb.vel.x) * n.x + (pd.vel.y - pb.vel.y) * n.y;
      const m1 = d.profile.massKg, m2 = b.profile.massKg, mu = m1 * m2 / (m1 + m2);
      open.push({ d, b, n, t0: sim.t, close, m1, m2, J: mu * close * 0.9144, v0: (pd.vel.x * n.x + pd.vel.y * n.y), press: [] as number[], fell: false, gap: L - d.profile.radius - b.profile.radius });
    }
    for (const r of open) {
      if (r.done) continue;
      const sup = r.d.body.support, f = sup?.felt ?? { x: 0, y: 0 };
      r.press.push(-(f.x * r.n.x + f.y * r.n.y));  // along the line back toward him (+: pushing him back)
      if (sup && sup.state !== 'up' && sim.t - r.t0 <= 0.4) r.fell = true;
      if (sim.t - r.t0 >= 0.25 - 1e-9) { r.done = true; r.struck = strikes.filter((x) => x.b === r.d.body && x.t >= r.t0 - 0.1 && x.t <= sim.t).reduce((s2, x) => s2 + x.j, 0); r.struck0 = strikes.some((x) => x.b === r.d.body && x.t >= r.t0 - 0.1 && x.t <= sim.t); r.v1 = r.d.vel.x * r.n.x + r.d.vel.y * r.n.y; rows.push(r); }
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(0) : 'nan'; };
const dt = 0.05;
for (const [lab, R] of [['fell within 0.4 s', rows.filter((r) => r.fell)], ['stayed up', rows.filter((r) => !r.fell)]] as const) {
  if (!R.length) continue;
  const Jsim = R.map((r) => r.press.reduce((s: number, x: number) => s + Math.max(0, x) * dt, 0));
  const peak = R.map((r) => Math.max(...r.press));
  const ratio = R.map((r, i) => Jsim[i] / Math.max(1, r.J));
  const dp = R.map((r) => r.m1 * (r.v0 - r.v1) * 0.9144);
  console.log(`${lab}: n ${R.length} | closing p50 ${(R.map((r) => r.close).sort((a, b) => a - b)[Math.floor(R.length / 2)]).toFixed(2)} yd/s | inelastic impulse mu*v p50 ${q(R.map((r) => r.J))} N s`
    + ` | felt impulse over 0.25 s p50 ${q(Jsim)} N s (ratio p50 ${(ratio.sort((a, b) => a - b)[Math.floor(R.length / 2)]).toFixed(2)}, p90 ${(ratio[Math.floor(0.9 * (R.length - 1))]).toFixed(2)})`
    + ` | peak press p50/p90 ${q(peak)}/${q(peak, .9)} N | struck by a scripted strike in the window ${R.filter((r) => r.struck0).length} (impulse p50 of those ${q(R.filter((r) => r.struck0).map((r) => r.struck))} N s) | his momentum loss along the line p50 ${q(dp)} N s`);
}
for (const r of rows.filter((r) => r.fell).slice(0, 8)) console.log(`  ${r.d.slot} vs ${r.b.slot} t ${r.t0.toFixed(2)} m ${r.m1.toFixed(0)}/${r.m2.toFixed(0)} closing ${r.close.toFixed(2)} yd/s gap ${r.gap.toFixed(2)} | mu*v ${r.J.toFixed(0)} N s | press ${r.press.map((x: number) => x.toFixed(0)).join(' ')} | his v along ${r.v0.toFixed(2)} -> ${r.v1.toFixed(2)} | scripted strike ${r.struck.toFixed(0)} N s`);
