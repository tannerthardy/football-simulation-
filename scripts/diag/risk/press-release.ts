// Press-man release fixture (cover1/cover0, four_verts + slant_flat, doubles/trips, seeds 1-12 x flip): for each
// receiver with his press corner, by route (go / slant): speed at 0.5 s, lateral at 0.5 s, time to 5 yd downfield,
// time level with the corner, depth at 3.0 s (or play end). Medians.
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const rows: Record<string, any[]> = {};
for (const concept of ['four_verts', 'slant_flat']) for (const coverage of ['cover1', 'cover0']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 12; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const pairs = sim.offense.map((o: any) => [o, sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot)]).filter((p: any) => p[1]);
  const st = new Map(pairs.map(([o]: any) => [o, { x0: o.pos.x, y0: o.pos.y, v05: NaN, lat05: NaN, t5: 3.0, level: 3.0, depth: 0, route: o.behavior?.route?.id }]));
  while (sim.phase === 'live' && sim.t < 3.0) {
    sim.tick();
    for (const [o, d] of pairs) { const s: any = st.get(o), dir = sim.attackDir(o.team), dx = (o.pos.x - s.x0) * dir;
      if (Number.isNaN(s.v05) && sim.t + 1e-6 >= 0.5) { s.v05 = Math.hypot(o.vel.x, o.vel.y); s.lat05 = Math.abs(o.pos.y - s.y0); }
      if (s.t5 === 3.0 && dx >= 5) s.t5 = sim.t;
      if (s.level === 3.0 && (o.pos.x - d.pos.x) * dir > 0) s.level = sim.t;
      s.depth = dx; }
  }
  for (const [o] of pairs) { const s: any = st.get(o); if (['go', 'slant'].includes(s.route)) (rows[s.route] ??= []).push(s); }
}
const q = (v: number[]) => { const s = [...v].filter(x => !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`LINE_START=${process.env.LINE_START ?? 'default'}`);
for (const [k, v] of Object.entries(rows)) console.log(`  ${k.padEnd(6)} n ${v.length} | speed 0.5 s ${q(v.map(r => r.v05))} | lateral 0.5 s ${q(v.map(r => r.lat05))} | to 5 yd ${q(v.map(r => r.t5))} s | level ${q(v.map(r => r.level))} s | depth@3.0 ${q(v.map(r => r.depth))}`);
export {};
