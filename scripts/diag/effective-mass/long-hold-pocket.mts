// Long holds in the staged interior set (Integration, 2026-11-16, POCKET_DROP's staged pressure 5 -> 11%): on the
// interior-staged.mts plays where the QB still holds the ball at 3.0 s, by snap time (1.5 / 2.0 / 2.5 / 3.0 / 3.5 s), p50:
// the QB's depth behind the line, the interior OL's (p50 of the three), the nearest interior rusher's distance to the QB,
// and the QB's speed toward the line (+ = climbing). Does the QB move into the cup, or the cup onto him?
// usage: SET_SPOT=1 SET_SPOT_TACKLE=1 POCKET_LEVEL=1 [POCKET_DROP=1] node --import tsx scripts/diag/effective-mass/long-hold-pocket.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const T = [1.5, 2.0, 2.5, 3.0, 3.5];
const rows: any[] = [];
for (const concept of ['four_verts', 'smash', 'dagger', 'curl_flat', 'flood']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (let roster = 1; roster <= 8; roster++) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    const mid = sim.offense.filter((a: any) => ['LG', 'C', 'RG'].includes(a.slot));
    const dl = sim.defense.filter((d: any) => /^(DT|NT)/.test(d.slot) || d.player.position === 'DT');
    const snap: any = {};
    while (sim.phase === 'live' && sim.t < 3.6) {
      const t0 = sim.t; sim.tick();
      for (const k of T) if (t0 < k && sim.t >= k && sim.throwAt < 0) {
        const ol = mid.map((a: any) => (sim.los - a.pos.x) * dir).sort((a: number, b: number) => a - b)[1];
        const near = Math.min(...dl.map((d: any) => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y)));
        snap[k] = { qb: (sim.los - sim.qb.pos.x) * dir, ol, near, climb: sim.qb.vel.x * dir };
      }
    }
    if (snap[3.0]) rows.push(snap);
  }
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)] : NaN; };
console.log(`long holds (ball held at 3.0 s): ${rows.length}`);
for (const k of T) { const R = rows.filter((r) => r[k]); console.log(`  ${k} s (n ${R.length}): QB ${q(R.map((r) => r[k].qb)).toFixed(2)} | OL ${q(R.map((r) => r[k].ol)).toFixed(2)} | gap ${q(R.map((r) => r[k].qb - r[k].ol)).toFixed(2)} | nearest interior rusher to the QB ${q(R.map((r) => r[k].near)).toFixed(2)} | QB climbing ${q(R.map((r) => r[k].climb)).toFixed(2)} yd/s`); }
