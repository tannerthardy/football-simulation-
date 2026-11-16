// The anchor in games (Integration, 2026-11-15): held interior pass pairs (held-request.mts's definition: through 2.5 s
// after contact, never past 1.2 yd or 70 deg off the blocker's line to the QB, before the throw). For each window of
// time since contact:
//   - the pair's speed toward the QB along the rusher's line to him;
//   - each body's felt contact force and committed lean along that axis (N);
//   - the rusher's leg capacity (pushForce, traction-capped) and posture, the blocker's posture and depth behind his
//     snap spot;
//   - the rusher's move in the rep (e.move: none / bull / other).
// The question: in the staged pair (anchor-staged.mts) the pair walks back about 1.1 yd/s; in games the held pair
// stalls (0.2-0.3 late). What differs? Measurement only.
// usage: [flags] node --import tsx scripts/diag/effective-mass/anchor-games.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const N = 0.9144, BINS = [[0, .5], [.5, 1], [1, 1.5], [1.5, 2.5]];
const pairsAll: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const pairs = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const qb = sim.qb; if (!qb) return;
    if (sim.t >= 0.2 && sim.t <= 2.0 && sim.throwAt < 0) for (const b of sim.offense) {
      if (!['LG', 'C', 'RG'].includes(b.slot) || pairs.has(b)) continue;
      const dl = sim.defense.filter((d: any) => d.behavior?.kind === 'rush').map((d: any) => ({ d, r: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) })).filter((x: any) => x.r <= 1.2).sort((x: any, y: any) => x.r - y.r)[0];
      if (dl) pairs.set(b, { d: dl.d, t0: sim.t, rel: false, f: [] as any[] });
    }
    for (const [b, p] of pairs) {
      if (p.done) continue; const d = p.d, dt = sim.t - p.t0;
      if (sim.throwAt >= 0 || dt > 2.5) { p.done = true; continue; }
      const ux = qb.pos.x - b.pos.x, uy = qb.pos.y - b.pos.y, L = Math.hypot(ux, uy) || 1, rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, sep = Math.hypot(rx, ry);
      const ang = Math.atan2((rx * -uy + ry * ux) / L, -(rx * ux + ry * uy) / L) * 180 / Math.PI;
      if (sep > 1.2 || Math.abs(ang) > 70) { p.rel = true; p.done = true; continue; }
      const qx = qb.pos.x - d.pos.x, qy = qb.pos.y - d.pos.y, ql = Math.hypot(qx, qy) || 1, toq = (v: any) => (v.x * qx + v.y * qy) / ql;
      const sb = b.body.support, sd = d.body.support, spd = supportParams(d.profile);
      const e = b.engagement ?? d.engagement;
      p.f.push({ dt, pair: (toq(b.vel) + toq(d.vel)) / 2, rq: toq(sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 }),
        dFelt: sd ? -toq(sd.felt) * N : NaN, dLean: sd ? toq(sd.lean) * N : NaN, bFelt: sb ? toq(sb.felt) * N : NaN, bLean: sb ? -toq(sb.lean) * N : NaN,
        dCap: spd.pushForce * N, dPost: sd?.posture ?? NaN, bPost: sb?.posture ?? NaN, up: sd?.state === 'up' && sb?.state === 'up',
        depth: (sim.snapX[b.idx] - b.pos.x) * sim.attackDir(sim.offense[0].team), move: e?.move ?? 'none', moveIn: e?.moveUntil != null && sim.t < e.moveUntil,
        eng: !!e, dlb: (d.profile.massKg - b.profile.massKg) * 2.2046 });
    }
  };
  const out = sim.run();
  for (const p of pairs.values()) if (!p.rel) pairsAll.push(p);
  return out;
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(0.5 * (s.length - 1))] : NaN; };
const F = pairsAll.flatMap((p) => p.f);
console.log(`held interior pairs ${pairsAll.length} (p50 by time since contact; N along the rusher's line to the QB)`);
// The NFL witness's split (held-walkback.py): the pair's speed toward the QB by the rusher's weight minus the blocker's.
for (const [a, c] of BINS) {
  const R = F.filter((r) => r.dt >= a && r.dt < c);
  console.log(`  by weight, ${a.toFixed(1)}-${c.toFixed(1)} s: ` + [['< -30 lb', -1e9, -30], ['-30..0', -30, 0], ['0..+30', 0, 30], ['> +30', 30, 1e9]].map(([l, lo, hi]: any) => { const S = R.filter((r) => r.dlb >= lo && r.dlb < hi); return `rusher ${l} ${q(S.map((r) => r.pair)).toFixed(2)} (n ${S.length})`; }).join(' | '));
}
for (const [a, c] of BINS) {
  const R = F.filter((r) => r.dt >= a && r.dt < c), f = (k: string, S = R) => q(S.map((r) => r[k]));
  const eng = R.filter((r) => r.eng).length / Math.max(1, R.length), up = R.filter((r) => r.up).length / Math.max(1, R.length);
  console.log(`  ${a.toFixed(1)}-${c.toFixed(1)} s (${R.length}): pair toward the QB ${f('pair').toFixed(2)} yd/s, rusher asks ${f('rq').toFixed(2)} | felt rusher ${f('dFelt').toFixed(0)} / blocker ${f('bFelt').toFixed(0)} | lean rusher ${f('dLean').toFixed(0)} of capacity ${f('dCap').toFixed(0)} / blocker ${f('bLean').toFixed(0)} | posture rusher ${f('dPost').toFixed(2)} / blocker ${f('bPost').toFixed(2)} | blocker depth ${f('depth').toFixed(2)} yd | engaged ${(100 * eng).toFixed(0)}%, both up ${(100 * up).toFixed(0)}%`);
  for (const [lab, S] of [['no move', R.filter((r) => r.move === 'none' || !r.moveIn)], ['bull in flight', R.filter((r) => r.move === 'bull' && r.moveIn)], ['other move in flight', R.filter((r) => r.move !== 'bull' && r.move !== 'none' && r.moveIn)]] as [string, any[]][])
    console.log(`      ${lab.padEnd(21)} ${(100 * S.length / Math.max(1, R.length)).toFixed(0)}%: pair ${f('pair', S).toFixed(2)} | rusher asks ${f('rq', S).toFixed(2)} | felt ${f('dFelt', S).toFixed(0)} | lean rusher ${f('dLean', S).toFixed(0)} / blocker ${f('bLean', S).toFixed(0)}`);
}
