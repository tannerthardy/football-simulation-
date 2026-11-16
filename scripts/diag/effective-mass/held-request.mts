// The held rusher's request against what he achieves (Integration, 2026-11-15; hand-fight note 18): pass pairs held
// through 2.5 s after contact (never past 1.2 yd or 70 deg off the blocker's line to the QB, before the throw), interior
// (LG / C / RG) and edge (LT / RT), by time since contact: the rusher's requested velocity (his intent this tick) and his
// achieved velocity, each toward the QB and across his line to the QB. Then his get-off: snap reaction (his
// snapReadyAt), his first-step request and his achieved speed over the first 0.5 s after the snap.
// usage: node --import tsx scripts/diag/effective-mass/held-request.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const BINS = [[0, .5], [.5, 1], [1, 1.5], [1.5, 2.5]];
const held: Record<string, any[]> = { interior: [], edge: [] }; const getoff: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const pairs = new Map<any, any>(); const go = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const qb = sim.qb; if (!qb) return;
    for (const d of sim.defense) if (d.behavior?.kind === 'rush' && sim.t <= 0.5) {
      const s = go.get(d) ?? { ready: d.snapReadyAt, req: [] as number[], got: [] as number[] }; go.set(d, s);
      const iv = sim.intents?.[d.idx]?.vel; if (iv) { s.req.push(Math.hypot(iv.x, iv.y)); s.got.push(Math.hypot(d.vel.x, d.vel.y)); }
    }
    if (sim.t >= 0.2 && sim.t <= 2.0 && sim.throwAt < 0) for (const b of sim.offense) {
      if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(b.slot) || pairs.has(b)) continue;
      const dl = sim.defense.filter((d: any) => d.behavior?.kind === 'rush').map((d: any) => ({ d, r: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) })).filter((x: any) => x.r <= 1.2).sort((x: any, y: any) => x.r - y.r)[0];
      if (dl) pairs.set(b, { d: dl.d, t0: sim.t, rel: false, f: [] as any[], cls: ['LT', 'RT'].includes(b.slot) ? 'edge' : 'interior' });
    }
    for (const [b, p] of pairs) {
      if (p.done) continue; const d = p.d, dt = sim.t - p.t0;
      if (sim.throwAt >= 0 || dt > 2.5) { p.done = true; continue; }
      const ux = qb.pos.x - b.pos.x, uy = qb.pos.y - b.pos.y, L = Math.hypot(ux, uy) || 1, rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, sep = Math.hypot(rx, ry);
      const ang = Math.atan2((rx * -uy + ry * ux) / L, -(rx * ux + ry * uy) / L) * 180 / Math.PI;
      if (sep > 1.2 || Math.abs(ang) > 70) { p.rel = true; p.done = true; continue; }
      const qx = qb.pos.x - d.pos.x, qy = qb.pos.y - d.pos.y, ql = Math.hypot(qx, qy) || 1, toq = (v: any) => (v.x * qx + v.y * qy) / ql, acr = (v: any) => Math.abs((v.x * -qy + v.y * qx) / ql);
      const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 };
      const bv = sim.intents?.[b.idx]?.vel ?? { x: 0, y: 0 }, tx = -ry / (sep || 1), ty = rx / (sep || 1);
      // The blocker too, across the line between them: is he asking to slide (a set landmark, a mirror)?
      p.f.push({ dt, rq: toq(iv), ra: acr(iv), aq: toq(d.vel), aa: acr(d.vel), bra: Math.abs(bv.x * tx + bv.y * ty), baa: Math.abs(b.vel.x * tx + b.vel.y * ty),
        bsr: Math.sign(bv.x * tx + bv.y * ty), dsa: Math.sign(d.vel.x * tx + d.vel.y * ty), bsa: Math.sign(b.vel.x * tx + b.vel.y * ty),
        // The blocker's offset from the rusher's line to the QB (yd; his set aims him onto it), whether his request
        // across that line closes it, and the pair's field-y velocity signed toward the field centre (the mirror check).
        off: (() => { const lx = -qy / ql, ly = qx / ql; return (b.pos.x - d.pos.x) * lx + (b.pos.y - d.pos.y) * ly; })(),
        closes: (() => { const lx = -qy / ql, ly = qx / ql, o = (b.pos.x - d.pos.x) * lx + (b.pos.y - d.pos.y) * ly; return Math.sign(bv.x * lx + bv.y * ly) === -Math.sign(o); })(),
        slot: b.slot, vyc: (b.vel.y + d.vel.y) / 2 * Math.sign(sim.ballY - b.pos.y || 1), vy: (b.vel.y + d.vel.y) / 2 });
    } };
  const res = sim.run();
  for (const p of pairs.values()) if (!p.rel && p.f.length) held[p.cls].push(...p.f);
  for (const s of go.values()) getoff.push(s);
  return res;
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
for (const cls of ['interior', 'edge']) {
  console.log(`${cls} held pairs (requested / achieved, toward the QB then across), p50 yd/s:`);
  for (const [a, b] of BINS) { const F = held[cls].filter(f => f.dt >= a && f.dt < b);
    console.log(`  ${a.toFixed(1)}-${b.toFixed(1)} s (${F.length}): toward ${q(F.map(f => f.rq)).toFixed(2)} / ${q(F.map(f => f.aq)).toFixed(2)} | across ${q(F.map(f => f.ra)).toFixed(2)} / ${q(F.map(f => f.aa)).toFixed(2)} | blocker across ${q(F.map(f => f.bra)).toFixed(2)} / ${q(F.map(f => f.baa)).toFixed(2)}, moving the same way as the rusher ${(100 * F.filter(f => f.dsa !== 0 && f.dsa === f.bsa).length / Math.max(1, F.length)).toFixed(0)}%`); }
}
for (const cls of ['interior']) for (const [a, b] of BINS) { const F = held[cls].filter(f => f.dt >= a && f.dt < b);
  console.log(`  ${cls} ${a.toFixed(1)}-${b.toFixed(1)} s: the blocker's |offset| from the rusher's line to the QB p50 ${q(F.map(f => Math.abs(f.off))).toFixed(2)} yd, his request closing it ${(100 * F.filter(f => f.closes).length / Math.max(1, F.length)).toFixed(0)}% | pair field-y velocity p50: LG ${q(F.filter(f => f.slot === 'LG').map(f => f.vy)).toFixed(2)}, C ${q(F.filter(f => f.slot === 'C').map(f => f.vy)).toFixed(2)}, RG ${q(F.filter(f => f.slot === 'RG').map(f => f.vy)).toFixed(2)} (toward the field centre: LG ${q(F.filter(f => f.slot === 'LG').map(f => f.vyc)).toFixed(2)}, RG ${q(F.filter(f => f.slot === 'RG').map(f => f.vyc)).toFixed(2)})`); }
console.log(`get-off (rushers, first 0.5 s after the snap): snap reaction p50 ${q(getoff.map(s => s.ready)).toFixed(2)} s | requested speed p50 over the window ${q(getoff.map(s => q(s.req))).toFixed(2)} | achieved speed p50 ${q(getoff.map(s => q(s.got))).toFixed(2)}, at 0.5 s ${q(getoff.map(s => s.got[s.got.length - 1])).toFixed(2)} yd/s`);
