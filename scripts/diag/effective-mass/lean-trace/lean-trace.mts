const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const L: any = { target: null, rows: [] }; (globalThis as any).__L = L;
const all: any[] = []; let shown = false;
for (let seed = 1; seed <= 24; seed++) for (const concept of ['four_verts', 'smash']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    L.target = null; let tk: any = null;
    for (const t of tackles) {
      const e = t.engagement; if (!e || e.type !== 'pass') continue;
      const d = e.defender; if (Math.abs(d.pos.y - sim.ballY) < 3) continue;
      if (d.pos.x - t.pos.x < -0.3 || Math.hypot(d.pos.x - t.pos.x, d.pos.y - t.pos.y) > 1.2) continue;
      if (sim.t < 1.5 || sim.t > 2.5) continue;
      tk = t; break;
    }
    if (tk) { L.target = tk.body; L.rows = []; }
    const leanBefore = tk ? tk.body.support.lean.x : 0;
    sim.tick();
    if (tk) {
      for (const r of L.rows) all.push(r);
      if (!shown && L.rows.length && sim.t > 1.9) {
        shown = true;
        console.log(`one tick, seed ${seed} ${concept} ${tk.slot} t ${sim.t.toFixed(2)}: lean between ticks ${leanBefore.toFixed(0)} -> first entry ${L.rows[0].entry.toFixed(0)}; base limit ${(L.rows[0].m * L.rows[0].w0 ** 2 * L.rows[0].rb).toFixed(0)}`);
        for (const r of L.rows) console.log(`  entry ${r.entry.toFixed(0)} | release0 ${(-r.rel[0]).toFixed(0)} | target ${r.tx.toFixed(0)} (felt ${r.felt.toFixed(0)}, plan ${r.plan.toFixed(0)}) blend k ${(r.k ?? 0).toFixed(3)} rising ${r.rising} -> ${(r.afterBlend ?? NaN).toFixed(0)} | pitch ${r.pitch ? 'clamp to ' + r.most.toFixed(0) : '-'} | release1 ${(-r.rel[1]).toFixed(0)} | final ${r.final.toFixed(0)}`);
      }
    }
  }
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(1) : 'nan'; };
const n = all.length;
console.log(`substeps ${n}: pitch clamp bit ${(100 * all.filter((r) => r.pitch).length / n).toFixed(0)}% | release0 >0 ${(100 * all.filter((r) => r.rel[0] > 0.5).length / n).toFixed(0)}% | release1 >0 ${(100 * all.filter((r) => r.rel[1] > 0.5).length / n).toFixed(0)}% | rising ${(100 * all.filter((r) => r.rising).length / n).toFixed(0)}%`);
console.log(`p50: entry ${q(all.map((r) => r.entry))} | target ${q(all.map((r) => r.tx))} | after blend ${q(all.map((r) => r.afterBlend))} | final ${q(all.map((r) => r.final))} | pitch 'most' when it bit ${q(all.filter((r) => r.pitch).map((r) => r.most))} | release0 ${q(all.map((r) => r.rel[0]))} release1 ${q(all.map((r) => r.rel[1]))} | base limit ${q(all.map((r) => r.m * r.w0 ** 2 * r.rb))}`);
const tz = all.filter((r) => r.tx === 0).length;
console.log(`target zero (no drive asked: ex <= 0 or no push) ${(100 * tz / n).toFixed(0)}% of substeps`);
