// PRESS_JAM fixture: pressed receiver/corner pairs (cover1/cover0, four_verts + slant_flat, doubles/trips, seeds x flip).
// Per pair: punch decision (thrown -> landed / missed, or none), hands joint, level time (receiver's x passes the
// corner's), depth gained at 3.0 s (or play end); grouped by press vs release skill.
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const PJ: any = await import('../../../src/sim/press-jam.js');
const rows: any[] = [];
for (const concept of ['four_verts', 'slant_flat']) for (const coverage of ['cover1', 'cover0']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 12; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const pairs = sim.offense.map((o: any) => [o, sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot)]).filter((p: any) => p[1]);
  const st = new Map(pairs.map(([o]: any) => [o, { joint: 0, level: null as number | null, x0: o.pos.x, depth: 0, down: false }]));
  while (sim.phase === 'live' && sim.t < 3.0) {
    sim.tick();
    for (const [o, d] of pairs) { const s: any = st.get(o);
      if (sim.world.joints.some((j: any) => j.kind === 'hands' && j.a === d.body && j.b === o.body)) s.joint += sim.dt;
      if (s.level === null && (o.pos.x - d.pos.x) * sim.attackDir(o.team) > 0) s.level = sim.t;
      if (d.isDown(sim.t)) s.down = true;
      s.depth = (o.pos.x - s.x0) * sim.attackDir(o.team); }
  }
  for (const [o, d] of pairs) { const s: any = st.get(o), p = PJ.punches.get(d);
    rows.push({ rel: o.r('releaseVsPress'), press: d.r('press'), punch: p ? p.result : 'none', at: p?.at, joint: s.joint, level: s.level ?? 3.0, depth: s.depth, down: s.down }); }
}
const pct = (n: number, d: number) => (100 * n / Math.max(1, d)).toFixed(0) + '%';
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)].toFixed(2) : '  - '; };
console.log(`PRESS_JAM=${process.env.PRESS_JAM ?? '0'} LINE_START=${process.env.LINE_START ?? 'default'}  pressed pairs ${rows.length}`);
const line = (lab: string, v: any[]) => console.log(`  ${lab.padEnd(18)} n ${String(v.length).padStart(3)} | joint ${pct(v.filter(r => r.joint > 0).length, v.length).padStart(4)} p50 ${q(v.filter(r => r.joint > 0).map(r => r.joint))} s | level p50 ${q(v.map(r => r.level))} s | depth@3.0 ${q(v.map(r => r.depth))} | corner down ${pct(v.filter(r => r.down).length, v.length)}`);
for (const k of ['landed', 'missed', 'none']) { const v = rows.filter(r => r.punch === k); if (v.length) line(k, v); }
line('all', rows);
for (const [lab, f] of [['release > press', (r: any) => r.rel > r.press + 0.1], ['even', (r: any) => Math.abs(r.rel - r.press) <= 0.1], ['press > release', (r: any) => r.press > r.rel + 0.1]] as const) {
  const v = rows.filter(f); const c = (k: string) => v.filter(r => r.punch === k).length;
  console.log(`  ${lab.padEnd(16)} n ${v.length} | landed ${c('landed')} missed ${c('missed')} none ${c('none')} | level p50 ${q(v.map(r => r.level))} | depth@3.0 ${q(v.map(r => r.depth))}`); }
console.log(`  punch time p50 ${q(rows.filter(r => r.at !== undefined).map(r => r.at))} s`);
export {};
