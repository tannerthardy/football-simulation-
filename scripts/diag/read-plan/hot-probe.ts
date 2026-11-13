/**
 * HOT_PLAN fixture probe: corner-flat vs Cover 2 with the strong corner sinking (test/read-plan.test.ts's key
 * fixture), seeds 1-6, on the current engine. Prints the key read, the true time to the nearest rusher at the cue,
 * the target and the time to throw. Arms by the environment.
 *   [HOT_PLAN=1] [FREE_BOUND=1] node --import tsx scripts/diag/read-plan/hot-probe.ts
 */
import { PlaySim } from '../../../src/sim/playsim.js';
import { goTo } from '../../../src/sim/behaviors/common.js';
import { nativeTraceSetup } from '../command-trace.js';

for (const key of ['sink', 'jump'] as const) for (let seed = 1; seed <= 6; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'corner_flat', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team), ss = sim.offAlign.strongSign;
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  const s1 = sim.offense.find((o: any) => ref(o) === 'S1'), s2 = sim.offense.find((o: any) => ref(o) === 'S2');
  const cb = sim.defense.find((d: any) => d.slot === 'CB_S'), orig = cb.behavior;
  cb.behavior = { kind: orig.kind, update: (a: any, s: any) => s.t < 0.6 ? orig.update(a, s)
    : goTo(a, key === 'sink' ? { x: s.los + 15 * dir, y: s1.pos.y } : { x: s.los + 3 * dir, y: s2.pos.y + 3 * ss }, { speed: 0.95 }) };
  let qb: any = null, target: any = null, rushIn: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb?.keyRead && rushIn === null) {
      const q = sim.qb.pos;
      rushIn = Math.min(...sim.defense.map((d: any) => {
        const dx = q.x - d.pos.x, dy = q.y - d.pos.y, dist = Math.hypot(dx, dy);
        return dist / Math.max(0.5, (d.vel.x * dx + d.vel.y * dy) / Math.max(dist, 1e-6));
      }));
    }
    if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target; }
  };
  sim.run();
  console.log(JSON.stringify({ key, seed, read: qb?.keyRead?.throwTo ?? null, rushIn: rushIn && +rushIn.toFixed(2),
    target: target ? ref(target) : null, ttt: sim.throwAt, outcome: sim.outcome, yards: sim.buildResult().yards }));
}
