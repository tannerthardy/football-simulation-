// Who takes a coming backer once a back is a protector (Integration, 2026-11-16, from BOX_DEPTH's will_b): the moment the
// protection first assigns a blitzer to someone, is it the back while a lineman was free (no man, not engaged) and nearer
// him (centre distance, his own reach of the man's path)? Staged pressures as box-depth-blitz.mts (mike_a, will_b,
// zero_6, fire_zone), only plays where a back is a protector at the time. Per blitzer: first assignee (back / lineman),
// the nearest free lineman's distance to him against the back's, and the outcome (picked up by whom, free to the QB).
// usage: [BACK_CHECK=1 BACK_SHAPE=1] node --import tsx scripts/diag/pass-operators/back-passover.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PRESSURE_BY_ID, COVERAGE_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { isOL } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const R: any[] = [];
for (const [pressure, coverage] of [['mike_a', 'cover1'], ['will_b', 'cover1'], ['zero_6', 'cover0'], ['fire_zone', 'cover3']])
  for (const concept of ['curl_flat', 'hitch_out', 'flood', 'stick', 'smash', 'mesh', 'four_verts', 'dagger']) for (const formation of ['gun_doubles_11', 'gun_trips_11', 'ace_11'])
    for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
      let sim: any;
      try {
        const setup: any = nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false });
        setup.defCall = { ...setup.defCall, pressure: PRESSURE_BY_ID[pressure], coverage: COVERAGE_BY_ID[coverage] };
        sim = new PlaySim(setup);
      } catch { continue; }
      const back = sim.offense.find((a: any) => sim.offAlign.spots[a.slot]?.backfield && a !== sim.qb);
      const B = Object.keys(PRESSURE_BY_ID[pressure].blitzers).map((slot) => sim.defense.find((d: any) => d.slot === slot)).filter(Boolean)
        .map((d: any) => ({ d, first: null as any, by: null as string | null, free: false }));
      while (sim.phase === 'live' && sim.t < 4) {
        sim.tick();
        const coord = sim.offense.find((a: any) => a.behavior?.kind === 'pass-pro')?.behavior?.coord;
        if (!coord || !back) break;
        const backIn = coord.protectors.includes(back);
        for (const b of B) {
          if (!b.first && backIn) for (const [k, r] of coord.assigned) if (r === b.d) {
            const free = sim.offense.filter((o: any) => isOL(o) && !o.engagement && !coord.assigned.has(o));
            const dist = (o: any) => Math.hypot(o.pos.x - b.d.pos.x, o.pos.y - b.d.pos.y);
            const nearOL = free.length ? Math.min(...free.map(dist)) : Infinity;
            b.first = { who: k === back ? 'back' : isOL(k) ? 'lineman' : 'other', t: sim.t, backDist: dist(back), freeOL: free.length, nearOL };
            break;
          }
          if (!b.by && !b.free && b.d.engagement) { const k = b.d.engagement.blocker; b.by = k === back ? 'back' : isOL(k) ? 'lineman' : 'other'; }
          if (!b.by && !b.free && sim.throwAt < 0 && Math.hypot(b.d.pos.x - sim.qb.pos.x, b.d.pos.y - sim.qb.pos.y) <= 2) b.free = true;
        }
      }
      for (const b of B) if (b.first) R.push({ pressure, ...b.first, by: b.by, free: b.free });
    }
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const toBack = R.filter((r) => r.who === 'back'), passed = toBack.filter((r) => r.freeOL > 0 && r.nearOL < r.backDist);
console.log(`blitzers assigned while a back was a protector: ${R.length} | first to the back ${pc(toBack.length, R.length)}, to a lineman ${pc(R.filter((r) => r.who === 'lineman').length, R.length)}`);
console.log(`  to the back while a free lineman was nearer him: ${passed.length} (${pc(passed.length, toBack.length)} of the back's) | outcome: back picked him up ${pc(passed.filter((r) => r.by === 'back').length, passed.length)}, a lineman ${pc(passed.filter((r) => r.by === 'lineman').length, passed.length)}, free to the QB ${pc(passed.filter((r) => r.free).length, passed.length)}`);
const fair = toBack.filter((r) => !(r.freeOL > 0 && r.nearOL < r.backDist));
console.log(`  to the back with no nearer free lineman: ${fair.length} | free to the QB ${pc(fair.filter((r) => r.free).length, fair.length)} | lineman-first blitzers free to the QB ${pc(R.filter((r) => r.who === 'lineman' && r.free).length, R.filter((r) => r.who === 'lineman').length)}`);
for (const p of ['mike_a', 'will_b', 'zero_6', 'fire_zone']) { const P = R.filter((r) => r.pressure === p), PB = P.filter((r) => r.who === 'back'), PP = PB.filter((r) => r.freeOL > 0 && r.nearOL < r.backDist);
  console.log(`  ${p}: ${P.length} assigned, to the back ${PB.length}, passed over a nearer free lineman ${PP.length}, of those free to the QB ${PP.filter((r) => r.free).length}`); }
