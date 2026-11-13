// Which unloads topple a protector (Flex, 2026-11-13, the commit bound). Every tick a pass blocker's felt press drops by
// half or more from the tick before (a swim, club, pull, spin or a lost contact), while he is up: his lean along the old
// press before it, as a share of m w0^2 x criticalDeviation (the World's own recoverable offset at his posture), his
// velocity along the press (+ = the way he was pushed), and whether he falls within 0.4 s. Binned by the lean share.
// usage: [flags] node --import tsx scripts/diag/effective-mass/unload-outcomes.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams, omega0, criticalDeviation } = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const ev: { share: number; ratio: number; v: number; fell: boolean; tech: number }[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const prev = new Map<any, any>(); const open: { b: any; until: number; rec: any }[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const o of open) if (!o.rec.fell && o.b.body.support?.state !== 'up' && sim.t <= o.until) o.rec.fell = true;
      if (sim.carrier !== sim.qb) return;
      for (const b of sim.offense) {
        if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(b.slot)) continue;
        const s = b.body.support; if (!s || s.state !== 'up') { prev.delete(b); continue; }
        const F = Math.hypot(s.felt.x, s.felt.y), p = prev.get(b);
        if (p && p.F > 300 && F < 0.5 * p.F) {
          const sp = supportParams(b.profile), w0 = omega0(sp, p.posture), crit = criticalDeviation(sp, p.posture, 0, 1);
          const share = p.lean / (b.profile.massKg * w0 * w0 * crit);
          const rec = { share, ratio: p.lean / p.F, v: p.v, fell: false, tech: b.r('passBlock') };
          ev.push(rec); open.push({ b, until: sim.t + 0.4, rec });
        }
        const ux = -s.felt.x / (F || 1), uy = -s.felt.y / (F || 1);
        prev.set(b, { F, posture: s.posture, lean: Math.max(0, s.lean.x * ux + s.lean.y * uy), v: -(b.vel.x * ux + b.vel.y * uy) });
      }
    };
    return sim.run();
  } } });
}
console.log(`unloads ${ev.length}, fell within 0.4 s ${ev.filter((e) => e.fell).length}`);
for (const [lo, hi] of [[0, 0.3], [0.3, 0.5], [0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0], [1.0, 9]]) {
  const B = ev.filter((e) => e.share >= lo && e.share < hi); if (!B.length) continue;
  const fast = B.filter((e) => e.v > 1), slow = B.filter((e) => e.v <= 1);
  const rate = (A: typeof B) => A.length ? `${(100 * A.filter((e) => e.fell).length / A.length).toFixed(0)}% of ${A.length}` : '-';
  console.log(`   lean ${lo.toFixed(1)}-${hi.toFixed(1)} of m w0^2 crit: fell ${rate(B)} | carried back > 1 yd/s ${rate(fast)} | <= 1 ${rate(slow)} | lean/press p50 ${[...B.map((e) => e.ratio)].sort((a, b) => a - b)[B.length >> 1].toFixed(2)}`);
}
