// QB_BREAK=1 [SCRAMBLE_RULE=1] node --import tsx scripts/diag/scramble/scramble-pair.ts > rows.jsonl
// The same plays with the receivers' scramble rule off and on: per play, whether the quarterback left the pocket (more
// than 4.5 yd off the ball), when, and the result. Same bodies, call and seed in both arms.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = (process.env.SCR_CONCEPTS ?? 'smash mesh flood drive y_cross dagger four_verts curl_flat stick sail_corner').split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const concept of CONCEPTS) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team); let outAt: number | null = null; let thr: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), away, route: target?.behavior?.route?.id ?? null, out: outAt !== null,
      depth: target ? +((target.pos.x - sim.los) * dir).toFixed(1) : null,
      sep: target ? +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))).toFixed(1) : null };
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  const tk = sim.tick.bind(sim);
  sim.tick = () => { tk(); if (outAt === null && !thr && sim.ball.kind === 'held' && Math.abs(sim.qb.pos.y - sim.ballY) > 4.5 && (sim.qb.pos.x - sim.los) * dir < 0) outAt = +sim.t.toFixed(2); };
  let res: any; try { res = sim.run(); } catch (e: any) { console.error(String(e?.stack).slice(0, 300)); continue; }
  const st = res.stats;
  console.log(JSON.stringify({ concept, coverage, roster, seed, outAt, thr, sacked: !!st.sacked, cmp: !!st.completed, int: !!st.interceptedBy, yards: res.yards ?? null }));
}
