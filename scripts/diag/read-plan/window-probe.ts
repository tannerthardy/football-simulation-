/**
 * The QB's throw window against what happened (risk-model diagnosis): on the forced-concept panel's plays, at the
 * moment he decides to throw (startThrow), his window's terms for every defender are recomputed as window() does
 * (where he thinks the man is, the blind time, the reaction he assumes, the run time to the catch point, the ball's
 * arrival), and afterwards what each defender did: when he broke toward the catch point (moving toward it at 2 yd/s
 * or more, at least half his speed, after the decision), when he got within reach (reach + 0.3) of it, and his
 * speed on the way. One row per throw; the defender rows ranked by predicted margin (tt - total; < 0 means the QB
 * expected him to beat the ball). Passive.
 *   node --import tsx scripts/diag/read-plan/window-probe.ts [--seeds 1,2,3,4] > out/read-plan/window.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { timeToReach } from '../../../src/physics/reach.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2,3,4').split(',').map(Number);
const forms = arg('--forms', 'gun_doubles_11,gun_trips_11').split(',');
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const P: any = QBPass.prototype, st0 = P.startThrow;
let rec: any = null;
P.startThrow = function (a: any, sim: any, ev: any) {
  if (rec && !rec.decision) {
    const wind = this.windup(a), total = wind + ev.T, pt = ev.point, pMan = this.mind.pMan();
    const forecast = this.receiverForecasts.get(ev.target);
    const target = forecast?.predict(sim.t, 0) ?? ev.target.pos;
    const breakAt = forecast?.breakAt() ?? null, untilBreak = breakAt === null ? 0 : Math.max(0, breakAt - sim.t);
    const defs = sim.defense.filter((d: any) => !d.isDown(sim.t)).map((d: any) => {
      const seen = this.mind.estimate(d);
      const facingQB = Math.cos(seen.facing - Math.atan2(a.pos.y - seen.pos.y, a.pos.x - seen.pos.x)) > 0.2;
      const onTarget = Math.hypot(seen.pos.x - target.x, seen.pos.y - target.y) < 3;
      const facingBlind = pMan * wind + (1 - pMan) * Math.max(0, wind - d.profile.reactionTime);
      const blind = facingQB ? facingBlind : onTarget ? Math.min(untilBreak, wind) : wind;
      const mover = { pos: { x: seen.pos.x + seen.vel.x * blind, y: seen.pos.y + seen.vel.y * blind }, vel: seen.vel, profile: d.profile, speedScale: d.speedScale };
      const react = d.profile.reactionTime * (facingQB ? 1 : 1.8) + (d.engagement ? 0.5 : 0);
      const run = timeToReach(mover, pt, d.profile.reach + 0.3);
      return { d, slot: d.slot, facingQB, onTarget, blind: +blind.toFixed(2), react: +react.toFixed(2), run: +run.toFixed(2), tt: +(blind + run + react).toFixed(2),
        margin: +(blind + run + react - total).toFixed(2), seenErr: +Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y).toFixed(2),
        speed0: +Math.hypot(d.vel.x, d.vel.y).toFixed(2), vmax: +d.profile.vmax.toFixed(2), distPt: +Math.hypot(d.pos.x - pt.x, d.pos.y - pt.y).toFixed(2),
        brk: null as number | null, reached: null as number | null, path: 0, prev: { x: d.pos.x, y: d.pos.y } };
    });
    rec.decision = { t: sim.t, wind: +wind.toFixed(2), T: +ev.T.toFixed(2), total: +total.toFixed(2), pt: { x: pt.x, y: pt.y }, P: +ev.P.toFixed(3), intRisk: +ev.intRisk.toFixed(3), target: ev.target.slot };
    rec.defs = defs;
  }
  return st0.call(this, a, sim, ev);
};
for (const c of concepts) for (const formation of forms) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: c.id, seed, roster: seed, formation, flip }));
  rec = { decision: null, defs: [] };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const D = rec.decision;
    if (!D) return;
    const since = sim.t - D.t;
    for (const x of rec.defs) {
      const d = x.d, dx = D.pt.x - d.pos.x, dy = D.pt.y - d.pos.y, dist = Math.hypot(dx, dy), sp = Math.hypot(d.vel.x, d.vel.y);
      x.path += Math.hypot(d.pos.x - x.prev.x, d.pos.y - x.prev.y); x.prev = { x: d.pos.x, y: d.pos.y };
      const toward = dist > 0 ? (d.vel.x * dx + d.vel.y * dy) / dist : 0;
      if (x.brk === null && toward >= 2 && toward >= 0.5 * sp) x.brk = +since.toFixed(2);
      if (x.reached === null && dist <= d.profile.reach + 0.3) { x.reached = +since.toFixed(2); x.pathAt = +x.path.toFixed(2); }
    }
  };
  const res = sim.run(), s = sim.stats;
  if (!rec.decision || !s.attempted) continue;
  const intBy = s.interceptedBy ? sim.defense.find((d: any) => d.player.id === s.interceptedBy)?.slot ?? null : null;
  const defs = rec.defs.sort((a: any, b: any) => a.margin - b.margin).slice(0, 4).map(({ d, prev, path, ...x }: any) => ({ ...x, interceptor: x.slot === intBy }));
  process.stdout.write(JSON.stringify({ concept: c.id, formation, coverage, seed, flip, int: !!intBy, intBy, cmp: !!s.completed, releaseT: sim.throwAt, ...rec.decision, defs }) + '\n');
}
