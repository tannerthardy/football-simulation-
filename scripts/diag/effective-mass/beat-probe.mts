// What ends a tackle's rep on an edge rusher (Integration, 2026-11-12: with the tackle anchored, edge wins rose to
// 33-34% and the beaten rusher came inside free; is the rep's beat -- |phi| >= 1 against the rusher's line to the QB --
// firing while the rusher is still beside the tackle at arm's length?). Every end of a pass rep between a tackle
// (LT/RT) and an edge rusher (|y - ball| > 3 yd at the end) while the QB holds the ball, at the moment it ends:
//  - the reason (the 'shed' event's note, e.g. 'pass: turned the corner'; 'other' when the rep ends another way);
//  - phi (the rep's, against the line to the QB);
//  - where the tackle is along the rusher's own path of travel: (tackle - rusher) . (rusher velocity unit),
//    negative = the tackle behind him along where he is running ('hips past hips' when below -0.3 yd), and across it;
//  - their distance against the tackle's reach (bodies + arm), the hands joint on, its force;
//  - the rusher's depth and width against the tackle, and his distance to the QB.
// usage: [flags] node --import tsx scripts/diag/effective-mass/beat-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const rows: any[] = [];
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const dir = sim.attackDir('O');
    const dis = sim.disengage.bind(sim), ev = sim.event.bind(sim);
    sim.disengage = (e: any) => {
      const b = e.blocker, d = e.defender, qb = sim.qb;
      if (e.type === 'pass' && (b.slot === 'LT' || b.slot === 'RT') && Math.abs(d.pos.y - sim.ballY) > 3 && sim.carrier === qb && sim.throwAt < 0) {
        const sp = Math.hypot(d.vel.x, d.vel.y), ux = sp > 0.5 ? d.vel.x / sp : NaN, uy = sp > 0.5 ? d.vel.y / sp : NaN;
        const rx = b.pos.x - d.pos.x, ry = b.pos.y - d.pos.y;
        const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === b.body && j.b === d.body) || (j.a === d.body && j.b === b.body)));
        const out = Math.sign(b.pos.y - sim.ballY) || 1;
        rows.push({ t: sim.t, why: 'other', phi: Math.abs(e.phi), along: rx * ux + ry * uy, across: Math.abs(-rx * uy + ry * ux), speed: sp,
          dist: Math.hypot(rx, ry), reach: b.profile.radius + d.profile.radius + b.player.measurables.armIn / 36,
          hands: !!j, N: j?.normalForce ?? 0, depth: (d.pos.x - b.pos.x) * dir, width: out * (d.pos.y - b.pos.y),
          toQB: Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y), key: `${b.idx}:${d.idx}:${sim.t}` });
      }
      return dis(e);
    };
    sim.event = (type: string, a: any, b: any, note?: string) => {
      if (type === 'shed' && rows.length && rows[rows.length - 1].key === `${b?.idx}:${a?.idx}:${sim.t}`) rows[rows.length - 1].why = note ?? 'shed';
      return ev(type, a, b, note);
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`tackle-edge rep ends while the QB holds: ${rows.length}`);
const whys: Record<string, any[]> = {}; for (const r of rows) (whys[r.why] ??= []).push(r);
for (const [w, R] of Object.entries(whys).sort((a, b) => b[1].length - a[1].length)) {
  const M = R.filter((r) => Number.isFinite(r.along));
  console.log(`${w} n ${R.length}: phi p50 ${q(R.map((r) => r.phi)).toFixed(2)} | tackle along the rusher's path p25/50/75 ${q(M.map((r) => r.along), .25).toFixed(2)}/${q(M.map((r) => r.along)).toFixed(2)}/${q(M.map((r) => r.along), .75).toFixed(2)} yd`
    + ` (hips past hips, < -0.3: ${pc(M.filter((r) => r.along < -0.3).length, M.length)}; still level or ahead, > -0.3: ${pc(M.filter((r) => r.along >= -0.3).length, M.length)}) | across ${q(M.map((r) => r.across)).toFixed(2)}`
    + ` | within his reach ${pc(R.filter((r) => r.dist <= r.reach).length, R.length)} | hands on ${pc(R.filter((r) => r.hands).length, R.length)} (N p50 ${q(R.filter((r) => r.hands).map((r) => r.N)).toFixed(0)})`
    + ` | rusher depth vs tackle p50 ${q(R.map((r) => r.depth)).toFixed(2)}, width ${q(R.map((r) => r.width)).toFixed(2)}, to QB ${q(R.map((r) => r.toQB)).toFixed(1)} | t p50 ${q(R.map((r) => r.t)).toFixed(2)}`);
}
