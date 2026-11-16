// Needs temporary probe hooks (not committed): in src/sim/behaviors/common.ts goTo() after 't' is built: (globalThis as any).__mv?.(a, t, 'goTo'); at the top of track(): (globalThis as any).__mv?.(a, target, 'track');
// in ZoneCoverage after 'const qbEyes = seenQbEyes(a, sim);': (globalThis as any).__eyes?.(a, qbEyes); before 'if (carryable.length > 0': (globalThis as any).__carry?.(a, this.target, threats, sim.los, carryTo, lm);
// Why seam carries end (Integration, seam B): for each underneath zone defender whose technique leaves a carry
// (open-carry-seam / carry-wall / carry-run-past) for a non-carry technique in the last 0.5 s before the throw, which
// carryable condition his carried receiver failed at that tick in his picture: seen upfield speed <= 4.5, depth past
// carryTo (the coached hand-off), lateral 6+ yd off his landmark, or gone from his threat set; whether the receiver is
// carryable again within 0.3 s (a knife edge, not a perceived end); his achieved speed change over the half second.
//   node --import tsx scripts/diag/defense/carry-end.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const cs = new Map<any, any>();
(globalThis as any).__carry = (a: any, tgt: any, threats: any[], los: number, carryTo: number, lm: any) => {
  const th = threats.find((t) => t.r === tgt);
  cs.set(a, th ? { lm: { ...lm },  vx: th.vel.x, depth: th.pos.x - los, lat: Math.abs(th.pos.y - lm.y), carryTo, ok: th.vel.x > 4.5 && th.pos.x - los > 2 && th.pos.x - los < carryTo && Math.abs(th.pos.y - lm.y) < 6 } : { gone: true, lm: { ...lm } });
};
const rows: any[] = []; const walk: any[] = [];
const isCarry = (l: string) => /open-carry-seam|carry-wall|carry-run-past/.test(l);
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const req = new Map<any, any>(); const hist: any[] = []; let done = false; let snap: Map<any, number> | null = null;
        const dir = sim.attackDir(sim.offense[0].team);
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snap) snap = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { cs.delete(d); const r = u(...q); req.set(d, { r, c: cs.get(d) }); return r; }; b.__h = 1; } }
          tick();
          if (done) return;
          hist.push({ t: sim.t, d: new Map(sim.defense.map((d: any) => { const q = req.get(d); return [d, { pos: { ...d.pos }, vx: d.vel.x * dir, label: (q?.r && facingTechnique(q.r)?.label) ?? '-', c: q?.c, got: Math.hypot(d.vel.x, d.vel.y) }]; })) });
          
          if (sim.ball.kind !== 'air') return;
          done = true; if (sim.t < 1.0) return;
          for (const d of sim.defense) {
            const s0 = snap!.get(d) ?? 0; if (s0 < 2 || s0 >= 9 || /^(DE|DT|NT)/.test(d.slot)) continue;
            if (!/Zone/.test(d.behavior?.constructor?.name ?? '')) continue;
            const H = hist.map((h) => ({ t: h.t, ...h.d.get(d) }));
            const t0 = sim.t - 0.5; const i0 = H.findIndex((h) => h.t >= t0);
            // walk-back: every hand-off with 1.0+ s before the throw
            for (let i = 1; i < H.length; i++) {
              if (!(isCarry(H[i - 1].label) && !isCarry(H[i].label))) continue;
              if (sim.t - H[i].t < 1.0) break;
              const lm = H[i].c?.lm; if (!lm) break;
              const at = (dt: number) => H.find((h) => h.t >= H[i].t + dt);
              const p5 = at(0.5), p10 = at(1.0);
              const dl = (h: any) => Math.hypot(h.pos.x - lm.x, h.pos.y - lm.y);
              walk.push({ dDepth5: (p5.pos.x - H[i].pos.x) * dir, dDepth10: (p10.pos.x - H[i].pos.x) * dir, vx5: p5.vx, vx10: p10.vx,
                lm0: dl(H[i]), lm5: dl(p5), lm10: dl(p10), lmBehind: (H[i].pos.x - lm.x) * dir, to: H[i].label });
              break;
            }
            for (let i = Math.max(1, i0); i < H.length; i++) {
              if (!(isCarry(H[i - 1].label) && !isCarry(H[i].label))) continue;
              const c = H[i].c ?? { gone: true };
              const why = c.gone ? 'gone from his threats' : c.ok ? 'still carryable (other branch won)' : c.vx <= 4.5 ? 'seen speed <= 4.5' : c.depth >= c.carryTo ? 'past carryTo (hand-off)' : c.lat >= 6 ? 'lateral 6+' : 'depth < 2';
              const back = H.slice(i + 1).some((h) => h.t - H[i].t <= 0.3 && isCarry(h.label));
              rows.push({ why, back, to: H[i].label, vx: c.vx, dGot: H[H.length - 1].got - (H[i0 >= 0 ? i0 : 0]?.got ?? 0) });
              break;
            }
          }
        };
        sim.run();
      }
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
console.log(`carry ends in the last 0.5 s before the throw: n ${rows.length}`);
const by: Record<string, any[]> = {}; for (const r of rows) (by[r.why] ??= []).push(r);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  const to: Record<string, number> = {}; for (const r of v) to[r.to] = (to[r.to] ?? 0) + 1;
  console.log(`${k.padEnd(36)} ${(v.length / rows.length).toFixed(2)} | carryable again within 0.3 s ${v.filter((r) => r.back).length}/${v.length} | seen speed p50 ${med(v.map((r) => r.vx))} | achieved change p50 ${med(v.map((r) => r.dGot))} | to ${Object.entries(to).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l, n]) => `${l} ${n}`).join(', ')}`);
}
console.log(`hand-offs from a carry with 1.0+ s before the throw: n ${walk.length}; he was p50 ${med(walk.map((w) => w.lmBehind))} yd deeper than his landmark at the hand-off`);
console.log(`  depth change since the hand-off (+ deeper): +0.5 s ${med(walk.map((w) => w.dDepth5))}, +1.0 s ${med(walk.map((w) => w.dDepth10))} | depth velocity +0.5 s ${med(walk.map((w) => w.vx5))}, +1.0 s ${med(walk.map((w) => w.vx10))}`);
console.log(`  distance to landmark: at hand-off ${med(walk.map((w) => w.lm0))}, +0.5 s ${med(walk.map((w) => w.lm5))}, +1.0 s ${med(walk.map((w) => w.lm10))} | walking back (coming up at 1+ yd/s at +1.0 s and 1+ yd nearer the landmark): ${walk.filter((w) => w.vx10 < -1 && w.lm10 < w.lm0 - 1).length}/${walk.length}`);
