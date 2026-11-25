import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
for (const seed of [19]) {
  const setup: any = nativeTraceSetup({ concept: 'stick', coverage: 'cover2', seed, roster: 3, formation: 'gun_trips_11', flip: false });
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let last = -1, calls = 0, sets = 0, lastAng: any = null, lastHalf: any = null, lastSeenAge: any = null;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const bb = sim.qb.behavior; if (bb?.mind && !bb.mind.__w) { bb.mind.__w = 1; const o = bb.mind.observe.bind(bb.mind); bb.mind.observe = (g: any) => { calls++; const cb = sim.defense.find((d: any) => d.slot === 'CB_S'); const before = bb.mind.memory.get(cb)?.t; o(g); const after = bb.mind.memory.get(cb)?.t; if (after !== before) sets++; const c = sim.see(sim.qb, cb); lastAng = Math.round(Math.abs(Math.atan2(Math.sin(Math.atan2(c.pos.y - sim.qb.pos.y, c.pos.x - sim.qb.pos.x) - Math.atan2(g.y - sim.qb.pos.y, g.x - sim.qb.pos.x)), Math.cos(Math.atan2(c.pos.y - sim.qb.pos.y, c.pos.x - sim.qb.pos.x) - Math.atan2(g.y - sim.qb.pos.y, g.x - sim.qb.pos.x)))) * 57.3); lastHalf = Math.round(bb.mind.clearHalf * 57.3); lastSeenAge = c.age; }; }
    t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h, q = sim.qb;
    if (h && sim.t >= 0.45 && sim.t <= 1.5 && sim.t - last >= 0.099) {
      last = sim.t; const cb = sim.defense.find((d: any) => d.slot === 'CB_S'), e = h.estimate(cb);
      const head = q.head ?? q.body.facing, toCB = Math.atan2(cb.pos.y - q.pos.y, cb.pos.x - q.pos.x), gz = v2.gaze ? v2.gaze(h) : null;
      const toG = gz ? Math.atan2(gz.y - q.pos.y, gz.x - q.pos.x) : null;
      console.log(r2(sim.t), 'state', v2.cycle.state, 'look', JSON.stringify(v2.cycle.looks.current), 'head-toCB deg', Math.round(wrap(head - toCB) * 57.3), 'head-toGaze', toG === null ? null : Math.round(wrap(head - toG) * 57.3), 'age', r2(h.pictureAge(cb)), 'seen v', r2(e.vel.x), r2(e.vel.y), 'true v', r2(cb.vel.x), r2(cb.vel.y), 'qbEyes', sim.qbEyes?.slot ?? null, 'observe calls', calls, 'CB sets', sets, 'ang(seen pic)', lastAng, 'clearHalf', lastHalf, 'see.age', lastSeenAge); calls = 0; sets = 0;
    }
    if (sim.t > 1.6) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { console.log(String(e)); }
}
