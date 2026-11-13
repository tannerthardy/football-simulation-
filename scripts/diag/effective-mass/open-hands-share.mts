// OPEN_HANDS question (Integration, 2026-11-12): how much of the hands joints' steering (tangential) force today
// exceeds what an open hand could carry by friction on its own push, mu * max(0, N)? Every World hands joint, every
// tick of every scrimmage play, split by the rep it belongs to (run / pass; 'other' if no engagement owns it).
// Loaded: |tangential| > 50 N. Reported: the share of loaded joint-ticks over the cap, the share of all tangential
// force (summed |T|) above the cap, and the same for joints with no compression at all (N <= 0).
// Split by the frame (Integration, 2026-11-12: a grip inside the frame is legal technique; the same grip kept on a man
// who has left it is holding): the bearing of the defender from the offensive player against that player's facing,
// inside the frame within 45 deg (and, as a sensitivity cut, 60 deg). Tension (N < 0) shares too.
// mu: 0.42, dynamic, natural dry skin on a cotton-polyester fabric at about 15 N (Gerhardt et al. 2008, J R Soc
// Interface 5:1317, PMC2607440); 0.6 (normally moist skin) and 0.91 (wet fabric) as the sensitivity range.
// CUT=phi splits by the rep's leverage instead of the facing frame; CUT=dframe by the defender's frame (where the
// blocker is against the defender's own facing: front / side / back).
// usage: [flags] node --import tsx scripts/diag/effective-mass/open-hands-share.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const MUS = [0.42, 0.6, 0.91];
type Acc = { tension?: number; ticks: number; loaded: number; noN: number; T: number; over: number[]; overT: number[]; noNT: number };
const acc: Record<string, Acc> = {};
const total = { over: 0 }, overBy: Record<string, number> = {};
const get = (k: string) => acc[k] ??= { ticks: 0, loaded: 0, noN: 0, T: 0, over: MUS.map(() => 0), overT: MUS.map(() => 0), noNT: 0 };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const owner = new Map<any, string>(), rep = new Map<any, any>();
      for (const a of sim.agents) { const e = a.engagement; if (e?.hands) { owner.set(e.hands, e.type); rep.set(e.hands, e); } }
      for (const j of sim.world.joints) {
        if (j.kind !== 'hands') continue;
        const k0 = owner.get(j) ?? 'other';
        const ob = sim.agents.find((x: any) => (x.body === j.a || x.body === j.b) && x.team === 'O')?.body;
        const db = ob ? (ob === j.a ? j.b : j.a) : null;
        let frame = 'n/a';
        if (ob && db) {
          const bear = Math.atan2(db.pos.y - ob.pos.y, db.pos.x - ob.pos.x);
          const off45 = Math.abs(((bear - ob.facing) * 180 / Math.PI + 540) % 360 - 180);
          frame = off45 <= 45 ? 'inside' : off45 <= 60 ? 'edge 45-60' : 'outside';
        }
        // The rep's own leverage (the holding detector's measure): |phi| < 0.5 in front, 0.5-1 at the shoulder,
        // >= 1 at or behind his hip, against the defender's line to his goal.
        const e = rep.get(j), ph = e ? Math.abs(e.phi) : NaN;
        const lev = !e ? 'no rep' : ph < 0.5 ? 'phi front' : ph < 1 ? 'phi shoulder' : 'phi hip+';
        // The rule's frame is the defender's: the blocker's bearing from the defender against the defender's own
        // facing -- on his front (within 45 deg), his side (45-90), or his back (beyond 90).
        let dframe = 'n/a';
        if (ob && db) {
          const bear = Math.atan2(ob.pos.y - db.pos.y, ob.pos.x - db.pos.x);
          const off = Math.abs(((bear - db.facing) * 180 / Math.PI + 540) % 360 - 180);
          dframe = off <= 45 ? 'his front' : off <= 90 ? 'his side' : 'his back';
        }
        const cut = process.env.CUT === 'phi' ? lev : process.env.CUT === 'dframe' ? dframe : frame;
        const k = `${k0} / ${cut}`, A = get(k); A.ticks++;
        if ((j.normalForce ?? 0) < -1e-6) A.tension = (A.tension ?? 0) + 1;
        const T = Math.abs(j.tangentForce ?? 0), N = j.normalForce ?? 0;
        const cap42 = 0.42 * Math.max(0, N); total.over += T > cap42 ? T - cap42 : 0; if (T > cap42) (overBy[k] = (overBy[k] ?? 0) + T - cap42);
        if (T <= 50) continue;
        A.loaded++; A.T += T;
        if (N <= 0) { A.noN++; A.noNT += T; }
        MUS.forEach((mu, i) => { const cap = mu * Math.max(0, N); if (T > cap) { A.over[i]++; A.overT[i] += T - cap; } });
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
for (const [k, A] of Object.entries(acc).sort()) {
  console.log(`${k}: hands joint-ticks ${A.ticks}, in tension ${pc(A.tension ?? 0, A.ticks)}, loaded (|T| > 50 N) ${A.loaded} (${pc(A.loaded, A.ticks)}); with no compression under it ${pc(A.noN, A.loaded)} (carrying ${pc(A.noNT, A.T)} of the tangential force)`);
  console.log(`   share of all over-cap force (mu 0.42, every joint) in this cell: ${pc(overBy[k] ?? 0, total.over)}`);
  MUS.forEach((mu, i) => console.log(`   mu ${mu}: loaded ticks over mu*N ${pc(A.over[i], A.loaded)} | tangential force above the cap ${pc(A.overT[i], A.T)} of all`));
}
