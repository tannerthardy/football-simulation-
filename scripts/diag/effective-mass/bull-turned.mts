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
      reps.set(e, { q0: Math.hypot(e.defender.pos.x - sim.qb.pos.x, e.defender.pos.y - sim.qb.pos.y), t0: sim.t, turn: side * f * 180 / Math.PI * (off > 0 ? 1 : -1), b, d: e.defender, n: 0, drive: 0, down: false, win: false });
    }
    for (const r of reps.values()) {
      if (r.done) continue;
      if (sim.t - r.t0 > 1.0 || sim.throwAt >= 0 || sim.phase !== 'live') { r.done = true; rows.push(r); continue; }
      const { b, d } = r, nx = b.pos.x - d.pos.x, ny = b.pos.y - d.pos.y, L = Math.hypot(nx, ny) || 1;
      r.drive += (b.vel.x * nx + b.vel.y * ny) / L; r.n++;
      // Ground given toward the QB (his velocity toward the QB), and the rusher's own closing on the QB.
      const qx = sim.qb.pos.x - b.pos.x, qy = sim.qb.pos.y - b.pos.y, Q = Math.hypot(qx, qy) || 1;
      r.give = (r.give ?? 0) + (b.vel.x * qx + b.vel.y * qy) / Q;
      r.q1 = Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y); r.t1 = sim.t;
      // The push's angle off his chest (the rusher's bearing from him against his facing).
      r.pushOff = (r.pushOff ?? 0) + Math.abs(Math.atan2(Math.sin(Math.atan2(-ny, -nx) - b.body.facing), Math.cos(Math.atan2(-ny, -nx) - b.body.facing))) * 180 / Math.PI;
      // The rusher's request: its part into the man (along the line to him) against its size.
      const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 }, ivn = Math.hypot(iv.x, iv.y);
      if (ivn > 0.3) { r.into = (r.into ?? 0) + (iv.x * nx + iv.y * ny) / L / ivn; r.ni = (r.ni ?? 0) + 1; }
      // Displaced: his achieved velocity along the push minus what he asked for along it (ground he did not choose to give).
      const bv = sim.intents?.[b.idx]?.vel ?? { x: 0, y: 0 };
      r.asked = (r.asked ?? 0) + (bv.x * nx + bv.y * ny) / L;
      // The rusher's own facing against the line to the man he is driving (0 = chest to chest).
      r.rOff = (r.rOff ?? 0) + Math.abs(Math.atan2(Math.sin(Math.atan2(ny, nx) - d.body.facing), Math.cos(Math.atan2(ny, nx) - d.body.facing))) * 180 / Math.PI;
      // Forces: the rusher's lean (leg drive into the man) and the tackle's, along the line; the load on the tackle along it.
      const ul = { x: nx / L, y: ny / L }, dl = d.body.support?.lean ?? { x: 0, y: 0 }, bl = b.body.support?.lean ?? { x: 0, y: 0 }, bL = b.body.support?.load ?? { x: 0, y: 0 };
      r.rLean = (r.rLean ?? 0) + (dl.x * ul.x + dl.y * ul.y); r.tLean = (r.tLean ?? 0) - (bl.x * ul.x + bl.y * ul.y);
      r.tLoad = (r.tLoad ?? 0) + (bL.x * ul.x + bL.y * ul.y);
      r.rSpeedAlong = (r.rSpeedAlong ?? 0) + (d.vel.x * ul.x + d.vel.y * ul.y);
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
  console.log(`${lab.padEnd(24)} n ${String(R.length).padStart(4)} | turn p50 ${q(R.map((r) => r.turn))} deg | tackle down within 1.0 s ${pc(R.filter((r) => r.down).length, R.length)} | driven back p50 ${q(R.map((r) => r.drive / Math.max(1, r.n)))} yd/s | ground given toward the QB p50 ${q(R.map((r) => (r.give ?? 0) / Math.max(1, r.n)))} yd/s | rusher closing on the QB p50 ${q(R.filter((r) => r.t1 > r.t0).map((r) => (r.q0 - r.q1) / (r.t1 - r.t0)))} yd/s | push off his chest p50 ${q(R.map((r) => (r.pushOff ?? 0) / Math.max(1, r.n)))} p90 ${q(R.map((r) => (r.pushOff ?? 0) / Math.max(1, r.n)), .9)} deg, over 45 ${pc(R.filter((r) => (r.pushOff ?? 0) / Math.max(1, r.n) > 45).length, R.length)} | he asked along the push p50 ${q(R.map((r) => (r.asked ?? 0) / Math.max(1, r.n)))}, displaced beyond it p50 ${q(R.map((r) => (r.drive - (r.asked ?? 0)) / Math.max(1, r.n)))} yd/s | rusher's chest off the man p50 ${q(R.map((r) => (r.rOff ?? 0) / Math.max(1, r.n)))} deg | rusher's lean into him p50 ${q(R.map((r) => (r.rLean ?? 0) / Math.max(1, r.n)))} N, tackle's lean against p50 ${q(R.map((r) => (r.tLean ?? 0) / Math.max(1, r.n)))} N, load on the tackle along the push ${q(R.map((r) => (r.tLoad ?? 0) / Math.max(1, r.n)))} N, rusher speed along the push ${q(R.map((r) => (r.rSpeedAlong ?? 0) / Math.max(1, r.n)))} | his request into the man (cos) p50 ${q(R.filter((r) => r.ni).map((r) => r.into / r.ni))} | rusher within 2 yd of the QB ${pc(R.filter((r) => r.win).length, R.length)}`);
}
