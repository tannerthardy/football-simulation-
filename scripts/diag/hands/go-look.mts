// Defense (HANDS_SEEN / the look): four_verts vs cover1, the throw to X staged at AT s (the QB's motion is his own; only
// the choice is staged). Per seed: the corner on X, his man-look choice (bit 256: in phase, looks), whether he saw the ball
// (handsSees / seenReady) by the arrival, his distance from the receiver at the arrival, and the outcome.
// Usage: <flags> node --import tsx scripts/diag/hands/go-look.mts [N=16] [AT=2.6]
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const D: any = await import(`${W}/src/sim/behaviors/defense.ts`);
const BE: any = await import(`${W}/src/sim/ball-estimate.ts`);
const N = Number(process.argv[2] ?? 16), AT = Number(process.argv[3] ?? 2.6);
const tally: Record<string, number> = {};
for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'four_verts' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'c1' },
    los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at: AT, slot: 'X' } } as never);
  const X = sim.slot('X'); let cb: any = null, saw = false, arr: any = null;
  while (sim.phase !== 'dead' && sim.t < 7) {
    sim.tick();
    if (!cb) cb = sim.defense.find((d: any) => d.behavior?.kind === 'man' && d.behavior.target === X) ?? null;
    if (cb && sim.ball.kind === 'air') {
      const s = BE.estimatesFor(cb) ? sim.ballEstimates?.seenReady(cb, sim) : sim.ballEstimates?.handsSees?.(cb, sim);
      if (s) saw = true;
      const b = sim.ball.flight.pos; const dh = Math.hypot(b.x - X.pos.x, b.y - X.pos.y);
      if (!arr || dh < arr.dh) arr = { dh, t: sim.t, gap: Math.hypot(cb.pos.x - X.pos.x, cb.pos.y - X.pos.y) };
    }
  }
  const look = cb ? D.manLookOf(cb) : undefined;
  const ev = sim.events.filter((e: any) => ['pbu', 'interception', 'catch', 'incomplete', 'deflection'].includes(e.type)).map((e: any) => `${sim.agents[e.a]?.slot ?? '-'}:${e.type}`);
  const cbPlay = cb && sim.events.some((e: any) => e.a === cb.idx && ['pbu', 'interception', 'deflection'].includes(e.type));
  const caught = sim.events.some((e: any) => e.type === 'catch' && e.a === X.idx);
  const key = `${look ? (look.inPhase ? 'inPhase' : 'trailing') : 'noLook'}${look?.looks ? '+looks' : ''} saw=${saw} -> ${cbPlay ? 'CB plays' : caught ? 'caught' : 'other'}`;
  tally[key] = (tally[key] ?? 0) + 1;
  console.log(`s${seed} cb=${cb?.slot} look=${look ? JSON.stringify({ inPhase: look.inPhase, looks: look.looks, behind: +look.behind.toFixed(2) }) : '-'} saw=${saw} gap@arr=${arr ? arr.gap.toFixed(2) : '-'} | ${ev.join(',')}`);
}
console.log(JSON.stringify(tally, null, 1));
