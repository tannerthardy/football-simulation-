// The ride at the hip, staged (Integration, 2026-11-16): the QB lane's staged plays (nativeTraceSetup), the same bodies
// and seeds for every arm, mirrored (flip off / on). For each edge rusher reaching his tackle's hip (edge-flatten's
// event: more than 0.3 yd deeper than the tackle while still outside him, from 0.3 s, ball in hand):
//   - center distance to the tackle at the hip / +0.2 / +0.5 / +1.0 s (the NFL: 0.72 / 0.98 / 2.24 yd p25 / 50 / 75
//     at the hip, bimodal: hip to hip 0.7-1.0, free beyond 2);
//   - his closing speed on the tackle over 0-0.5 s (relative, along the line between them);
//   - the tackle: speed over 0-0.5 s, whether he goes down within 1.0 s;
//   - the hands: on at the hip; if a rusher gets hip to hip (within 1.0 yd) by +0.5 s, whether the tackle's hands then
//     come off and stay off for the rest of the second (cleared) or come back (re-fit);
//   - his distance to the QB at the hip and +1.0 s.
// Arms by env (the World's own flags, or the probe-only DIAG_PRESS_EXT / DIAG_ARM_YIELD of the diagnostic worktree).
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-ride-staged.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const reps: any[] = [];
for (const concept of ['four_verts', 'smash', 'dagger']) for (const coverage of ['cover2', 'cover3', 'cover1']) for (let roster = 1; roster <= 12; roster++) for (const seed of [1, 2, 3, 4]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const by = sim.ballY, dir = sim.attackDir(sim.offense[0].team);
  const pairs = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT').map((t: any) => {
    const out = Math.sign(t.pos.y - by) || 1;
    const d = sim.defense.filter((x: any) => { const w = (x.pos.y - t.pos.y) * out; return w >= 0 && w <= 4 && Math.abs(x.pos.x - sim.los) < 2; })
      .sort((a: any, b: any) => (b.pos.y - t.pos.y) * out - (a.pos.y - t.pos.y) * out)[0];
    return d ? { t, d, out, t0: null as number | null, ticks: [] as any[] } : null;
  }).filter(Boolean);
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    for (const p of pairs) {
      const { t, d, out } = p;
      if (p.t0 === null) {
        if (sim.throwAt >= 0 || sim.t < 0.3 || d.behavior?.kind !== 'rush') continue;
        if ((d.pos.x - t.pos.x) * dir < -0.3 && (d.pos.y - t.pos.y) * out > 0) p.t0 = sim.t; else continue;
      }
      const dt = sim.t - p.t0!; if (dt > 1.0 + 1e-9) continue;
      const j = sim.world.joints.find((j: any) => j.kind === 'hands' && j.a === t.body && j.b === d.body);
      const ux = d.pos.x - t.pos.x, uy = d.pos.y - t.pos.y, L = Math.hypot(ux, uy) || 1;
      p.ticks.push({ dt, dist: L, close: -((d.vel.x - t.vel.x) * ux + (d.vel.y - t.vel.y) * uy) / L, tSpeed: Math.hypot(t.vel.x, t.vel.y),
        tUp: (t.body.support?.state ?? 'up') === 'up', joint: !!j, toQB: Math.hypot(sim.qb.pos.x - d.pos.x, sim.qb.pos.y - d.pos.y) });
    }
  }
  for (const p of pairs) if (p.t0 !== null && p.ticks.length > 5) reps.push(p);
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const at = (r: any, t0: number) => r.ticks.reduce((b: any, x: any) => (Math.abs(x.dt - t0) < Math.abs(b.dt - t0) ? x : b), r.ticks[0]);
const dists = (t0: number) => reps.map((r) => at(r, t0)).filter((x: any) => Math.abs(x.dt - t0) < 0.06).map((x: any) => x.dist);
console.log(`edge rushers reaching the tackle's hip: ${reps.length}`);
console.log('  center distance p25/50/75 (yd), hip / +0.2 / +0.5 / +1.0 s: ' + [0, 0.2, 0.5, 1.0].map((t0) => { const D = dists(t0); return `${q(D, .25).toFixed(2)}/${q(D).toFixed(2)}/${q(D, .75).toFixed(2)}`; }).join(' | ')
  + ` | within 1.2 yd at the hip ${pc(dists(0).filter((x) => x <= 1.2).length, dists(0).length)}, hip to hip (<= 1.0) by +0.5 s ${pc(reps.filter((r) => r.ticks.some((x: any) => x.dt <= 0.5 && x.dist <= 1.0)).length, reps.length)}`);
const early = reps.flatMap((r) => r.ticks.filter((x: any) => x.dt <= 0.5));
console.log(`  closing on the tackle 0-0.5 s ${q(early.map((x: any) => x.close)).toFixed(2)} yd/s | tackle speed ${q(early.map((x: any) => x.tSpeed)).toFixed(1)} yd/s, down within 1.0 s ${pc(reps.filter((r) => r.ticks.some((x: any) => !x.tUp)).length, reps.length)} | hands on at the hip ${pc(reps.filter((r) => r.ticks[0].joint).length, reps.length)}`);
const h2h = reps.filter((r) => r.ticks.some((x: any) => x.dt <= 0.5 && x.dist <= 1.0));
let cleared = 0, refit = 0, held = 0;
for (const r of h2h) {
  const k = r.ticks.findIndex((x: any) => x.dist <= 1.0), after = r.ticks.slice(k);
  const offAt = after.findIndex((x: any) => !x.joint);
  if (offAt < 0) held++; else if (after.slice(offAt).some((x: any) => x.joint)) refit++; else cleared++;
}
console.log(`  hip to hip by +0.5 s (n ${h2h.length}): hands then off and stay off (cleared) ${pc(cleared, h2h.length)}, off then back on (re-fit) ${pc(refit, h2h.length)}, never off ${pc(held, h2h.length)}`);
console.log(`  to the QB, hip -> +1.0 s: ${q(reps.map((r) => r.ticks[0].toQB)).toFixed(1)} -> ${q(reps.map((r) => at(r, 1.0).toQB)).toFixed(1)} yd (NFL 5.3 -> 3.5) | hip to hip: ${q(h2h.map((r) => r.ticks[0].toQB)).toFixed(1)} -> ${q(h2h.map((r) => at(r, 1.0).toQB)).toFixed(1)}`);
