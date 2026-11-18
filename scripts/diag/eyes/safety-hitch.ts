// node --import tsx scripts/diag/eyes/safety-hitch.ts > rows.jsonl   (QB lane, 2026-11-18: two-high cues on engine-80)
// Cover 2 family and Tampa 2, staged: at the QB's first hitch (set + one stride) each deep half safety's change in width
// (|y| from the ball, + = wider) and depth since the snap, the route of the #1 on his side (outermost receiver) and of
// #2; the Mike's depth. Truth (what the defense does), for whether the taught cues exist to be read. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
for (const concept of ['four_verts', 'verts_hitch', 'smash', 'curl_flat', 'stick', 'flood']) for (const coverage of ['cover2', 'cover2_match', 'tampa2', 'cover4'])
  for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), D = (p: any) => (p.x - sim.los) * dir, W = (p: any) => p.y - sim.ballY;
    const snap = new Map<any, any>(); let row: any = null;
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => { if (!snap.size) for (const d of sim.defense) snap.set(d, { ...d.pos }); tick0(); const b: any = sim.qb.behavior;
      if (!row && b?.kind === 'qb-pass' && b.setAt >= 0 && sim.t >= b.setAt + b.stride() - 1e-9) {
        const recs = sim.offense.filter((o: any) => o.behavior?.route);
        const side = (s: number) => recs.filter((o: any) => Math.sign(W(o.pos)) === s).sort((a: any, c: any) => Math.abs(W(c.pos)) - Math.abs(W(a.pos)));
        row = { t: +sim.t.toFixed(2), safeties: sim.defense.filter((d: any) => D(snap.get(d)) >= 9).map((d: any) => { const s0 = snap.get(d), sd = Math.sign(W(s0)) || 1, mine = side(sd);
          return { slot: d.slot, zone: d.behavior?.zone ?? d.behavior?.kind, widen: +(Math.abs(W(d.pos)) - Math.abs(W(s0))).toFixed(2), deeper: +(D(d.pos) - D(s0)).toFixed(2), n1: mine[0]?.behavior?.route?.id ?? null, n2: mine[1]?.behavior?.route?.id ?? null }; }),
          mike: (() => { const m = sim.defense.find((d: any) => d.slot === 'LB_M' || d.slot === 'MLB' || d.slot === 'LB'); return m ? { slot: m.slot, depth: +D(m.pos).toFixed(1), zone: m.behavior?.zone ?? null } : null; })() }; } };
    try { sim.run(); } catch { continue; }
    console.log(JSON.stringify({ concept, coverage, roster, seed, row }));
  }
