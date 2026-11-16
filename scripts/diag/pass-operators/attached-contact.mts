// The body contact between an attached end and the rusher who hits him (#35 item 2): over the 0.6 s after first
// contact (staged double_outs, as attached-release.mts), the World's normal impulse on the end from that rusher, its
// downfield and lateral components (on the end; + downfield = toward the line he is releasing past), the Coulomb
// friction bound on it (CONTACT_FRICTION 0.35 x N), and the Δv they could give his mass, against his achieved Δv.
// usage: [RELEASE_COMMIT=1] node --import tsx scripts/diag/pass-operators/attached-contact.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: any[] = [];
for (const formation of ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12']) for (const coverage of ['cover1', 'cover3', 'cover2', 'cover4']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'double_outs', seed, roster, formation, flip: false }));
  const dir = sim.attackDir(sim.offense[0].team);
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const st = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 2.0) {
    sim.tick();
    for (const a of ends) {
      if (!st.has(a)) for (const d of sim.defense) if ((d.player.position === 'EDGE' || d.player.position === 'DT') && Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= a.profile.radius + d.profile.radius + 0.15) { st.set(a, { d, t: sim.t, v0: { ...a.vel }, Nx: 0, Ny: 0, N: 0, ticks: 0 }); break; }
      const s = st.get(a); if (!s || sim.t - s.t > 0.6 || s.done) continue;
      const ia = sim.world.bodies.indexOf(a.body), id = sim.world.bodies.indexOf(s.d.body);
      for (const c of sim.lastStep?.contacts ?? []) {
        if (!((c.i === ia && c.j === id) || (c.i === id && c.j === ia)) || !c.first) continue;
        // normal points from i to j: the impulse on j is +normal, on i -normal.
        const sgn = c.j === ia ? 1 : -1;
        s.Nx += sgn * c.normal?.x * c.impulse || sgn * c.first.normal.x * c.impulse; s.Ny += sgn * c.first.normal.y * c.impulse; s.N += c.impulse; s.ticks++;
      }
      if (sim.t - s.t > 0.58) { s.done = true; s.v1 = { ...a.vel }; s.m = sim.world.mass[ia]; s.lat = Math.sign(s.d.pos.y - a.pos.y); }
    }
  }
  for (const [a, s] of st) if (s.done) rows.push({ m: s.m, N: s.N, down: s.Nx * dir, across: -s.Ny * s.lat, dvDown: (s.v1.x - s.v0.x) * dir, ticks: s.ticks });
}
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const f = (k: string, g = (r: any) => r[k]) => `${q(rows.map(g), .25).toFixed(2)}/${q(rows.map(g)).toFixed(2)}/${q(rows.map(g), .75).toFixed(2)}`;
console.log(`ends ${rows.length} | mass p50 ${q(rows.map((r) => r.m)).toFixed(0)} | ticks in contact p50 ${q(rows.map((r) => r.ticks))} of ~24`);
console.log(`normal impulse on the end over 0.6 s p25/50/75 ${f('N')} kg·yd/s | its downfield part ${f('down')} | its lateral part away from the rusher ${f('across')}`);
console.log(`Δv the normal could give him downfield ${f('', (r) => r.down / r.m)} yd/s | friction bound 0.35N/m ${f('', (r) => 0.35 * r.N / r.m)} | achieved Δv downfield ${f('dvDown')}`);
