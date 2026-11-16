// CARRY_TURN's stated cost: the deep ball over a man who concedes. Staged: concepts with vertical routes against man
// (cover0 / cover1 / cover2man) and deep-third (cover3 family) calls, same seeds off/on. Throws to a receiver on go /
// fade / seam / post: completion, yards, the catch's depth, and the nearest defender to the catch point at the arrival,
// by call family and by the receiver's downfield pace at 2.5 s (or at the throw if earlier).
//   node --import tsx scripts/diag/defense/deep-ball.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 4);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const VERT = new Set(['go', 'fade', 'seam', 'seam_read', 'post']);
const rows: any[] = [];
for (const concept of ['four_verts', 'verts_hitch', 'pa_shot', 'post_cross', 'seam_hitch', 'dagger', 'pa_post_dig', 'hitch_post', 'fade_flat'])
  for (const coverage of ['cover0', 'cover1', 'cover2man', 'cover3', 'cover3_match', 'cover3_seam'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11', 'ace_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); let thr: any = null, pace: Map<any, number> | null = null, arr: any = null;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          for (const o of sim.offense) if (o.behavior?.route) o.__route = o.behavior.route.id;
          tick();
          if (!pace && (sim.t >= 2.5 || sim.ball.kind === 'air')) pace = new Map(sim.offense.map((o: any) => [o, o.vel.x * dir]));
          if (!thr && sim.ball.kind === 'air' && sim.ball.target) { const T = sim.ball.target; thr = { r: T, route: T.__route, pace: pace?.get(T) ?? T.vel.x * dir }; }
          if (thr && !arr && sim.ball.kind !== 'air') {
            const r = thr.r; arr = { depth: (r.pos.x - sim.los) * dir, near: Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))) };
          }
        };
        const res = sim.run();
        if (!thr || !VERT.has(thr.route)) continue;
        rows.push({ fam: /^cover3/.test(coverage) ? 'deep thirds' : 'man', route: thr.route, pace: thr.pace, cmp: !!sim.stats.completed, yards: res.yards ?? 0, depth: arr?.depth ?? null, near: arr?.near ?? null });
      }
const q = (v: number[], p: number) => { const s = v.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(1) : '-'; };
for (const fam of ['man', 'deep thirds']) for (const [lab, lo, hi] of [['all', -99, 99], ['under 7.5', -99, 7.5], ['7.5-8.2', 7.5, 8.2], ['over 8.2', 8.2, 99]] as const) {
  const S = rows.filter((r) => r.fam === fam && r.pace >= lo && r.pace < hi); if (!S.length) continue;
  console.log(`${fam.padEnd(11)} pace ${lab.padEnd(9)} throws ${String(S.length).padStart(4)} completed ${(S.filter((r) => r.cmp).length / S.length).toFixed(2)} yards/throw ${(S.reduce((a, r) => a + r.yards, 0) / S.length).toFixed(1)} | ball arrives at depth p50 ${q(S.map((r) => r.depth), .5)} | nearest defender to the receiver at arrival p50 ${q(S.map((r) => r.near), .5)} yd`);
}
