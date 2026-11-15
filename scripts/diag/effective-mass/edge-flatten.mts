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
// 2026-11-15 (Integration: the hands at the hip): the hands joint between tackle and rusher (edge-past.mts's reading),
// whose hands, its normal force; the rep's move and whether it is live (in its window and landed).
function hands(sim: any, t: any, d: any) {
  const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === t.body && j.b === d.body) || (j.a === d.body && j.b === t.body)));
  const e = d.engagement && d.engagement.blocker === t ? d.engagement : null;
  // The joint's owner is a (the actor may differ under technique); its capacities push / steer / hold (N); lastN is the
  // last step's normal force (RUSH_HANDS only); handsOn (2 when unset); grip (OPEN_HANDS: fingers on cloth).
  const N = 0.9144;
  return { joint: !!j, tackleHands: j ? j.a === t.body : false, force: j?.lastN != null ? j.lastN * N : NaN,
    steerCap: j ? j.steer * N : NaN, holdCap: j ? j.hold * N : NaN, handsOn: j ? (j.handsOn ?? 2) : 0, grip: !!j?.grip,
    move: e?.move ?? null, live: e ? sim.t < e.moveUntil && !!e.moveOk : false, holding: !!e?.holding };
}
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
          eng: !!d.engagement && d.engagement.blocker === t, toQB: Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y), held: sim.throwAt >= 0,
          ...hands(sim, t, d) };
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

// The hands at the hip: by whether the tackle's hands are still on at +0.25 s.
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const E0 = evs.filter((e) => e.rows[0] && e.rows[0.25] && e.rows[1.0]);
for (const [lab, f] of [['hands on at +0.25 s', (e: any) => e.rows[0.25].joint], ['hands off by +0.25 s', (e: any) => !e.rows[0.25].joint]] as [string, (e: any) => boolean][]) {
  const G = E0.filter(f); if (!G.length) continue;
  const m = (o: number, k: string) => q(G.map((e) => e.rows[o][k])).toFixed(1);
  const mv: Record<string, number> = {}; for (const e of G) for (const o of [0, 0.25, 0.5]) { const r = e.rows[o]; if (r.move) { const k = `${r.move}${r.live ? '*' : ''}`; mv[k] = (mv[k] ?? 0) + 1; } }
  console.log(`  ${lab} (n ${G.length}, ${pc(G.length, E0.length)}): at the hip joint ${pc(G.filter((e) => e.rows[0].joint).length, G.length)}, tackle's hands ${pc(G.filter((e) => e.rows[0].tackleHands).length, G.length)}, normal ${q(G.map((e) => e.rows[0].force)).toFixed(0)} N, steer cap ${q(G.map((e) => e.rows[0].steerCap)).toFixed(0)} N, hands on ${q(G.map((e) => e.rows[0].handsOn)).toFixed(0)}, grip ${pc(G.filter((e) => e.rows[0].grip).length, G.length)}, holding ${pc(G.filter((e) => e.rows[0.25].holding).length, G.length)}`
    + ` | at +1.0 s runs ${m(1.0, 'ach')} deg at ${m(1.0, 'as')} yd/s, to the QB ${m(0, 'toQB')} -> ${m(1.0, 'toQB')} yd | moves 0-0.5 s (* live) ${JSON.stringify(mv)}`);
}
