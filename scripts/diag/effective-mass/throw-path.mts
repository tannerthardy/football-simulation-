// Which decision starts the throws that rushers hit (Integration, 2026-11-11, sacks): every throw start on a dropback --
// the path (current read / outlet / out of reads / hot-panic / rhythm in the drop), his urgency and felt time to contact
// (pressure().time), whether the target was the read he was on and ready (read through), the throw's P; then whether a
// defender reached 1.0 yd before the ball was out and the result. Monkeypatches QBPass methods (no source change).
// usage: [flags] node --import tsx scripts/diag/effective-mass/throw-path.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const Q: any = (await import(`${W}/src/sim/behaviors/qb.ts`)).QBPass.prototype;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
let lastBest: any = null;
const bo = Q.bestOption; Q.bestOption = function (a: any, sim: any, u: number) { const ev = bo.call(this, a, sim, u); lastBest = { ev, u, t: sim.t }; return ev; };
const st = Q.startThrow; Q.startThrow = function (a: any, sim: any, ev: any) {
  const pr = this.pressure(a, sim); const read = this.reads?.[this.readIdx];
  const fromBest = lastBest && lastBest.t === sim.t && lastBest.ev === ev;
  const path = this.phase === 'drop' ? 'rhythm (drop)' : fromBest ? (lastBest.u >= 1 && pr.time < 0.45 ? 'hot/panic' : 'out of reads') : ev.target === read ? 'current read' : 'outlet';
  sim.__start = { path, felt: r2(Math.min(pr.time, 9)), onRead: ev.target === read, ready: !!this.ready?.(ev.target, sim), P: r2(ev.P), t: sim.t };
  return st.call(this, a, sim, ev); };
// FINISH_CHECK / SET_DECIDE: throws he was offered and could not finish, per play.
const cf = Q.canFinish; if (typeof cf === 'function') Q.canFinish = function (a: any, sim: any) { const ok = cf.call(this, a, sim); if (!ok) sim.__noFinish = (sim.__noFinish ?? 0) + 1; return ok; };
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; let contactAt: number | null = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (qb && contactAt === null && sim.throwAt < 0) for (const d of sim.defense) if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.0) { contactAt = sim.t; break; } };
    const res = sim.run();
    const s0 = sim.__start; const ev = sim.events.map((e: any) => e.type);
    const noFinish = sim.__noFinish ?? 0;
    if (s0 && sim.throwAt >= 0) console.log(JSON.stringify({ ...s0, t: undefined, contactBeforeOut: contactAt !== null && contactAt <= sim.throwAt, contactAfterStart: contactAt !== null ? r2(contactAt - s0.t) : null,
      result: ev.includes('interception') ? 'int' : ev.includes('catch') ? 'complete' : 'incomplete', yards: r2(res?.yards ?? NaN), noFinish, throwaway: !!sim.ball?.throwaway }));
    else console.log(JSON.stringify({ path: null, noFinish, contactBeforeOut: contactAt !== null, result: ev.includes('sack') ? 'sack' : sim.scrambled ? 'scramble' : 'other', yards: r2(res?.yards ?? NaN) }));
    return res; } } });
}
