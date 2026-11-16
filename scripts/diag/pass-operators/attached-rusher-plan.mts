// Ends over / near an attached end (within 2.5 yd across, 3 deep at the snap), by slot and rush plan: how many touch the
// attached end before 2 s (staged double_outs). 2026-11-16: DE_S power 96 / 96, DE_S speed 0 / 96, DE_W 0 / 48.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const C: any = {};
for (const formation of ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12']) for (const coverage of ['cover1', 'cover3', 'cover2', 'cover4']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'double_outs', seed, roster, formation, flip: false }));
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const de = sim.defense.filter((d: any) => d.slot === 'DE_S' || d.slot === 'DE_W');
  const hit = new Set<string>();
  const near = (a: any) => de.filter((d: any) => Math.abs(d.pos.y - a.pos.y) < 2.5 && Math.abs(d.pos.x - a.pos.x) < 3);
  const pairs = ends.flatMap((a: any) => near(a).map((d: any) => [a, d]));
  while (sim.phase === 'live' && sim.t < 2.0) { sim.tick(); for (const [a, d] of pairs) if (Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= a.profile.radius + d.profile.radius + 0.15) hit.add(a.slot + d.slot); }
  for (const [a, d] of pairs) { const k = `${d.slot} ${d.behavior?.plan ?? d.behavior?.kind}`; C[k] = C[k] ?? [0, 0]; C[k][0]++; if (hit.has(a.slot + d.slot)) C[k][1]++; }
}
console.log('end over / near an attached end: [n, touched]', C);
