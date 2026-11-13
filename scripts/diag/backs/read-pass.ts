/**
 * What the QB passed on his way to the back, and whether he expected a blitz (league games; passive: evaluate() draws no
 * dice). Per pass play: the concept; every read he moved off (slot:route, when, his window P and interception risk for
 * it then, the true distance from that receiver to his nearest defender then, and that receiver's depth past the line);
 * his blitz expectation at 1.0 s against the rushers that came (defenders on 'rush' or 'blitz' at 1.0 s); the target, his
 * route, the read index and the throw time.
 *   node --import tsx scripts/diag/backs/read-pass.ts [--seed 101] [--games 8] > out/backs/reads.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const rid = (a: any, routes: Map<any, string>) => `${a.slot}:${routes.get(a) ?? a?.behavior?.route?.id ?? a?.behavior?.kind}`;
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  let qb: any = null, lastIdx = 0, passed: any[] = [], blitz: any = null, thr: any = null;
  const routes = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    if (!qb && sim.qb.behavior?.kind === 'qb-pass') { qb = sim.qb.behavior; lastIdx = qb.readIdx; }
    for (const a of sim.offense) if (a.behavior?.route?.id) routes.set(a, a.behavior.route.id);
    if (!blitz && sim.t >= 1.0) blitz = { expected: !!qb?.mind?.blitzExpected, rushers: sim.defense.filter((d: any) => d.behavior?.kind === 'rush' || d.behavior?.kind === 'blitz').length };
    if (qb && !thr && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb && qb.readIdx > lastIdx) {
      for (let i = lastIdx; i < qb.readIdx && i < qb.reads.length; i++) {
        const r = qb.reads[i];
        let ev: any = null;
        try { ev = qb.evaluate(sim.qb, sim, r, qb.barNow?.u ?? 0); } catch {}
        const near = Math.min(...sim.defense.filter((d: any) => !d.isDown(sim.t)).map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y)));
        passed.push({ read: rid(r, routes), t: +sim.t.toFixed(2), P: ev ? +ev.P.toFixed(2) : null, int: ev ? +ev.intRisk.toFixed(2) : null, sep: +near.toFixed(2), depth: +((r.pos.x - sim.los) * sim.attackDir('O')).toFixed(1) });
      }
      lastIdx = qb.readIdx;
    }
    if (!thr && was !== 'air' && sim.ball.kind === 'air' && !sim.ball.throwaway && sim.ball.target) thr = { t: +sim.t.toFixed(2), target: rid(sim.ball.target, routes), pos: sim.ball.target.player.position, readIdx: qb?.readIdx ?? null };
  };
  const res = run.call(this);
  process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, reads: qb?.reads?.map((r: any) => rid(r, routes)) ?? [], passed, blitz, thr, caught: !!sim.stats.completed, outcome: res.outcome }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
