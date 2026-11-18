// node --import tsx scripts/diag/eyes/drop-timing.ts [seed] [games] > rows.jsonl
// Integration (2026-11-17), Defense's positions operator applied to our games: per QB pass play (a throw from the pass
// behavior), the snap to his set (the first time he is 1 yd or more from his snap spot and slower than 1.2 yd/s), his
// drop depth at the set (yd behind the snap spot), the set to the release, the release to the catch (or the ball's
// arrival), the throw's air yards (the catch point past the line) and the ball's speed (distance over flight). The call's
// drop type and alignment. Same definitions as scripts/diag/eyes/drop_timing_nfl.py. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const dir = sim.attackDir(sim.qb.team), snap = { x: sim.qb.pos.x, y: sim.qb.pos.y };
  let setT = null as number | null, setDepth = null as number | null, rel: any = null, arrive = null as number | null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !rel && !away && intended) rel = { dec: (() => { const r = (p.behavior as any)?.throwRec; return r ? { P: +r.P.toFixed(3), iR: +r.intRisk.toFixed(3), u: r.u === null ? null : +(+r.u).toFixed(2), normal: r.clearsNormal, hot: !!r.hot, slot: r.slot, decT: +r.t.toFixed(2) } : null; })(), rhythm: ((p.behavior as any)?.rhythmThrows ?? 0) > 0, planT: arrivalT - sim.t, natT: (p.behavior as any)?.naturalFlight?.(Math.hypot(intended.x - p.pos.x, intended.y - p.pos.y)) ?? null, t: sim.t, from: { x: p.pos.x, y: p.pos.y }, to: { x: intended.x, y: intended.y }, air: (intended.x - sim.los) * dir };
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const q = sim.qb, d = Math.hypot(q.pos.x - snap.x, q.pos.y - snap.y), v = Math.hypot(q.vel.x, q.vel.y);
    if (setT === null && !rel && sim.carrier === q && d >= 1 && v < 1.2) { setT = sim.t; setDepth = (snap.x - q.pos.x) * dir; }
    if (rel && arrive === null && sim.ball.kind !== 'air') arrive = sim.t;
  };
  const res: any = orig.apply(this);
  if (rel) {
    const call = sim.offCall, flight = arrive !== null ? arrive - rel.t : null, dist = Math.hypot(rel.to.x - rel.from.x, rel.to.y - rel.from.y);
    console.log(JSON.stringify({ cov: sim.defCall?.coverage?.id ?? null, shell: sim.defCall?.coverage?.shell ?? null, drop: call.pass?.drop ?? null, family: call.pass?.family ?? null, gun: call.formation.qb !== 'under', setT, setDepth: setDepth === null ? null : +setDepth.toFixed(2),
      rel: +rel.t.toFixed(2), rhythm: rel.rhythm, planT: +rel.planT.toFixed(2), natT: rel.natT === null ? null : +rel.natT.toFixed(2), flight: flight === null ? null : +flight.toFixed(2), air: +rel.air.toFixed(1), dist: +dist.toFixed(1), speed: flight ? +(dist / flight).toFixed(1) : null, cmp: !!res.stats?.completed, dec: rel.dec,
      fate: (() => { const ev = sim.events.map((e: any) => e.type); return ev.includes('interception') ? 'int' : res.stats?.completed ? 'catch' : ev.includes('pbu') || ev.includes('deflection') ? 'pbu' : ev.includes('drop') ? 'drop' : 'miss'; })() }));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 4); g++) simulateGame(home, away, { seed: seed + g });
