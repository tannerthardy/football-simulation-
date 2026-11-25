// Hitch staged case (Run Game, 2026-11-25, Integration's card e139), measurement only. One receiver (X) has just caught
// a hitch, standing, facing the quarterback; one corner (CB_S) GAP yd off, straight downfield or at ANGLE deg off the
// line toward the sideline, backpedal speed V0 toward him at zero (standing); everyone else out of the play. Both
// controllers run (the carrier chooses his own path); his picture of the corner is current (24 records). Per tick: the
// centre distance, the corner's speed and command, whether a reach / flight is live, the bond, events; summary: tackled
// (yards after the catch), or not and why. Usage: <flags> node --import tsx hitch-stage.mts [GAP=3] [ANGLE=0]
const W = process.cwd();
const { CENTER_Y } = await import(`${W}/src/core/field.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const T: any = await import(`${W}/src/sim/tackle.ts`);
const GAP = Number(process.argv[2] ?? 3), ANGLE = Number(process.argv[3] ?? 0) * Math.PI / 180;
const r2 = (v: number) => Math.round(v * 100) / 100;
const res: string[] = [];
for (const seed of [45, 46, 47, 48, 49, 50, 51, 52]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'A offense', 'AOF'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'A defense', 'ADF'), 'nickel'), seed,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'hitch' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, audibles: false }) as any;
  const c = sim.slot('X')!, d = sim.slot('CB_S')!;
  for (const a of sim.agents) if (a !== c && a !== d) { a.downUntil = 99; a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  const dir = sim.attackDir(c.team);
  c.body.pos = { x: 45, y: 10 }; c.body.vel = { x: 0, y: 0 }; c.body.facing = dir > 0 ? Math.PI : 0;
  d.body.pos = { x: 45 + GAP * Math.cos(ANGLE) * dir, y: 10 - GAP * Math.sin(ANGLE) }; d.body.vel = { x: 0, y: 0 }; d.body.facing = dir > 0 ? Math.PI : 0;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 3; sim.throwAt = 2; sim.t = 3; sim.world.time = 3;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const lines: string[] = []; let seen = sim.events.length, minD = 9;
  for (let k = 0; k < 60 && sim.phase === 'live'; k++) {
    sim.tick();
    const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); minD = Math.min(minD, dd);
    const ev = sim.events.slice(seen).filter((e: any) => e.a === d.idx || e.b === d.idx || e.a === c.idx).map((e: any) => `${e.type}${e.note ? ':' + e.note : ''}`); seen = sim.events.length;
    const cmd = sim.intents[d.idx]?.vel;
    lines.push(`t${r2(sim.t - 3)} d=${r2(dd)} cxy=${r2((c.pos.x - 45) * dir)},${r2(c.pos.y - 10)} cv=${r2(Math.hypot(c.vel.x, c.vel.y))} dv=${r2(Math.hypot(d.vel.x, d.vel.y))} cmd=${cmd ? r2(Math.hypot(cmd.x, cmd.y)) : '-'} reach=${T.reachOf?.(d) ? 1 : 0} dsup=${d.body.support?.state?.[0]} bond=${sim.bond ? sim.bond.tacklers.length : 0} ${ev.join(',')}`);
  }
  const endX = sim.endSpot ? sim.endSpot.x : c.pos.x;
  const evs = sim.events.filter((e: any) => e.a === d.idx).map((e: any) => `${e.type}${e.note ? ':' + e.note : ''}`).filter((s: string) => !s.startsWith('read:'));
  res.push(`seed ${seed}: ${sim.phase === 'dead' ? 'DOWN' : 'live at 3 s'}, yac ${r2((endX - 45) * dir)}, closest ${r2(minD)}; corner: ${evs.join(' ') || 'no tackle event'}`);
  if (seed === 45 || process.env.STAGE_ALL) console.log(`\n== seed ${seed}\n` + lines.join('\n'));
}
console.log('\n' + res.join('\n'));
