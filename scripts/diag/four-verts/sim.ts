/**
 * Four verticals, the standing stress test (both sides): four_verts from 2x2 and 3x1 against Cover 1, 2, 3 and 4,
 * N plays a cell (seed and roster 1..N, both flips), on whatever engine the environment sets. One row per play.
 * Report and the NFL side: scripts/diag/four-verts/report.py. No engine change; passive.
 *   [READ_PLAN=1] node --import tsx scripts/diag/four-verts/sim.ts [--n 100] [--arm name]   -> out/four-verts/sim-<arm>.jsonl
 * Row: where the ball went (seam = a vertical from an inside alignment, go = from the widest alignment on his
 * side, back, other), time to throw, completion, interception; at the throw, each vertical's separation (nearest
 * defender) and how long it had been open (separation >= 2.5 yd, 8 yd or more deep, continuously) before the
 * throw; the first time any seam was open, and to whom; for each vertical, the nearest defender (slot, distance)
 * as he passes 12 and 18 yd.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', '100')), arm = arg('--arm', 'x');
const OPEN = 2.5, DEEP = 8;
mkdirSync('out/four-verts', { recursive: true });
const rows: string[] = [];
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (let i = 1; i <= N; i++) {
    const seed = Math.ceil(i / 2), flip = i % 2 === 0;
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }));
    const dir = sim.attackDir(sim.offense[0].team), by = sim.ballY;
    const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
    // Verticals and their class from the snap alignment: the widest on his side is the outside go, the rest seams.
    const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
    const cls = new Map<any, string>();
    for (const r of runners) {
      const side = Math.sign(r.pos.y - by) || 1;
      const wider = runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5);
      cls.set(r, wider ? 'seam' : 'go');
    }
    const st = new Map<any, { openSince: number | null; at12: any; at18: any }>(runners.map((r: any) => [r, { openSince: null, at12: null, at18: null }]));
    let firstOpen: any = null, target: any = null, atThrow: any = null;
    const near = (r: any) => {
      let best: any = null, bd = Infinity;
      for (const d of sim.defense) { const x = Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y); if (x < bd) { bd = x; best = d; } }
      return { d: best, dist: bd };
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const air = sim.ball.kind === 'air';
      tick();
      for (const r of runners) {
        if (!(r.behavior instanceof RouteRunner)) continue;
        const s = st.get(r)!, depth = (r.pos.x - sim.los) * dir, n = near(r);
        // The defense's read runs on after the throw (to the end of the play, while he runs his route).
        if (!s.at12 && depth >= 12) s.at12 = { slot: n.d.slot, dist: +n.dist.toFixed(2) };
        if (!s.at18 && depth >= 18) s.at18 = { slot: n.d.slot, dist: +n.dist.toFixed(2) };
        if (sim.throwAt >= 0) continue;
        const open = depth >= DEEP && n.dist >= OPEN;
        if (open && s.openSince === null) s.openSince = sim.t;
        if (!open) s.openSince = null;
        if (open && !firstOpen && cls.get(r) === 'seam') firstOpen = { t: +sim.t.toFixed(2), ref: ref(r), sep: +n.dist.toFixed(2) };
      }
      if (!air && sim.ball.kind === 'air' && !target) {
        target = sim.ball.target;
        atThrow = runners.map((r: any) => { const s = st.get(r)!; return { ref: ref(r), cls: cls.get(r), sep: +near(r).dist.toFixed(2), openFor: s.openSince === null ? 0 : +(sim.t - s.openSince).toFixed(2) }; });
      }
    };
    const res = sim.run(), s = sim.stats;
    const tc = !target ? null : cls.get(target) ?? (ref(target) === 'B' || ref(target) === 'B2' ? 'back' : 'other');
    rows.push(JSON.stringify({ formation, coverage, seed, flip, target: tc, targetRef: target ? ref(target) : null, ttt: s.timeToThrow ?? null,
      att: !!s.attempted, cmp: !!s.completed, int: !!s.interceptedBy || res.events.some((e: any) => e.type === 'interception'), sack: !!s.sacked,
      yards: +res.yards.toFixed(2), atThrow, firstOpen,
      verts: runners.map((r: any) => ({ ref: ref(r), cls: cls.get(r), at12: st.get(r)!.at12, at18: st.get(r)!.at18 })) }));
  }
writeFileSync(`out/four-verts/sim-${arm}.jsonl`, rows.join('\n') + '\n');
console.log(`${arm}: ${rows.length} plays`);
