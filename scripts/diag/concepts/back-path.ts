/**
 * The back's route as a path (BACK_PATHS): league games; on every called drop-back pass (not a screen), each back
 * running a back route (routeOfAgent 'back:<id>'): his depth from the line and width from the ball at 1.0 / 1.5 /
 * 2.0 / 2.5 s, and, when he is thrown to, the aim's depth. Same quantities as the NFL path from tracking (FLAT routes
 * by backs, non-PA drop-backs). Passive.
 *   [BACK_PATHS=1] node --import tsx scripts/diag/concepts/back-path.ts [--seed 101] [--games 8] > out/concepts/bp-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen' || pass.family === 'playaction') return run.call(this);
  const backs = sim.offense.filter((o: any) => (sim.offAlign.refOf[o.slot] ?? o.slot).startsWith('B'));
  const ball = sim.ballY, at: Map<any, any> = new Map(backs.map((b: any) => [b, {}]));
  let thrown: any = null, aim: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!air && sim.ball.kind === 'air' && !thrown) { thrown = sim.ball.target; aim = sim.ball.intended; }
    for (const b of backs) for (const T of [1.0, 1.5, 2.0, 2.5]) { const m = at.get(b); if (m[T] === undefined && sim.t >= T - 1e-9) m[T] = [+(b.pos.x - sim.los).toFixed(2), +Math.abs(b.pos.y - ball).toFixed(2)]; }
  };
  const r = run.call(this);
  for (const b of backs) {
    const route = routeOfAgent.get(b) ?? 'in';
    if (!route.startsWith('back:')) continue;
    process.stdout.write(JSON.stringify({ route: route.slice(5), path: at.get(b), targeted: thrown === b, aim: thrown === b && aim ? +(aim.x - sim.los).toFixed(1) : null,
      cmp: thrown === b && !!sim.stats.completed, yards: thrown === b ? +r.yards.toFixed(2) : null }) + '\n');
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
