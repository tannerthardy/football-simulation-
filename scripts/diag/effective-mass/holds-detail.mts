// Which blocks the offensive holding calls come from (Integration, 2026-11-12: set A's path-of-travel frame took run
// holding calls from 1.0 to 2.8 a team-game). At each called holding foul against the offence (the 'holding' event),
// the holder and the man: play type, the holder's behaviour and run-block kind (RunBlocker plan), slot, whether it was
// his own rep or a helper's hands, whether he chose to hang on (the rep's holding flag) or it was a grip he had not
// yet let go, the man's speed, and the holder's position along the man's path (+ ahead of him, - behind) and across.
// usage: [flags] node --import tsx scripts/diag/effective-mass/holds-detail.mts [first seed] [games]
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
    if (kind !== 'scrimmage') return undefined;
    const ev = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => {
      if (type === 'holding' && a && b) {
        const own = sim.engagements.find((e: any) => e.blocker === a && e.defender === b);
        const help = sim.engagements.find((e: any) => e.defender === b && e.helpers?.includes(a));
        const sp = Math.hypot(b.vel.x, b.vel.y), rx = a.pos.x - b.pos.x, ry = a.pos.y - b.pos.y;
        // Between the man and the ball (the carrier, else the QB): the holder within 0.6 yd of the line from the man to
        // the ball and part way along it -- still in his way -- or not.
        const ball = (sim.carrier ?? sim.qb)?.pos ?? b.pos;
        const bx = ball.x - b.pos.x, by = ball.y - b.pos.y, bl = Math.hypot(bx, by) || 1;
        const proj = (rx * bx + ry * by) / bl, off = Math.abs(-rx * by + ry * bx) / bl;
        const between = proj > 0 && proj < bl && off < 0.6;
        const toBall = (b.vel.x * bx + b.vel.y * by) / bl;
        rows.push({ between, toBall, ballDist: bl, closing: bl / Math.max(1, b.profile.vmax), type: sim.isPass ? 'pass' : 'run', beh: a.behavior?.kind ?? '?', plan: a.behavior?.plan?.kind ?? '-', slot: a.slot,
          who: own ? 'own rep' : help ? 'helper' : 'other', chose: own ? !!own.holding : false, t: sim.t, speed: sp,
          along: sp > 0.5 ? (rx * b.vel.x + ry * b.vel.y) / sp : NaN, across: sp > 0.5 ? Math.abs(-rx * b.vel.y + ry * b.vel.x) / sp : NaN,
          phi: own ? Math.abs(own.phi) : help ? Math.abs(help.phi) : NaN });
      }
      return ev(type, a, b, note);
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
const tg = games * 2;
for (const ty of ['run', 'pass']) {
  const R = rows.filter((r) => r.type === ty); if (!R.length) continue;
  console.log(`${ty}: called ${R.length} (${(R.length / tg).toFixed(2)} a team-game)`);
  const cnt = (f: (r: any) => string) => { const m: Record<string, number> = {}; for (const r of R) m[f(r)] = (m[f(r)] ?? 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pc(v, R.length)}`).join(' | '); };
  console.log(`  by block: ${cnt((r) => `${r.beh}/${r.plan}`)}`);
  console.log(`  by slot: ${cnt((r) => r.slot)}`);
  console.log(`  whose hands: ${cnt((r) => r.who)} | chose to hang on ${pc(R.filter((r) => r.chose).length, R.length)}`);
  const P = R.filter((r) => Number.isFinite(r.along) && r.along < -0.3);
  console.log(`  holder still between the man and the ball (in his way): ${pc(R.filter((r) => r.between).length, R.length)} | past him along his path (< -0.3): ${pc(P.length, R.length)}, of those still between him and the ball ${pc(P.filter((r) => r.between).length, P.length)} | the man to the ball p50 ${q(R.map((r) => r.ballDist)).toFixed(1)} yd (time at his top speed ${q(R.map((r) => r.closing)).toFixed(2)} s), his speed toward it ${q(R.map((r) => r.toBall)).toFixed(2)} yd/s`);
  console.log(`  the man: speed p50 ${q(R.map((r) => r.speed)).toFixed(2)} yd/s | holder along his path p25/50/75 ${q(R.map((r) => r.along), .25).toFixed(2)}/${q(R.map((r) => r.along)).toFixed(2)}/${q(R.map((r) => r.along), .75).toFixed(2)} (behind him < -0.3: ${pc(R.filter((r) => r.along < -0.3).length, R.length)}) | across ${q(R.map((r) => r.across)).toFixed(2)} | rep |phi| p50 ${q(R.map((r) => r.phi)).toFixed(2)} (< 1: ${pc(R.filter((r) => r.phi < 1).length, R.length)}) | t p50 ${q(R.map((r) => r.t)).toFixed(2)}`);
}
