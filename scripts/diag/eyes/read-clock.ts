// QB lane 2026-11-18 (Integration's third question): per pass concept, what moves his eyes off each read. One play
// per concept and formation (cover3, seed 1, roster 7), at his set: whether the read is on the plan's beats
// (onBeats: beatDue), has a footwork step but no beats (the dwell decides, or READ_WINDOW's quick clock on a quick
// concept), or neither (the dwell). Also whether the concept is a triangle or a peek (their own hold rules).
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const [id, c] of Object.entries(PASS_BY_ID) as [string, any][]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: id, seed: 1, roster: 7, formation, flip: false })); } catch { continue; }
  for (let i = 0; i < 80; i++) { sim.tick(); const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && b.setAt >= 0 && b.reads) {
      const cls = b.reads.map((r: any) => { let beats = false; try { beats = !!b.onBeats(r); } catch {} const s = b.stepOf?.get?.(r);
        return beats ? 'beats' : s ? 'step' : 'dwell'; });
      console.log(JSON.stringify({ id, formation, family: c.family, drop: c.drop, tri: !!b.plan?.triangle, peek: !!b.plan?.peek, reads: cls }));
      break; }
    if (sim.phase !== 'live') break; }
}
