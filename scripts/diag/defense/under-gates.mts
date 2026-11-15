// UNDER_PASS staged gates (SETTLE_DEPTH first). Every pass concept but screens against zone calls, same seeds off/on.
// Per throw: the target's route family, completion, yards; the underneath zone defenders (hook_*, curl_flat_*) on the
// target's side at the throw: depth, and whether they had settled short of their landmark. Rows by route family, and
// the underneath defenders' depth at the throw by job.
//   node --import tsx scripts/diag/defense/under-gates.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const FAM: Record<string, string> = { dig: 'in-breaker', in: 'in-breaker', square_in: 'in-breaker', drive: 'in-breaker', cross: 'crosser 10+', deep_cross: 'crosser 10+',
  shallow: 'shallow / mesh', shallow_high: 'shallow / mesh', mesh_under: 'shallow / mesh', drag: 'shallow / mesh', flat: 'flat', back_flat: 'flat', swing: 'flat', arrow: 'flat',
  out: 'out', quick_out: 'out', hitch: 'hitch / curl', curl: 'hitch / curl', hook: 'hitch / curl', stick: 'hitch / curl', slant: 'slant', seam: 'vertical', go: 'vertical', post: 'vertical', corner: 'corner', short_in: 'short in', angle: 'flat', back_out: 'flat', checkdown: 'flat', deep_out: 'out', comeback: 'out', fade: 'vertical', seam_read: 'vertical', wheel: 'vertical' };
const rows: any[] = []; const under: Record<string, number[]> = {};
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover3_seam', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11', 'ace_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        let thr: any = null; const dpt = (a: any) => (a.pos.x - sim.los) * sim.attackDir(sim.offense[0].team);
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          if (!thr && sim.ball.kind === 'air' && sim.ball.target) {
            const r = sim.ball.target, rt = r.behavior?.fallback?.route ?? r.behavior?.route, side = Math.sign(r.pos.y - sim.ballY);
            const und = sim.defense.filter((d: any) => /^(hook|curl_flat)/.test(d.behavior?.zone ?? '')).map((d: any) => ({ job: d.behavior.zone.replace(/_(s|w|mid)$/, ''), depth: dpt(d), side: Math.sign(d.pos.y - sim.ballY) === side }));
            for (const u of und) (under[u.job] ??= []).push(u.depth);
            thr = { route: rt?.id ?? '?', und: und.filter((u: any) => u.side) };
          }
        };
        const res = sim.run();
        if (thr) rows.push({ fam: FAM[thr.route] ?? 'other', cmp: !!sim.stats.completed, yards: res.yards ?? 0, und: thr.und });
      }
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(1) : '-'; };
console.log(`throws ${rows.length}: comp ${(rows.filter((r) => r.cmp).length / rows.length).toFixed(3)} yd/throw ${(rows.reduce((s, r) => s + r.yards, 0) / rows.length).toFixed(2)}`);
for (const [job, v] of Object.entries(under)) console.log(`  ${job} depth at the throw p25/p50/p75 ${q(v, .25)}/${q(v, .5)}/${q(v, .75)} (n ${v.length})`);
for (const fam of ['in-breaker', 'crosser 10+', 'shallow / mesh', 'flat', 'hitch / curl', 'slant', 'short in', 'out', 'vertical', 'corner', 'other']) {
  const S = rows.filter((r) => r.fam === fam); if (!S.length) continue;
  console.log(`  ${fam.padEnd(15)} n ${String(S.length).padStart(4)} comp ${(S.filter((r) => r.cmp).length / S.length).toFixed(2)} yd/throw ${(S.reduce((s, r) => s + r.yards, 0) / S.length).toFixed(1)} | underneath on his side at the throw, depth p50 ${q(S.flatMap((r) => r.und.map((u: any) => u.depth)), .5)}`);
}
