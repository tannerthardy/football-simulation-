// Whole-game runs for the GRASP_PATCH question (Integration, 2026-11-10): why whole games lose twice the stuffs the
// fixed run set does. One JSON line per designed run in live games (one arm; settings at load): down, distance, yards
// to goal, box count at the snap (defenders up to 8 yd off the ball and within 5 yd of the centre laterally), yards,
// outcome; first contact (first defender within 1.0 yd of the carrier after the handoff): x from the LOS, how many
// defenders are within 1.5 yd then and by +0.5 s, the line of centres' turn by +0.3 s, the runner's gain from contact;
// and every defender who came within 1.0 yd: when, whether he got a grasp, whether it broke, and how far the runner
// went after he first touched him. usage: node --import tsx scripts/diag/effective-mass/game-runs.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 16);
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let n = 0;
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const idx = n++; if (sim.isPass) return undefined;
    const up = sim.attackDir('O'), C = sim.offense.find((a: any) => a.slot === 'C') ?? sim.offense[0];
    const o: any = { id: `g${s}-${idx}`, down: sim.down, dist: +Math.abs(sim.firstDownX - sim.los).toFixed(1), toGoal: +Math.abs((up > 0 ? 110 : 10) - sim.los).toFixed(1), call: sim.offCall?.label,
      box: sim.defense.filter((d: any) => { const dep = (d.pos.x - sim.los) * up; return dep >= -0.5 && dep <= 8 && Math.abs(d.pos.y - C.pos.y) <= 5; }).length, touches: [] as any[] };
    const tick = sim.tick.bind(sim); let t0 = -1, c0: any = null, hit: any = null, a0 = 0, x0 = 0; const seen = new Map<any, any>();
    sim.tick = () => { tick(); const c = sim.carrier; if (!c || sim.handoffAt < 0 || (c0 && c !== c0)) return;
      for (const d of sim.defense) { if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) > 1.0 || seen.has(d)) continue;
        const r = { slot: d.slot, t: +sim.t.toFixed(2), x: +((c.pos.x - sim.los) * up).toFixed(2), grasp: false, broke: false, body: d.body ?? d }; seen.set(d, r); o.touches.push(r); }
      for (const jt of sim.world?.joints ?? []) if (jt.kind === 'grasp') for (const [d, r] of seen) if (jt.a === r.body || jt.a === d) { r.grasp = true; if (jt.broken) r.broke = true; }
      if (t0 < 0) { if (!seen.size) return; t0 = sim.t; c0 = c; hit = [...seen.keys()][0];
        a0 = Math.atan2(hit.pos.y - c.pos.y, hit.pos.x - c.pos.x); x0 = c.pos.x; o.cx = +((c.pos.x - sim.los) * up).toFixed(2);
        o.near0 = sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 1.5).length; return; }
      const dt = sim.t - t0;
      if (Math.abs(dt - 0.3) < 0.026) { const a = Math.atan2(hit.pos.y - c.pos.y, hit.pos.x - c.pos.x); o.turn = +(Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI).toFixed(0); }
      if (Math.abs(dt - 0.5) < 0.026) o.near5 = sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 1.5).length; };
    const r = sim.run();
    o.yards = +r.yards.toFixed(2); o.outcome = r.outcome; if (c0) o.afterContact = +((c0.pos.x - x0) * up).toFixed(2);
    const endX = c0 ? (c0.pos.x - sim.los) * up : null;
    for (const t of o.touches) { delete t.body; if (endX !== null) t.after = +(endX - t.x).toFixed(2); }
    console.log(JSON.stringify(o)); return r; } } });
}
