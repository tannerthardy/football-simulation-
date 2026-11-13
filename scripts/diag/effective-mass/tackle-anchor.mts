// The tackle walked back into the QB (Integration, 2026-11-12: edge rushers reach 2 yd of the QB still level with or
// in front of their tackle on 12-14% of our dropbacks, NFL 3%). Both sides of the contact, from the engine's state,
// every tick of a pass rep between a tackle (LT/RT) and an edge rusher (|y - ball| > 3 yd) with the QB holding and
// the rusher in front of him (not more than 0.3 yd deeper, not inside him).
// Tackle, by phase of his request along x (the attack frame; negative = toward his own goal): kicking (< -0.3 yd/s),
// asking to hold (|x| <= 0.3), other (> 0.3): requested vs achieved x, the ground force on him along x (+ = toward the
// rusher, resisting) against the friction his feet could supply (StepReport.groundImpulseLimit), its utilisation, the
// hands joint's normal force, his support state, posture.
// Rusher: his move and whether it is live (landed, in its window), the push share and speed he asks for (fraction of
// vmax), his ground force toward the tackle and its utilisation.
// Capacity references printed for the bodies seen: traction mu*m*g (TURF_MU 1.1) and leg drive (power*G), each man.
// Units kg*yd/s^2 (1 N = 1.094).
// usage: [flags] node --import tsx scripts/diag/effective-mass/tackle-anchor.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const rows: any[] = [];
const caps = { tk: new Map<any, any>(), r: new Map<any, any>() };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const dir = sim.attackDir('O');
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = sim.agents.map((a: any) => ({ x: a.pos.x, y: a.pos.y }));
      tick();
      const rep = sim.lastStep; if (!rep || sim.carrier !== sim.qb || sim.throwAt >= 0) return;
      for (const tk of sim.offense) {
        if (tk.slot !== 'LT' && tk.slot !== 'RT') continue;
        const e = tk.engagement; if (!e || e.type !== 'pass' || e.blocker !== tk) continue;
        const d = e.defender; if (Math.abs(d.pos.y - sim.ballY) <= 3) continue;
        const out = Math.sign(tk.pos.y - sim.ballY) || 1;
        const depth = (d.pos.x - tk.pos.x) * dir, width = out * (d.pos.y - tk.pos.y);
        if (depth < -0.3 || width < -0.3) continue;                         // past him or inside him
        const it = sim.intents[tk.idx], id = sim.intents[d.idx], dt = sim.dt;
        const req = (it?.vel.x ?? 0) * dir, phase = req < -0.3 ? 'kicking' : req <= 0.3 ? 'asking to hold' : 'other';
        const gT = rep.groundImpulse[tk.idx], gR = rep.groundImpulse[d.idx];
        const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === tk.body && j.b === d.body) || (j.a === d.body && j.b === tk.body)));
        const live = sim.t < e.moveUntil && e.moveOk;
        if (!caps.tk.has(tk.player.id)) { const p = supportParams(tk.profile); caps.tk.set(tk.player.id, { traction: p.traction, push: p.pushForce, mass: tk.profile.massKg }); }
        if (!caps.r.has(d.player.id)) { const p = supportParams(d.profile); caps.r.set(d.player.id, { traction: p.traction, push: p.pushForce, mass: d.profile.massKg }); }
        rows.push({ t: sim.t, phase, req, ach: tk.vel.x * dir, moved: (tk.pos.x - before[tk.idx].x) * dir / dt,
          gx: gT.x * dir / dt, glim: rep.groundImpulseLimit[tk.idx] / dt, gutil: Math.hypot(gT.x, gT.y) / Math.max(1e-9, rep.groundImpulseLimit[tk.idx]),
          N: j?.normalForce ?? 0, state: tk.body.support?.state ?? 'up', posture: tk.body.support?.posture ?? NaN,
          move: e.move, live, push: id?.push ?? NaN, rspeed: id ? Math.hypot(id.vel.x, id.vel.y) / d.profile.vmax : NaN,
          rgx: -gR.x * dir / dt, rgutil: Math.hypot(gR.x, gR.y) / Math.max(1e-9, rep.groundImpulseLimit[d.idx]), depth });
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
const T = [...caps.tk.values()], R = [...caps.r.values()];
console.log(`capacity references (p50): tackle mass ${q(T.map((c) => c.mass)).toFixed(0)} kg, traction ${q(T.map((c) => c.traction)).toFixed(0)}, push (min(leg drive, traction)) ${q(T.map((c) => c.push)).toFixed(0)} | rusher mass ${q(R.map((c) => c.mass)).toFixed(0)} kg, traction ${q(R.map((c) => c.traction)).toFixed(0)}, push ${q(R.map((c) => c.push)).toFixed(0)} (kg*yd/s^2)`);
for (const ph of ['kicking', 'asking to hold', 'other']) {
  for (const [lo, hi] of [[0, 1.5], [1.5, 2.5], [2.5, 9]]) {
    const S = rows.filter((r) => r.phase === ph && r.t >= lo && r.t < hi); if (S.length < 20) continue;
    const moves: Record<string, number> = {}; for (const r of S) { const k = `${r.move}${r.live ? '*' : ''}`; moves[k] = (moves[k] ?? 0) + 1; }
    const top = Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${pc(v, S.length)}`).join(' ');
    console.log(`${ph}, ${lo}-${hi} s (ticks ${S.length}): tackle requested x p50 ${q(S.map((r) => r.req)).toFixed(2)}, achieved ${q(S.map((r) => r.ach)).toFixed(2)} yd/s (carried back > 1 yd/s ${pc(S.filter((r) => r.ach < -1).length, S.length)})`
      + ` | his ground force toward the rusher p50 ${q(S.map((r) => r.gx)).toFixed(0)} of a friction limit ${q(S.map((r) => r.glim)).toFixed(0)} (utilisation p50 ${q(S.map((r) => r.gutil)).toFixed(2)}, >= 0.95: ${pc(S.filter((r) => r.gutil >= 0.95).length, S.length)})`
      + ` | hands N p50 ${q(S.map((r) => r.N)).toFixed(0)} | not 'up' ${pc(S.filter((r) => r.state !== 'up').length, S.length)}, posture ${q(S.map((r) => r.posture)).toFixed(2)}`);
    console.log(`     rusher: moves ${top} (live ${pc(S.filter((r) => r.live).length, S.length)}) | push p50 ${q(S.map((r) => r.push)).toFixed(2)}, asks ${q(S.map((r) => r.rspeed)).toFixed(2)} of vmax | ground force toward the tackle p50 ${q(S.map((r) => r.rgx)).toFixed(0)} (utilisation ${q(S.map((r) => r.rgutil)).toFixed(2)}, >= 0.95: ${pc(S.filter((r) => r.rgutil >= 0.95).length, S.length)})`);
  }
}
