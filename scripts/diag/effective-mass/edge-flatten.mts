// The edge's flatten, requested against achieved (Integration, 2026-11-15: split (i) the request from (ii) the bend).
// Same event as scripts/diag/pass-operators/edge-flatten.py: the first tick, from 0.3 s with the QB holding the ball, at
// which the paired edge rusher (outermost defender within 4 yd outside a tackle and 2 yd of the line at the snap) is
// more than 0.3 yd deeper than his tackle while still outside him: the tackle's hip, where the coaching says he
// flattens to the QB's upfield shoulder. At the event and +0.25 / +0.5 / +1.0 s: his requested and achieved heading,
// each against the bearing to the QB (0 = straight at him; + = still wider, his outside), his requested and achieved
// speed, his turn rate, whether he is engaged with the tackle's hands on, and his distance to the QB. Measurement only.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-flatten.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const OFF = [0, 0.25, 0.5, 1.0];
const evs: any[] = [];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const by = sim.ballY, dir = sim.attackDir(sim.offense[0].team);
  const pairs = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT').map((t: any) => {
    const out = Math.sign(t.pos.y - by) || 1;
    const d = sim.defense.filter((x: any) => { const w = (x.pos.y - t.pos.y) * out; return w >= 0 && w <= 4 && Math.abs(x.pos.x - sim.los) < 2; })
      .sort((a: any, b: any) => (b.pos.y - t.pos.y) * out - (a.pos.y - t.pos.y) * out)[0];
    return d ? { t, d, out, t0: null as number | null, rows: {} as any, prevH: null as number | null } : null;
  }).filter(Boolean);
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const p of pairs) {
      const { t, d, out } = p;
      if (p.t0 === null) {
        if (sim.throwAt >= 0 || sim.t < 0.3 || d.behavior?.kind !== 'rush') continue;
        if ((d.pos.x - t.pos.x) * dir < -0.3 && (d.pos.y - t.pos.y) * out > 0) p.t0 = sim.t; else continue;
      }
      const dt = sim.t - p.t0!;
      const h = Math.atan2(d.vel.y, d.vel.x);
      for (const o of OFF) if (!p.rows[o] && dt >= o - 1e-9 && dt < o + sim.dt) {
        const qb = sim.qb, bq = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x), iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 };
        // + = his heading is outside the bearing to the QB (wider than straight at him, toward his own sideline side).
        const signed = (a: number) => wrap(a - bq) * (out * dir > 0 ? -1 : 1) * 180 / Math.PI;
        p.rows[o] = { req: Math.hypot(iv.x, iv.y) > 0.2 ? signed(Math.atan2(iv.y, iv.x)) : NaN, ach: Math.hypot(d.vel.x, d.vel.y) > 0.3 ? signed(h) : NaN,
          rs: Math.hypot(iv.x, iv.y), as: Math.hypot(d.vel.x, d.vel.y), turn: p.prevH === null ? NaN : Math.abs(wrap(h - p.prevH)) / sim.dt * 180 / Math.PI,
          eng: !!d.engagement && d.engagement.blocker === t, toQB: Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y), held: sim.throwAt >= 0 };
      }
      p.prevH = h;
    }
  };
  const res = sim.run();
  for (const p of pairs) if (p.t0 !== null) evs.push(p);
  return res;
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(0.5 * (s.length - 1))] : NaN; };
console.log(`edge rushers reaching the tackle's hip: ${evs.length} (heading against the bearing to the QB, + = still wider)`);
for (const o of OFF) {
  const S = evs.map((e) => e.rows[o]).filter(Boolean), f = (k: string, X = S) => q(X.map((r: any) => r[k]));
  const eng = S.filter((r: any) => r.eng);
  console.log(`  +${o.toFixed(2)} s (n ${S.length}): asks heading ${f('req').toFixed(0)} deg at ${f('rs').toFixed(1)} yd/s | runs ${f('ach').toFixed(0)} deg at ${f('as').toFixed(1)} yd/s | turn rate ${f('turn').toFixed(0)} deg/s | engaged with the tackle ${(100 * eng.length / Math.max(1, S.length)).toFixed(0)}% (asks / runs ${f('req', eng).toFixed(0)} / ${f('ach', eng).toFixed(0)} deg) | to the QB ${f('toQB').toFixed(1)} yd`);
}
