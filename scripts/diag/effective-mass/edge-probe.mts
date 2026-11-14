// Edge rusher against the tackle, requested vs achieved (Integration, 2026-11-12, edge-rush.py: our edge rushers win
// as often as the NFL's but in front of the tackle, who ends deeper than the QB). Every dropback, each side: the tackle
// (outermost OL at the snap) and the edge rusher (as edge-rush.py: DL/LB within 1.6 yd of the line, 0-4 yd outside the
// tackle, widest, rushing by 1.0 s). At 1.0 / 1.5 / 2.0 / 2.5 / 3.0 s while the QB holds the ball: the tackle's and the
// rusher's requested velocity (this tick's intent) and achieved velocity along x (toward the QB is -x for the rusher,
// the tackle's kick is -x), whether they are engaged (the World's hands joint between them), the tackle's depth and
// the QB's. One JSON line per edge rush.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-probe.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
const TIMES = [1.0, 1.5, 2.0, 2.5, 3.0];
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const dir = sim.attackDir('O');
    const X = (x: number) => (x - sim.los) * dir;
    let pairs: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const qb = sim.qb; if (!qb) return;
      if (!pairs) {
        const OL = sim.offense.filter((o: any) => ['OT', 'OG', 'C'].includes(o.player.position));
        if (OL.length < 5) { pairs = []; return; }
        pairs = [];
        for (const side of [-1, 1]) {
          const tk = OL.reduce((m: any, o: any) => side * (o.pos.y - sim.ballY) > side * (m.pos.y - sim.ballY) ? o : m);
          const cand = sim.defense.filter((d: any) => ['EDGE', 'DT', 'LB'].includes(d.player.position) && X(d.pos.x) <= 1.6)
            .map((d: any) => ({ d, w: side * (d.pos.y - tk.pos.y) })).filter((c: any) => c.w >= 0 && c.w <= 4);
          if (!cand.length) continue;
          const { d, w } = cand.reduce((m: any, c: any) => c.w > m.w ? c : m);
          pairs.push({ tk, d, side, w0: r2(w), x0: X(d.pos.x), snaps: {} as any });
        }
      }
      if (sim.carrier !== qb || sim.throwAt >= 0) return;
      for (const pr of pairs) for (const T of TIMES) if (!pr.snaps[T] && sim.t >= T - 1e-9 && sim.t < T + sim.dt) {
        const it = sim.intents?.[pr.tk.idx]?.vel, id = sim.intents?.[pr.d.idx]?.vel;
        const engaged = sim.world.joints.some((j: any) => j.kind === 'hands' && ((j.a === pr.tk.body && j.b === pr.d.body) || (j.a === pr.d.body && j.b === pr.tk.body)));
        pr.snaps[T] = { tReq: r2(it ? it.x * dir : NaN), tAch: r2(pr.tk.vel.x * dir), tDepth: r2(X(pr.tk.pos.x)),
          rReq: r2(id ? id.x * dir : NaN), rAch: r2(pr.d.vel.x * dir), rReqLat: r2(id ? pr.side * id.y : NaN), rAchLat: r2(pr.side * pr.d.vel.y),
          engaged, qbDepth: r2(X(qb.pos.x)), rDepth: r2(X(pr.d.pos.x)), rSpeed: r2(Math.hypot(pr.d.vel.x, pr.d.vel.y)) };
      }
    };
    const res = sim.run();
    for (const pr of pairs ?? []) if (pr.x0 !== undefined && pr.snaps[1.0] && pr.snaps[1.0].rDepth < pr.x0 - 1.0)
      console.log(JSON.stringify({ side: pr.side, w0: pr.w0, rpos: pr.d.player.position, snaps: pr.snaps }));
    return res; } } });
}
