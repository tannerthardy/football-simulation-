// Pass pocket and first pressure on live games (Integration, 2026-11-10: blocked rushers win too soon). One JSON line per
// dropback, in the NFL export's frame (x from the line of scrimmage, offense attacking +x; 0.1 s frames from the snap):
//   ol: the five OL's x by frame; qb: the QB's x, y by frame; throw: the throw time (or null); sack
//   press: the first defender within 2 yd of the QB before the throw: time; slot; ever engaged; engaged then (and his blocker
//          within 1.2 yd or not); for his last engagement before then: when it ended and how (shed = the blocker's shedBy
//          set for him at end + 0.6 s; else apart / other); the QB's displacement from his deepest set point toward him.
// usage: node --import tsx scripts/diag/effective-mass/pass-pocket.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const OLS = ['LT', 'LG', 'C', 'RG', 'RT'];
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const up = sim.attackDir('O'), los = sim.los, X = (a: any) => +((a.pos.x - los) * up).toFixed(2);
    const ol = OLS.map(sl => sim.offense.find((a: any) => a.slot === sl)); if (ol.some((a: any) => !a)) return undefined;
    const rec: any = { ol: [], qb: [], throw: null, sack: false, press: null };
    const seenEng = new Map<any, any>(); const tick = sim.tick.bind(sim); let k = 0, deepest: any = null;
    const frame = () => { rec.ol.push(ol.map(X)); rec.qb.push([X(sim.qb), +(sim.qb.pos.y * 1).toFixed(2)]); };
    frame();
    sim.tick = () => { tick(); const t = sim.t;
      for (const e of sim.engagements ?? []) seenEng.set(e.defender, { e, blocker: e.blocker, start: e.start });
      for (const [d, r] of seenEng) if (r.end === undefined && !(sim.engagements ?? []).includes(r.e)) { r.end = +t.toFixed(2); r.how = Math.abs((r.blocker.shedBy?.get(d) ?? -9) - (t + 0.6)) < 0.06 ? 'shed' : 'apart/other'; }
      if (t >= (k + 1) * 0.1 - 1e-9 && k < 40) { k++; frame(); }
      const q = sim.qb; if (rec.throw === null && sim.throwAt >= 0) rec.throw = +sim.throwAt.toFixed(2);
      if (rec.throw === null && (!deepest || X(q) < deepest.x)) deepest = { x: X(q), y: q.pos.y };
      if (!rec.press && rec.throw === null) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - q.pos.x, a.pos.y - q.pos.y) <= 2);
        if (d) { const r = seenEng.get(d), e = d.engagement;
          const qd = deepest ? { x: X(q) - deepest.x, y: (q.pos.y - deepest.y) } : { x: 0, y: 0 };
          const tox = X(d) - X(q), toy = d.pos.y - q.pos.y, tl = Math.hypot(tox, toy) || 1;
          rec.press = { t: +t.toFixed(2), slot: d.slot, ever: !!r, engagedNow: !!e, blockerNear: e ? Math.hypot(e.blocker.pos.x - d.pos.x, e.blocker.pos.y - d.pos.y) <= 1.2 : (r ? Math.hypot(r.blocker.pos.x - d.pos.x, r.blocker.pos.y - d.pos.y) <= 1.2 : false),
            endT: r?.end ?? null, how: r ? (r.end === undefined ? 'still engaged' : r.how) : 'never blocked', start: r ? +r.start.toFixed(2) : null,
            qbDrift: +((qd.x * tox + qd.y * toy) / tl).toFixed(2), depthD: X(d) }; } } };
    const res = sim.run(); rec.sack = !!sim.stats?.sacked; rec.y = res.yards;
    console.log(JSON.stringify(rec)); return res; } } });
}
