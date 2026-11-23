// QB lane 2026-11-23 (Flex / Integration: the QB still drifting back at 2.0-2.5 s). Measurement only. League games; every
// thrown or sacked dropback from the pass behaviour. Per play: the called drop (type, gun), the snap spot; every tick
// while he has the ball before the release: depth behind his snap spot (yd, + = back), speed, his behaviour's phase,
// and, in the set phase, the pocket spring as pocketMove computes it on his felt pictures (the push from bodies within
// 3.5 yd, x 2 x pocketPresence, along the line: + = pushed back) and whether the edge step-up is on. The release time.
//   node --import tsx scripts/diag/eyes/drop-drift.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const dir = sim.attackDir(sim.qb.team), snap = { x: sim.qb.pos.x, y: sim.qb.pos.y };
  const ticks: any[] = []; let release: number | null = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, ...rest: any[]) => { if (p === sim.qb && release === null) release = +sim.t.toFixed(2); return tb(p, ...rest); };
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    tick0();
    const q = sim.qb, b: any = q.behavior;
    if (release !== null || sim.carrier !== q || b?.kind !== 'qb-pass') return;
    const row: any = { t: +sim.t.toFixed(2), d: +((snap.x - q.pos.x) * dir).toFixed(2), v: +Math.hypot(q.vel.x, q.vel.y).toFixed(2), ph: b.phase };
    if (b.phase === 'set') {
      const pp = q.r('pocketPresence'); let fx = 0, n = 0;
      for (const d of sim.defense) {
        if (d.isDown(sim.t)) continue;
        const s = b.felt(q, sim, d).pos, dx = q.pos.x - s.x, dy = q.pos.y - s.y, dd = Math.hypot(dx, dy);
        if (dd < 1e-3 || dd > 3.5) continue;
        fx += (dx / dd) * (3.5 - dd) / 3.5; n++;
      }
      row.push = +(-fx * 2 * pp * dir).toFixed(2); row.near = n; row.home = +((snap.x - b.drop.x) * dir).toFixed(2); row.edge = !!b.edgeOn;
    }
    ticks.push(row);
  };
  const res = orig.apply(this);
  const call = sim.offCall;
  console.log(JSON.stringify({ seed, drop: call?.pass?.drop ?? null, family: call?.pass?.family ?? null, concept: call?.pass?.id ?? null,
    gun: call?.formation?.qb !== 'under', pa: !!call?.pass?.playAction || call?.pass?.drop === 'pa', release,
    sack: (sim.events as any[]).some((e) => e.type === 'sack'), ticks }));
  return res;
};
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s });
}
