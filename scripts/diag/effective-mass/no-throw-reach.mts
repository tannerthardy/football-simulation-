// What the QB's no-throw branches do today (Integration / Rules + Coaching, 2026-11-12). Every dropback: the first
// time each of scramble, throwAway and evade is called, with his felt time to contact then (under 0.45 s = the hot
// path), whether he was outside the tackles' snap positions, and how the play ended (sack, scramble, throwaway,
// throw, grounding). One JSON line per dropback. Flags via env (read it with FREE_BOUND=1 HOT_LOOK=1).
// usage: [flags] node --import tsx scripts/diag/effective-mass/no-throw-reach.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const Q: any = (await import(`${W}/src/sim/behaviors/qb.ts`)).QBPass.prototype;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (const name of ['scramble', 'throwAway', 'evade']) {
  const f0 = Q[name];
  Q[name] = function (a: any, sim: any, ...rest: any[]) {
    const rec = (sim.__calls ??= {});
    if (!rec[name]) { let felt = NaN; try { felt = this.pressure(a, sim).time; } catch { /* */ }
      rec[name] = { t: r2(sim.t), felt: r2(felt), outside: !!this.outsidePocket?.(a, sim) }; }
    return f0.call(this, a, sim, ...rest); };
}
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const res = sim.run(); const ev = sim.events.map((e: any) => e.type);
    const end = ev.includes('intentional_grounding') ? 'grounding' : ev.includes('throwaway') ? 'throwaway' : ev.includes('sack') ? 'sack'
      : sim.scrambled ? 'scramble' : sim.throwAt >= 0 ? 'throw' : 'other';
    console.log(JSON.stringify({ calls: sim.__calls ?? {}, end, yards: r2(res?.yards ?? NaN) }));
    return res; } } });
}
