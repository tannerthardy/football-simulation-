// Turning as a strike question (Integration, 2026-11-14, ruling 2). World strikes act at the line of centres (pairImpulse
// x, y only), so no move puts a moment on the blocker by construction. Per strike on an engaged pass-set blocker, by the
// rusher's move: the impulse's component across the line between them, the moment it would deliver at his shoulder (x
// CHEST_HALF 0.12 yd), against the yaw motor's budget over the same tick (his turn torque cap at his base, standing and
// at 80% of traction in use). And the feet's race: on ticks where the rusher has a half-man (|phi| 0.4-0.7) and is
// moving > 2 yd/s, the blocker's hip turn rate against the rate of the bearing to the rusher, and how often he is at
// his turn-rate cap.
// usage: [flags] node --import tsx scripts/diag/effective-mass/strike-moments.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams, baseRadiusAt } = await import(`${W}/src/physics/support.js`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const byMove: Record<string, { lat: number[]; ratio: number[] }> = {}; const race = { n: 0, lag: 0, cap: 0, hips: [] as number[], brg: [] as number[] };
const G = 9.81 * 1.0936; // yd/s^2
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const prev = new Map<any, { f: number; brg: number }>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0) return;
    const rep: any = sim.world.report;
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      const b = e.blocker, d = e.defender, bi = b.idx, di = d.idx;
      const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, L = Math.hypot(dx, dy) || 1, tx = -dy / L, ty = dx / L;
      // His motor's yaw impulse budget this tick: torque cap = traction x base radius (kg yd^2/s^2) x dt, standing.
      const sp = supportParams(b.profile), base = baseRadiusAt(sp, b.body.support?.posture ?? 0.5), T = sp.traction ?? b.profile.massKg * G * 1.0;
      const budget = T * base * sim.dt, budget80 = Math.sqrt(Math.max(0, T * T - (0.8 * T) ** 2)) * base * sim.dt;
      for (const s of rep?.strikes ?? []) {
        if (!((s.i === di && s.j === bi) || (s.i === bi && s.j === di))) continue;
        const lat = Math.abs(s.impulse.x * tx + s.impulse.y * ty), mv = e.move ?? 'none';
        const r = (byMove[mv] ??= { lat: [], ratio: [] }); r.lat.push(lat); r.ratio.push(lat * 0.12 / budget); (r as any).r80 ??= []; (r as any).r80.push(lat * 0.12 / Math.max(1e-6, budget80));
      }
      const brg = Math.atan2(dy, dx), f = b.body.facing, p = prev.get(e);
      if (p && Math.abs(e.phi ?? 0) >= 0.4 && Math.abs(e.phi ?? 0) <= 0.7 && Math.hypot(d.vel.x, d.vel.y) > 2) {
        const w = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
        const hr = Math.abs(w(f - p.f)) / sim.dt, br = Math.abs(w(brg - p.brg)) / sim.dt;
        race.n++; race.hips.push(hr * 180 / Math.PI); race.brg.push(br * 180 / Math.PI);
        if (br > hr) race.lag++;
        if (hr >= 0.95 * (b.profile.turnRate ?? Infinity)) race.cap++;
      }
      prev.set(e, { f, brg });
    }
  };
  return sim.run();
} } });
const q = (v: number[], fr: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(fr * (s.length - 1))] : NaN; };
console.log('strikes on engaged pass-set blockers, by the rusher\'s move: impulse across the line (kg yd/s) and the moment it would give at his shoulder over his motor\'s one-tick yaw budget (standing / at 80% of traction in use)');
for (const [mv, r] of Object.entries(byMove).sort((a, b) => b[1].lat.length - a[1].lat.length)) {
  const r80 = (r as any).r80 as number[];
  console.log(`  ${mv.padEnd(8)} n ${String(r.lat.length).padStart(4)} | across p50/p90 ${q(r.lat, .5).toFixed(0)}/${q(r.lat, .9).toFixed(0)} | moment / budget p50/p90 ${q(r.ratio, .5).toFixed(2)}/${q(r.ratio, .9).toFixed(2)}, at 80% ${q(r80, .5).toFixed(2)}/${q(r80, .9).toFixed(2)} | would exceed the standing budget ${(100 * r.ratio.filter((x) => x > 1).length / r.ratio.length).toFixed(0)}%`);
}
console.log(`the race (rusher at a half-man, |phi| 0.4-0.7, moving > 2 yd/s): ticks ${race.n} | his hips' turn rate p50/p90 ${q(race.hips, .5).toFixed(0)}/${q(race.hips, .9).toFixed(0)} deg/s against the bearing's ${q(race.brg, .5).toFixed(0)}/${q(race.brg, .9).toFixed(0)} | bearing faster than his hips ${(100 * race.lag / Math.max(1, race.n)).toFixed(0)}% | at his turn-rate cap ${(100 * race.cap / Math.max(1, race.n)).toFixed(0)}%`);
