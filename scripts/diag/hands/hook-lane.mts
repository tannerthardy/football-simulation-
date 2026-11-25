// Defense (HANDS_SEEN / zone eyes): the hook under a slant. slant_flat vs Cover 3 (spot), the throw staged to the slant
// (SLOT, default X) at AT s; for every zone defender whose body comes within his reach + 0.25 of the ball in flight more
// than 3 yd short of the catch point: his head off the ball (deg) and off the passer at the release, whether he saw it
// (handsSees, or seenReady with the estimator), whether he played it. Usage: <flags> node --import tsx
// scripts/diag/hands/hook-lane.mts [N=40] [AT=1.45] [SLOT=X]. HL_ANY=1: anywhere in the flight, within 2 yd.
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const BE: any = await import(`${W}/src/sim/ball-estimate.ts`);
const N = Number(process.argv[2] ?? 40), AT = Number(process.argv[3] ?? 1.45), SLOT = process.argv[4] ?? 'X';
const ang = (a: number, b: number) => Math.round(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 57.3);
const rows: any[] = [];
for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(61), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(62), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: 'slant_flat' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'c3' },
    los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at: AT, slot: SLOT } } as never);
  let th: any = null; const men = new Map<number, any>();
  while (sim.phase !== 'dead' && sim.t < 5) {
    sim.tick();
    if (sim.ball.kind === 'air' && !th) th = { pt: { ...sim.ball.intended }, qb: { ...sim.qb.pos }, arrT: sim.ball.arrivalT, heads: new Map(sim.defense.map((d: any) => [d.idx, ang(d.head ?? d.body.facing, Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x))])) };
    if (th && sim.ball.kind === 'air' && sim.t <= th.arrT + 0.02) {
      const bp = sim.ballPos(); if (!process.env.HL_ANY && Math.hypot(bp.x - th.pt.x, bp.y - th.pt.y) <= 3) continue;
      for (const d of sim.defense) { if (d.behavior?.kind !== 'zone') continue;
        const dd = Math.hypot(bp.x - d.pos.x, bp.y - d.pos.y), m = men.get(d.idx);
        if (!m || dd < m.dd) men.set(d.idx, { dd, z: bp.z, slot: d.slot, reach: d.profile.reach, headBall: ang(d.head ?? d.body.facing, Math.atan2(bp.y - d.pos.y, bp.x - d.pos.x)), headQBatRel: th.heads.get(d.idx),
          saw: BE.estimatesFor(d) ? sim.ballEstimates?.seenReady(d, sim) : sim.ballEstimates?.handsSees?.(d, sim) }); }
    }
  }
  if (process.env.HL_DBG) console.log('DBG', seed, 'thrown', !!th, 'kinds', sim.defense.map((d: any) => d.slot + ':' + d.behavior?.kind).join(' '), 'closest', [...men.values()].map((m: any) => m.slot + ' ' + m.dd.toFixed(1)).join(', '));
  for (const [id, m] of men) if (m.dd <= (process.env.HL_ANY ? 2 : m.reach + 0.25)) rows.push({ seed, ...m, dd: +m.dd.toFixed(2), z: +m.z.toFixed(2), played: sim.events.some((e: any) => ['pbu', 'deflection', 'interception'].includes(e.type) && e.a === id) });
}
for (const r of rows) console.log('HOOK', JSON.stringify(r));
const k = (r: any) => `${r.headQBatRel <= 45 ? 'eyes on QB at release' : 'eyes off QB at release'} saw=${r.saw}`;
const g: Record<string, [number, number]> = {}; for (const r of rows) { (g[k(r)] ??= [0, 0]); g[k(r)][0]++; if (r.played) g[k(r)][1]++; }
console.log('lane contacts by zone defenders:', rows.length, JSON.stringify(g));
