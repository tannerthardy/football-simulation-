// OPEN_HANDS question (Integration, 2026-11-12): how much of the hands joints' steering (tangential) force today
// exceeds what an open hand could carry by friction on its own push, mu * max(0, N)? Every World hands joint, every
// tick of every scrimmage play, split by the rep it belongs to (run / pass; 'other' if no engagement owns it).
// Loaded: |tangential| > 50 N. Reported: the share of loaded joint-ticks over the cap, the share of all tangential
// force (summed |T|) above the cap, and the same for joints with no compression at all (N <= 0).
// mu: 0.42, dynamic, natural dry skin on a cotton-polyester fabric at about 15 N (Gerhardt et al. 2008, J R Soc
// Interface 5:1317, PMC2607440); 0.6 (normally moist skin) and 0.91 (wet fabric) as the sensitivity range.
// usage: [flags] node --import tsx scripts/diag/effective-mass/open-hands-share.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const MUS = [0.42, 0.6, 0.91];
type Acc = { ticks: number; loaded: number; noN: number; T: number; over: number[]; overT: number[]; noNT: number };
const acc: Record<string, Acc> = {};
const get = (k: string) => acc[k] ??= { ticks: 0, loaded: 0, noN: 0, T: 0, over: MUS.map(() => 0), overT: MUS.map(() => 0), noNT: 0 };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const owner = new Map<any, string>();
      for (const a of sim.agents) { const e = a.engagement; if (e?.hands) owner.set(e.hands, e.type); }
      for (const j of sim.world.joints) {
        if (j.kind !== 'hands') continue;
        const k = owner.get(j) ?? 'other', A = get(k); A.ticks++;
        const T = Math.abs(j.tangentForce ?? 0), N = j.normalForce ?? 0;
        if (T <= 50) continue;
        A.loaded++; A.T += T;
        if (N <= 0) { A.noN++; A.noNT += T; }
        MUS.forEach((mu, i) => { const cap = mu * Math.max(0, N); if (T > cap) { A.over[i]++; A.overT[i] += T - cap; } });
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
for (const [k, A] of Object.entries(acc)) {
  console.log(`${k}: hands joint-ticks ${A.ticks}, loaded (|T| > 50 N) ${A.loaded} (${pc(A.loaded, A.ticks)}); with no compression under it ${pc(A.noN, A.loaded)} (carrying ${pc(A.noNT, A.T)} of the tangential force)`);
  MUS.forEach((mu, i) => console.log(`   mu ${mu}: loaded ticks over mu*N ${pc(A.over[i], A.loaded)} | tangential force above the cap ${pc(A.overT[i], A.T)} of all`));
}
