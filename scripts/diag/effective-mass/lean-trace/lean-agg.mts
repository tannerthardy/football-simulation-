const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const L: any = { target: null, rows: [] }; (globalThis as any).__L = L;
const rows: any[] = [];
for (let seed = 1; seed <= 24; seed++) for (const concept of ['four_verts', 'smash']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    L.target = null; let tk: any = null, d: any = null;
    for (const t of tackles) {
      const e = t.engagement; if (!e || e.type !== 'pass') continue;
      d = e.defender; if (Math.abs(d.pos.y - sim.ballY) < 3) continue;
      if (d.pos.x - t.pos.x < -0.3 || Math.hypot(d.pos.x - t.pos.x, d.pos.y - t.pos.y) > 1.2) continue;
      if (sim.t < 1.5 || sim.t > 2.5) continue;
      tk = t; break;
    }
    if (tk) { L.target = tk.body; L.rows = []; }
    const geo = tk ? { dx: d.pos.x - tk.pos.x, dy: Math.abs(d.pos.y - tk.pos.y) } : null;
    sim.tick();
    if (tk && L.rows.length) { const r = L.rows[L.rows.length - 1]; r.geo = geo; rows.push(r); }
  }
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const fm = rows.map((r) => Math.hypot(r.felt, r.feltY)), lm = rows.map((r) => Math.hypot(r.final, r.finalY)), tm = rows.map((r) => Math.hypot(r.tx, r.ty));
console.log(`ticks ${rows.length} (kicking or holding, 1.5-2.5 s, edge rusher in front within 1.2 yd)`);
console.log(`felt press |F| p25/50/75 ${q(fm, .25)} / ${q(fm)} / ${q(fm, .75)}; along x (his retreat axis) share |Fx|/|F| p50 ${q(rows.map((r, i) => Math.abs(r.felt) / Math.max(1e-6, fm[i])))}`);
console.log(`lean |lean| / |target| p25/50/75 ${q(rows.map((r, i) => lm[i] / Math.max(1e-6, tm[i])), .25)} / ${q(rows.map((r, i) => lm[i] / Math.max(1e-6, tm[i])))} / ${q(rows.map((r, i) => lm[i] / Math.max(1e-6, tm[i])), .75)}; |lean| p50 ${q(lm)}; target p50 ${q(tm)}`);
console.log(`rusher relative to tackle: dx (depth, + = toward the LOS) p50 ${q(rows.map((r) => r.geo.dx))}, |dy| p50 ${q(rows.map((r) => r.geo.dy))}`);
