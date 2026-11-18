// On-time flats (Integration/QB/Coverage, 2026-11-18). Completions to a receiver whose route id contains "flat".
// At the throw and at the catch: the flat defender by rule (a zone defender whose zone name has "flat", on the catcher's
// side of the ball at the throw; else none), his distance to the catcher, depth relative to him (+ = deeper), speed
// toward him; the nearest defender likewise. After the catch: first defender within 1.0 yd (slot, job, time), YAC.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { writeFileSync } = await import('node:fs');
const SEEDS = Number(process.argv[2] ?? 3), out: any[] = [];
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(',');
for (const cov of COVS) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), los = sim.los, N = (p: any) => ({ x: (p.x - los) * dir, y: p.y });
    let thr: any = null, cat: any = null, C: any = null, tc = -1, first: any = null, route = '';
    const job = (d: any) => ({ s: d.slot, k: d.behavior?.kind ?? '', z: d.behavior?.zone ?? '', m: d.behavior?.man?.slot ?? d.behavior?.target?.slot ?? '' });
    const tick = sim.tick.bind(sim);
    const routes = new Map<string, string>();
    sim.tick = () => { tick(); for (const o of sim.offense) { const id = o.behavior?.route?.id; if (id && !routes.has(o.slot)) routes.set(o.slot, id); }
      if (!thr && sim.ball.kind === 'air') { const tg = sim.ball.target; route = tg?.behavior?.route?.id ?? ''; thr = { t: sim.t, tgt: tg?.slot, ty: tg?.pos.y, jobs: sim.defense.map(job) }; }
      const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; route = routes.get(C.slot) ?? '';
        const c = N(C.pos); cat = { c, s: Math.hypot(C.vel.x, C.vel.y), d: sim.defense.map((d: any) => { const p = N(d.pos), v = { x: d.vel.x * dir, y: d.vel.y }, l = Math.hypot(c.x - p.x, c.y - p.y) || 1;
          return { ...job(d), dist: +l.toFixed(1), dx: +(p.x - c.x).toFixed(1), toward: +((v.x * (c.x - p.x) + v.y * (c.y - p.y)) / l).toFixed(1) }; }) }; }
      if (C && !first) { const c = C.pos; const f = sim.defense.find((d: any) => Math.hypot(d.pos.x - c.x, d.pos.y - c.y) < 1.0); if (f) first = { ...job(f), t: +(sim.t - tc).toFixed(2) }; } };
    let r: any; try { r = sim.run(); } catch { continue; }
    if (process.env.DBG && C) console.error(concept, formation, seed, flip, route, sim.stats.completed);
    if (!C || !sim.stats.completed || !/flat/.test(route)) continue;
    
    const rule = cat.d.filter((d: any) => /flat/.test(d.z)).sort((a: any, b: any) => a.dist - b.dist)[0] ?? null;
    const near = [...cat.d].sort((a: any, b: any) => a.dist - b.dist)[0];
    out.push({ cov, concept, formation, seed, flip, route, air: +(sim.stats.airYards ?? 0).toFixed(1), thrT: +(thr.t - (sim.snapAt ?? 0)).toFixed(2), catchY: +cat.c.y.toFixed(1), cs: +cat.s.toFixed(1),
      rule, near, first, yac: +((r.yards ?? 0) - (sim.stats.airYards ?? 0)).toFixed(1), td: sim.events.some((e: any) => e.type === 'touchdown') });
  }
writeFileSync(process.argv[3], JSON.stringify(out)); console.log('rows', out.length);
