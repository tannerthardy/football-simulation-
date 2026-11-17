// Where the honest arm's zone yards after the catch come from (Integration, 2026-11-17; reads only). Staged zone
// completions (cover 2/3/4/6, gun doubles and trips, every non-screen concept), per play the nearest underneath and the
// nearest deep zone defender to the catch point at the catch. From the release to 1.5 s after the catch: his release
// belief (when, from what), his first sight of the flight, his landing estimate's error at the catch (his own estimate's
// catch point against the true one; the true path under the default arm is error 0 by construction), when the catch
// is in his picture (observedHolder names the catcher), what he is doing at +0 / +0.3 / +0.6 / +1.0 s (chasing the
// carrier he sees = his controller looks at him this tick; ball = playing a flight / estimate; zone = his zone or
// technique; none = standing under 1 yd/s), when he first moves toward the carrier (3 yd/s within 45 deg), YAC.
// usage: [flags] node --import tsx scripts/diag/yac/honest-after.mts [seeds]   (run from the checkout root)
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const { observedHolder } = await import(`${W}/src/sim/possession-read.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const DEF = await import(`${W}/src/sim/behaviors/defense.ts`);
const rows: any[] = []; const plays = { thrown: 0, comp: 0, pbu: 0, int: 0 }; let manTag = 0, splitTag = 0;
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const looked = new Map<any, any>(); const la = sim.lookAt.bind(sim); sim.lookAt = (a: any, t: any, ...r: any[]) => { looked.set(a, t); return la(a, t, ...r); };
        let rel = -1, C: any = null, tc = -1, cx0 = 0; const W2: any[] = [];
        const ev0 = sim.event.bind(sim); const seenEv = new Set<string>();
        sim.event = (type: string, a?: any, ...r: any[]) => {
          if ((type === 'pbu' || type === 'interception') && !seenEv.has(type)) seenEv.add(type);
          if (type === 'catch' && a?.team === 'O' && !C && sim.offCall?.kind === 'pass') {
            C = a; tc = sim.t; cx0 = a.pos.x;
            // His zone: ZoneCoverage and CoverageDefender both carry it (a man seat has none).
            const zoneOf = (d: any) => d.behavior?.zone as string | undefined;
            const zd = sim.defense.filter((d: any) => zoneOf(d));
            for (const deep of [false, true]) {
              const pool = zd.filter((d: any) => isDeepZone(zoneOf(d)) === deep).sort((p: any, q: any) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y));
              const d = pool[0]; if (!d) continue;
              const E = sim.ballEstimates; let err: number | null = null;
              if (E?.peek && (E.samplesOf?.(d) ?? 0) > 0) { const p = E.peek(d, sim); if (p.length) { const q = p.reduce((m: any, s: any) => (Math.hypot(s.x - a.pos.x, s.y - a.pos.y) < Math.hypot(m.x - a.pos.x, m.y - a.pos.y) ? s : m)); err = Math.hypot(q.x - a.pos.x, q.y - a.pos.y); } }
              const rb = releaseBelief(sim, d);
              W2.push({ fm: DEF.flightManBranch?.get(d)?.branch ?? '-', pickC: DEF.flightManPickOf ? DEF.flightManPickOf(d) === a : null, d, deep, dist: Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y), rbAt: rb.releasedAt, src: rb.source, ballAt: rb.ballAt, err, at: {} as any });
            }
          }
          return ev0(type, a, ...r);
        };
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          looked.clear(); tick();
          if (rel < 0 && sim.ball?.kind === 'air') rel = sim.t;
          if (!C) return;
          const dt = sim.t - tc;
          if (dt > 1.5) return;
          for (const w of W2) {
            const d = w.d;
            if (w.known === undefined) { const h = observedHolder(d, sim); if (h && h.target === C) w.known = dt; }
            if (w.move === undefined) { const sp = Math.hypot(d.vel.x, d.vel.y), dx = C.pos.x - d.pos.x, dy = C.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1;
              if (sp >= 3 && (d.vel.x * dx + d.vel.y * dy) / (l * sp) >= Math.SQRT1_2) w.move = dt; }
            for (const m of [0, 0.3, 0.6, 1.0]) if (w.at[m] === undefined && dt >= m - 1e-9) {
              const sp = Math.hypot(d.vel.x, d.vel.y), tags = d.tags ?? new Set();
              w.at[m] = looked.get(d) === C ? 'chase' : tags.has('onBall') || tags.has('flight-unsettled') ? 'ball' : sp < 1 ? 'none' : 'zone';
            }
          }
        };
        let thrown = false; const t0 = sim.tick; sim.tick = () => { t0(); if (sim.ball?.kind === 'air') thrown = true; for (const d of sim.defense) { if (d.tags?.has?.('flight-man')) manTag++; if (d.tags?.has?.('flight-split')) splitTag++; } };
        try { sim.run(); } catch { continue; }
        if (thrown && sim.offCall?.kind === 'pass') { plays.thrown++; if (sim.stats?.completed) plays.comp++; if (seenEv.has('pbu')) plays.pbu++; if (seenEv.has('interception')) plays.int++; }
        if (!C || !sim.stats?.completed) continue;
        const dir = sim.attackDir(sim.offense[0].team);
        const res = sim.result ?? null;
        const yac = ((C.pos.x - cx0) * dir);
        for (const w of W2) rows.push({ fm: w.fm, pickC: w.pickC, coverage, deep: w.deep, yac, dist: w.dist, rbAt: w.rbAt === undefined ? null : w.rbAt - rel, src: w.src ?? 'none', ball: w.ballAt === undefined ? null : w.ballAt - rel, err: w.err, known: w.known ?? null, move: w.move ?? null, at: w.at, flight: tc - rel });
      }
const q = (v: any[], k = 2) => { const w = v.filter((x) => x !== null && Number.isFinite(x)).sort((a: number, b: number) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(k)).join('/') : '-'; };
const cnt = (V: any[], m: number) => { const c: Record<string, number> = {}; for (const r of V) c[r.at[m] ?? '-'] = (c[r.at[m] ?? '-'] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '); };
console.log(`throws ${plays.thrown} completions ${plays.comp} (${(100 * plays.comp / Math.max(1, plays.thrown)).toFixed(1)}%) PBU plays ${plays.pbu} INT plays ${plays.int} | flight-man defender-ticks ${manTag} split ${splitTag}`);
console.log(`BALL_EST=${process.env.BALL_EST ?? 'default'} ACQ_SEEN=${process.env.ACQ_SEEN ?? '-'} TRACKED_CATCH=${process.env.TRACKED_CATCH ?? '-'}`);
for (const deep of [false, true]) {
  const V = rows.filter((r) => r.deep === deep);
  console.log(`${deep ? 'DEEP' : 'UNDER'} n ${V.length} | dist at catch ${q(V.map(r => r.dist), 1)} | flight ${q(V.map(r => r.flight))} | throw believed (s after release) ${q(V.map(r => r.rbAt))} [${Object.entries(V.reduce((m: any, r) => (m[r.src] = (m[r.src] ?? 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(', ')}] | flight seen ${q(V.map(r => r.ball))} (never ${V.filter(r => r.ball === null).length}) | landing err ${q(V.map(r => r.err), 1)} yd`);
  console.log(`      catch known (s after catch) ${q(V.map(r => r.known))} (never ${V.filter(r => r.known === null).length}) | moves to carrier ${q(V.map(r => r.move))} (never ${V.filter(r => r.move === null).length}) | YAC ${q(V.map(r => r.yac), 1)}`);
  for (const m of [0, 0.3, 0.6, 1.0]) console.log(`      +${m.toFixed(1)} s: ${cnt(V, m)}`);
  const N = V.filter((r) => r.move === null), c: Record<string, number> = {};
  for (const r of N) { const k = `${r.fm}${r.pickC === null ? '' : r.pickC ? '/picked catcher' : '/picked other'}`; c[k] = (c[k] ?? 0) + 1; }
  console.log(`      never moving (${N.length}): ${Object.entries(c).map(([k, v]) => k + ' ' + v).join(', ')} | dist ${q(N.map(r => r.dist), 1)} | catch known ${q(N.map(r => r.known))} | YAC on those plays ${q(N.map(r => r.yac), 1)}`);
}
