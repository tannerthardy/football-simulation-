// The spread by technique (Flex, 2026-11-13, ANCHOR_BASE: k = 1.05 - 0.55 x technique). Per OL per dropback: his
// technique (0.5 pass blocking + 0.5 balance, as anchorBase), whether he falls before the throw, and the ground he gave
// (his depth behind the line at the throw, or at 3.0 s without one, less his depth at 1.0 s). Thirds of technique
// across the OL-dropbacks; interior and tackles together.
// usage: [flags] node --import tsx scripts/diag/effective-mass/technique-spread.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: { tech: number; fell: boolean; ground: number }[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
    const at1 = new Map<any, number>(), atEnd = new Map<any, number>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const live = sim.carrier === sim.qb && sim.t <= 3.0;
      for (const o of ol) {
        const depth = (sim.los - o.pos.x) * (sim.attackDir?.(o.team) ?? 1);
        if (Math.abs(sim.t - 1.0) < sim.dt / 2) at1.set(o, depth);
        if (live) atEnd.set(o, depth);
      }
    };
    const r = sim.run();
    const thr = sim.events.find((e: any) => e.type === 'throw')?.t ?? Infinity;
    for (const o of ol) {
      const fell = sim.events.some((e: any) => e.type === 'fall' && e.a === o.idx && e.t >= 0.5 && e.t <= thr);
      if (at1.has(o) && atEnd.has(o)) rows.push({ tech: 0.5 * o.r('passBlock') + 0.5 * o.r('balance'), fell, ground: atEnd.get(o)! - at1.get(o)! });
    }
    return r;
  } } });
}
const sorted = [...rows].sort((a, b) => a.tech - b.tech), n = sorted.length;
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, lo, hi] of [['bottom third', 0, n / 3], ['middle third', n / 3, 2 * n / 3], ['top third', 2 * n / 3, n]] as const) {
  const T = sorted.slice(Math.floor(lo), Math.floor(hi));
  console.log(`${lab.padEnd(12)} technique ${T[0]?.tech.toFixed(2)}-${T[T.length - 1]?.tech.toFixed(2)} | OL-dropbacks ${T.length} | fell before the throw ${(100 * T.filter((r) => r.fell).length / T.length).toFixed(1)}% | ground given 1.0 s -> throw (or 3.0 s) p50 ${q(T.map((r) => r.ground))} yd, p75 ${q(T.map((r) => r.ground), .75)}`);
}
