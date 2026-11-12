// The turn into the throw in the sim, measured as qb-release.py measures it on NFL tracking (Integration for Tanner,
// 2026-11-11): every pass, the QB's facing and the target's position sampled each 0.1 s; going back from the release, the
// frames his shoulders were closing on the target (angle to it falling >= 5 deg a frame): duration and angle turned; the
// air distance; whether he was moving (>= 2 yd/s). Flags via env.
// usage: [flags] node --import tsx scripts/diag/effective-mass/throw-turn.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
// The turn each throw asks for at its start (facing to the target), and where it came from: the drop (rhythm), the read
// his eyes were on, or another man.
const Q: any = (await import(`${W}/src/sim/behaviors/qb.ts`)).QBPass.prototype;
const st0 = Q.startThrow; Q.startThrow = function (a: any, sim: any, ev: any) {
  const b = Math.atan2(ev.point.y - a.pos.y, ev.point.x - a.pos.x);
  sim.__ask = { ask: r2(Math.abs(Math.atan2(Math.sin(b - a.body.facing), Math.cos(b - a.body.facing))) * 180 / Math.PI),
    from: this.phase === 'drop' ? 'drop' : ev.target === this.reads?.[this.readIdx] ? 'eyes' : 'other', readIdx: this.readIdx };
  return st0.call(this, a, sim, ev); };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; const frames: any[] = []; let next = 0; let target: any = null; let rel: any = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (q: any, t: any, v0: any, intended: any, ...rest: any[]) => { if (!target && q === qb && t) { target = t; rel = { t: sim.t, pos: { ...qb.pos }, v: Math.hypot(qb.vel.x, qb.vel.y), intended }; } return tb(q, t, v0, intended, ...rest); };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (!qb || sim.t + 1e-9 < next) return; next = sim.t + 0.1;
      frames.push({ t: sim.t, f: qb.body.facing, q: { ...qb.pos }, rs: new Map(sim.offense.map((o: any) => [o, { ...o.pos }])) }); };
    const res = sim.run();
    if (target && rel) {
      const ang = (fr: any) => { const tp = fr.rs.get(target); if (!tp) return null; const b = Math.atan2(tp.y - fr.q.y, tp.x - fr.q.x);
        return Math.abs(Math.atan2(Math.sin(fr.f - b), Math.cos(fr.f - b))) * 180 / Math.PI; };
      let kr = frames.findIndex((fr: any) => fr.t >= rel.t - 1e-9); if (kr < 0) kr = frames.length - 1;
      let k = kr; while (k - 1 >= 0 && ang(frames[k - 1]) !== null && ang(frames[k - 1])! - ang(frames[k])! >= 5) k--;
      const air = Math.hypot(rel.intended.x - rel.pos.x, rel.intended.y - rel.pos.y);
      console.log(JSON.stringify({ turn: r2((kr - k) * 0.1), tang: r2((ang(frames[k]) ?? 0) - (ang(frames[kr]) ?? 0)), air: r2(air), moving: rel.v >= 2, ...(sim.__ask ?? {}), tRel: r2(rel.t), complete: sim.events.some((e: any) => e.type === 'catch') }));
    }
    return res; } } });
}
