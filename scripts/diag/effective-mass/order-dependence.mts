/** Solver order-dependence (Integration, 2026-11-15; hold-sink's side wrap differs between engines with HOLD_SINK off and the only visible difference is the body order):
 * the hold-sink scene (a tight side wrap by the SS on the Y runner at 6 yd/s, grip 0.8, the runner asking 8 yd/s, 30 steps) run in a FRESH World built over the same
 * 24 bodies in a different order each time, nothing else changed. Intents follow the bodies. Reports the runner's travel and when he left his feet, per permutation.
 *   [HOLD_SINK=0] [N=24] node --import tsx scripts/diag/effective-mass/order-dependence.mts */
const W = process.cwd();
const { CENTER_Y } = await import(`${W}/src/core/field.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { gripForce, updateBond } = await import(`${W}/src/sim/tackle.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const N = Number(process.env.N ?? 24), q = 0.8;
function scene(order: number[] | null) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'), defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6, pressure: null, label: 'hold' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const carrier = sim.slot('Y')!, defender = sim.slot('SS')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  const body = carrier.profile.radius + defender.profile.radius, gap = body + 0.1;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 }; defender.body.pos = { x: 50, y: CENTER_Y + gap }; defender.body.vel = { x: 0, y: 0 };
  sim.t = 2; sim.ball = { kind: 'held', carrier }; sim.catchAt = 0; sim.phase = 'live';
  const idx = order ?? sim.agents.map((_: any, i: number) => i);
  const world = new World(idx.map((i: number) => sim.agents[i].body), { substeps: sim.setup?.substeps });
  world.time = 2; sim.world = world;
  const joint: any = { kind: 'grasp', a: defender.body, b: carrier.body, hold: gap, reach: body + defender.profile.reach * 0.9 + 0.15, capacity: gripForce(defender, q), lock: q, legs: 0.5, pull: 1.2, origin: 'reach' };
  world.joints.push(joint);
  sim.bond = { carrier, tacklers: [defender], start: 2, progressX: 50, down: false, stalled: 0, grip: new Map([[defender, q]]), control: new Map([[defender, q]]), holds: new Map([[defender, joint]]), execution: new Map([[defender, 1]]) };
  let fell = -1;
  for (let k = 1; k <= 30; k++) {
    const byAgent: any[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
    byAgent[carrier.idx] = { vel: { x: 8, y: 0 }, effort: 1, push: 1 }; byAgent[defender.idx] = { vel: { x: 8, y: 0 }, effort: 1 };
    if (sim.bond) updateBond(sim, sim.bond, byAgent);
    world.step(idx.map((i: number) => byAgent[i]), sim.dt); sim.t += sim.dt;
    if (fell < 0 && carrier.body.support?.state !== 'up') fell = sim.t - 2;
  }
  return { travel: carrier.body.pos.x - 50, fell, pos: carrier.body.pos.y - CENTER_Y };
}
const rng = new Rng(7); const idx = Array.from({ length: 22 }, (_, i) => i);
const rows: { travel: number; fell: number; label: string }[] = [];
const base = scene(null); rows.push({ ...base, label: 'agent order' });
rows.push({ ...scene([...idx].reverse()), label: 'reversed' });
for (let k = 0; k < N; k++) { const p = [...idx]; for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } rows.push({ ...scene(p), label: `perm ${k}` }); }
const st = (v: number[]) => { v = [...v].sort((a, b) => a - b); return `min ${v[0].toFixed(3)} median ${v[v.length >> 1].toFixed(3)} max ${v[v.length - 1].toFixed(3)} spread ${(v[v.length - 1] - v[0]).toFixed(3)}`; };
console.log(`HOLD_SINK=${process.env.HOLD_SINK ?? 'default'}  agent-order run: travel ${base.travel.toFixed(3)} yd, down at ${base.fell.toFixed(3)} s`);
console.log(`${rows.length} orders: travel ${st(rows.map(r => r.travel))}`);
console.log(`                down at ${st(rows.map(r => r.fell))}`);
console.log('identical to agent order within 1e-9: ' + rows.filter(r => Math.abs(r.travel - base.travel) < 1e-9 && Math.abs(r.fell - base.fell) < 1e-9).length + ' of ' + rows.length);

// ---- a crowd: six bodies in mutual contact (three offensive linemen into three defensive linemen, plus the runner behind them), no joints, same permutation test
function crowd(order: number[] | null) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'), defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'hold' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover6, pressure: null, label: 'hold' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  const cast = sim.agents.slice(0, 3).concat(sim.agents.slice(11, 14)); // three of the offense, three of the defense
  cast.forEach((a: any, k: number) => { const off = k < 3; a.body.pos = { x: 50 + (off ? -0.55 : 0.55) * 0.9, y: CENTER_Y + ((k % 3) - 1) * 1.1 }; a.body.vel = { x: off ? 3 : -3, y: 0 }; a.body.facing = off ? 0 : Math.PI; });
  const idx = order ?? sim.agents.map((_: any, i: number) => i);
  const world = new World(idx.map((i: number) => sim.agents[i].body), { substeps: sim.setup?.substeps }); world.time = 2;
  for (let k = 1; k <= 40; k++) {
    const byAgent: any[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
    cast.forEach((a: any, j: number) => { byAgent[a.idx] = { vel: { x: j < 3 ? 6 : -6, y: 0 }, effort: 1, push: 1 }; });
    world.step(idx.map((i: number) => byAgent[i]), sim.dt);
  }
  return cast.map((a: any) => [a.body.pos.x, a.body.pos.y]).flat();
}
const c0 = crowd(null); let worst = 0, differ = 0;
const rng2 = new Rng(11);
for (let k = 0; k < N; k++) { const p = [...idx]; for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rng2.next() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const c = crowd(p); const d = Math.max(...c.map((v: number, i: number) => Math.abs(v - c0[i]))); worst = Math.max(worst, d); if (d > 1e-9) differ++; }
console.log(`crowd of 6 bodies in mutual contact, 40 steps, ${N} body orders: largest position difference from the agent-order run ${worst.toExponential(2)} yd; ${differ} of ${N} orders differ by more than 1e-9`);
console.log('crowd final x,y of the six: ' + c0.map((v: number) => v.toFixed(2)).join(' '));
