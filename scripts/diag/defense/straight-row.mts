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
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)).slice(0, 30))
  for (const coverage of ['cover2', 'cover3', 'cover4']) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation: 'gun_doubles_11', flip })); } catch { continue; }
    let C: any = null, tc = 0; const watch = new Map<any, any>();
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
        w.log.push({ t, sp: Math.hypot(d.vel.x, d.vel.y), want: it?.vel ? Math.hypot(it.vel.x, it.vel.y) : NaN, support: d.body.support?.state ?? '-', load: d.body.sprintLoad ?? 0, trunk: (d.body.trunk ?? 0) * 180 / Math.PI, energy: d.body.energy, effort: it?.effort ?? 1 });
        if (w.intent) { stepBody(w.clone, w.intent, sim.dt); w.alone.push(Math.hypot(w.clone.vel.x, w.clone.vel.y)); }
      }
    };
    sim.run();
    for (const w of watch.values()) if (w.log.length && w.log[w.log.length - 1].t >= 0.45) rows.push(w);
  }
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : '-'; };
const at = (w: any, t: number) => w.log.find((l: any) => l.t >= t - 1e-6);
console.log(`straight-line row, unbroken for 0.5 s: n ${rows.length}; v0 p50 ${q(rows.map((w) => w.v0), .5)}, vmax ${q(rows.map((w) => w.vmax), .5)}, tau ${q(rows.map((w) => w.tau), .5)}`);
for (const t of [0.25, 0.5]) {
  const k = Math.round(t / (rows[0]?.log[1]?.t - rows[0]?.log[0]?.t || 1 / 60));
  const world = rows.map((w) => at(w, t)?.sp), alone = rows.map((w) => w.alone[Math.min(w.alone.length - 1, w.log.findIndex((l: any) => l.t >= t - 1e-6))]);
  const curve = rows.map((w) => w.vmax - (w.vmax - w.v0) * Math.exp(-t / w.tau));
  const want = rows.map((w) => at(w, t)?.want);
  console.log(`  +${t} s: wanted ${q(want, .5)} | world ${q(world, .5)} | same body stepped alone (stepBody, intent held) ${q(alone, .5)} | sprint curve from v0 ${q(curve, .5)}`);
}
const states: Record<string, number> = {}; for (const w of rows) for (const l of w.log) states[l.support] = (states[l.support] ?? 0) + 1;
const tot = Object.values(states).reduce((a, b) => a + b, 0);
console.log(`  tick log over the 0.5 s: support state ${Object.entries(states).map(([k, v]) => `${k} ${(v / tot).toFixed(2)}`).join(', ')}; sprint load p50 ${q(rows.flatMap((w) => w.log.map((l: any) => l.load)), .5)}; trunk twist p50 ${q(rows.flatMap((w) => w.log.map((l: any) => Math.abs(l.trunk))), .5)} deg; energy p50 ${q(rows.flatMap((w) => w.log.map((l: any) => l.energy)), .5)}; effort p50 ${q(rows.flatMap((w) => w.log.map((l: any) => l.effort)), .5)}`);
