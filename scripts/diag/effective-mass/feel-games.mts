// The QB's felt time to contact against the true time over whole games (BLOCK_SEEN read, 2026-11-12). Every pass play,
// each 0.1 s while he holds the ball after the snap: for each defender within 3 yd, his estimate (felt picture + held)
// and the true time (true state, no hold), whether the sim has the rusher engaged, and whether that engagement is stale
// (the rusher's body beyond the blocker's arm's length: centres more than the blocker's reach + the rusher's radius). Per play: the first moment a defender is truly within
// 0.5 s and whether he already felt someone within 0.5 s by then. One JSON line per play.
// Also (2026-11-12) each sample's rush type as the QB sees it -- free (no offensive body within arm's length of the
// rusher), through (one on his path to the QB), ride (one in contact beside him) -- and the realized time: until that
// defender's centre first came within 1.3 yd of the QB's while he still held the ball (null if he never did).
// usage: [flags] node --import tsx scripts/diag/effective-mass/feel-games.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { timeToReach } = await import(`${W}/src/physics/reach.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; const pairs: any[] = []; let next = 0; const arrive = new Map<number, number>(); let firstTrue: number | null = null, feltBy: number | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!qb || sim.carrier !== qb || sim.throwAt >= 0 || sim.t + 1e-9 < next || sim.t < 0.3) return; next = sim.t + 0.1;
      const b = qb.behavior; if (typeof b?.held !== 'function') return;
      const pr = b.pressure(qb, sim); if (feltBy === null && pr.time <= 0.5) feltBy = sim.t;
      for (const d of sim.defense) {
        if (d.isDown(sim.t)) continue;
        const tru = timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8);
        if (firstTrue === null && tru <= 0.5) firstTrue = sim.t;
        if (!arrive.has(d.idx) && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.3) arrive.set(d.idx, sim.t);
        if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 3) continue;
        const seen = b.felt(qb, sim, d), held = b.held(qb, d, sim);
        let est = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8) + held;
        // FREE_BOUND: the estimate pressure() itself uses.
        if (process.env.FREE_BOUND === '1' && typeof b.freeBound === 'function') est = Math.min(est, b.freeBound(qb, sim, d, seen));
        const e = d.engagement;
        const stale = !!e && Math.hypot(e.blocker.pos.x - d.pos.x, e.blocker.pos.y - d.pos.y) > e.blocker.profile.reach + d.profile.radius;
        // Rush type, as the QB sees it.
        const rp = seen.pos, L = Math.hypot(qb.pos.x - rp.x, qb.pos.y - rp.y) || 1, ux = (qb.pos.x - rp.x) / L, uy = (qb.pos.y - rp.y) / L;
        let type = 'free';
        for (const o of sim.offense) {
          if (o === qb || o.isDown(sim.t)) continue;
          const bp = b.felt(qb, sim, o).pos;
          if (Math.hypot(bp.x - rp.x, bp.y - rp.y) > o.profile.reach + d.profile.radius) continue;
          const along = (bp.x - rp.x) * ux + (bp.y - rp.y) * uy, off = Math.abs((bp.x - rp.x) * uy - (bp.y - rp.y) * ux);
          type = along > 0 && along < L && off < d.profile.radius + o.profile.radius ? 'through' : (type === 'through' ? type : 'ride');
        }
        pairs.push([r2(est), r2(tru), e ? 1 : 0, stale ? 1 : 0, r2(held), type, d.idx, r2(sim.t)]);
      } };
    const res = sim.run(); const ev = sim.events.map((e: any) => e.type);
    for (const p of pairs) p.push(arrive.has(p[6]) ? r2(arrive.get(p[6])! - p[7]) : null);
    console.log(JSON.stringify({ pairs, firstTrue: r2(firstTrue ?? NaN), feltBy: r2(feltBy ?? NaN), sack: ev.includes('sack'), thrown: sim.throwAt >= 0 }));
    return res; } } });
}
