// The QB under an alarm (Integration, 2026-11-12: under a free rusher ours releases in 0.15-0.25 s and completes more
// than the NFL QB). Every dropback: the alarm = the first moment pressure() feels a hit within 0.45 s. At the alarm:
// where his eyes are (sim.qbEyes) and his body faces. At the throw start (startThrow): the path (hot = the hot path's
// pick, else the read logic), the target, the angle between his body facing and the target, and between his gaze line
// (to the man he was looking at) and the target, both at the alarm; whether the target is the man he was looking at; how
// old his last picture of the target was (receiver forecast lastPicture); alarm -> motion start -> release. One JSON
// line per dropback with an alarm and a throw. Flags via env.
// usage: [flags] node --import tsx scripts/diag/effective-mass/hot-throw.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const Q: any = (await import(`${W}/src/sim/behaviors/qb.ts`)).QBPass.prototype;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
const deg = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
let hotPick: any = null;
const ht = Q.hotThrow; Q.hotThrow = function (a: any, sim: any) { const ev = ht.call(this, a, sim); hotPick = ev ? { ev, t: sim.t } : null; return ev; };
const st0 = Q.startThrow; Q.startThrow = function (a: any, sim: any, ev: any) {
  const al = sim.__alarm;
  if (al && !sim.__start) {
    const tp = ev.target.pos, toT = Math.atan2(tp.y - al.qbPos.y, tp.x - al.qbPos.x);
    const pic = this.receiverForecasts?.get(ev.target)?.lastPicture?.();
    sim.__start = { t: sim.t, path: hotPick && hotPick.t === sim.t && hotPick.ev === ev ? 'hot' : 'read', target: ev.target.slot,
      bodyAngle: r2(deg(toT - al.facing)), gazeAngle: al.gazeDir === null ? null : r2(deg(toT - al.gazeDir)), onEyes: al.eyes === ev.target,
      pictureAge: pic ? r2(sim.t - pic.sampledAt) : null, P: r2(ev.P) };
    const cmd = st0.call(this, a, sim, ev);
    sim.__start.windup = r2(this.releaseAt - sim.t);
    return cmd;
  }
  return st0.call(this, a, sim, ev); };
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; let next = 0;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      // The alarm is read before this tick's decisions, from the state the QB decides on.
      if (qb && !sim.__alarm && sim.carrier === qb && sim.throwAt < 0 && sim.t >= next && sim.t >= 0.3 && typeof qb.behavior?.pressure === 'function' && qb.behavior.phase !== 'windup') {
        next = sim.t + 0.05;
        const pr = qb.behavior.pressure(qb, sim);
        if (pr.time <= 0.45) {
          const eyes = sim.qbEyes;
          sim.__alarm = { t: sim.t, facing: qb.body.facing, qbPos: { ...qb.pos }, eyes, gazeDir: eyes ? Math.atan2(eyes.pos.y - qb.pos.y, eyes.pos.x - qb.pos.x) : null, felt: r2(pr.time) };
        }
      }
      tick(); };
    const res = sim.run(); const ev = sim.events.map((e: any) => e.type);
    const al = sim.__alarm, s0 = sim.__start;
    if (al) console.log(JSON.stringify({ alarm: r2(al.t), felt: al.felt, thrown: sim.throwAt >= 0, ...(s0 ? { ...s0, t: undefined, toStart: r2(s0.t - al.t), toRelease: sim.throwAt >= 0 ? r2(sim.throwAt - al.t) : null } : {}),
      complete: ev.includes('catch'), sack: ev.includes('sack'), yards: r2(res?.yards ?? NaN) }));
    return res; } } });
}
