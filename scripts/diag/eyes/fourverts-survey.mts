// Four verts survey (fixture candidates): per play, the separation of each seam/go at 2.2 s (nearest defender), the
// target, the throw time, and whether the back got it. Env sets flags; reference stack applied unless set.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
for (const coverage of ['cover2', 'cover4', 'cover3', 'cover6']) for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip }));
  let at22: any = null, thr: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind; tick();
    if (!at22 && sim.t >= 2.2) at22 = Object.fromEntries(sim.offense.filter((a: any) => ['go', 'seam'].includes(a.behavior?.route?.id)).map((a: any) => [a.slot, +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y))).toFixed(1)]));
    if (!thr && was !== 'air' && sim.ball.kind === 'air') thr = { t: +sim.t.toFixed(2), to: sim.ball.target ? `${sim.ball.target.slot}:${sim.ball.target.behavior?.route?.id ?? sim.ball.target.behavior?.kind}` : 'away' };
  };
  const res = sim.run();
  console.log(JSON.stringify({ coverage, seed, flip, at22, thr, caught: !!sim.stats.completed, out: res.outcome }));
}
