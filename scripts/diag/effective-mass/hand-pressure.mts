// Pass-rush read for HAND_MOMENT (Integration, 2026-11-16): pressure by rusher class, how many are never released from a blocker's hands, and the pocket's room.
// The QB lane's staged plays (nativeTraceSetup), the same bodies and seeds for every arm, mirrored. For every defender whose behaviour is `rush`, from the snap to the
// throw (or 3.5 s):
//   - class: edge (DE / OLB / EDGE slots), interior (DT / NT), other (a linebacker or back sent);
//   - pressure: within 1.5 yd of the QB at any tick before the throw (yd is the metric's own: scripts/mechanics/metrics.py PRESSURE_YD is 1.5), and the time of the first;
//   - never released: a blocker's hands were on him (a hands joint with any offensive body) at some tick and at every tick after the first until the throw or his pressure;
//   - the pocket: the QB's distance to the nearest rusher (any class) at 1.5 / 2.0 / 2.5 s, and the share of plays where one is within 1.5 yd by 2.5 s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/hand-pressure.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const cls = (slot: string) => /^(DE|LDE|RDE|EDGE|OLB|LOLB|ROLB)/.test(slot) ? 'edge' : /^(DT|NT|LDT|RDT)/.test(slot) ? 'interior' : 'other';
const rows: Record<string, { n: number; pressured: number; tFirst: number[]; engaged: number; never: number }> = {};
const room: Record<string, number[]> = { '1.5': [], '2.0': [], '2.5': [] }; let plays = 0, nearBy25 = 0, throwT: number[] = [];
for (const concept of ['four_verts', 'smash', 'dagger']) for (const coverage of ['cover2', 'cover3', 'cover1']) for (let roster = 1; roster <= 12; roster++) for (const seed of [1, 2, 3, 4]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const rushers = sim.defense.filter((d: any) => d.behavior?.kind === 'rush');
  const st = new Map<any, { press: number | null; on: boolean; everOn: boolean; dropped: boolean }>(rushers.map((d: any) => [d, { press: null, on: false, everOn: false, dropped: false }]));
  const nearest: Record<string, number> = {};
  while (sim.phase === 'live' && sim.t < 3.5 && sim.throwAt < 0) {
    sim.tick();
    if (sim.throwAt >= 0) break;
    let nr = Infinity;
    for (const d of rushers) {
      const s = st.get(d)!, dist = Math.hypot(sim.qb.pos.x - d.pos.x, sim.qb.pos.y - d.pos.y); nr = Math.min(nr, dist);
      if (s.press === null && dist <= 1.5) s.press = sim.t;
      if (s.press !== null) continue;
      const on = sim.world.joints.some((j: any) => j.kind === 'hands' && j.b === d.body && sim.offense.some((o: any) => o.body === j.a));
      if (on) s.everOn = true; else if (s.everOn) s.dropped = true;
    }
    for (const k of ['1.5', '2.0', '2.5']) if (Math.abs(sim.t - Number(k)) < sim.dt / 2) nearest[k] = nr;
  }
  plays++; if (sim.throwAt >= 0) throwT.push(sim.throwAt);
  for (const k of ['1.5', '2.0', '2.5']) if (nearest[k] !== undefined) room[k]!.push(nearest[k]!);
  if (nearest['2.5'] !== undefined && nearest['2.5'] <= 1.5) nearBy25++;
  for (const d of rushers) {
    const c = cls(String(d.slot)), r = (rows[c] ??= { n: 0, pressured: 0, tFirst: [], engaged: 0, never: 0 }), s = st.get(d)!;
    r.n++; if (s.press !== null) { r.pressured++; r.tFirst.push(s.press); }
    if (s.everOn) { r.engaged++; if (!s.dropped) r.never++; }
  }
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
console.log(`staged pass plays ${plays} (throws ${throwT.length}, p50 throw ${q(throwT).toFixed(2)} s)`);
for (const c of ['edge', 'interior', 'other']) { const r = rows[c]; if (!r) continue; console.log(`  ${c.padEnd(9)} rushers ${String(r.n).padStart(4)} | pressured before the throw ${pc(r.pressured, r.n)}, first at p50 ${q(r.tFirst).toFixed(2)} s | engaged ${pc(r.engaged, r.n)}, of those never released ${pc(r.never, r.engaged)}`); }
console.log(`  pocket: QB to nearest rusher p50 at 1.5 / 2.0 / 2.5 s: ${['1.5', '2.0', '2.5'].map((k) => q(room[k]!).toFixed(2)).join(' / ')} yd (n ${room['2.5']!.length}); within 1.5 yd by 2.5 s on ${pc(nearBy25, room['2.5']!.length)} of plays`);
