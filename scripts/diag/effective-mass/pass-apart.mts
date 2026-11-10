// How a pass rusher gets off his block (Integration, 2026-11-10). Live games, one arm per process. Every OL-DL pass
// engagement that ends while the QB still has the ball, with the last 0.5 s before the end (10 ticks). End reason:
// 'corner' (the rep's beat: the blocker's shedBy set for him; pass reps beat when |phi| >= 1, the rusher hip to hip past
// him toward the QB) or 'apart' (the separation rule: surface gap beyond arm/36 + 0.35 yd) or 'other'. Whether that rusher
// then pressures (first within 2 yd of the QB before the throw). Per tick, along the axis from the rusher to the QB
// (lat = across it, signed + toward the side the rusher is going):
//   phi; the hands row's mean steer (tangent) force / its steer limit and normal force / its push or hold limit;
//   the blocker's requested and achieved lateral velocity, and the rusher's achieved lateral velocity;
//   the blocker's facing against the direction to the rusher (deg); relative slip across their line of centres.
// usage: node --import tsx scripts/diag/effective-mass/pass-apart.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const reps = new Map<any, any>(); const ended: any[] = []; let pressBy: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const q = sim.qb, t = sim.t, holding = sim.throwAt < 0;
      for (const e of sim.engagements ?? []) { if (e.type !== 'pass' || !OL.has(e.blocker.slot) || !DL.test(e.defender.slot)) continue;
        let r = reps.get(e); if (!r) { r = { start: +e.start.toFixed(2), ticks: [] as any[], e }; reps.set(e, r); }
        const b = e.blocker, d = e.defender, ax = { x: q.pos.x - d.pos.x, y: q.pos.y - d.pos.y }, al = Math.hypot(ax.x, ax.y) || 1, ux = ax.x / al, uy = ax.y / al, lx = -uy, ly = ux;
        const h = e.hands, it = sim.intents?.[b.idx];
        const rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, rd = Math.hypot(rx, ry) || 1;
        r.ticks.push({ t, phi: e.phi, steer: h ? Math.abs(h.tangentForce ?? 0) / Math.max(1e-9, h.steer) : NaN,
          normal: h ? ((h.normalForce ?? 0) >= 0 ? (h.normalForce ?? 0) / Math.max(1e-9, h.push) : -(h.normalForce ?? 0) / Math.max(1e-9, h.hold)) : NaN,
          bReq: it?.vel ? it.vel.x * lx + it.vel.y * ly : NaN, bLat: b.vel.x * lx + b.vel.y * ly, dLat: d.vel.x * lx + d.vel.y * ly,
          face: Math.abs(wrap(b.body.facing - Math.atan2(ry, rx))) * 57.3, slip: (-(d.vel.x - b.vel.x) * ry + (d.vel.y - b.vel.y) * rx) / rd, holding }); }
      for (const [e, r] of reps) if (r.end === undefined && !(sim.engagements ?? []).includes(e)) { r.end = t;
        const b = e.blocker, d = e.defender, gap = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - (b.profile.radius + d.profile.radius);
        r.how = Math.abs((b.shedBy?.get(d) ?? -9) - (t + 0.6)) < 0.06 ? 'corner' : gap > 0.9 ? 'apart' : 'other'; r.gap = gap; r.d = d; if (holding) ended.push(r); }
      if (!pressBy && holding) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - q.pos.x, a.pos.y - q.pos.y) <= 2); if (d) pressBy = { d, t }; } };
    const res = sim.run();
    for (const r of ended) { const last = r.ticks.slice(-10); const sgn = Math.sign(last.reduce((a: number, x: any) => a + x.dLat, 0)) || 1;
      console.log(JSON.stringify({ how: r.how, start: r.start, end: +r.end.toFixed(2), gap: +r.gap.toFixed(2), pressed: !!pressBy && pressBy.d === r.d && pressBy.t >= r.end, pressT: pressBy && pressBy.d === r.d ? +pressBy.t.toFixed(2) : null,
        ticks: last.map((x: any) => ({ phi: +Math.abs(x.phi).toFixed(2), steer: +x.steer.toFixed(2), normal: +x.normal.toFixed(2), bReq: +(x.bReq * sgn).toFixed(2), bLat: +(x.bLat * sgn).toFixed(2), dLat: +(x.dLat * sgn).toFixed(2), face: +x.face.toFixed(0), slip: +(x.slip * sgn).toFixed(2) })) })); }
    return res; } } });
}
