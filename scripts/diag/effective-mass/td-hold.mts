// Pass touchdowns and holds (Integration, 2026-11-11: run-ref-21 league cards show pass TD rate 7.6 -> 8.9% at about the
// same yards). Same teams as sim-export (one roster pair from the seed, per-game identities). Every completed pass: the
// catch spot (yards to the goal), whether the catcher was held (any grasp on him) and from where, the yards he gained
// after the first hold, the holds' ends, and whether it scored. Flags via env.
// usage: [flags] node --import tsx scripts/diag/effective-mass/td-hold.mts [seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, withIdentity } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { OPP_GOAL_X, OWN_GOAL_X } = await import(`${W}/src/core/field.ts`);
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 16);
// TRACE=1: also print, for held TDs whose first hold came inside 10 yd, the play tick by tick after the first hold.
const TRACE = process.env.TRACE === '1';
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(withIdentity(home, seed + g), withIdentity(away, seed + g), { seed: seed + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    let rec: any = null; const tick = sim.tick.bind(sim); const holds = new Map<any, any>(); const ticks: string[] = [];
    sim.tick = () => { tick();
      const c = sim.carrier; if (!c || c === sim.qb || sim.throwAt < 0) return;
      const dir = sim.attackDir(c.team), goal = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X, x = c.pos.x;
      if (!rec) rec = { catchToGoal: r2((goal - x) * dir), firstHoldX: null, firstHoldToGoal: null, from: null, maxHolders: 0, ends: [] as string[], fellAfterHold: null, t0: sim.t, tHold: null, dir, goal };
      for (const j of sim.world.joints) if (j.kind === 'grasp' && j.b === c.body && !holds.has(j)) {
        holds.set(j, true);
        if (rec.firstHoldX === null) { rec.firstHoldX = x; rec.firstHoldToGoal = r2((goal - x) * dir); rec.tHold = sim.t;
          const rx = j.a.pos.x - c.pos.x, ry = j.a.pos.y - c.pos.y, sp = Math.hypot(c.vel.x, c.vel.y), cos = sp > 0.5 ? (rx * c.vel.x + ry * c.vel.y) / (Math.hypot(rx, ry) * sp) : 1;
          rec.from = cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side'; rec.legs0 = r2(j.legs); rec.lock0 = r2(j.lock ?? NaN); } }
      for (const [j, v] of holds) if (v === true && (j.broken || !sim.world.joints.includes(j))) { holds.set(j, false); rec.ends.push(j.broken ? 'broke' : 'removed'); }
      rec.maxHolders = Math.max(rec.maxHolders, new Set(sim.world.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body).map((j: any) => j.a)).size);
      rec.lastX = x;
      if (TRACE && rec.firstHoldX !== null) { const gs = sim.world.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body);
        const bi = sim.world.indexOf ? sim.world.indexOf(c.body) : -1, bound = bi >= 0 ? (sim.world.strideHolds?.[bi] ?? 0) : 0;
        ticks.push(`  t+${(sim.t - rec.tHold).toFixed(2)} to goal ${((goal - x) * dir).toFixed(2)} | v ${Math.hypot(c.vel.x, c.vel.y).toFixed(2)} | holders ${new Set(gs.map((j: any) => j.a)).size} legs ${gs.map((j: any) => (j.legs ?? 0).toFixed(2)).join('/')} lock ${gs.map((j: any) => (j.lock ?? 0).toFixed(2)).join('/')} | bound ${bound.toFixed(2)} | runner ${c.body.support?.state} | holders ${gs.map((j: any) => j.a.support?.state).join('/')}`); }
    };
    const res = sim.run();
    if (rec) { const ev = sim.events.map((e: any) => e.type); const td = ev.includes('touchdown') || res?.outcome === 'touchdown';
      const endX = rec.lastX;
      console.log(JSON.stringify({ g, catchToGoal: rec.catchToGoal, held: rec.firstHoldX !== null, from: rec.from, legs0: rec.legs0, lock0: rec.lock0, firstHoldToGoal: rec.firstHoldToGoal,
        afterHold: rec.firstHoldX !== null ? r2((endX - rec.firstHoldX) * rec.dir) : null, ...(TRACE && td && rec.firstHoldToGoal !== null && rec.firstHoldToGoal <= 10 ? { trace: ticks } : {}), holdDur: rec.tHold !== null ? r2(sim.t - rec.tHold) : null, maxHolders: rec.maxHolders, ends: rec.ends, td, yards: r2(res?.yards ?? NaN), outcome: res?.outcome })); }
    return res; } } });
}
