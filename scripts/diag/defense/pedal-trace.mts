// The existing off-man pedal over the first second (Integration, before any third OFF_PEDAL attempt). Staged: every pass
// concept but screens vs COVS (quarters family + cover1_off), two formations, seeds, both flips. Each CB in a man
// technique (ManCoverage, his receiver 4+ yd in front at the snap). Per 0.1 s: his receiver's true upfield speed, the
// corner's raw delayed sight of it (sim.see), the filtered picture the pedal uses (RouteObservation.read), the pedal's
// requested and his achieved upfield speed (+ = away from the line); medians, and when each first passes 1 yd/s.
//   node --import tsx out/diag/cd/pedal-trace.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { RouteObservation } = await import(`${W}/src/sim/coverage-read.ts`);
const RO: any = RouteObservation.prototype; const r0 = RO.read;
RO.read = function (...a: any[]) { const s = r0.apply(this, a); this.__last = s; return s; };
const T = Array.from({ length: 11 }, (_, i) => +(i * 0.1).toFixed(1));
const rows: Record<string, any[]> = {};
const first: Record<string, number[]> = { true: [], raw: [], seen: [], req: [], got: [] };
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of (process.env.COVS ?? 'cover4,cover4_stubbie,cover1_off').split(','))
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const req = new Map<any, any>(); const tr = new Map<any, any>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (sim.t > 1.05) return;
          for (const d of sim.defense) {
            if (!/^CB/.test(d.slot)) continue;
            const b = d.behavior; const man = b?.kind === 'man' ? (b.sub ?? b) : null; const R = b?.target;
            if (!man || !R) continue;
            if (!tr.has(d)) { if ((d.pos.x - R.pos.x) * dir < 4) { tr.set(d, null); continue; } tr.set(d, { key: `${coverage.startsWith('cover4') ? 'quarters' : 'off-man'}`, s: {} }); }
            const t = tr.get(d); if (!t) continue;
            const k = +(Math.round(sim.t * 10) / 10).toFixed(1);
            const obs = man.observation ?? b.sub?.observation; const seen = obs?.__last;
            const raw = sim.see(d, R).vel; const q = req.get(d);
            if (t.s[k] === undefined) t.s[k] = { true: R.vel.x * dir, raw: raw.x * dir, seen: seen ? seen.vel.x * dir : NaN, req: q?.vel ? q.vel.x * dir : NaN, got: d.vel.x * dir };
          }
        };
        sim.run();
        for (const [, t] of tr) if (t) (rows[t.key] ??= []).push(t.s);
      }
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
for (const [key, R] of Object.entries(rows)) {
  console.log(`${key}: n ${R.length} corners   (upfield speed, yd/s; corner columns + = away from the line)`);
  console.log('   t     #1 true   seen raw   seen filtered   pedal request   corner achieved');
  for (const t of T) {
    const S = R.map((r: any) => r[t]).filter(Boolean);
    console.log(`  ${t.toFixed(1)}   ${med(S.map((s: any) => s.true)).padStart(6)}   ${med(S.map((s: any) => s.raw)).padStart(8)}   ${med(S.map((s: any) => s.seen)).padStart(13)}   ${med(S.map((s: any) => s.req)).padStart(13)}   ${med(S.map((s: any) => s.got)).padStart(15)}`);
  }
  for (const f of ['true', 'raw', 'seen', 'req', 'got']) {
    const ts = R.map((r: any) => { const k = T.find((t) => r[t] && r[t][f] > 1); return k ?? NaN; });
    console.log(`   first above 1 yd/s, ${f.padEnd(5)} p50 ${med(ts)} s (never ${ts.filter((x: number) => !Number.isFinite(x)).length})`);
  }
}
