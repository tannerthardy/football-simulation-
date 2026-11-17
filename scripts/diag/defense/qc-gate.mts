// CORNER_DROP's two checks before the card (Integration). Staged: pass concepts against the Cover 3 family, three
// formations, seeds, both flips; throws to #1 (the widest receiver on his side). The deep-third corner on #1's side.
//   (1) the quick game: at hitch / curl / stick throws, the corner at -0.3 s and at the throw (distance to #1, his
//       velocity along depth: + deeper = sinking, - = driving downhill; closing on #1; his label), at the catch
//       (distance, speed toward #1) and the time from the catch to the play's end (tackle / out of bounds) with
//       completion, yards and YAC.
//   (2) VERT=1: only the vertical-heavy concepts; throws to #1 by route family (completion, yards, the corner's
//       cushion over #1 at the throw and the nearest defender to #1 at the arrival).
//   node --import tsx scripts/diag/defense/cd-hitch.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2), VERT = process.env.VERT === '1';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const QUICK = new Set(['hitch', 'curl', 'stick', 'hook']);
const DEEP = new Set(['go', 'fade', 'seam', 'seam_read', 'post', 'corner', 'wheel']);
const VCON = ['smash', 'four_verts', 'verts_hitch', 'seam_hitch', 'fade_flat', 'hitch_post', 'pa_shot', 'post_cross', 'dagger', 'pa_post_dig'];
const concepts = VERT ? VCON.filter((c) => PASS_BY_ID[c]) : Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id));
const rows: any[] = [];
for (const concept of concepts)
  for (const coverage of (process.env.COVS ?? 'cover4,cover4_stubbie,cover4_book_read,cover4_box,cover1_off').split(','))
    for (const formation of ['gun_doubles_11', 'gun_trips_11', 'ace_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const dpt = (p: any) => (p.x - sim.los) * dir;
        let one: Set<any> | null = null; const req = new Map<any, any>(); const hist: any[] = [];
        let thr: any = null, cat: any = null, arr: any = null, tCatch = -1, tEnd = -1;
        const corner = (side: number) => sim.defense.filter((d: any) => /^CB/.test(d.slot) && Math.sign(d.pos.y - sim.ballY) === side).sort((a: any, b: any) => Math.abs(b.pos.y - sim.ballY) - Math.abs(a.pos.y - sim.ballY))[0];
        const snap = (d: any, r: any) => { const lx = r.pos.x - d.pos.x, ly = r.pos.y - d.pos.y, L = Math.hypot(lx, ly) || 1; const q = req.get(d);
          return { dist: L, vDepth: d.vel.x * dir, qDepth: q?.vel ? q.vel.x * dir : NaN, close: (d.vel.x * lx + d.vel.y * ly) / L, cushion: dpt(d.pos) - dpt(r.pos), label: (q && facingTechnique(q)?.label) ?? '-' }; };
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!one) { const rec = sim.offense.filter((o: any) => o.behavior?.route); const by = (sg: number) => rec.filter((o: any) => Math.sign(o.pos.y - sim.ballY) === sg).sort((a: any, b: any) => Math.abs(b.pos.y - sim.ballY) - Math.abs(a.pos.y - sim.ballY))[0]; one = new Set([by(1), by(-1)].filter(Boolean)); }
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (!thr && sim.ball.kind === 'held') { hist.push({ t: sim.t, d: new Map([...(one ?? [])].map((r: any) => { const c = corner(Math.sign(r.pos.y - sim.ballY)); return [r, c ? snap(c, r) : null]; })) }); while (hist.length && sim.t - hist[0].t > 0.4) hist.shift(); }
          if (!thr && sim.ball.kind === 'air' && sim.ball.target && one?.has(sim.ball.target)) {
            const r = sim.ball.target, c = corner(Math.sign(r.pos.y - sim.ballY)); if (!c) { thr = 'skip'; return; }
            const rt = r.behavior?.fallback?.route ?? r.behavior?.route; const back = hist.find((h) => h.t >= sim.t - 0.3);
            thr = { r, c, route: rt?.id ?? '?', at: snap(c, r), pre: back?.d.get(r) ?? null };
          } else if (!thr && sim.ball.kind === 'air') thr = 'skip';
          if (thr && thr !== 'skip' && !arr && sim.ball.kind !== 'air') arr = { near: Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - thr.r.pos.x, d.pos.y - thr.r.pos.y))) };
          if (thr && thr !== 'skip' && !cat && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier === thr.r) { tCatch = sim.t; const c = thr.c, r = thr.r; const L = Math.hypot(r.pos.x - c.pos.x, r.pos.y - c.pos.y) || 1; cat = { dist: L, toward: (c.vel.x * (r.pos.x - c.pos.x) + c.vel.y * (r.pos.y - c.pos.y)) / L, depth: dpt(r.pos) }; }
          tEnd = sim.t;
        };
        const res = sim.run();
        if (!thr || thr === 'skip') continue;
        rows.push({ route: thr.route, at: thr.at, pre: thr.pre, cat, near: arr?.near ?? null, cmp: !!sim.stats.completed, yards: res.yards ?? 0, yac: cat ? (res.yards ?? 0) - cat.depth : null, toEnd: tCatch >= 0 ? tEnd - tCatch : null });
      }
const q = (v: any[], p: number) => { const a = v.filter((x) => x !== null && Number.isFinite(x)).sort((x: number, y: number) => x - y); return a.length ? a[Math.floor(p * (a.length - 1))].toFixed(2) : '-'; };
const fr = (R: any[], f: (r: any) => boolean) => (R.filter(f).length / Math.max(1, R.length)).toFixed(2);
const row = (lab: string, R: any[]) => { if (!R.length) return; const C = R.filter((r) => r.cat);
  console.log(`${lab.padEnd(22)} throws ${String(R.length).padStart(4)} comp ${fr(R, (r) => r.cmp)} yd/throw ${(R.reduce((a, r) => a + r.yards, 0) / R.length).toFixed(1)} YAC p50 ${q(C.map((r) => r.yac), .5)} | nearest at arrival p50 ${q(R.map((r) => r.near), .5)}`);
  for (const [k, f] of [['-0.3 s', (r: any) => r.pre], ['throw', (r: any) => r.at]] as const) { const S = R.map(f).filter(Boolean);
    console.log(`    corner at ${k.padEnd(6)} dist p50 ${q(S.map((s: any) => s.dist), .5)} cushion p50 ${q(S.map((s: any) => s.cushion), .5)} | depth velocity p50 ${q(S.map((s: any) => s.vDepth), .5)} (requested ${q(S.map((s: any) => s.qDepth), .5)}) | sinking (>0.5) ${fr(S, (s: any) => s.vDepth > 0.5)} driving (<-0.5) ${fr(S, (s: any) => s.vDepth < -0.5)} | closing p50 ${q(S.map((s: any) => s.close), .5)}`); }
  if (C.length) console.log(`    at the catch            dist p50 ${q(C.map((r) => r.cat.dist), .5)} speed toward #1 p50 ${q(C.map((r) => r.cat.toward), .5)} | catch to play end p50/p90 ${q(C.map((r) => r.toEnd), .5)}/${q(C.map((r) => r.toEnd), .9)} s`);
  const L: Record<string, number> = {}; for (const r of R) L[r.at.label] = (L[r.at.label] ?? 0) + 1;
  console.log(`    label at the throw: ${Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${(v / R.length).toFixed(2)}`).join(', ')}`); };
if (!VERT) { row('all throws to #1', rows); row('hitch / curl / stick', rows.filter((r) => QUICK.has(r.route))); row('deep (go/fade/seam/post/corner)', rows.filter((r) => DEEP.has(r.route))); }
else { row('all throws to #1', rows); row('deep (go/fade/seam/post/corner)', rows.filter((r) => DEEP.has(r.route))); row('quick (hitch/curl)', rows.filter((r) => QUICK.has(r.route))); row('other', rows.filter((r) => !DEEP.has(r.route) && !QUICK.has(r.route))); }
