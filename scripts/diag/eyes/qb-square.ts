/**
 * Does the QB's body lead the throw (as nfl_qb_square.py measures the NFL)? League games, passive: on targeted passes,
 * at 0.1 s steps from 1.0 s before the release to it, the angle between his body facing and the direction to the
 * target then and to the eventual catch point (the ball's arrival point), whether his eyes (sim.qbEyes) were on the
 * target, his speed toward the target, and when his throwing motion began.
 *   node --import tsx scripts/diag/eyes/qb-square.ts [--seed 101] [--games 8] > out/eyes/sim.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const deg = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const buf: any[] = []; let out: any = null; let motionAt: number | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    if (sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
      if (sim.qb.behavior?.phase === 'windup' && motionAt === null) motionAt = sim.t;
      if (sim.qb.behavior?.phase !== 'windup') motionAt = null;
      buf.push({ t: sim.t, x: sim.qb.pos.x, y: sim.qb.pos.y, vx: sim.qb.vel.x, vy: sim.qb.vel.y, f: sim.qb.body.facing, eyes: sim.qbEyes, pos: new Map(sim.offense.map((a: any) => [a, { x: a.pos.x, y: a.pos.y }])) });
      while (buf.length && buf[0].t < sim.t - 1.05) buf.shift();
    }
    if (!out && was !== 'air' && sim.ball.kind === 'air' && !sim.ball.throwaway && sim.ball.target) {
      const r = sim.ball.target, cp = sim.ball.intended, rel = sim.t;
      const rows: any = {};
      for (let s = -10; s <= 0; s++) {
        const tt = rel + s / 10;
        const b = buf.reduce((best: any, x: any) => (!best || Math.abs(x.t - tt) < Math.abs(best.t - tt) ? x : best), null);
        if (!b || Math.abs(b.t - tt) > 0.06) continue;
        const rp = b.pos.get(r);
        rows[(s / 10).toFixed(1)] = { toRcv: +deg(Math.atan2(rp.y - b.y, rp.x - b.x) - b.f).toFixed(1), toCatch: cp ? +deg(Math.atan2(cp.y - b.y, cp.x - b.x) - b.f).toFixed(1) : null, eyes: b.eyes === r, vToward: +((b.vx * (rp.x - b.x) + b.vy * (rp.y - b.y)) / (Math.hypot(rp.x - b.x, rp.y - b.y) || 1)).toFixed(2) };
      }
      out = { ttt: +(rel - (sim.qb.behavior?.snapAt ?? 0)).toFixed(2), motion: motionAt === null ? null : +(rel - motionAt).toFixed(2), rows };
    }
  };
  const res = run.call(this);
  if (out) process.stdout.write(JSON.stringify(out) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
