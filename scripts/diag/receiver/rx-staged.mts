// Receiver ball estimate on the staged pass set (Coverage, 2026-11-18). Per throw, the intended receiver: first sight
// (s after release), when he knows it (glance dwell), how long he has seen it without knowing it, his estimate's error
// at the arrival (his estimate's point at the arrival time vs the true ball then) by time since first sight, and the
// play's result (complete / drop / incomplete / int), YAC. usage: [flags] node --import tsx scripts/diag/receiver/rx-staged.mts seeds
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        let T: any = null, t0 = 0, first: number | null = null, knows: number | null = null, gap = 0, snaps: any[] = [], end: number | null = null, ev: string | null = null, cx = 0, route = '';
        const tb = sim.throwBall.bind(sim);
        sim.throwBall = (p: any, target: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; t0 = sim.t; route = target.behavior?.route?.id ?? '?'; } return tb(p, target, ...r); };
        const e0 = sim.event.bind(sim);
        sim.event = (type: string, a: any, ...r: any[]) => { if (T && !ev && ['catch', 'drop', 'pbu', 'interception', 'incomplete', 'miss', 'deflection'].includes(type)) { ev = type; end = sim.t; if (type === 'catch') cx = a.pos.x; } return e0(type, a, ...r); };
        const tick = sim.tick.bind(sim);
        sim.tick = () => { tick(); if (!T || sim.ball.kind !== 'air' || ev) return; const E = sim.ballEstimates; if (!E) return;
          const seen = !!E.lastSeen?.(T), k = !!E.glanceKnows?.(T, sim);
          if (seen && first === null) first = sim.t - t0;
          if (k && knows === null) knows = sim.t - t0;
          if (seen && !k) gap += sim.dt;
          if (first !== null) snaps.push({ since: sim.t - t0 - first, path: (E.peek?.(T, sim) ?? []).map((q: any) => ({ t: q.t, x: q.x, y: q.y })) }); };
        let res: any; try { res = sim.run(); } catch { continue; }
        if (!T) continue;
        const truth = sim.ballPath, tEnd = end ?? truth[truth.length - 1]?.t; const tb0 = truth.reduce((m: any, q: any) => (Math.abs(q.t - tEnd) < Math.abs(m.t - tEnd) ? q : m), truth[0]);
        const errs = snaps.filter((s) => s.path.length).map((s) => { const q = s.path.reduce((m: any, p: any) => (Math.abs(p.t - tEnd) < Math.abs(m.t - tEnd) ? p : m)); return { since: s.since, err: Math.hypot(q.x - tb0.x, q.y - tb0.y) }; });
        const dir = sim.attackDir(sim.offense[0].team);
        rows.push({ key: `${concept}/${coverage}/${formation}/${seed}/${flip}`, route, first, knows, gap, errs, ev: ev ?? 'none', comp: !!res.stats.completed, yac: res.stats.completed ? (res.stats.yac ?? null) : null });
      }
const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const n = rows.length, cnt = (f: (r: any) => boolean) => rows.filter(f).length;
console.log(`flags RCV_KNOWS=${process.env.RCV_KNOWS ?? 'on'} PURSUIT_BEARING=${process.env.PURSUIT_BEARING ?? 'on'} | throws ${n} | complete ${cnt(r => r.comp)} (${(100 * cnt(r => r.comp) / n).toFixed(1)}%) drops ${cnt(r => r.ev === 'drop')} miss ${cnt(r => r.ev === 'miss')} incomplete ${cnt(r => r.ev === 'incomplete')} pbu ${cnt(r => r.ev === 'pbu')} int ${cnt(r => r.ev === 'interception')} | YAC p25/50/75 ${q(rows.filter(r => r.comp).map(r => r.yac))}`);
console.log(`first sight ${q(rows.map(r => r.first ?? NaN))} s (never ${cnt(r => r.first === null)}) | knows ${q(rows.map(r => r.knows ?? NaN))} s (never ${cnt(r => r.knows === null)}) | seen without knowing > 0.1 s: ${cnt(r => r.gap > 0.1 + 1e-9)} (comp ${cnt(r => r.gap > 0.1 + 1e-9 && r.comp)}) | > 0.3 s: ${cnt(r => r.gap > 0.3 + 1e-9)} (comp ${cnt(r => r.gap > 0.3 + 1e-9 && r.comp)})`);
for (const [lo, hi] of [[0, 0.05], [0.05, 0.15], [0.15, 0.25], [0.25, 0.4], [0.4, 0.6], [0.6, 9]]) { const v = rows.flatMap(r => r.errs.filter((e: any) => e.since >= lo - 1e-9 && e.since < hi - 1e-9).map((e: any) => e.err)); console.log(`  ${lo.toFixed(2)}-${hi === 9 ? '+' : hi.toFixed(2)} s after first sight: n ${v.length} | estimate's error at the arrival ${q(v)} yd`); }
const byRoute = new Map<string, any[]>(); for (const r of rows) (byRoute.get(r.route) ?? byRoute.set(r.route, []).get(r.route)!).push(r);
console.log('by route (n, comp%, seen-without-knowing>0.1s):', [...byRoute].sort((a, b) => b[1].length - a[1].length).slice(0, 14).map(([k, v]) => `${k} ${v.length} ${(100 * v.filter(r => r.comp).length / v.length).toFixed(0)}% ${v.filter(r => r.gap > 0.1 + 1e-9).length}`).join(' | '));

if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify(rows.map(r => ({ key: r.key, route: r.route, gap: r.gap, ev: r.ev, comp: r.comp, yac: r.yac }))));
