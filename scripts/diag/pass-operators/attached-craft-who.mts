// Which man the route craft bends an attached end around in the 0.6 s after a rusher hits him (double_outs, staged).
// Needs a temporary export of receiver.ts craftHeld as globalThis.__craftHeld (not committed); 2026-11-16: the rusher
// who hit him 60 of 62.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const C: Record<string, number> = {};
for (const formation of ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12']) for (const coverage of ['cover1', 'cover3', 'cover2', 'cover4']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'double_outs', seed, roster, formation, flip: false }));
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const first = new Map<any, any>(); const seen = new Set<string>();
  while (sim.phase === 'live' && sim.t < 2.0) {
    sim.tick();
    for (const a of ends) {
      if (!first.has(a)) for (const d of sim.defense) if (Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= a.profile.radius + d.profile.radius + 0.15 && (d.player.position === 'EDGE' || d.player.position === 'DT')) { first.set(a, { d, t: sim.t }); break; }
      const f = first.get(a), h = (globalThis as any).__craftHeld.get(a);
      if (f && h && sim.t - f.t <= 0.6) { const k = `${formation}${coverage}${roster}${seed}${a.slot}`; if (!seen.has(k)) { seen.add(k); const who = h.d === f.d ? 'the rusher who hit him' : h.d.player.position; C[who] = (C[who] ?? 0) + 1; } }
    }
  }
}
console.log(C);
