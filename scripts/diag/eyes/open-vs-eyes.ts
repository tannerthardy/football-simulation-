// QB lane 2026-11-18 (Integration: does the 0.35 s dwell mistime the drop-back game?). For each concept in OVE_CONCEPTS,
// doubles / trips x 7 zone shells x rosters 3, 11 x seeds 1, 2 (no flip): every ready read evaluated every tick (u = 0,
// no dice), when it first clears his bar, when his eyes get there and leave, whether it was thrown; and the throw time.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const C = (process.env.OVE_CONCEPTS ?? 'curl_flat,smash,dagger,flood').split(',');
for (const concept of C) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover2', 'cover2_match', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
  for (const roster of [3, 11]) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    const per = new Map<string, any>(); let thrown: any = null;
    for (let i = 0; i < 120 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
      const was = sim.ball.kind; sim.tick(); const b: any = sim.qb.behavior;
      if (!thrown && was !== 'air' && sim.ball.kind === 'air') thrown = { t: +sim.t.toFixed(2), slot: sim.ball.target?.slot ?? null };
      if (b?.kind !== 'qb-pass' || !b.reads || thrown) continue;
      const need = b.barNow?.thr ?? 0.55, risk = b.barNow?.maxInt ?? 0.05, onR = b.reads[b.readIdx];
      for (const r of b.reads) {
        const s = per.get(r.slot) ?? { slot: r.slot, route: r.behavior?.route?.id, idx: b.reads.indexOf(r), clearAt: null, eyesAt: null, eyesOff: null, beats: (() => { try { return !!b.onBeats(r); } catch { return false; } })() };
        per.set(r.slot, s);
        if (b.setAt >= 0) { if (onR === r && s.eyesAt === null) s.eyesAt = +sim.t.toFixed(2); if (onR !== r && s.eyesAt !== null && s.eyesOff === null) s.eyesOff = +sim.t.toFixed(2); }
        let ready = false; try { ready = b.ready(r, sim); } catch {} if (!ready) continue;
        let e: any = null; try { e = b.evaluate(sim.qb, sim, r, 0); } catch {} if (!e) continue;
        if (s.clearAt === null && e.P >= need && e.intRisk <= risk) s.clearAt = +sim.t.toFixed(2);
      }
    }
    console.log(JSON.stringify({ concept, key: [formation, coverage, roster, seed].join('|'), thrown, reads: [...per.values()] }));
  }
