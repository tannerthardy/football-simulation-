// Diagnosis (Integration, 2026-11-25): when could a rusher see the coached cue for getting his hands up -- the passer
// setting his feet (his seen speed < 1 yd/s after his drop above 2 yd/s), the passer in the rusher's head cone, at the
// rusher's own perception delay -- against the load he reads now (release belief loadingAt). Bat-time panel: rushers
// the ball passes within reach of in its first 0.4 s; plus every rusher. Times from the release.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const RB: any = await import(`${W}/src/sim/release-belief.ts`);
const { inHeadCone } = await import(`${W}/src/sim/head.ts`);
const rows: any[] = [];
for (const cov of ['cover3', 'cover1']) for (const concept of ['curl_flat', 'stick', 'slant_flat', 'smash', 'mesh']) for (let seed = 1; seed <= 8; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: seed % 2 === 0 }));
  let rel = -1, trueSet = -1, qbFast = false; const st = new Map<number, any>(); const near = new Set<number>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const q = sim.qb;
    const qs = Math.hypot(q.vel.x, q.vel.y); if (qs > 2) qbFast = true; else if (qbFast && qs < 1 && rel < 0) trueSet = sim.t, qbFast = false;
    for (const d of sim.defense) if (['rush', 'blitz'].includes(d.behavior?.kind) && rel < 0) {
      const r = st.get(d.idx) ?? { fast: false, first: null, last: null, load: null }; st.set(d.idx, r);
      const s = sim.see(d, q), sp = Math.hypot(s.vel.x, s.vel.y), cone = inHeadCone(d.head ?? d.body.facing, Math.atan2(s.pos.y - d.pos.y, s.pos.x - d.pos.x));
      if (sp > 2) r.fast = true; else if (r.fast && sp < 1 && cone) { r.fast = false; r.first ??= sim.t; r.last = sim.t; }
      if (r.load === null && RB.releaseBelief(sim, d).loadingAt !== undefined) r.load = sim.t; }
    if (rel < 0 && sim.ball.kind === 'air') rel = sim.t;
    if (rel >= 0 && sim.ball.kind === 'air' && sim.t - rel <= 0.4) { const b = sim.ball.flight.pos;
      for (const d of sim.defense) if (st.has(d.idx) && Math.hypot(b.x - d.pos.x, b.y - d.pos.y) <= d.profile.reach) near.add(d.idx); }
    if (sim.t > 8 || (rel >= 0 && sim.t - rel > 0.5)) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  if (rel < 0) continue;
  for (const [i, r] of st) rows.push({ near: near.has(i), eng: !!sim.agents[i].engagement, set1: r.first === null ? null : r.first - rel, setL: r.last === null ? null : r.last - rel, load: r.load === null ? null : r.load - rel, trueSet: trueSet < 0 ? null : trueSet - rel });
}
const q = (v: any[], p: number) => { const s = v.filter((x: any) => x !== null && Number.isFinite(x)).sort((a: number, b: number) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : NaN; };
for (const [k, f] of [['ball passes within reach', (r: any) => r.near], ['all rushers', (_: any) => true]] as const) { const R = rows.filter(f as any);
  console.log(`${k}: n ${R.length} | passer's true set (from release) p25/50/75 ${q(R.map(r => r.trueSet), .25)} ${q(R.map(r => r.trueSet), .5)} ${q(R.map(r => r.trueSet), .75)}`
    + ` | seen set, first: had ${R.filter(r => r.set1 !== null).length} p50 ${q(R.map(r => r.set1), .5)} | seen set, last: p25/50/75 ${q(R.map(r => r.setL), .25)} ${q(R.map(r => r.setL), .5)} ${q(R.map(r => r.setL), .75)}`
    + ` | load read: had ${R.filter(r => r.load !== null).length} p25/50/75 ${q(R.map(r => r.load), .25)} ${q(R.map(r => r.load), .5)} ${q(R.map(r => r.load), .75)}`
    + ` | earlier by (load - last set) p25/50/75 ${q(R.filter(r => r.load !== null && r.setL !== null).map(r => r.load - r.setL), .25)} ${q(R.filter(r => r.load !== null && r.setL !== null).map(r => r.load - r.setL), .5)} ${q(R.filter(r => r.load !== null && r.setL !== null).map(r => r.load - r.setL), .75)}`); }
