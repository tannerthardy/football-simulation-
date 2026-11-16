// The staged interior pair (Integration, 2026-11-16, POCKET_DROP's gate): the QB lane's staged dropbacks (four_verts,
// smash, dagger, curl_flat, flood x cover1 / cover2 / cover3 / cover4 x rosters 1-8 x seeds 1-2, gun_doubles_11). Every
// interior pass engagement (LG / C / RG and a DL or LB) while the QB holds the ball:
//   - by time since contact (0-0.5, 0.5-1.0, 1.0-1.5, 1.5-2.5 s): the pair's velocity toward the QB (the mean of the two
//     bodies, + = toward the QB) and the rusher's, p50; the blocker's depth behind the line;
//   - the rep's control 0.5 s after contact (p50);
//   - how it ended before the throw: held (still engaged, or the ball out), released (the engagement ended), and of the
//     released: inside / outside the blocker (his side of the blocker's line to the QB) and whether the rusher then got
//     within 2 yd of the QB before the ball was out;
// and per play: interior pressure (an interior rusher within 2 yd of the QB before the ball is out) by his plan
// (power / finesse / speed), with whether he was engaged then or free, and how he got free (released from his
// blocker, never engaged), the time, and sacks.
// usage: SET_SPOT=1 SET_SPOT_TACKLE=1 POCKET_LEVEL=1 [POCKET_DROP=1] node --import tsx scripts/diag/effective-mass/interior-staged.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const BINS = [[0, .5], [.5, 1], [1, 1.5], [1.5, 2.5]];
const INT = new Set(['LG', 'C', 'RG']);
const reps: any[] = [], plays: any[] = [];
for (const concept of ['four_verts', 'smash', 'dagger', 'curl_flat', 'flood']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (let roster = 1; roster <= 8; roster++) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    const open = new Map<any, any>();
    const intRushers = sim.defense.filter((d: any) => d.player.position === 'DT' || /^DT|^NT/.test(d.slot) || d.player.position === 'LB');
    let pressure: any = null;
    while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0) {
      sim.tick();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !INT.has(e.blocker.slot)) continue;
        if (!open.has(e)) open.set(e, { b: e.blocker, d: e.defender, t0: sim.t, bins: BINS.map(() => ({ pair: [] as number[], rush: [] as number[], depth: [] as number[] })), ctl: null as number | null, end: null as any, plan: e.defender.behavior?.plan ?? e.defender.behavior?.kind });
      }
      for (const [e, r] of open) {
        if (r.end) continue;
        const dt = sim.t - r.t0, q = sim.qb.pos;
        const ux = q.x - r.b.pos.x, uy = q.y - r.b.pos.y, ul = Math.hypot(ux, uy) || 1;
        const tq = (v: any) => (v.x * ux + v.y * uy) / ul;
        const bi = BINS.findIndex(([a, b]) => dt >= a && dt < b);
        if (bi >= 0 && sim.engagements.includes(e)) {
          r.bins[bi].pair.push((tq(r.b.vel) + tq(r.d.vel)) / 2); r.bins[bi].rush.push(tq(r.d.vel)); r.bins[bi].depth.push((sim.los - r.b.pos.x) * dir);
        }
        if (r.ctl === null && dt >= 0.5 && sim.engagements.includes(e)) r.ctl = e.control;
        if (!sim.engagements.includes(e)) {
          const lat = (r.d.pos.y - r.b.pos.y) * Math.sign(sim.ballY - r.b.pos.y || 1);
          r.end = { t: dt, side: lat > 0 ? 'inside' : 'outside', reached: false };
        }
      }
      if (!pressure) for (const d of intRushers) if (Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) {
        const rep = [...open.values()].find((r) => r.d === d);
        pressure = { t: sim.t, plan: d.behavior?.plan ?? d.behavior?.kind, engaged: !!d.engagement, how: d.engagement ? 'engaged' : rep ? 'released' : 'never engaged' };
        break;
      }
      for (const r of open.values()) if (r.end && !r.end.reached && Math.hypot(r.d.pos.x - sim.qb.pos.x, r.d.pos.y - sim.qb.pos.y) <= 2) r.end.reached = true;
    }
    reps.push(...open.values());
    plays.push({ pressure, sack: sim.events.some((e: any) => e.type === 'sack') });
  }
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
console.log(`interior pass reps ${reps.length} on ${plays.length} plays`);
console.log('  by time since contact: pair / rusher toward the QB p50 (yd/s), blocker depth p50 (yd): ' + BINS.map(([a, b], i) =>
  `${a}-${b} s ${q(reps.flatMap((r) => r.bins[i].pair)).toFixed(2)} / ${q(reps.flatMap((r) => r.bins[i].rush)).toFixed(2)}, ${q(reps.flatMap((r) => r.bins[i].depth)).toFixed(2)}`).join(' | '));
console.log(`  control 0.5 s in p50 ${q(reps.map((r) => r.ctl ?? NaN)).toFixed(2)} | ended before the ball ${pc(reps.filter((r) => r.end).length, reps.length)} (inside ${pc(reps.filter((r) => r.end?.side === 'inside').length, reps.length)}, outside ${pc(reps.filter((r) => r.end?.side === 'outside').length, reps.length)}), at p50 ${q(reps.filter((r) => r.end).map((r) => r.end.t)).toFixed(2)} s; released then reached the QB ${pc(reps.filter((r) => r.end?.reached).length, reps.length)}`);
for (const plan of ['power', 'finesse', 'speed']) {
  const R = reps.filter((r) => r.plan === plan); if (!R.length) continue;
  console.log(`  ${plan} (reps ${R.length}): rusher toward the QB 1.0-1.5 / 1.5-2.5 s ${q(R.flatMap((r) => r.bins[2].rush)).toFixed(2)} / ${q(R.flatMap((r) => r.bins[3].rush)).toFixed(2)} | control 0.5 s ${q(R.map((r) => r.ctl ?? NaN)).toFixed(2)} | released ${pc(R.filter((r) => r.end).length, R.length)}, then reached the QB ${pc(R.filter((r) => r.end?.reached).length, R.length)}`);
}
const P = plays.filter((p) => p.pressure);
const by = (k: string) => P.reduce((m: any, p) => (m[p.pressure[k]] = (m[p.pressure[k]] ?? 0) + 1, m), {});
console.log(`  interior pressure ${pc(P.length, plays.length)} of plays at p50 ${q(P.map((p) => p.pressure.t)).toFixed(2)} s | by plan ${JSON.stringify(by('plan'))} | how ${JSON.stringify(by('how'))} | sacks ${plays.filter((p) => p.sack).length}`);
