// Sim sacks (Integration, 2026-11-10): what ends them. Live games, flags via env. At each sack: time from the tackle bond's
// start (first hold on the QB) to the whistle; the QB's support state then ('up' = ruled down in the grasp, the rule in
// tackle.ts; else a physical fall); the largest control/grip any tackler held; when grip first reached 0.6; the QB's
// speed and travel over the bond. usage: [flags] node --import tsx scripts/diag/effective-mass/sack-trace.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    let start = -1, g6 = -1, maxG = 0, p0: any = null, path = 0, last: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const b = sim.bond, q = sim.qb;
      if (b && b.carrier === q && sim.throwAt < 0) {
        if (start < 0) { start = b.start ?? sim.t; p0 = { ...q.pos }; last = { ...q.pos }; }
        const g = Math.max(0, ...b.tacklers.map((d: any) => b.control?.get(d) ?? b.grip?.get(d) ?? 0)); maxG = Math.max(maxG, g);
        if (g6 < 0 && g >= 0.6) g6 = sim.t;
        path += Math.hypot(q.pos.x - last.x, q.pos.y - last.y); last = { ...q.pos };
      } };
    const res = sim.run(); const ev = sim.events.find((e: any) => e.type === 'sack');
    if (ev && start >= 0) { const q = sim.qb;
      console.log(JSON.stringify({ held: r2(ev.t - start), qbState: q.body.support?.state, maxGrip: r2(maxG), grip06: g6 >= 0 ? r2(g6 - start) : null,
        travel: r2(Math.hypot(q.pos.x - p0.x, q.pos.y - p0.y)), path: r2(path) })); }
    return res; } } });
}
