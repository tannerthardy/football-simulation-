// Integration's checks on rally's straight-line row (defenders within 8 yd at a short catch, velocity within 45 deg of
// the line to the carrier, back to the QB): (b) the same body stepped alone (stepBody, his intent held) against what the
// world gave him, and the sprint curve v(t) = vmax - (vmax - v0) exp(-t / tau); (c) his state in the world tick log
// (support state, sprint load, trunk twist, energy) over the first 0.5 s.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const rows: any[] = []; const cmp: any[] = []; const lastFd = new Map<any, any>(); (globalThis as any).__fd = (b: any, r: any) => lastFd.set(b, r);
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)).slice(0, 30))
  for (const coverage of ['cover2', 'cover3', 'cover4']) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation: 'gun_doubles_11', flip })); } catch { continue; }
    let C: any = null, tc = 0; const watch = new Map<any, any>();
    const wstep = sim.world.step.bind(sim.world);
    sim.world.step = (intents: any[], dt: number) => {
      const pre = new Map<any, any>();
      if (C && C !== 'skip') for (const [d] of watch) { const it = intents[d.idx]; if (!it || it.free) continue; pre.set(d, { clone: { ...d.body, pos: { ...d.body.pos }, vel: { ...d.body.vel }, support: d.body.support ? { ...d.body.support } : undefined }, it, v0: { ...d.body.vel } }); }
      const r = wstep(intents, dt);
      for (const [d, q] of pre) { const t = sim.t - tc; if (t > 0.5) continue; stepBody(q.clone, q.it, dt); const v1 = d.body.vel, c = q.clone.vel;
        const sp0 = Math.hypot(q.v0.x, q.v0.y); const gw = Math.hypot(v1.x, v1.y) - sp0, gs = Math.hypot(c.x, c.y) - sp0;
        cmp.push({ t, gw, gs, off: Math.abs(((Math.atan2(q.it.vel.y, q.it.vel.x) - Math.atan2(q.v0.y, q.v0.x)) * 180 / Math.PI + 540) % 360 - 180) }); }
      return r;
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held') {
        C = sim.ball.carrier; tc = sim.t; const depth = (C.pos.x - sim.los) * sim.attackDir(C.team);
        if (depth < 0 || depth > 12) { C = 'skip'; return; }
        for (const d of sim.defense) {
          const lx = C.pos.x - d.pos.x, ly = C.pos.y - d.pos.y, L = Math.hypot(lx, ly), sp = Math.hypot(d.vel.x, d.vel.y);
          if (L > 8 || L < 1.5 || sp < 1) continue;
          if (ang(Math.atan2(d.vel.y, d.vel.x), Math.atan2(ly, lx)) >= 45) continue;
          if (ang(d.facing, Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x)) < 90) continue;
          const it = sim.intents[d.idx];
          const clone = { ...d.body, pos: { ...d.body.pos }, vel: { ...d.body.vel }, support: d.body.support ? { ...d.body.support } : undefined };
          watch.set(d, { v0: sp, vmax: d.profile.vmax, tau: d.profile.tau, clone, intent: it ? { ...it, vel: { ...it.vel } } : null, log: [] as any[], alone: [] as number[] });
        }
      }
      if (C && C !== 'skip') for (const [d, w] of watch) {
        const t = sim.t - tc; if (t > 0.55) continue;
        if (sim.bond?.tacklers?.includes(d) || Math.hypot(C.pos.x - d.pos.x, C.pos.y - d.pos.y) < 1) { w.stopped ??= t; continue; }
        const it = sim.intents[d.idx];
        w.log.push({ fd: lastFd.get(d.body), t, sp: Math.hypot(d.vel.x, d.vel.y), want: it?.vel ? Math.hypot(it.vel.x, it.vel.y) : NaN, support: d.body.support?.state ?? '-', load: d.body.sprintLoad ?? 0, trunk: (d.body.trunk ?? 0) * 180 / Math.PI, energy: d.body.energy, effort: it?.effort ?? 1 });
        if (w.intent) { stepBody(w.clone, w.intent, sim.dt); w.alone.push(Math.hypot(w.clone.vel.x, w.clone.vel.y)); }
      }
    };
    sim.run();
    for (const w of watch.values()) if (w.log.length && w.log[w.log.length - 1].t >= 0.45) rows.push(w);
  }
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
const fmt = (x: number) => Number.isFinite(x) ? x.toFixed(2) : '-';
const deg = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
console.log(`n ${rows.length} defenders`);
// per tick, first 0.5 s: the planned force's component along his velocity, the angle of the plan off his velocity, of his hips off the plan, and the speed he gained
const T = rows.flatMap((w) => w.log.filter((l: any) => l.fd && l.t < 0.5).map((l: any, k: number, arr: any[]) => ({ ...l, dsp: k + 1 < arr.length ? (arr[k + 1].sp - l.sp) / Math.max(arr[k + 1].t - l.t, 1e-6) : NaN })));
const rec = T.map((l: any) => { const f = l.fd, sp = Math.hypot(f.vx, f.vy), lm = Math.hypot(f.lx, f.ly);
  return { demand: lm, along_v: sp > 1e-6 ? (f.lx * f.vx + f.ly * f.vy) / sp : NaN, planOffV: sp > 1e-6 && lm > 1e-6 ? deg(Math.atan2(f.ly, f.lx), Math.atan2(f.vy, f.vx)) : NaN,
    hipsOffPlan: lm > 1e-6 ? deg(f.fac, Math.atan2(f.ly, f.lx)) : NaN, hipsOffV: sp > 1e-6 ? deg(f.fac, Math.atan2(f.vy, f.vx)) : NaN, dsp: l.dsp / 0.9144, strength: f.strength, cap: f.capacity, a: f.a, along: f.along, t: l.t }; });
for (const k of ['demand', 'along_v', 'planOffV', 'hipsOffPlan', 'hipsOffV', 'dsp', 'strength', 'cap', 'a', 'along']) console.log(`${k.padEnd(12)} p10 ${fmt(q(rec.map((r: any) => r[k]), .1))} p50 ${fmt(q(rec.map((r: any) => r[k]), .5))} p90 ${fmt(q(rec.map((r: any) => r[k]), .9))}`);
console.log('(demand, along_v, strength, cap in m/s^2; dsp the realized speed gain, m/s^2; angles in deg)');
const small = rec.filter((r: any) => r.planOffV < 15), big = rec.filter((r: any) => r.planOffV >= 15);
console.log(`plan within 15 deg of velocity: n ${small.length}, realized dsp p50 ${fmt(q(small.map((r: any) => r.dsp), .5))} vs demand along v p50 ${fmt(q(small.map((r: any) => r.along_v), .5))}; plan 15+ deg off: n ${big.length}, dsp p50 ${fmt(q(big.map((r: any) => r.dsp), .5))} vs along_v p50 ${fmt(q(big.map((r: any) => r.along_v), .5))}`);

// World against stepBody, the same state and intent each tick (dt = the world's step): the speed each one gains
const med = (v: number[]) => q(v, .5);
const bins: [number, number][] = [[0, 15], [15, 30], [30, 60], [60, 180]];
console.log('per-tick speed gain (yd/s per step) World vs stepBody from the same pre-step state and intent, by angle of the requested velocity off his velocity:');
for (const [lo, hi] of bins) { const R = cmp.filter((c) => c.off >= lo && c.off < hi); console.log(`  ${lo}-${hi} deg: n ${R.length}, World ${fmt(med(R.map((c) => c.gw)))} stepBody ${fmt(med(R.map((c) => c.gs)))} (means ${fmt(R.reduce((a, c) => a + c.gw, 0) / Math.max(R.length, 1))} / ${fmt(R.reduce((a, c) => a + c.gs, 0) / Math.max(R.length, 1))})`); }
