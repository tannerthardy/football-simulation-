// The contact load a QB takes during his throwing motion (Flex, 2026-11-13: the windup is immune to a rusher arriving
// within a yard; the physics half is to make that contact act on the throw). Per throw: the contact impulse on his body
// over the windup (the support's received load x dt, kg·yd/s) and as a velocity change (/ his mass, yd/s), split before
// and after the delivery's start (sim.deliveryAt); whether a defender was within 1.0 yd during it; whether a tackle
// bond existed at the delivery's start; the pass result.
// usage: [flags] node --import tsx scripts/diag/effective-mass/windup-load.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    let cur: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const qb = sim.qb, inMotion = sim.windupAt >= 0 && sim.throwAt < 0 && sim.carrier === qb;
      tick();
      if (!inMotion) { if (cur && sim.throwAt >= 0 && !cur.done) { cur.done = true; rows.push(cur); } return; }
      if (!cur) cur = { pre: 0, post: 0, near: false, bondAtDelivery: false, m: qb.profile.massKg, preDV: 0, postDV: 0 };
      const L = qb.body.support?.load ?? { x: 0, y: 0 }, J = Math.hypot(L.x, L.y) * sim.dt;
      const delivering = sim.deliveryAt >= 0 && sim.t >= sim.deliveryAt;
      if (delivering) cur.post += J; else cur.pre += J;
      if (delivering && cur.bondAtDelivery === false && sim.bond?.carrier === qb) cur.bondAtDelivery = true;
      for (const d of sim.defense) if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.0) cur.near = true;
    };
    const r = sim.run();
    if (cur && !cur.done) { cur.done = true; cur.noRelease = true; rows.push(cur); }
    return r;
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, f] of [['defender within 1 yd during the motion', (r: any) => r.near], ['none within 1 yd', (r: any) => !r.near]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  console.log(`${lab}: throws ${R.length} | contact impulse before the delivery p50/p90 ${q(R.map((r) => r.pre), .5)}/${q(R.map((r) => r.pre), .9)}, during it ${q(R.map((r) => r.post), .5)}/${q(R.map((r) => r.post), .9)} kg·yd/s`
    + ` | as velocity change before/during p90 ${q(R.map((r) => r.pre / r.m), .9)}/${q(R.map((r) => r.post / r.m), .9)} yd/s | a tackle bond at the delivery's start ${(100 * R.filter((r) => r.bondAtDelivery).length / R.length).toFixed(0)}%`);
}
