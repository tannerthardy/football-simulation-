// PA_HINGE attempt 2 check (2026-11-16): when each lineman reaches his run-look step spot (within 0.2 yd), and how close he gets.
// usage: CONCEPT_DROPS=1 QB_FOOTWORK=3|19 PA_HINGE=1 node --import tsx scripts/diag/pass-operators/pa-hinge-steps.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { paFakeSide } = await import(`${W}/src/sim/pa-look.ts`);
const R: any[] = [];
for (const concept of ['pa_post_dig', 'pa_shot']) for (const coverage of ['cover1', 'cover3']) for (const roster of [3, 7]) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
  const ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
  const dir = sim.attackDir(sim.offense[0].team); const home = new Map(ol.map((a: any) => [a, { x: a.pos.x, y: a.pos.y }]));
  const r = new Map(ol.map((a: any) => [a, { min: 9, at: null as any, minT: 0 }]));
  while (sim.phase === 'live' && sim.t < 1.6) { sim.tick(); const side = paFakeSide.get(sim) ?? 0;
    for (const a of ol) { const h: any = home.get(a), z: any = r.get(a);
      const end = a.tags.has('pa-hinge'); const sp = end ? { x: h.x - dir * 0.9, y: h.y + side * 0.45 } : { x: h.x, y: h.y + side * 0.9 };
      const d = Math.hypot(a.pos.x - sp.x, a.pos.y - sp.y); if (d < z.min) { z.min = d; z.minT = sim.t; } if (z.at === null && d <= 0.2) z.at = sim.t; } }
  for (const [a, z] of r) R.push({ slot: a.slot, ...z });
}
const q = (v: number[]) => v.length ? v.slice().sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)].toFixed(2) : '-';
for (const s of ['LT', 'LG', 'C', 'RG', 'RT']) { const X = R.filter((r) => r.slot === s);
  console.log(s, 'reached within 0.2', X.filter((r) => r.at !== null).length, '/', X.length, 'at p50', q(X.filter((r) => r.at !== null).map((r) => r.at)), '| closest p50', q(X.map((r) => r.min)), 'at', q(X.map((r) => r.minT))); }
