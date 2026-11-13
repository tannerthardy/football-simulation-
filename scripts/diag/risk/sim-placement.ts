/**
 * Deep-ball placement in the sim, the same operator as nfl_placement.py (ball to the targeted receiver when the
 * ball arrives, by throw distance, and completion), plus his belief: at the throw, the miss he expects at that
 * distance (missSigma) and the accuracy term his window multiplies in (pAcc), and the miss he actually threw (the
 * ball's arrival point against his aim). Forced-concept panel plays plus four verticals (the deep throws).
 *   node --import tsx scripts/diag/risk/sim-placement.ts [--seeds 1,2] > out/risk/sim-placement.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2').split(',').map(Number);
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const P: any = QBPass.prototype, rel = P.release;
let cur: any = null;
P.release = function (a: any, sim: any, ev: any) {
  if (cur && !cur.aim) {
    const dist = Math.hypot(ev.point.x - a.pos.x, ev.point.y - a.pos.y), sigma = this.missSigma(a, sim, dist, 0);
    cur.aim = { T: ev.T, at: sim.t, x: ev.point.x, y: ev.point.y, dist: +dist.toFixed(1), sigma: +sigma.toFixed(2), pAcc: +Math.exp(-(sigma * sigma) / (2 * 1.35 * 1.35)).toFixed(3), P: +ev.P.toFixed(3) };
  }
  return rel.call(this, a, sim, ev);
};
const jobs: Array<[string, string]> = [];
for (const c of concepts) jobs.push([c.id, 'x']);
for (let i = 0; i < 6; i++) jobs.push(['four_verts', 'x']);
for (const [concept] of jobs) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip }));
  cur = { aim: null, arrive: null, rel: null, planned: null };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air', b0 = air ? sim.ballPos() : null, target = air ? sim.ball.target : null;
    tick();
    if (!air && sim.ball.kind === 'air' && !cur.rel) cur.rel = { ...sim.ballPos() };
    if (air && sim.ball.kind !== 'air' && !cur.arrive && target) cur.arrive = { ball: b0, rec: { x: target.pos.x, y: target.pos.y } };
    // At the planned arrival (release + flight time): the throw's own miss (the ball against his aim) and the
    // receiver's (him against the aim point), before anyone adjusts to the ball's actual flight.
    if (cur.aim && !cur.planned && sim.t >= cur.aim.at + cur.aim.T - 1e-9) {
      const tg = sim.ball.kind === 'air' ? sim.ball.target : target, b = sim.ballPos();
      cur.planned = { throwMiss: +Math.hypot(b.x - cur.aim.x, b.y - cur.aim.y).toFixed(2), recMiss: tg ? +Math.hypot(tg.pos.x - cur.aim.x, tg.pos.y - cur.aim.y).toFixed(2) : null, inAir: sim.ball.kind === 'air' };
    }
  };
  const res = sim.run(), s = sim.stats;
  if (!cur.aim || !cur.arrive || !cur.rel) continue;
  const b = cur.arrive.ball, r = cur.arrive.rec;
  process.stdout.write(JSON.stringify({ concept, coverage, throwDist: +Math.hypot(b.x - cur.rel.x, b.y - cur.rel.y).toFixed(1), ballToCatcher: +Math.hypot(b.x - r.x, b.y - r.y).toFixed(2),
    missFromAim: +Math.hypot(b.x - cur.aim.x, b.y - cur.aim.y).toFixed(2), planned: cur.planned, cmp: !!s.completed, int: !!s.interceptedBy, ...cur.aim }) + '\n');
}
