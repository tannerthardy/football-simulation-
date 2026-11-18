// Sim side of zone-yac-nfl.py: natural dropbacks vs zone (cover2/3/4/6), all non-screen concepts, doubles/trips,
// seeds, flip; completions with 10+ air yards. Same fields.
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const SEEDS = Number(process.argv[2] ?? 3); const out: any[] = []; const TOUCH = process.env.TOUCH ? Number(process.env.TOUCH) : 1.0;
for (const cov of (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(',')) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id) && (!process.env.CONCEPTS || process.env.CONCEPTS.split(',').includes(id))))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), los = sim.los;
    let C: any = null; const fr: any[] = []; let kf = -1;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) C = sim.ball.carrier;
      if (!C || sim.ball.carrier !== C) return;
      fr.push({ t: sim.t, x: (C.pos.x - los) * dir, y: C.pos.y, s: Math.hypot(C.vel.x, C.vel.y), d: sim.defense.map((d: any) => ({ x: (d.pos.x - los) * dir, y: d.pos.y, r: d.profile.radius })) });
      if (kf < 0) { const f = fr[fr.length - 1]; if (f.d.some((q: any) => Math.hypot(q.x - f.x, q.y - f.y) < TOUCH)) kf = fr.length - 1; } };
    let r: any; try { r = sim.run(); } catch { continue; }
    if (!C || !sim.stats.completed || (sim.stats.airYards ?? 0) < 10 || fr.length < 2) continue;
    const f0 = fr[0], nd = f0.d.reduce((a: any, b: any) => Math.hypot(b.x - f0.x, b.y - f0.y) < Math.hypot(a.x - f0.x, a.y - f0.y) ? b : a);
    const dx = nd.x - f0.x, pos = dx > 1 ? 'front' : dx < -1 ? 'behind' : 'level';
    const path = (a: number, b: number) => { let p = 0; for (let i = a + 1; i <= b; i++) p += Math.hypot(fr[i].x - fr[i - 1].x, fr[i].y - fr[i - 1].y); return p; };
    const ke = fr.length - 1, endX = r.endX !== undefined ? (r.endX - los) * dir : fr[ke].x;
    out.push({ cov, concept, formation, seed, flip, pos, ndist: Math.hypot(nd.x - f0.x, nd.y - f0.y), yac: endX - f0.x, untouched: path(0, kf >= 0 ? kf : ke), tfc: kf >= 0 ? fr[kf].t - f0.t : null,
      after: kf >= 0 ? path(kf, ke) : null, contact: kf >= 0, oob: sim.events.some((e: any) => e.type === 'out_of_bounds'), td: sim.events.some((e: any) => e.type === 'touchdown'), s: f0.s, thrT: sim.throwAt - (sim.snapAt ?? 0), flight: fr[0].t - sim.throwAt,
      sl0: Math.min(f0.y, 53.33 - f0.y), slE: Math.min(fr[ke].y, 53.33 - fr[ke].y), endX: fr[ke].x - f0.x,
      lastTouch: (() => { for (let i = ke; i >= 0; i--) if (fr[i].d.some((q: any) => Math.hypot(q.x - fr[i].x, q.y - fr[i].y) < TOUCH)) return +(fr[ke].t - fr[i].t).toFixed(2); return null; })(),
      outward: (() => { const i0 = Math.max(0, fr.findIndex((q: any) => q.t >= fr[ke].t - 1)); const tw = Math.sign(fr[i0].y - 26.67); return +((fr[ke].y - fr[i0].y) * tw).toFixed(2); })() });
  }
writeFileSync(process.argv[3], JSON.stringify(out)); console.log('rows', out.length);
