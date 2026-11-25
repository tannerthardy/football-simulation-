// Staged "should obviously work" case (SIDE=S|W picks the side's #1 and flat corner) (Integration / QB lane, 2026-11-24): quick outs vs Cover 2 with SQUAT_SINK. The
// strong flat corner, every 0.1 s to the catch: #1 as he sees him (depth, width outside the ball, velocity), his
// squatSinking / oneCancelled state, his technique label, his depth and width, his requested velocity; the release time
// and the outcome. One coverage, one concept, seeds 1..N.   SQUAT_SINK=1 node --import tsx scripts/diag/coverage/c2-out-stage.mts [seeds] [concept] [coverage]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 12), concept = process.argv[3] ?? 'quick_outs', coverage = process.argv[4] ?? 'cover2';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; a.__req = { ...c.vel }; return c; };
for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  const SIDE = process.env.SIDE ?? 'S'; const one = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering[SIDE + '1']);
  const cb = sim.defense.find((d: any) => (d.behavior as any)?.zone === (SIDE === 'W' ? 'flat_w' : 'flat_s'));
  const lines: string[] = []; let rel = null as number | null, target = '';
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (rel === null && sim.ball?.kind === 'air') { rel = sim.t; target = sim.ball.target?.slot ?? ''; }
    if (Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6 && sim.t <= (rel ?? 9) + 1.0 && cb && one) {
      const s = sim.see(cb, one), out = Math.sign(one.pos.y - sim.ballY) || 1, b: any = cb.behavior;
      lines.push(`  ${sim.t.toFixed(1)} #1 seen d ${(s.pos.x - sim.los).toFixed(1)} w ${((s.pos.y - sim.ballY) * out).toFixed(1)} v(${s.vel.x.toFixed(1)},${(s.vel.y * out).toFixed(1)}) | CB ${b?.kind}:${b?.zone ?? ''} sit ${b?.sitting ? 1 : 0} sink ${b?.squatSinking ? 1 : 0} canc ${b?.oneCancelled ? 1 : 0} sinkWith ${b?.sinkWith?.slot ?? "-"} ${cb.__lab ?? ''} d ${(cb.pos.x - sim.los).toFixed(1)} w ${((cb.pos.y - sim.ballY) * out).toFixed(1)} req(${(cb.__req?.x ?? 0).toFixed(1)},${((cb.__req?.y ?? 0) * out).toFixed(1)})${sim.ball?.kind === 'air' ? ' [air]' : ''}`);
    } };
  const r = sim.run();
  console.log(`seed ${seed}: release ${(rel as number | null)?.toFixed(2)} to ${target} (#1 ${one?.slot}) -> ${r.outcome} ${r.yards.toFixed(1)}`);
  if (seed <= 3) console.log(lines.join('\n'));
}
