// The bull down the middle of a turned tackle (Flex, 2026-11-14; Integration: with the vertical set a turned tackle is
// common, and the base and ANCHOR_BASE do not read facing). Per DE pass rep against a tackle, at the first tick of a
// bull: the tackle's turn (his facing toward the outside of downfield, deg). Over the next 1.0 s (ball still in): the
// tackle down (a fall event), his speed driven back toward the QB (p50 of the per-rep mean of his velocity along the
// rusher's push, + = driven), and the rusher within 2 yd of the QB. Split: turned more than 60 deg vs not.
// usage: [flags] node --import tsx scripts/diag/effective-mass/bull-turned.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const reps = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const off = sim.attackDir('O');
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !/^DE/.test(e.defender.slot) || !['LT', 'RT'].includes(e.blocker.slot) || e.move !== 'bull' || reps.has(e)) continue;
      if (sim.throwAt >= 0) continue;
      const b = e.blocker, side = Math.sign(b.pos.y - sim.ballY) || 1;
      const fwd = off > 0 ? 0 : Math.PI, f = Math.atan2(Math.sin(b.body.facing - fwd), Math.cos(b.body.facing - fwd));
      reps.set(e, { t0: sim.t, turn: side * f * 180 / Math.PI * (off > 0 ? 1 : -1), b, d: e.defender, n: 0, drive: 0, down: false, win: false });
    }
    for (const r of reps.values()) {
      if (r.done) continue;
      if (sim.t - r.t0 > 1.0 || sim.throwAt >= 0 || sim.phase !== 'live') { r.done = true; rows.push(r); continue; }
      const { b, d } = r, nx = b.pos.x - d.pos.x, ny = b.pos.y - d.pos.y, L = Math.hypot(nx, ny) || 1;
      r.drive += (b.vel.x * nx + b.vel.y * ny) / L; r.n++;
      if (b.body.support?.state !== 'up') r.down = true;
      if (Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) r.win = true;
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
for (const [lab, f] of [['all bulls', (r: any) => true], ['tackle turned > 60 deg', (r: any) => Math.abs(r.turn) > 60], ['tackle within 60 deg', (r: any) => Math.abs(r.turn) <= 60]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  console.log(`${lab.padEnd(24)} n ${String(R.length).padStart(4)} | turn p50 ${q(R.map((r) => r.turn))} deg | tackle down within 1.0 s ${pc(R.filter((r) => r.down).length, R.length)} | driven back p50 ${q(R.map((r) => r.drive / Math.max(1, r.n)))} yd/s | rusher within 2 yd of the QB ${pc(R.filter((r) => r.win).length, R.length)}`);
}
