// Trailing pursuit staged cases (Run Game, 2026-11-25, Integration), measurement only. A receiver (X) has caught on the
// run: CASE=safety: carrier at SPEED straight upfield, a trailing corner (CB_S) 1.5 yd behind him at the same speed, a
// safety (FS) 10 yd ahead and 4 yd to the side, standing; he should be tackled by the safety. CASE=trail: the trailer
// alone, the carrier commanded at SPEED below the corner's top speed (a speed edge); he should run him down. The
// carrier's command is fixed (the World decides what his body does); the defenders' controllers run. Per tick: each
// defender's distance, speed, commanded speed, reach/flight live; summary: who tackled, when, yards.
// CASE=ahead: one carrier in space (his own controller, starting at SPEED) and one safety 10 yd ahead, LAT yd to the side
// (env, default 4), standing; nobody else. He should be tackled or forced to the sideline nearly every time.
// Usage: <flags> node --import tsx trail-stage.mts [CASE=safety|trail|ahead] [SPEED=7]
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const T: any = await import(`${W}/src/sim/tackle.ts`);
const CASE = process.argv[2] ?? 'safety', SPEED = Number(process.argv[3] ?? 7);
const r2 = (v: number) => Math.round(v * 100) / 100;
const res: string[] = [];
for (const seed of [45, 46, 47, 48, 49, 50]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'A offense', 'AOF'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'A defense', 'ADF'), 'nickel'), seed,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'stage' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 30, ballY: 26, firstDownX: 40, audibles: false }) as any;
  const c = sim.slot('X')!, t = sim.slot('CB_S')!, s = sim.slot('FS')!;
  const live = CASE === 'safety' ? [c, t, s] : CASE === 'ahead' ? [c, s] : [c, t];
  for (const a of sim.agents) if (!live.includes(a)) { a.downUntil = 99; a.body.pos = { x: 2 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  const dir = sim.attackDir(c.team), f = dir > 0 ? 0 : Math.PI;
  c.body.pos = { x: 40, y: 20 }; c.body.vel = { x: SPEED * dir, y: 0 }; c.body.facing = f;
  t.body.pos = { x: 40 - Number(process.env.TRAIL_GAP ?? 1.5) * dir, y: 20 }; t.body.vel = { x: (SPEED - Number(process.env.TRAIL_DV ?? 0)) * dir, y: 0 }; t.body.facing = f;
  if (CASE === 'ahead') { s.body.pos = { x: 40 + 10 * dir, y: 20 + Number(process.env.LAT ?? 4) }; s.body.vel = { x: 0, y: 0 }; s.body.facing = f + Math.PI; }
  if (CASE === 'safety') { s.body.pos = { x: 50 * (dir > 0 ? 1 : 0) + (dir > 0 ? 0 : 30), y: 24 }; s.body.pos.x = 40 + 10 * dir; s.body.vel = { x: 0, y: 0 }; s.body.facing = f + Math.PI; }
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 3; sim.throwAt = 2; sim.t = 3; sim.world.time = 3;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any, dt: number) => { if (CASE !== 'ahead') intents[c.idx] = { ...intents[c.idx], vel: { x: SPEED * dir, y: 0 }, facing: f }; if (process.env.TRAIL_FIX && CASE !== 'ahead') intents[t.idx] = { ...intents[t.idx], vel: { x: (SPEED - Number(process.env.TRAIL_DV ?? 0)) * dir, y: 0 }, facing: f }; return step(intents, dt); };
  const lines: string[] = []; let seen = sim.events.length; const minD = new Map<any, number>();
  for (let k = 0; k < 80 && sim.phase === 'live'; k++) {
    sim.tick();
    const parts: string[] = [];
    for (const d of live.slice(1)) {
      const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); minD.set(d, Math.min(minD.get(d) ?? 9, dd));
      const cmd = sim.intents[d.idx]?.vel;
      parts.push(`${d.player.position}:fc=${T.lungeForecast ? r2(T.lungeForecast(sim, d, c, c.pos, c.vel).gap) : '-'} d=${r2(dd)} v=${r2(Math.hypot(d.vel.x, d.vel.y))} cmd=${cmd ? r2(Math.hypot(cmd.x, cmd.y)) : '-'} vmax=${r2(d.profile.vmax)} r=${T.reachOf?.(d) ? 1 : 0} ${d.body.support?.state?.[0]}`);
    }
    const ev = sim.events.slice(seen).filter((e: any) => e.b === c.idx || e.a === c.idx).map((e: any) => `${sim.agents[e.a]?.player.position}:${e.type}${e.note ? ':' + e.note : ''}`).filter((x: string) => !x.includes('read:')); seen = sim.events.length;
    lines.push(`t${r2(sim.t - 3)} cv=${r2(Math.hypot(c.vel.x, c.vel.y))} | ${parts.join(' | ')} ${ev.join(',')}`);
  }
  const endX = sim.endSpot ? sim.endSpot.x : c.pos.x;
  const tk = sim.events.filter((e: any) => e.b === c.idx && (e.type === 'tackle_wrap' || e.type === 'missed_tackle' || e.type === 'broken_tackle')).map((e: any) => `${sim.agents[e.a].player.position}:${e.type}${e.note ? ':' + e.note : ''}@${r2(e.t - 3)}`);
  res.push(`seed ${seed}: ${sim.phase === 'dead' ? (sim.outcome?.kind ?? 'DOWN') : 'live'} y=${r2(c.pos.y)} at ${r2(sim.t - 3)} s, yards ${r2((endX - 40) * dir)}; closest ${[...minD].map(([d, v]) => `${d.player.position} ${r2(v)}`).join(', ')}; ${tk.join(' ') || 'no tackle event'}`);
  if (seed === 45 || process.env.STAGE_ALL) console.log(`\n== seed ${seed}\n` + lines.join('\n'));
}
console.log('\n' + res.join('\n'));
