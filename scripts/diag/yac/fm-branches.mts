// FLIGHT_MAN branches (Integration, 2026-11-17; reads only). Staged zone throws (cover 2/3/4/6, gun doubles/trips, every
// non-screen concept). Per defender who took a FLIGHT_MAN branch on the play, his last branch while the ball was up
// ('in' looked for the ball, 'out' played the man, 'split' between two), by coverage and deep/underneath: count, his
// breakups and interceptions, and early contact (his body on the receiver he picked while the ball is still in the air,
// before any catch: what a pass-interference rule would have to judge).
// usage: BALL_EST=26657 ACQ_SEEN=1 TRACKED_CATCH=1 FLIGHT_MAN=1 node --import tsx scripts/diag/yac/fm-branches.mts [seeds]
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const D = await import(`${W}/src/sim/behaviors/defense.ts`);
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const st = new Map<any, any>();
        const ev0 = sim.event.bind(sim);
        sim.event = (type: string, a?: any, ...r: any[]) => {
          if (type === 'pbu' && a && st.has(a)) st.get(a).pbu = true;
          if (type === 'interception' && a && st.has(a)) st.get(a).int = true;
          return ev0(type, a, ...r);
        };
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          if (sim.ball?.kind !== 'air' || sim.ball.securing) return;
          for (const d of sim.defense) {
            const b = D.flightManBranch.get(d);
            if (!b || b.t < sim.t - sim.dt - 1e-9) continue;
            let s = st.get(d); if (!s) { s = { zone: d.behavior?.zone, branch: b.branch, early: false }; st.set(d, s); }
            s.branch = b.branch;
            const R = D.flightManPickOf(d);
            if (R && Math.hypot(R.pos.x - d.pos.x, R.pos.y - d.pos.y) <= d.profile.radius + R.profile.radius + 0.15) s.early = true;
          }
        };
        try { sim.run(); } catch { continue; }
        for (const [, s] of st) rows.push({ coverage, deep: s.zone ? isDeepZone(s.zone) : false, ...s, comp: !!sim.stats?.completed });
      }
console.log(`FLIGHT_MAN defenders: ${rows.length}`);
for (const cov of ['cover2', 'cover3', 'cover4', 'cover6']) for (const deep of [false, true]) {
  const V = rows.filter((r) => r.coverage === cov && r.deep === deep); if (!V.length) continue;
  console.log(`${cov} ${deep ? 'deep ' : 'under'} ` + ['in', 'out', 'split'].map((b) => { const B = V.filter((r) => r.branch === b);
    return `${b} ${B.length} (pbu ${B.filter(r => r.pbu).length} int ${B.filter(r => r.int).length} early contact ${B.filter(r => r.early).length})`; }).join(' | '));
}
for (const b of ['in', 'out', 'split']) { const B = rows.filter((r) => r.branch === b);
  console.log(`ALL ${b}: ${B.length} | pbu ${B.filter(r => r.pbu).length} int ${B.filter(r => r.int).length} | early contact ${B.filter(r => r.early).length} (${(100 * B.filter(r => r.early).length / Math.max(1, B.length)).toFixed(1)}%)`); }
