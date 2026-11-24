// HONEST_FLIGHT overhang (2026-11-24), measurement only: after the true flight ends (the ball is no longer in the air),
// how long does each defender keep a remembered flight (rememberedFlight, the path pursueIfLive plays under
// HONEST_FLIGHT) before his own estimate's end releases him? Per throw: the outcome (caught / incomplete / other), and per
// defender who had acquired the flight: overhang (s) from the true end to his last tick with a remembered flight.
// Usage: HONEST_FLIGHT=1 node --import tsx flight-overhang-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { rememberedFlight } = (await import(`${W}/src/sim/possession-read.ts`)) as any;
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const rows: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'pass' ? { wasAir: false, end: -1, last: new Map<any, number>(), had: new Set<any>() } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, air = sim.ball.kind === 'air';
  if (s.wasAir && !air && s.end < 0) s.end = sim.t;
  s.wasAir = s.wasAir || air;
  for (const d of sim.defense) if (rememberedFlight(d, sim.t)) { s.had.add(d); s.last.set(d, sim.t); }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s && s.end >= 0) {
    const outcome = this.stats?.completed ? 'caught' : this.outcome === 'incomplete' || this.stats?.incomplete ? 'incomplete' : String(this.outcome ?? 'other');
    rows.push({ outcome, end: r2(s.end), deadAt: r2(this.t), overhang: [...s.had].map((d: any) => r2(Math.max(0, (s.last.get(d) ?? s.end) - s.end))) });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} throws`); }
writeFileSync(OUT, JSON.stringify(rows));
const q = (v: number[], p: number) => { const y = [...v].sort((a, b) => a - b); return y.length ? y[Math.floor(p * (y.length - 1))] : null; };
for (const o of ['caught', 'incomplete']) {
  const X = rows.filter(r => r.outcome === o), H = X.flatMap(r => r.overhang);
  console.log(`${o}: throws ${X.length}, defender-flights ${H.length} | overhang after the true flight ends p50 ${q(H, .5)} p90 ${q(H, .9)} max ${q(H, 1)} | > 0.3 s ${H.filter(h => h > 0.3).length}`);
}
