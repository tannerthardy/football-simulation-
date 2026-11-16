// Why underneath zone defenders slow into the throw (Integration census (c), after prethrow_motion.py: NFL underneath
// LB 3.05 -> 3.34 yd/s from -0.5 s to the throw, ours 2.93 -> 2.69). Staged: every pass concept but screens vs zone
// calls, two formations, seeds, both flips. Every zone defender 2-9 yd off at the snap. At -0.5 s and at the throw:
// his technique label, requested and achieved speed, requested and achieved depth velocity (+ = away from the line).
// Rows: decelerators (achieved speed down 0.5+ yd/s over the half second), holders, accelerators (up 0.5+); for each,
// the label transitions (label at -0.5 -> label at the throw) and request vs achieved.
//   node --import tsx scripts/diag/defense/decel-census.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const req = new Map<any, any>(); const hist: any[] = [];
        let snap: Map<any, number> | null = null, tThrow = -1;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snap) snap = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (tThrow >= 0) return;
          hist.push({ t: sim.t, d: new Map(sim.defense.map((d: any) => { const r = req.get(d); return [d, { got: Math.hypot(d.vel.x, d.vel.y), gx: d.vel.x * dir, req: r?.vel ? Math.hypot(r.vel.x, r.vel.y) : NaN, rx: r?.vel ? r.vel.x * dir : NaN, label: `${d.behavior?.constructor?.name ?? '-'}:${(r && facingTechnique(r)?.label) ?? '-'}` }]; })) });
          while (hist.length && sim.t - hist[0].t > 0.6) hist.shift();
          if (sim.ball.kind === 'air') {
            tThrow = sim.t;
            if (tThrow < 1.0) return;
            const at = (off: number) => hist.reduce((b: any, x: any) => (!b || Math.abs(x.t - (tThrow + off)) < Math.abs(b.t - (tThrow + off)) ? x : b), null);
            const h0 = at(-0.5), h1 = at(0);
            for (const d of sim.defense) {
              const s0 = snap!.get(d) ?? 0; if (s0 < 2 || s0 >= 9 || /^(DE|DT|NT)/.test(d.slot)) continue;
              if (!/Zone|CoverageDefender/.test(d.behavior?.constructor?.name ?? '')) continue;
              const a = h0?.d.get(d), b = h1?.d.get(d); if (!a || !b) continue;
              rows.push({ a, b, dv: b.got - a.got });
            }
          }
        };
        sim.run();
      }
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : '-'; };
console.log(`underneath zone defenders (2-9 yd off at the snap), throws at 1.0 s or later: n ${rows.length}`);
console.log(`  speed p50 at -0.5 s ${q(rows.map((r) => r.a.got))} -> throw ${q(rows.map((r) => r.b.got))} | requested ${q(rows.map((r) => r.a.req))} -> ${q(rows.map((r) => r.b.req))} | depth vel ${q(rows.map((r) => r.a.gx))} -> ${q(rows.map((r) => r.b.gx))}`);
for (const [lab, f] of [['decelerating (-0.5+ yd/s)', (r: any) => r.dv <= -0.5], ['holding', (r: any) => Math.abs(r.dv) < 0.5], ['accelerating (+0.5+)', (r: any) => r.dv >= 0.5]] as const) {
  const S = rows.filter(f);
  console.log(`${lab.padEnd(26)} ${(S.length / rows.length).toFixed(2)} | speed ${q(S.map((r) => r.a.got))} -> ${q(S.map((r) => r.b.got))} | requested ${q(S.map((r) => r.a.req))} -> ${q(S.map((r) => r.b.req))} | depth vel requested ${q(S.map((r) => r.a.rx))} -> ${q(S.map((r) => r.b.rx))}`);
  const by: Record<string, any[]> = {}; for (const r of S) (by[`${r.a.label} -> ${r.b.label}`] ??= []).push(r);
  for (const [k, v] of Object.entries(by).sort((x, y) => y[1].length - x[1].length).slice(0, 8))
    console.log(`     ${k.padEnd(62)} ${(v.length / S.length).toFixed(2)} | speed ${q(v.map((r) => r.a.got))} -> ${q(v.map((r) => r.b.got))} | req ${q(v.map((r) => r.a.req))} -> ${q(v.map((r) => r.b.req))}`);
}
