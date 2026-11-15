// The held pair's late slide (Integration / the user's candidate, 2026-11-15): interior pass pairs (each of LG / C / RG
// and the nearest DL within 1.2 yd from 0.2 s) that stay engaged through 2.5 s after contact (never past 1.2 yd or 70
// deg off the blocker's line to the QB, interior-fight.py's release) before the throw. After 1.0 s since contact: each
// man's speed across the line between them, and the rusher's speed. Run once per flag arm.
// usage: [FLAG=0 ...] node --import tsx scripts/diag/effective-mass/held-slide.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const IN = ['LG', 'C', 'RG']; const rows: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const pairs = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const qb = sim.qb; if (!qb) return;
    if (sim.t >= 0.2 && sim.t <= 2.0 && sim.throwAt < 0) for (const b of sim.offense) {
      if (!IN.includes(b.slot) || pairs.has(b)) continue;
      const dl = sim.defense.filter((d: any) => d.behavior?.kind === 'rush').map((d: any) => ({ d, r: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) })).filter((x: any) => x.r <= 1.2).sort((x: any, y: any) => x.r - y.r)[0];
      if (dl) pairs.set(b, { d: dl.d, t0: sim.t, rel: false, f: [] as any[] });
    }
    for (const [b, p] of pairs) {
      if (p.done) continue; const d = p.d, dt = sim.t - p.t0;
      if (sim.throwAt >= 0 || dt > 2.5) { p.done = true; continue; }
      const ux = qb.pos.x - b.pos.x, uy = qb.pos.y - b.pos.y, L = Math.hypot(ux, uy) || 1, rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, sep = Math.hypot(rx, ry);
      const ang = Math.atan2((rx * -uy + ry * ux) / L, -(rx * ux + ry * uy) / L) * 180 / Math.PI;
      if (sep > 1.2 || Math.abs(ang) > 70) { p.rel = true; p.done = true; continue; }
      if (dt >= 1.0) { const tx = -ry / (sep || 1), ty = rx / (sep || 1);
        p.f.push({ ub: Math.abs(b.vel.x * tx + b.vel.y * ty), ud: Math.abs(d.vel.x * tx + d.vel.y * ty), sd: Math.hypot(d.vel.x, d.vel.y), sb: Math.hypot(b.vel.x, b.vel.y) }); }
    } };
  const res = sim.run();
  for (const p of pairs.values()) if (!p.rel && p.f.length) rows.push(...p.f);
  return res;
} } });
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(0.5 * (s.length - 1))] : NaN; };
console.log(JSON.stringify({ arm: process.env.ARM ?? 'default', ticks: rows.length, acrossBlocker: +q(rows.map(r => r.ub)).toFixed(2), acrossRusher: +q(rows.map(r => r.ud)).toFixed(2), rusherSpeed: +q(rows.map(r => r.sd)).toFixed(2), blockerSpeed: +q(rows.map(r => r.sb)).toFixed(2) }));
