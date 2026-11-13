// The blocker in front at the first pressure (Integration, 2026-11-10). Live games, flags via env. Per dropback: the QB's
// drop and his depth behind the line at 2.0 / 2.5 / 3.0 s (while he holds the ball). At the first pressure (first defender
// within 2 yd of the QB from 0.3 s, before the throw): that rusher's slot and whether his engagement flag is on; the nearest
// offensive player within 1.2 yd (if any) and, for an OL, his slot, depth, set-depth target (passSetDepth), requested and
// achieved retreat (yd/s, -x), and felt load along his retreat (x mg; + = pushing him back); in front or edge (pressure-shape
// rule). usage: [flags] node --import tsx scripts/diag/effective-mass/pass-press.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { passSetDepth } = await import(`${W}/src/sim/engagement.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']); const G = 9.81 * 1.0936;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const dir = sim.attackDir('O'), t0 = sim.t; const depth = (a: any) => -(a.pos.x - sim.los) * dir;
    const rec: any = { drop: sim.qb.behavior?.concept?.drop ?? sim.offCall?.pass?.concept?.drop ?? sim.offCall?.pass?.drop ?? null, qb: {} };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const t = sim.t - t0, q = sim.qb; if (sim.throwAt >= 0 || sim.carrier !== q) return;
      for (const m of [2.0, 2.5, 3.0]) if (rec.qb[m] === undefined && t >= m - 1e-9) rec.qb[m] = r2(depth(q));
      if (rec.press || t < 0.3) return;
      const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - q.pos.x, a.pos.y - q.pos.y) <= 2); if (!d) return;
      const near = sim.offense.filter((o: any) => o !== q).map((o: any) => ({ o, r: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) })).sort((a: any, b: any) => a.r - b.r)[0];
      const p: any = { t: r2(t), slot: d.slot, flag: !!d.engagement || (sim.engagements ?? []).some((e: any) => e.defender === d), qbDepth: r2(depth(q)) };
      if (near && near.r <= 1.2) { const b = near.o; const dq = Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y), bq = Math.hypot(b.pos.x - q.pos.x, b.pos.y - q.pos.y);
        const rx = q.pos.x - d.pos.x, ry = q.pos.y - d.pos.y, bx = b.pos.x - d.pos.x, by = b.pos.y - d.pos.y;
        const ang = Math.acos(Math.max(-1, Math.min(1, (rx * bx + ry * by) / Math.max(1e-6, Math.hypot(rx, ry) * Math.hypot(bx, by))))) * 57.3;
        const it = sim.intents?.[b.idx], sup = b.body.support, m = b.profile.massKg;
        Object.assign(p, { blocker: b.slot, shape: bq < dq - 0.3 && ang < 45 ? 'in front' : 'edge', bDepth: r2(depth(b)), set: OL.has(b.slot) ? r2(b.passSet?.depth ?? passSetDepth(sim, b)) : null,
          req: it?.vel ? r2(-it.vel.x * dir) : null, ach: r2(-b.vel.x * dir), felt: sup ? r2(-sup.felt.x * dir / (m * G)) : null, engagedWith: b.engagement?.defender === d }); }
      rec.press = p; };
    const res = sim.run(); rec.throw = sim.throwAt >= 0 ? r2(sim.throwAt - t0) : null; console.log(JSON.stringify(rec)); return res; } } });
}
