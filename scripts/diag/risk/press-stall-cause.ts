// Pressed WR/corner pairs in the press fixture (cover1/cover0, four_verts + slant_flat, doubles/trips, seeds x flip):
// stalls by press_stall.py's definition (0.1-0.9 s, behind the corner, centres <= 1.5 yd, under 4 yd/s, not gaining
// speed over the next 0.2 s), and for each stalled frame its cause: the corner's hands joint on him, bodies touching
// (centres within radii + 0.15 yd), or neither (slow near the corner with nothing on him). Also his commanded vs
// achieved speed on stalled frames, to tell a controller choice from a body held.
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const rows: any[] = [];
for (const concept of ['four_verts', 'slant_flat']) for (const coverage of ['cover1', 'cover0']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 12; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const pairs = sim.offense.map((o: any) => [o, sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot)]).filter((p: any) => p[1]);
  const tr = new Map(pairs.map(([o]: any) => [o, [] as any[]]));
  const cmds = new Map<any, any>();
  for (const [o] of pairs) { const b = o.behavior, u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); cmds.set(o, c); return c; }; }
  while (sim.phase === 'live' && sim.t < 1.2) {
    sim.tick();
    for (const [o, d] of pairs) {
      const dir = sim.attackDir(o.team), c = cmds.get(o);
      tr.get(o).push({ t: sim.t, behind: (d.pos.x - o.pos.x) * dir > 0, dist: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y), sp: Math.hypot(o.vel.x, o.vel.y),
        joint: sim.world.joints.some((j: any) => j.kind === 'hands' && j.a === d.body && j.b === o.body),
        touch: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= o.profile.radius + d.profile.radius + 0.15,
        want: c ? Math.hypot(c.vel.x, c.vel.y) : NaN, drive: c?.drive ?? 1 });
    }
  }
  for (const [o] of pairs) {
    const f = tr.get(o), k2 = Math.round(0.2 / sim.dt), st: any[] = [];
    for (let k = 0; k + k2 < f.length; k++) { const a = f[k];
      if (a.t < 0.1 || a.t > 0.9) continue;
      if (a.behind && a.dist <= 1.5 && a.sp < 4 && f[k + k2].sp <= a.sp + 0.1) st.push(a); }
    rows.push({ st });
  }
}
const s = rows.filter(r => r.st.length), fr = s.flatMap(r => r.st);
const q = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(2) : '-'; };
const pct = (n: number, d: number) => (100 * n / Math.max(1, d)).toFixed(0) + '%';
console.log(`pressed pairs ${rows.length}, stalled ${pct(s.length, rows.length)}; stalled frames ${fr.length} (p50 per pair ${q(s.map(r => r.st.length * 0.05))} s)`);
const cls = (a: any) => a.joint ? 'hands' : a.touch ? 'bodies' : 'neither';
for (const k of ['hands', 'bodies', 'neither']) { const v = fr.filter(a => cls(a) === k);
  console.log(`  ${k.padEnd(8)} frames ${pct(v.length, fr.length).padStart(4)} | his speed p50 ${q(v.map(a => a.sp))}, wanted ${q(v.map(a => a.want))}, drive ${q(v.map(a => a.drive))} | t p50 ${q(v.map(a => a.t))} s, centres ${q(v.map(a => a.dist))}`); }
export {};
