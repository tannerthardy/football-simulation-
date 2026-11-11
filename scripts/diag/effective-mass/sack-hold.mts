// The finish on a quarterback (Integration for Tanner, 2026-11-11: sacks 2.0% of dropbacks vs NFL 6.3%; rushers
// arrive, pressure at release matches, they don't finish). Live games, flags via env. Every dropback (pass play) from the
// first frame a defender's centre is within 1.0 yd of the QB before the ball is out: who, his approach (front/side/
// behind of the QB's facing), whether a hold forms on the QB (sim.bond with the QB as carrier) and when, the hold's peak
// grip/control, whether the QB starts a windup or releases the ball while held (and his held value then), how it ends
// (sack / throw / scramble / other) and the time from first contact to the end. NFL: first defender within 1 yd -> sack
// median 1.1 s. usage: [flags] node --import tsx scripts/diag/effective-mass/sack-hold.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; let rec: any = null; const tick = sim.tick.bind(sim);
    // The QB's own estimate of time to contact (pressure().time, from what he perceives) when his windup starts.
    let wind: any = null, lastWindAt = -1;
    sim.tick = () => { tick();
      if (!qb) return;
      if (sim.windupAt >= 0 && sim.windupAt !== lastWindAt && sim.throwAt < 0) { lastWindAt = sim.windupAt;
        const pr = (qb.behavior as any)?.pressure?.(qb, sim);
        wind = { t: sim.windupAt, est: pr ? r2(Math.min(pr.time, 9)) : null };
      }
      const out = sim.throwAt >= 0;
      if (!rec && !out && !sim.scrambled) {
        let best: any = null;
        for (const d of sim.defense) { const dd = Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y); if (dd <= 1.0 && (!best || dd < best.dd)) best = { d, dd }; }
        if (best) { const b = Math.atan2(best.d.pos.y - qb.pos.y, best.d.pos.x - qb.pos.x), f = qb.body.facing;
          const a = Math.abs(Math.atan2(Math.sin(b - f), Math.cos(b - f))) * 180 / Math.PI;
          rec = { t0: sim.t, slot: best.d.slot, approach: a < 45 ? 'front' : a > 135 ? 'behind' : 'side', engaged: !!best.d.engagement, qbSpeed: r2(Math.hypot(qb.vel.x, qb.vel.y)),
            windupBefore: sim.windupAt >= 0, holdAt: null, peakHeld: 0, windupHeld: null, releaseHeld: null, qbFell: null, end: null, dt: null, lastHeld: 0, windupT: null, deliveryT: null, holdPhase: null }; }
      }
      if (rec && !rec.end) {
        const bond = sim.bond; let held = 0;
        if (rec.windupT === null && sim.windupAt >= 0) rec.windupT = r2(sim.windupAt - rec.t0);
        if (rec.deliveryT === null && sim.deliveryAt >= 0) rec.deliveryT = r2(sim.deliveryAt - rec.t0);
        if (bond && bond.carrier === qb) { held = Math.max(0, ...bond.tacklers.map((d: any) => bond.control?.get(d) ?? bond.grip?.get(d) ?? 1));
          if (rec.holdAt === null) { rec.holdAt = r2(sim.t - rec.t0);
            // When the hold began against his throwing motion: before any windup, during the load (windup started, arm
            // not yet coming forward), or during the delivery (arm already coming forward).
            rec.holdPhase = sim.windupAt < 0 ? 'before windup' : (sim.deliveryAt >= 0 && sim.t >= sim.deliveryAt) ? 'delivery' : 'load'; } }
        rec.peakHeld = Math.max(rec.peakHeld, held);
        if (rec.windupHeld === null && sim.windupAt >= 0 && sim.windupAt >= rec.t0 - 1e-9) rec.windupHeld = r2(held);
        if (rec.qbFell === null && qb.body.support?.state !== 'up') rec.qbFell = r2(sim.t - rec.t0);
        // Where the holds on him are (leg share of each grasp on his body: 0 shoulder line, 0.5 waist, 1 legs), his support.
        const gs = sim.world.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === qb.body);
        if (gs.length) { rec.lastLegs = Math.min(...gs.map((j: any) => j.legs ?? 0)); }
        rec.lastSup = qb.body.support?.state;
        if (out && rec.releaseHeld === null) { rec.releaseLegs = r2(rec.prevLegs ?? NaN); rec.releaseSup = rec.prevSup; rec.releaseHeld = r2(Math.max(held, rec.lastHeld)); rec.end = 'throw'; rec.dt = r2(sim.t - rec.t0); }
        else if (sim.scrambled && !out) { rec.end = 'scramble'; rec.dt = r2(sim.t - rec.t0); }
        rec.lastHeld = held; rec.prevLegs = rec.lastLegs; rec.prevSup = rec.lastSup;
      }
    };
    const res = sim.run();
    if (rec) { const sack = sim.events.some((e: any) => e.type === 'sack');
      if (sack) { rec.end = 'sack'; const e = sim.events.find((e: any) => e.type === 'sack'); rec.dt = r2(e.t - rec.t0); }
      else if (!rec.end) { rec.end = 'other'; rec.dt = r2(sim.t - rec.t0); }
      if (wind) { rec.windEst = wind.est; rec.windToContact = r2(rec.t0 - wind.t); }
      rec.peakHeld = r2(rec.peakHeld); rec.t0 = undefined; rec.lastHeld = undefined; rec.lastLegs = undefined; rec.prevLegs = undefined; rec.lastSup = undefined; rec.prevSup = undefined;
      const ev = sim.events.map((e: any) => e.type); rec.result = ev.includes('interception') ? 'int' : ev.includes('catch') ? 'complete' : ev.includes('incomplete') ? 'incomplete' : null; rec.yards = r2(res?.yards ?? NaN);
      console.log(JSON.stringify(rec)); }
    else console.log(JSON.stringify({ end: 'no-contact', sack: sim.events.some((e: any) => e.type === 'sack') }));
    return res; } } });
}
