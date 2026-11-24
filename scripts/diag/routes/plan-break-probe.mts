// Rules + Coaching 2026-11-24 (PLAN_BREAK_BODY): run with and without PLAN_BREAK_BODY=1; analyse tracks with
// scripts/diag/routes/route_chart.py (rules/route-chart) and the vtxAt field (arrival at the first 35-degree turn).
// Planned vs run break, staged: every route runner's planned break (RouteRunner.breakTime, from his route's install) and
// his 10 Hz track to 4 s, no throw. One jsonl row per receiver.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const concepts = ['slant_flat', 'quick_outs', 'hitches', 'stick', 'smash', 'curl_flat', 'mesh', 'four_verts', 'flood', 'dagger', 'drive', 'y_cross', 'levels', 'comebacks', 'double_slants', 'hitch_post', 'corner_flat', 'sail_corner', 'double_outs'];
const forms = ['gun_doubles_11', 'gun_trips_11'];
for (const concept of concepts) for (const formation of forms) for (const seed of [1, 2, 3]) {
  let setup: any; try { setup = nativeTraceSetup({ concept, coverage: 'cover3', seed, roster: 3, formation, flip: false }); } catch { continue; }
  const sim: any = new PlaySim(setup); sim.throwBall = () => undefined;
  let snap: number | null = null; const tr: Record<number, number[][]> = {}; const plan: Record<number, any> = {}; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.t;
    if (snap !== null) {
      const t = sim.t - snap;
      for (const a of sim.offense) {
        const b = a.behavior;
        if (b?.kind === 'route' && plan[a.idx] === undefined) {
          const pts = b.route?.points ?? []; let bi = -1; pts.forEach((q: any, i: number) => { if (q.s !== undefined) bi = i; });
          // The path's first vertex turning 35 deg+ (the plan's break point under PLAN_BREAK_BODY).
          let prev = a.pos, dir: any = null, vtx: any = null;
          for (const q of b.path ?? []) { const sx = q.p.x - prev.x, sy = q.p.y - prev.y, l = Math.hypot(sx, sy); if (l < 1e-6) continue; const u = { x: sx / l, y: sy / l };
            if (dir && !vtx && u.x * dir.x + u.y * dir.y < Math.cos(35 * Math.PI / 180)) vtx = { x: prev.x, y: prev.y }; dir = u; prev = q.p; }
          plan[a.idx] = { vtx, vtxAt: null, route: String(b.route?.id ?? ''), planned: b.breakTime + ((b as any).bornAt - snap), pos: a.player?.position ?? a.slot, out: Math.sign(a.pos.y - sim.ballY) || 1, breakIdx: bi, passed: null };
        }
        const pv = plan[a.idx]; if (pv && pv.vtx && pv.vtxAt === null && Math.hypot(a.pos.x - pv.vtx.x, a.pos.y - pv.vtx.y) < 0.6) pv.vtxAt = Math.round(t * 100) / 100;
        const pp = plan[a.idx]; if (pp && pp.passed === null && b?.kind === 'route' && pp.breakIdx >= 0 && b.idx > pp.breakIdx) pp.passed = Math.round(t * 100) / 100;
        if (Math.abs(t * 10 - Math.round(t * 10)) < 0.26) ((tr[a.idx] ??= []) as number[][]).push([Math.round(t * 10) / 10, a.pos.x - sim.los, a.pos.y]);
      }
    }
    if (sim.t > 4.2) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  for (const [idx, p] of Object.entries(plan)) {
    const T = (tr[+idx] ?? []).filter((r, i, a) => i === 0 || r[0] !== a[i - 1][0]);
    console.log(JSON.stringify({ concept, formation, seed, ...p, track: T }));
  }
}
