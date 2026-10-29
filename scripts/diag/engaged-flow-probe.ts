/** Engaged run-rep pairs (primary blocker and defender) 0.5-1.5 s: each body's requested and achieved lateral velocity (along
 * the play's lateral axis, signed so + is the blocker's requested side), the hands' tangential
 * and normal force against their caps. Read-only.
 * Columns: seed, play, scheme, t, blocker slot, defender slot; lateral request B, D; lateral velocity B, D;
 * downfield request B, D; downfield velocity B, D (downfield = offense attack direction); |hand tangent force|,
 * steer cap, hand normal force, push cap, control, helpers, center distance, effort B, D; planned lateral
 * accel B, D; achieved lateral accel B, D; lateral velocity before the tick B, D.
 *   node --import tsx scripts/diag/engaged-flow-probe.ts <seed> | gzip > out/flow-s<seed>.jsonl.gz */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 7);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
let play = 0;
function watch(sim: PlaySim, id: number) {
  const w = sim.world as any, s = sim as any;
  const intents = new Map<any, any>(), before = new Map<any, any>(), planned = new Map<any, any>();
  const plan = w.plan.bind(w);
  w.plan = (b: any, i: number, intent: any, dt: number) => { intents.set(b, intent); before.set(b, { ...b.vel }); const o = plan(b, i, intent, dt); planned.set(b, o); return o; };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.t < 0.5 || sim.t > 1.5) return;
    const scheme = s.offCall.run?.scheme ?? '?';
    for (const e of sim.engagements as any[]) {
      if (e.type !== 'run' || !e.hands) continue;
      const b = e.blocker, d = e.defender, j = e.hands;
      const ib = intents.get(b.body), id_ = intents.get(d.body);
      if (!ib || !id_) continue;
      const sgn = Math.sign(ib.vel.y) || 1;
      console.log(JSON.stringify([seed, id, scheme, r3(sim.t), b.slot, d.slot,
        r3(ib.vel.y * sgn), r3(id_.vel.y * sgn), r3(b.vel.y * sgn), r3(d.vel.y * sgn),
        r3(ib.vel.x * sim.attackDir('O')), r3(id_.vel.x * sim.attackDir('O')), r3(b.vel.x * sim.attackDir('O')), r3(d.vel.x * sim.attackDir('O')),
        r3(Math.abs(j.tangentForce ?? 0)), r3(j.steer), r3(j.normalForce ?? 0), r3(j.push), r3(e.control), e.helpers.length,
        r3(Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y)), r3(ib.effort ?? 1), r3(id_.effort ?? 1),
        r3(planned.get(b.body).ay * sgn), r3(planned.get(d.body).ay * sgn), r3((b.vel.y - before.get(b.body).y) / sim.dt * sgn), r3((d.vel.y - before.get(d.body).y) / sim.dt * sgn), r3(before.get(b.body).y * sgn), r3(before.get(d.body).y * sgn)]));
    }
  };
}
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(home, away, { seed, record: false, runOnly: true, hooks: {
  playResult(sim, kind) { if (kind === 'scrimmage' && !sim.isPass) watch(sim, play++); return undefined; } } });
