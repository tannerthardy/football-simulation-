/**
 * PA_BOOT probe: the naked forced across coverages, formations and seeds (PA_BOOT=1). Per play: the QB's launch point
 * at the release (depth behind the snap spot, width from it, time from the snap, his speed), what he read the
 * boot-side end doing (bootCall) and the end's distance to him at the release, the target (receiver ref) and the
 * outcome. Compare launch with nfl_boot_launch.py. Passive.
 *   PA_BOOT=1 node --import tsx scripts/diag/concepts/boot-probe.ts [--seeds 1,2,3] > out/concepts/boot-probe.jsonl
 */
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2,3').split(',').map(Number);
const concept = arg('--concept', 'naked');
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip }));
  const snapX = sim.los, snapY = sim.ballY;
  let qb: any = null, rel: any = null, target: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior?.kind === 'qb-pass') qb = sim.qb.behavior;
    if (!air && sim.ball.kind === 'air' && !rel) {
      target = sim.ball.target;
      const end = qb?.bootEnd ?? null;
      rel = { t: +sim.t.toFixed(2), depth: +(snapX - sim.qb.pos.x).toFixed(2), width: +Math.abs(sim.qb.pos.y - snapY).toFixed(2),
        speed: +Math.hypot(sim.qb.vel.x, sim.qb.vel.y).toFixed(2), endDist: end ? +Math.hypot(end.pos.x - sim.qb.pos.x, end.pos.y - sim.qb.pos.y).toFixed(2) : null };
    }
  };
  const r = sim.run(), s = sim.stats, ev = r.events ?? [];
  const ref = (a: any) => a ? sim.offAlign.refOf[a.slot] ?? a.slot : null;
  process.stdout.write(JSON.stringify({ formation, coverage, seed, flip, call: qb?.bootCall ?? null, end: qb?.bootEnd?.slot ?? null, rel, target: ref(target),
    throwaway: ev.some((e: any) => e.type === 'throwaway'), att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked, int: ev.some((e: any) => e.type === 'interception'),
    scramble: !!sim.scrambled, yards: +r.yards.toFixed(2) }) + '\n');
}
