/**
 * BLITZ_READ opportunity (league games, passive): per pass play, the rushers at 0.4/0.6/0.8 s that the protection does
 * not account for (rush/blitz defenders no protector is assigned to: ProtectionCoordinator.assigned, read through a
 * protector), the side they come from, the receivers on that side running a quick route (family quick, or a back's or
 * flat route), the rushers' count, the throw (time, target slot, route) and a sack.
 *   node --import tsx scripts/diag/eyes/free-rusher.ts [--seed 101] [--games 8] > out/eyes/free-rusher.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const QUICK = new Set(['slant', 'quick_out', 'hitch', 'stick', 'flat', 'back_flat', 'swing', 'arrow', 'whip', 'speed_out', 'bubble']);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const at: any = {}; let thr: any = null; const routes = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    for (const a of sim.offense) if (a.behavior?.route?.id) routes.set(a, a.behavior.route.id);
    for (const T of [0.4, 0.6, 0.8, 1.0]) if (!at[T] && sim.t >= T - 1e-9) {
      const coord = sim.offense.map((o: any) => o.behavior?.coord).find((c: any) => c?.assigned);
      const taken = new Set<any>(coord ? [...coord.assigned.values()].filter(Boolean) : []);
      const rushers = sim.defense.filter((d: any) => d.behavior?.kind === 'rush' || d.behavior?.kind === 'blitz');
      const free = rushers.filter((d: any) => !taken.has(d) && !d.engagement);
      const qbB: any = sim.qb.behavior?.kind === 'qb-pass' ? sim.qb.behavior : null, Q = sim.qb.pos;
      const close = (p: any, v: any) => { const dx = Q.x - p.x, dy = Q.y - p.y, L = Math.hypot(dx, dy) || 1; return +((v.x * dx + v.y * dy) / L).toFixed(2); };
      at[T] = { rushers: rushers.length, free: free.map((d: any) => { const e = qbB?.mind?.estimate(d);
        return { pos: d.player.position, side: Math.sign(d.pos.y - sim.ballY) || 1, dist: +Math.hypot(d.pos.x - Q.x, d.pos.y - Q.y).toFixed(1),
          beyondLos: +((d.pos.x - sim.los) * sim.attackDir('O')).toFixed(1), closeTrue: close(d.pos, d.vel),
          estErr: e ? +Math.hypot(e.pos.x - d.pos.x, e.pos.y - d.pos.y).toFixed(2) : null, closeSeen: e ? close(e.pos, e.vel) : null }; }),
        quickBySide: Object.fromEntries([-1, 1].map((s) => [s, sim.offense.filter((o: any) => QUICK.has(routes.get(o) ?? '') && Math.sign(o.pos.y - sim.ballY) === s).map((o: any) => `${o.slot}:${routes.get(o)}`)])) };
    }
    if (!thr && was !== 'air' && sim.ball.kind === 'air') thr = { t: +sim.t.toFixed(2), slot: sim.ball.target?.slot ?? null, route: sim.ball.target ? routes.get(sim.ball.target) ?? null : null, away: !!sim.ball.throwaway };
  };
  let qbB: any = null; const t2 = sim.tick.bind(sim); sim.tick = () => { t2(); if (!qbB && sim.qb.behavior?.kind === 'qb-pass') qbB = sim.qb.behavior; };
  const res = run.call(this);
  const hot = qbB?.hot ? { at: +qbB.hot.at.toFixed(2), target: qbB.hot.target?.slot ?? null, by: qbB.hotBy } : null;
  process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, hot, at, thr, sack: sim.events.some((e: any) => e.type === 'sack'), caught: !!sim.stats.completed, outcome: res.outcome }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
