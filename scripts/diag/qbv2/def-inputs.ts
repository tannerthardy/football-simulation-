import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import * as J from '../../../src/sim/qbv2/judge.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
for (const seed of [14, 19, 7]) {
  const setup: any = nativeTraceSetup({ concept: 'stick', coverage: 'cover2', seed, roster: 3, formation: 'gun_trips_11', flip: false });
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let done = false;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h;
    if (!done && v2?.cycle?.state === 'throw') {
      done = true; const ref = v2.cycle.decision.intent.judged?.option?.ref;
      const roles = v2.lastRoles.get(ref) ?? [];
      const cb = sim.defense.find((d: any) => d.slot === 'CB_S'), e = h.estimate(cb), bd = h.body(cb);
      const r = v2.target(h, ref), m = h.mechanics(r, h.felt);
      console.log(seed, 'ref', ref, 't', r2(sim.t), 'windup', r2(h.windup()), 'T', r2(m.T), 'catch', r2(m.point.x - sim.los), r2(m.point.y), 'CB seen', r2(e.pos.x - sim.los), r2(e.pos.y), 'v', r2(e.vel.x), r2(e.vel.y), 'facing', r2(e.facing), 'd', r2(Math.hypot(e.pos.x - m.point.x, e.pos.y - m.point.y)), 'vmax', r2(bd.vmax), 'tau', r2(bd.tau), 'reach', r2(bd.reach), 'age', r2(h.pictureAge(cb)));
      for (const x of roles) if (sim.agents[x.id].slot === 'CB_S') console.log('    role', x.role, 'margin', r2(x.margin), 'sigma', r2(x.sigma), 'pA', r2(x.pArrive));
      const tArr = J.arriveTime({ pos: e.pos, vel: e.vel, facing: e.facing, vmax: bd.vmax, accel: bd.vmax / bd.tau }, m.point, bd.reach + J.PLAY_CLEAR, h.windup());
      console.log('    direct arriveTime (start at release)', r2(tArr), 'ball at', r2(h.windup() + m.T));
    }
    if (sim.t > 3) sim.phase = 'dead';
  };
  try { sim.run(); } catch {}
}
