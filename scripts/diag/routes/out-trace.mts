// Throws to an out (or any named route): the ball's intended point against where the receiver is when the ball gets
// there, the nearest defender then, and the result. For ROUTE_SHAPE's rounded out vs the authored square out.
//   ROUTE=out CONCEPTS=trips_sail,double_outs,trips_outs COVS=cover2,cover3 node --import tsx scripts/diag/routes/out-trace.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const ROUTE = process.env.ROUTE ?? 'out';
const CONCEPTS = (process.env.CONCEPTS ?? 'trips_sail,double_outs,trips_outs').split(',');
const COVS = (process.env.COVS ?? 'cover2,cover3').split(',');
const rows: any[] = [];
for (const concept of CONCEPTS) for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    const routeOf = new Map<any, string>();
    let aim: any = null, T: any = null, arr: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.throwAt < 0) { for (const r of sim.offense) { const id = r.behavior?.route?.id; if (id) routeOf.set(r, id); } return; }
      if (!aim && sim.ball.kind === 'air') {
        T = sim.offense.find((r: any) => r.player.id === sim.stats.target);
        aim = { x: sim.ball.intended.x, y: sim.ball.intended.y, arrivalT: sim.ball.arrivalT, tThrow: sim.t,
          rDepth: T ? (T.pos.x - sim.los) * dir : null };
      }
      if (aim && !arr && T && sim.t >= aim.arrivalT) {
        const near = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y)));
        // Miss along the receiver's direction of travel (+ = ball ahead of him) and across it.
        const v = Math.hypot(T.vel.x, T.vel.y) || 1, ux = T.vel.x / v, uy = T.vel.y / v;
        const mx = aim.x - T.pos.x, my = aim.y - T.pos.y;
        arr = { lead: mx * ux + my * uy, side: -mx * uy + my * ux, miss: Math.hypot(mx, my), near,
          depth: (T.pos.x - sim.los) * dir, aimDepth: (aim.x - sim.los) * dir, toSideline: Math.min(T.pos.y, 53.33 - T.pos.y) };
      }
    };
    const res = sim.run();
    if (!T || routeOf.get(T) !== ROUTE || !arr) continue;
    rows.push({ concept, coverage, formation, seed, flip, comp: !!res.stats.completed, int: !!res.stats.interceptedBy,
      drop: !!res.stats.dropped, tThrow: +aim.tThrow.toFixed(2), flight: +(aim.arrivalT - aim.tThrow).toFixed(2),
      ...Object.fromEntries(Object.entries(arr).map(([k, v]) => [k, +(v as number).toFixed(2)])) });
  }
for (const r of rows) console.log(JSON.stringify(r));
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
for (const [name, set] of [['complete', rows.filter(r => r.comp)], ['incomplete', rows.filter(r => !r.comp)]] as const)
  console.log(name, set.length, 'lead', med(set.map(r => r.lead)), 'side', med(set.map(r => r.side)), 'miss', med(set.map(r => r.miss)),
    'near', med(set.map(r => r.near)), 'depth', med(set.map(r => r.depth)), 'toSideline', med(set.map(r => r.toSideline)), 'tThrow', med(set.map(r => r.tThrow)));
