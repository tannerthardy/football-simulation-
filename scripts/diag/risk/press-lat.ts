// Press-man #1 lateral displacement from alignment at 1.25 s (+ = toward the ball's spot at the snap), the operator of
// NFL nfl_press_lat (widest receiver each side, his nearest DB within 2 yd deep and 3 yd across). Also his requested
// velocity's lateral component at 0.6 / 1.0 s and whether the corner was in contact (within 1 yd) then.
// usage: npx tsx scripts/diag/risk/press-lat.ts CONCEPT COVERAGE SEEDS
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const [concept, coverage] = [process.argv[2] ?? 'quick_outs', process.argv[3] ?? 'cover1'], seeds = Number(process.argv[4] ?? 12);
const rows: any[] = [];
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const cy = sim.qb.pos.y, wrs = sim.offense.filter((o: any) => o !== sim.qb && o.behavior?.route);
  const picks: any[] = [];
  for (const side of [1, -1]) {
    const S = wrs.filter((o: any) => (o.pos.y - cy) * side > 0); if (!S.length) continue;
    const r = S.reduce((a: any, b: any) => (Math.abs(b.pos.y - cy) > Math.abs(a.pos.y - cy) ? b : a));
    const d = sim.defense.reduce((a: any, b: any) => (Math.hypot(b.pos.x - r.pos.x, b.pos.y - r.pos.y) < Math.hypot(a.pos.x - r.pos.x, a.pos.y - r.pos.y) ? b : a));
    const dir = sim.attackDir(r.team);
    if ((d.pos.x - sim.los) * dir > 2 || Math.abs(d.pos.y - r.pos.y) > 3) continue;
    const u0 = r.behavior.update.bind(r.behavior);
    const s: any = { r, d, y0: r.pos.y, x0: r.pos.x, dir, route: r.behavior.route.id, req: {}, contact: {} };
    r.behavior.update = (a: any, sm: any) => { const c = u0(a, sm); s.cmd = c?.vel; return c; };
    picks.push(s);
  }
  while (sim.phase === 'live' && sim.t < 1.25 + 1e-6 && sim.ball.kind !== 'air') {
    sim.tick();
    for (const s of picks) for (const T of [0.6, 1.0]) if (s.req[T] === undefined && sim.t + 1e-6 >= T) {
      const side = Math.sign(s.y0 - cy) || 1;
      s.req[T] = s.cmd ? +(-s.cmd.y * side).toFixed(1) : null;
      s.contact[T] = Math.hypot(s.d.pos.x - s.r.pos.x, s.d.pos.y - s.r.pos.y) <= 1;
    }
  }
  if (sim.t + 1e-6 < 1.25) continue;
  for (const s of picks) rows.push({ route: s.route, inward: Math.abs(s.y0 - cy) - Math.abs(s.r.pos.y - cy), down: (s.r.pos.x - s.x0) * s.dir, req06: s.req[0.6], req10: s.req[1.0], c06: s.contact[0.6], c10: s.contact[1.0], key: `${formation}|${seed}|${flip}` });
}
const pc = (v: number[], f: number) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(f * (w.length - 1))].toFixed(2) : '-'; };
const inw = rows.map(r => r.inward);
console.log(`${concept} vs ${coverage}: press #1 n ${rows.length} | inward p10/50/90 ${pc(inw, .1)}/${pc(inw, .5)}/${pc(inw, .9)} | >=3 yd ${rows.filter(r => r.inward >= 3).length} >=5 yd ${rows.filter(r => r.inward >= 5).length} | downfield p50 ${pc(rows.map(r => r.down), .5)}`);
for (const r of rows.filter(r => r.inward >= 3).slice(0, 12)) console.log(`   ${r.key} ${r.route} inward ${r.inward.toFixed(1)} down ${r.down.toFixed(1)} | requested inward 0.6 s ${r.req06} (contact ${r.c06}) 1.0 s ${r.req10} (contact ${r.c10})`);
export {};
