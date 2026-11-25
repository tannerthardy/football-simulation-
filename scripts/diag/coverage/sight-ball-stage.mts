/** SIGHT_BALL staged (Flex, 2026-11-25): (1) the glimpse is release-evidence's old ball test (sawAt) exactly; (2) how many
 * estimator samples the sight line removes, receivers and defenders; (3) the hands gate: per tick a defender is tracking the
 * flight, seenReady ("has an estimate") against seesBall ("sees it now"), by how far his recorded head is off the ball.
 * usage: BALL_EST=<mask> SIGHT_BALL=<0|1> node --import tsx scripts/diag/coverage/sight-ball-stage.mts */
import { nativeTraceSetup } from '../command-trace.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { glimpsesBall } from '../../../src/sim/ball-estimate.js';
import { sawAt } from '../../../src/sim/release-evidence.js';
let agree = 0, disagree = 0; const samples = { O: 0, D: 0 };
const gate: Record<string, { ready: number; sees: number; n: number }> = {};
for (const [concept, coverage] of [['curl_flat', 'cover3'], ['stick', 'cover3'], ['slant_flat', 'cover1'], ['four_verts', 'cover1'], ['curl_flat', 'cover2']] as const) for (let seed = 1; seed <= 12; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  for (let i = 0; i < 400 && sim.phase === 'live'; i++) {
    sim.tick();
    if (sim.ball.kind !== 'air') continue;
    const b = sim.ball.flight.pos;
    for (const a of sim.agents) {
      if (a === sim.qb) continue;
      for (const back of [0, 4]) { const x = sawAt(sim, a, back, { pos: { x: b.x, y: b.y } }, b.z) === glimpsesBall(sim, a, back, b); if (x) agree++; else disagree++; }
      const est = sim.ballEstimates; if (!est) continue;
      if (a.team === 'D' && est.samplesOf(a) > 0) {
        const head = a.head ?? a.facing, off = Math.abs(Math.atan2(Math.sin(Math.atan2(b.y - a.pos.y, b.x - a.pos.x) - head), Math.cos(Math.atan2(b.y - a.pos.y, b.x - a.pos.x) - head))) * 180 / Math.PI;
        const k = off < 30 ? 'head within 30 deg of the ball' : off < 90 ? 'head 30-90 deg off' : 'head over 90 deg off';
        const g = (gate[k] ??= { ready: 0, sees: 0, n: 0 }); g.n++; if (est.seenReady(a, sim)) g.ready++; if (est.seesBall?.(a, sim)) g.sees++;
      }
    }
  }
  if (sim.ballEstimates) for (const a of sim.agents) samples[a.team as 'O' | 'D'] += sim.ballEstimates.samplesOf(a);
}
console.log(`BALL_EST=${process.env.BALL_EST ?? 6145} SIGHT_BALL=${process.env.SIGHT_BALL ?? 0}`);
console.log(`glimpse vs sawAt (ball): agree ${agree}, disagree ${disagree}`);
console.log(`estimator samples taken: offense ${samples.O}, defense ${samples.D}`);
console.log('| defender tracking the flight | ticks | seenReady (has an estimate) | seesBall (sees it now) |\n|---|---|---|---|');
for (const [k, g] of Object.entries(gate)) console.log(`| ${k} | ${g.n} | ${(100 * g.ready / g.n).toFixed(0)}% | ${(100 * g.sees / g.n).toFixed(0)}% |`);
