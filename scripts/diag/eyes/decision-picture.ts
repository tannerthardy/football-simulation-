// QB lane 2026-11-23 (Integration: is the picture he decides on degraded by his head angle?). League games; at each
// throw decision (windup start): his head's angle to the target; the time since his head was last within 15 deg of him;
// his receiver picture's age (forecast.lastPicture) and its error (forecast now vs truth); and, for the defenders near
// the target (truth within 6 yd), his believed position's error and its picture age (QBMind.estimate / pictureAge),
// and whether it comes from memory or a fresh see() (no memory).
//   node --import tsx scripts/diag/eyes/decision-picture.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const lastIn = new Map<any, number>(); let hooked = false, done = false;
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => {
        if (!done) { done = true;
          const r = ev.target, qb = s.qb, head = qb.head ?? qb.body.facing;
          const ang = Math.abs(wrap(head - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI;
          const f = b.receiverForecasts.get(r), pic = f?.lastPicture?.(), now = f?.predict?.(s.t, 0);
          const defs = s.defense.filter((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y) < 6).map((d: any) => {
            const e = b.mind.estimate(d); const mem = b.mind.memory.get(d);
            return { slot: d.slot, dist: +Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y).toFixed(1), err: +Math.hypot(e.pos.x - d.pos.x, e.pos.y - d.pos.y).toFixed(2),
              age: +b.mind.pictureAge(d).toFixed(2), fromMemory: !!mem,
              angD: +(Math.abs(wrap(head - Math.atan2(d.pos.y - qb.pos.y, d.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(0) }; });
          console.log(JSON.stringify({ t: +s.t.toFixed(2), slot: r.slot, ang: +ang.toFixed(1), sinceCone: lastIn.has(r) ? +(s.t - lastIn.get(r)!).toFixed(2) : null,
            picAge: pic ? +(s.t - pic.sampledAt).toFixed(2) : null, recErr: now ? +Math.hypot(now.x - r.pos.x, now.y - r.pos.y).toFixed(2) : null, defs }));
        }
        return st(a, s, ev); }; }
    tick0();
    const qb = sim.qb, head = qb.head ?? qb.body.facing;
    for (const o of sim.offense) if (o !== qb && Math.abs(wrap(head - Math.atan2(o.pos.y - qb.pos.y, o.pos.x - qb.pos.x))) * 180 / Math.PI <= 15) lastIn.set(o, sim.t);
  };
  return orig.apply(this);
};
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
