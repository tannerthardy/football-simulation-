// QB_POCKET=1 node --import tsx scripts/diag/escape/slide-sack.ts [seed] [games] > rows.jsonl
// One row per dropback with QB_POCKET on: each slide he decided (when, from whom, how far that man was, whether the
// man was in a blocker's hands, how it ended), when the ball left or he was sacked, who sacked him, and the nearest
// defender's distance at the first slide and 0.5 s later. Passive. Table: slide_sack_table.py.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim); let qb: any = null, thrownAt: number | null = null, windAt: number | null = null, setAt: number | null = null;
  const near: Array<[number, number]> = [];
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior;
    if (!qb && b?.kind === 'qb-pass') qb = b;
    if (!qb || sim.carrier !== q || q.behavior !== qb) return;
    if (setAt === null && qb.phase === 'set') setAt = sim.t;
    if (qb.phase === 'windup' && windAt === null) windAt = sim.t;
    if (qb.phase !== 'windup') windAt = null;
    let nd = 99; for (const d of sim.defense) nd = Math.min(nd, Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y));
    near.push([+sim.t.toFixed(2), +nd.toFixed(2)]);
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (...x: any[]) => { if (x[0] === sim.qb && thrownAt === null) thrownAt = sim.t; return tb(...x); };
  const res = orig.apply(this);
  if (!qb) return res;
  const slotOf = (id: string) => sim.defense.find((d: any) => d.player.id === id)?.slot ?? id;
  const at = (t: number) => { let v: number | null = null; for (const [tt, d] of near) if (tt <= t + 1e-6) v = d; return v; };
  const s0 = qb.slideLog[0];
  console.log(JSON.stringify({ setAt, thrownAt, windAt, end: +sim.t.toFixed(2), sacked: !!res.stats.sacked, by: (res.stats.sackedBy ?? []).map(slotOf), scramble: !!sim.scrambled,
    slides: qb.slideLog.map((s: any) => ({ t: +s.t.toFixed(2), dist: +s.dist.toFixed(2), by: s.by, inHands: s.inHands, toRead: s.toRead, end: s.end ? { t: +s.end.t.toFixed(2), why: s.end.why, moved: +s.end.moved.toFixed(2) } : null })),
    nearAtSlide: s0 ? at(s0.t) : null, nearAfter: s0 ? at(s0.t + 0.5) : null }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
