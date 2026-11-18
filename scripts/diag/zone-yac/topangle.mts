// Sim counterpart of topangle-nfl.py (same population as zone-yac2: cover2/3/4/6, non-screen, doubles/trips, seeds, flip).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { writeFileSync } = await import('node:fs');
const SEEDS = Number(process.argv[2] ?? 3); const out: any[] = [];
const ang = (vx: number, vy: number, tx: number, ty: number) => { let a = (Math.atan2(vy, vx) - Math.atan2(ty, tx)) * 180 / Math.PI; while (a > 180) a -= 360; while (a < -180) a += 360; return Math.abs(a); };
for (const cov of ['cover2', 'cover3', 'cover4', 'cover6']) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), los = sim.los, N = (p: any) => ({ x: (p.x - los) * dir, y: p.y });
    let C: any = null, tc = -1; const fr: any[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; }
      if (C) fr.push({ t: sim.t - tc, c: N(C.pos), d: sim.defense.map((d: any) => ({ s: d.slot, p: N(d.pos), v: { x: d.vel.x * dir, y: d.vel.y } })) }); };
    let r: any; try { r = sim.run(); } catch { continue; }
    if (!C || !sim.stats.completed || (sim.stats.airYards ?? 0) < 10 || fr.length < 2) continue;
    const at = (t: number) => fr.find((q: any) => q.t >= t - 1e-6) ?? fr[fr.length - 1];
    const f0 = fr[0], f5 = at(0.5), f15 = at(1.5);
    if (f5 === fr[fr.length - 1]) continue;
    for (const d0 of f0.d) { const dx = d0.p.x - f0.c.x, dd = Math.hypot(dx, d0.p.y - f0.c.y); if (dx <= 1 || dd < 3 || dd > 10) continue;
      const d5 = f5.d.find((q: any) => q.s === d0.s);
      const touch = fr.some((q: any) => { const e = q.d.find((z: any) => z.s === d0.s); return Math.hypot(e.p.x - q.c.x, e.p.y - q.c.y) < 1.0; });
      out.push({ cov, concept, slot: d0.s, d: +dd.toFixed(1), dx: +dx.toFixed(1), sp: +Math.hypot(d5.v.x, d5.v.y).toFixed(2), vx: +d5.v.x.toFixed(2),
        now: Math.round(ang(d5.v.x, d5.v.y, f5.c.x - d5.p.x, f5.c.y - d5.p.y)), ahead: Math.round(ang(d5.v.x, d5.v.y, f15.c.x - d5.p.x, f15.c.y - d5.p.y)),
        touch, yac: +(fr[fr.length - 1].c.x - f0.c.x).toFixed(1) }); }
  }
writeFileSync(process.argv[3], JSON.stringify(out)); console.log('rows', out.length);
