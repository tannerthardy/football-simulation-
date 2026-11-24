// Free-arm staged case (Run Game, 2026-11-24, Integration's simple case), measurement only. One blocker square in
// front of one defender (blocker 0.8 yd toward the offense, engagement control set), everyone else out of the play; the
// carrier starts 2 yd back and runs past the defender's free side, centre offset OFF at closest approach, at SPEED.
// Per tick: distance, the free-side read, whether a reach is live, the bond (holders, grip), events. Summary per case:
// a hand on (wrap), held to a fall, broken, reach missed, no reach and why.
// Usage: <flags> node --import tsx free-arm-stage.mts [SPEED=5] [CONTROL=0]
const W = process.cwd();
const { CENTER_Y } = await import(`${W}/src/core/field.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { RUN_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { reachOf } = await import(`${W}/src/sim/tackle.ts`);
const { reachTo } = await import(`${W}/src/sim/tackle-reach.ts`);
const SPEED = Number(process.argv[2] ?? 5), CONTROL = Number(process.argv[3] ?? 0);
const r2 = (v: number) => Math.round(v * 100) / 100;
for (const off of [0.8, 1.0, 1.2, 1.4]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'D'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'stage' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'stage' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 }) as any;
  const c = sim.slot('RB')!, d = sim.slot('DT_S')!, b = sim.slot('RG')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  c.downUntil = d.downUntil = b.downUntil = -1;
  const dir = sim.attackDir(c.team);
  d.body.pos = { x: 41, y: CENTER_Y }; d.body.facing = dir > 0 ? Math.PI : 0;
  b.body.pos = { x: 41 - 0.8 * dir, y: CENTER_Y }; b.body.facing = dir > 0 ? 0 : Math.PI;
  c.body.pos = { x: 41 - 2 * dir, y: CENTER_Y + off }; c.body.vel = { x: SPEED * dir, y: 0 }; c.body.facing = dir > 0 ? 0 : Math.PI;
  sim.t = sim.world.time = 1.2;
  const e = sim.engage(b, d, 'run'); e.control = CONTROL;
  // The carrier's command is fixed: straight past him at SPEED (the World still decides what his body achieves).
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any, dt: number) => { intents[c.idx] = { ...intents[c.idx], vel: { x: SPEED * dir, y: 0 }, facing: dir > 0 ? 0 : Math.PI }; return step(intents, dt); }; sim.ball = { kind: 'held', carrier: c }; sim.handoffAt = 0;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const full = r2(reachTo(d, c, 1));
  const lines: string[] = []; let seen = sim.events.length, minD = 9;
  for (let k = 0; k < 30 && sim.phase === 'live'; k++) {
    try { sim.tick(); } catch (err) { for (const a of sim.agents) { const i = sim.intents[a.idx]; const bad = [a.body.facing, a.body.spin, i?.facing, i?.vel?.x, a.pos.x, a.vel.x, a.body.energy].some((v: any) => v !== undefined && !Number.isFinite(v)); if (bad) console.log("bad", a.player.position, a.idx, a.body.facing, a.body.spin, JSON.stringify(i), a.pos, a.vel, a.body.energy); } throw err; }
    const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); minD = Math.min(minD, dd);
    const ev = sim.events.slice(seen).filter((e: any) => e.a === d.idx || e.b === d.idx || e.a === c.idx).map((e: any) => `${e.type}${e.note ? ':' + e.note : ''}`); seen = sim.events.length;
    const hold = sim.bond?.holds?.get(d);
    lines.push(`t${r2(sim.t - 1.2)} d=${r2(dd)} cx=${r2((c.pos.x - d.pos.x) * dir)} cv=${r2(Math.hypot(c.vel.x, c.vel.y))} eng=${d.engagement ? r2(d.engagement.control) : '-'} reach=${reachOf(d) ? 1 : 0} bond=${sim.bond ? sim.bond.tacklers.length : 0}${hold ? ` grip=${r2(sim.bond.grip?.get(d) ?? 0)} legs=${r2(hold.legs)} f=${r2(hold.force ?? 0)}` : ''} c=${c.body.support?.state} ${ev.join(',')}`);
  }
  const evs = sim.events.filter((e: any) => e.a === d.idx).map((e: any) => `${e.type}${e.note ? ':' + e.note : ''}`);
  console.log(`\n== offset ${off} yd, speed ${SPEED}, control ${CONTROL}: full arm reachTo ${full}, closest ${r2(minD)}; outcome ${sim.outcome?.kind ?? sim.phase}; defender events: ${evs.join(' ') || 'none'}`);
  console.log(lines.join('\n'));
}
