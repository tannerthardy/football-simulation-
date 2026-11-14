// [QB_HONEST_FEEL=1] node --import tsx scripts/diag/eyes/windup-trace.ts [seed] [games] > rows.jsonl
// Per dropback: what started the throw, how near the rush truly was and how near he felt it, and whether contact
// (a defender's centre within 1.0 yd, ball in hand; Flex's finish.py definition) came before the release.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 3);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const qb = sim.qb; let beh: any = null; let was = ''; const W: any[] = []; let contactAt: number | null = null, c2At: number | null = null;
  const near = () => { let m = Infinity; for (const d of sim.defense) if (!d.isDown(sim.t)) m = Math.min(m, Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y)); return m; };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!beh && qb.behavior.kind === 'qb-pass') beh = qb.behavior;
    if (!beh || sim.carrier !== qb || qb.behavior !== beh) return;
    const n = near();
    if (contactAt === null && sim.t > 0.5 && n <= 1.0) contactAt = sim.t;
    if (c2At === null && sim.t > 0.5 && n <= 2.0) c2At = sim.t;
    if (beh.phase === 'windup' && was !== 'windup') {
      const p = beh.pressure(qb, sim), rec = beh.throwRec;
      W.push({ t: sim.t, trueNear: +n.toFixed(2), feltTime: +p.time.toFixed(2), feltDist: +p.dist.toFixed(2), hot: !!rec?.hot, u: rec?.u ?? null, urg: rec?.urgency ?? null, clock: rec?.clock ?? null, P: rec?.P ?? null,
        clearsNormal: rec?.clearsNormal ?? null, releaseAt: beh.releaseAt, readIdx: beh.readIdx });
    }
    was = beh.phase;
  };
  const res = orig.apply(this);
  if (beh) console.log(JSON.stringify({ windups: W, contactAt, c2At, thrown: res.stats.attempted && !res.stats.throwaway ? res.stats.timeToThrow : null, away: !!res.stats.throwaway, sacked: !!res.stats.sacked, scramble: !!res.stats.scramble, completed: !!res.stats.completed, int: !!res.stats.interceptedBy, alarmAt: beh.alarmAt ?? null }));
  return res;
};
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });
