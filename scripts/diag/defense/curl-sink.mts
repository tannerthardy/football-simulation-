// CURL_SINK staged gates (task 126). Every pass concept against curl-flat calls, same seeds off/on. For each curl-flat
// defender whose CURL_FLAT_BACK branch fires (tag 'curl-flat-back'): when it fires and his depth then, his depth at
// 1.0-3.5 s while the ball is held. Throws: to a dig (his depth on the dig's side at the throw, completion, yards) and to
// a back on his side (yards, his distance to the catcher at the catch, his time from the catch to within 1 yd).
//   node --import tsx scripts/diag/defense/curl-sink.mts [seeds] [--rows]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3), ROWS = process.argv.includes('--rows');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const MARK = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
const concepts = Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id));
const rows: any[] = [];
for (const concept of concepts)
  for (const coverage of ['cover3', 'cover3_match', 'cover3_seam', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'ace_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any;
        try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        let cfs: any = null, thr: any = null, cat: any = null;
        const dpt = (a: any) => (a.pos.x - sim.los) * sim.attackDir(sim.offense[0].team);
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!cfs) cfs = sim.defense.filter((d: any) => /^curl_flat_/.test(d.behavior?.zone ?? '')).map((d: any): any => ({ d, side: Math.sign(d.pos.y - sim.ballY), fired: null as number | null, firedDepth: null as number | null, m: {} as Record<number, number> }));
          tick();
          for (const c of cfs) {
            if (c.fired === null && c.d.tags?.has?.('curl-flat-back')) { c.fired = sim.t; c.firedDepth = dpt(c.d); }
            if (sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) for (const m of MARK) if (c.m[m] === undefined && sim.t >= m - 1e-9) c.m[m] = dpt(c.d);
            if (cat && c.close === undefined && Math.hypot(c.d.pos.x - cat.r.pos.x, c.d.pos.y - cat.r.pos.y) < 1) c.close = sim.t - cat.t;
          }
          if (!thr && sim.ball.kind === 'air' && sim.ball.target) {
            const r = sim.ball.target, rt = r.behavior?.fallback?.route ?? r.behavior?.route;
            thr = { r, route: rt?.id ?? r.behavior?.constructor?.name ?? '?', back: /^(RB|FB|HB)/.test(r.slot), side: Math.sign(r.pos.y - sim.ballY),
              cf: cfs.filter((c: any) => c.side === Math.sign(r.pos.y - sim.ballY)).map((c: any) => ({ depth: dpt(c.d), fired: c.fired !== null })) };
          }
          if (thr && !cat && sim.catchAt >= 0 && sim.ball.kind === 'held') { cat = { r: sim.ball.carrier, t: sim.t };
            thr.catchDist = Math.min(...cfs.filter((c: any) => c.side === thr.side).map((c: any) => Math.hypot(c.d.pos.x - cat.r.pos.x, c.d.pos.y - cat.r.pos.y)), Infinity); }
        };
        const res = sim.run();
        const row = { concept, coverage, formation, seed, flip, yards: +(res.yards ?? 0).toFixed(1), cmp: !!sim.stats.completed,
          cfs: (cfs ?? []).filter((c: any) => c.fired !== null).map((c: any) => ({ fired: +c.fired.toFixed(2), firedDepth: +c.firedDepth.toFixed(1), m: c.m, close: c.side === thr?.side && thr?.back ? c.close ?? null : undefined })),
          thr: thr ? { route: thr.route, back: thr.back, cf: thr.cf, catchDist: Number.isFinite(thr.catchDist) ? +thr.catchDist.toFixed(1) : null } : null };
        rows.push(row); if (ROWS) process.stdout.write(JSON.stringify(row) + '\n');
      }
if (!ROWS) {
  const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(1) : '-'; };
  const F = rows.flatMap((r) => r.cfs);
  console.log(`plays ${rows.length}; curl-flat defenders whose back branch fired ${F.length}, fired at p50 ${q(F.map((c: any) => c.fired), .5)} s at depth p50 ${q(F.map((c: any) => c.firedDepth), .5)}`);
  console.log('  his depth while the ball is held: ' + MARK.map((m) => `${m.toFixed(1)} s ${q(F.map((c: any) => c.m[m]), .25)}/${q(F.map((c: any) => c.m[m]), .5)}/${q(F.map((c: any) => c.m[m]), .75)} (n ${F.filter((c: any) => c.m[m] !== undefined).length})`).join(' | '));
  const dig = rows.filter((r) => r.thr?.route === 'dig' && r.thr.cf.length);
  for (const [lab, S] of [['dig, his depth < 6', dig.filter((r) => Math.min(...r.thr.cf.map((c: any) => c.depth)) < 6)], ['dig, his depth >= 6', dig.filter((r) => Math.min(...r.thr.cf.map((c: any) => c.depth)) >= 6)]] as const)
    console.log(`  ${lab}: n ${S.length} comp ${S.length ? (S.filter((r) => r.cmp).length / S.length).toFixed(2) : '-'} yd/throw ${S.length ? (S.reduce((s, r) => s + r.yards, 0) / S.length).toFixed(1) : '-'}`);
  const fl = rows.filter((r) => r.thr?.back && r.thr.cf.length);
  const flF = fl.filter((r) => r.cfs.length);
  console.log(`  throws to a back on a curl-flat side: n ${fl.length} comp ${(fl.filter((r) => r.cmp).length / Math.max(1, fl.length)).toFixed(2)} yd/throw ${(fl.reduce((s, r) => s + r.yards, 0) / Math.max(1, fl.length)).toFixed(1)}; with his back branch fired n ${flF.length} yd/throw ${(flF.reduce((s, r) => s + r.yards, 0) / Math.max(1, flF.length)).toFixed(1)}, his distance at the catch p50 ${q(flF.map((r) => r.thr.catchDist), .5)}, to within 1 yd after the catch p50 ${q(flF.flatMap((r) => r.cfs.map((c: any) => c.close ?? NaN)), .5)} s (never ${flF.length ? (flF.filter((r) => r.cfs.every((c: any) => c.close == null)).length / flF.length).toFixed(2) : '-'})`);
  console.log(`  all plays: comp ${(rows.filter((r) => r.cmp).length / rows.length).toFixed(3)} yd/play ${(rows.reduce((s, r) => s + r.yards, 0) / rows.length).toFixed(2)}`);
}
