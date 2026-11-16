// BOX_DEPTH's payoff (Integration, #35): staged dropbacks against a backer coming. The same concepts as box-depth.mts from
// gun_doubles_11 / gun_trips_11, with a called pressure: mike_a and will_b (cover1), zero_6 (cover0), fire_zone (cover3);
// rosters 1-6, seeds 1-2. Per blitzer: picked up (a protector engaged with him before he is within 2 yd of the QB) and
// by whom (the back, a lineman), or free (within 2 yd of the QB before the ball is out, unengaged); per play: the first
// pressure and whether free, sacks, the back's release (his behaviour becomes a route).
// usage: BACK_CHECK=1 BACK_SHAPE=1 [BOX_DEPTH=1] node --import tsx scripts/diag/pass-operators/box-depth-blitz.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PRESSURE_BY_ID, COVERAGE_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { isOL } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const plays: any[] = [], blitzers: any[] = [];
for (const [pressure, coverage] of [['mike_a', 'cover1'], ['will_b', 'cover1'], ['zero_6', 'cover0'], ['fire_zone', 'cover3']])
  for (const concept of ['curl_flat', 'hitch_out', 'flood', 'stick', 'smash', 'mesh']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
    for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
      let sim: any;
      try {
        const setup: any = nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false });
        setup.defCall = { ...setup.defCall, pressure: PRESSURE_BY_ID[pressure], coverage: COVERAGE_BY_ID[coverage] };
        sim = new PlaySim(setup);
      } catch { continue; }
      const back = sim.offense.find((a: any) => sim.offAlign.spots[a.slot]?.backfield && a !== sim.qb);
      const B = Object.keys(PRESSURE_BY_ID[pressure].blitzers).map((slot) => sim.defense.find((d: any) => d.slot === slot)).filter(Boolean)
        .map((d: any) => ({ d, by: null as string | null, free: false }));
      let released: number | null = null, first: any = null;
      while (sim.phase === 'live' && sim.t < 4) {
        sim.tick();
        if (back && released === null && back.behavior?.kind === 'route') released = sim.t;
        for (const b of B) {
          const near = Math.hypot(b.d.pos.x - sim.qb.pos.x, b.d.pos.y - sim.qb.pos.y) <= 2;
          if (!b.by && !b.free && b.d.engagement) { const k = b.d.engagement.blocker; b.by = k === back ? 'back' : isOL(k) ? 'lineman' : 'other'; }
          if (!b.by && !b.free && near && sim.throwAt < 0) b.free = true;
        }
        if (!first && sim.throwAt < 0) for (const d of sim.defense) if (Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) {
          first = { free: !d.engagement, blitzer: B.some((b) => b.d === d) }; break; }
      }
      plays.push({ pressure, released, first, sack: sim.events.some((e: any) => e.type === 'sack') });
      for (const b of B) blitzers.push({ pressure, by: b.by, free: b.free });
    }
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
for (const p of ['all', 'mike_a', 'will_b', 'zero_6', 'fire_zone']) {
  const P = plays.filter((x) => p === 'all' || x.pressure === p), Bz = blitzers.filter((x) => p === 'all' || x.pressure === p);
  const fp = P.filter((x) => x.first);
  console.log(`${p} (plays ${P.length}, blitzers ${Bz.length}): blitzer picked up by the back ${pc(Bz.filter((b) => b.by === 'back').length, Bz.length)}, by a lineman ${pc(Bz.filter((b) => b.by === 'lineman').length, Bz.length)}, free to the QB ${pc(Bz.filter((b) => b.free).length, Bz.length)} | free first pressure ${pc(fp.filter((x) => x.first.free).length, P.length)} (a blitzer ${pc(fp.filter((x) => x.first.free && x.first.blitzer).length, P.length)}) | sacks ${P.filter((x) => x.sack).length} | back released p50 ${q(P.map((x) => x.released ?? NaN)).toFixed(2)} s (never ${pc(P.filter((x) => x.released === null).length, P.length)})`);
}
