const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const L: any = { target: null, rows: [] }; (globalThis as any).__L = L;
const all: any[] = []; let shown = 0;
for (let seed = 1; seed <= 24; seed++) for (const concept of ['four_verts', 'smash']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  const series: string[] = [];
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    L.target = null; let tk: any = null;
    for (const t of tackles) {
      const e = t.engagement; if (!e || e.type !== 'pass') continue;
      const d = e.defender; if (Math.abs(d.pos.y - sim.ballY) < 3) continue;
      if (d.pos.x - t.pos.x < -0.3 || Math.hypot(d.pos.x - t.pos.x, d.pos.y - t.pos.y) > 1.2) continue;
      if (t.slot !== 'RT') continue;
      tk = t; break;
    }
    if (tk) { L.target = tk.body; L.rows = []; }
    sim.tick();
    if (tk && L.rows.length) {
      const r = L.rows[L.rows.length - 1], f = L.rows[0];
      all.push(r);
      const mag = (x: number, y: number) => Math.hypot(x, y).toFixed(0);
      series.push(`t ${sim.t.toFixed(2)} lean (${r.final.toFixed(0)},${r.finalY.toFixed(0)}) |${mag(r.final, r.finalY)}| target (${r.tx.toFixed(0)},${r.ty.toFixed(0)}) |${mag(r.tx, r.ty)}| felt (${r.felt.toFixed(0)},${r.feltY.toFixed(0)}) vel (${r.vx.toFixed(1)},${r.vy.toFixed(1)}) pitch ${L.rows.filter((x: any) => x.pitch).length}/${L.rows.length} rising ${L.rows.filter((x: any) => x.rising).length}`);
    }
  }
  if (shown < 1 && series.length > 15) { shown++; console.log(`seed ${seed} ${concept} RT, engaged-in-front ticks:`); for (const l of series) console.log('  ' + l); }
}
