// Needs temporary probe hooks (not committed): in src/sim/behaviors/common.ts goTo() after 't' is built: (globalThis as any).__mv?.(a, t, 'goTo'); at the top of track(): (globalThis as any).__mv?.(a, target, 'track');
// in ZoneCoverage after 'const qbEyes = seenQbEyes(a, sim);': (globalThis as any).__eyes?.(a, qbEyes); before 'if (carryable.length > 0': (globalThis as any).__carry?.(a, this.target, threats, sim.los, carryTo, lm);
// Zone-settle request reversals (Tools 3724be1a): per tick in the last 0.5 s before the throw, each underneath zone
// defender's technique label, goTo/track target, distance to it, request vector. A reversal = two ticks whose request
// heading differs by 90+ deg (requests over 0.3 yd/s). For each first reversal: label before/after, target move between
// the ticks, distance before, whether the target crossed him (target-relative bearing flipped with target moving < 0.5 yd).
//   node --import tsx scripts/diag/defense/settle-flip.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
let cur = new Map<any, any>();
(globalThis as any).__mv = (a: any, t: any, kind: string) => { cur.set(a, { x: t.x, y: t.y, kind }); };
const eyes = new Map<any, any>(); (globalThis as any).__eyes = (a: any, r: any) => eyes.set(a, r ? r.slot : 'none');
const out: any[] = []; let settlers = 0; const steady: number[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const hist: any[] = []; let snap: Map<any, number> | null = null; let done = false;
        const req = new Map<any, any>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snap) snap = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { cur.delete(d); const r = u(...q); req.set(d, { r, tg: cur.get(d) }); return r; }; b.__h = 1; } }
          tick();
          if (done) return;
          hist.push({ t: sim.t, d: new Map(sim.defense.map((d: any) => { const q = req.get(d); const r = q?.r; return [d, { pos: { ...d.pos }, vel: r?.vel ? { ...r.vel } : null, tg: q?.tg, ey: eyes.get(d) ?? '-', got: Math.hypot(d.vel.x, d.vel.y), label: `${d.behavior?.constructor?.name ?? '-'}:${(r && facingTechnique(r)?.label) ?? '-'}`, sub: d.behavior?.target?.slot ?? '-' }]; })) });
          while (hist.length && sim.t - hist[0].t > 0.55) hist.shift();
          if (sim.ball.kind !== 'air') return;
          done = true; if (sim.t < 1.0) return;
          for (const d of sim.defense) {
            const s0 = snap!.get(d) ?? 0; if (s0 < 2 || s0 >= 9 || /^(DE|DT|NT)/.test(d.slot)) continue;
            if (!/Zone/.test(d.behavior?.constructor?.name ?? '')) continue;
            settlers++;
            const H = hist.map((h) => h.d.get(d)).filter((x: any) => x?.vel);
            const head = (v: any) => Math.atan2(v.y, v.x);
            let rev = false; const H0x = H[0], H1x = H[H.length - 1]; if (H0x && H1x) steady.push(H1x.got - H0x.got);
            for (let i = 1; i < H.length; i++) {
              const p = H[i - 1], q = H[i];
              if (Math.hypot(p.vel.x, p.vel.y) < 0.3 && Math.hypot(q.vel.x, q.vel.y) < 0.3) continue;
              let dh = Math.abs(head(q.vel) - head(p.vel)); if (dh > Math.PI) dh = 2 * Math.PI - dh;
              if (dh < Math.PI / 2) continue;
              const tm = p.tg && q.tg ? Math.hypot(q.tg.x - p.tg.x, q.tg.y - p.tg.y) : NaN;
              const dist = p.tg ? Math.hypot(p.tg.x - p.pos.x, p.tg.y - p.pos.y) : NaN;
              const distQ = q.tg ? Math.hypot(q.tg.x - q.pos.x, q.tg.y - q.pos.y) : NaN;
              const sp = (v: any) => Math.hypot(v.x, v.y);
              const cls = p.label !== q.label ? 'branch switch' : !(tm >= 0) ? 'no target' : tm > 0.5 ? 'target jumped' : 'target crossed him';
              // what moved the target: lateral (eyes) vs depth (settle cap)
              const dx = p.tg && q.tg ? Math.abs(q.tg.x - p.tg.x) : NaN, dy = p.tg && q.tg ? Math.abs(q.tg.y - p.tg.y) : NaN;
              const H0 = H[0], H1 = H[H.length - 1];
              out.push({ eyes: p.ey === q.ey ? 'same' : `${p.ey === 'none' ? 'none' : 'R'}->${q.ey === 'none' ? 'none' : (p.ey === 'none' ? 'R' : 'R2')}`, dGot: H1.got - H0.got, cls, from: p.label, to: q.label, tm, dist, distQ, s0: sp(p.vel), s1: sp(q.vel), dx, dy, kind: `${p.tg?.kind}->${q.tg?.kind}` });
              break;
            }
          }
        };
        sim.run();
      }
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
console.log(`underneath zone defenders (2-9 yd), throws >= 1.0 s: n ${settlers}; with a 90+ deg request reversal in the last 0.5 s: ${out.length} (${(out.length / settlers).toFixed(2)})`);
const by: Record<string, any[]> = {}; for (const r of out) (by[r.cls] ??= []).push(r);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${k.padEnd(20)} ${(v.length / out.length).toFixed(2)} | speed ${med(v.map((r) => r.s0))} -> ${med(v.map((r) => r.s1))} | dist to target before ${med(v.map((r) => r.dist))} after ${med(v.map((r) => r.distQ))} | target move ${med(v.map((r) => r.tm))} (depth ${med(v.map((r) => r.dx))}, lateral ${med(v.map((r) => r.dy))})`);
  const ey: Record<string, number> = {}; for (const r of v) ey[r.eyes] = (ey[r.eyes] ?? 0) + 1;
  console.log(`     achieved speed change over the half second p50 ${med(v.map((r) => r.dGot))} | eyes at the flip: ${Object.entries(ey).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  const lab: Record<string, any[]> = {}; for (const r of v) (lab[`${r.from} -> ${r.to}`] ??= []).push(r);
  for (const [l, R] of Object.entries(lab).sort((a, b) => b[1].length - a[1].length).slice(0, 12)) console.log(`     ${l.padEnd(64)} ${String(R.length).padStart(4)} | achieved change ${med(R.map((r) => r.dGot))} | target move ${med(R.map((r) => r.tm))} | eyes same ${R.filter((r) => r.eyes === 'same').length}`);
}
console.log(`all defenders: achieved speed change over the half second p50 ${med(steady)}`);
