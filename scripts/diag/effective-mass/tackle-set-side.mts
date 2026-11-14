// The tackle's set by side, by rusher stance, at two launch depths (Integration / QB lane, 2026-11-14: with the deeper
// launch the strong-side stand-up edge's sacks go 15 -> 49 while the weak side falls 57 -> 36; on the reference the
// weak-side edge takes 57% of sacks). The QB lane's staged plays (drop-staged.ts: concepts x eight coverages x rosters
// 3/7/11/19 x seeds 1-6, gun doubles else trips), run with CONCEPT_DROPS off or on. Per play, each tackle: his side
// (strong / weak by the formation's strength), his edge rusher (the outermost DL/LB aligned outside him within 4 yd who
// rushes), the rusher's stance (stand-up: a linebacker's body in the slot; hand down: a defensive lineman), and at 1.0 /
// 1.5 / 2.0 s: the tackle's depth and width from his alignment, the rusher's depth and width from the tackle's alignment,
// and the rusher outside the tackle (yd). Then the QB's set point and who sacked.
// usage: [CONCEPT_DROPS=1] node --import tsx scripts/diag/effective-mass/tackle-set-side.mts > rows.jsonl
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const CONCEPTS = 'smash mesh flood drive sail_corner corner_flat trips_sail trips_outs double_outs comebacks dagger y_cross four_verts verts_hitch stick curl_flat'.split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const ONLY_R = (process.env.TSS_ROSTERS ?? '3,7,11,19').split(',').map(Number), ONLY_C = (process.env.TSS_CONCEPTS ?? '').split(',').filter(Boolean);
for (const concept of ONLY_C.length ? ONLY_C : CONCEPTS) for (const coverage of COVS) for (const roster of ONLY_R) for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), strong = sim.offAlign.strongSign, by = sim.ballY;
    const T = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
    const rows: any[] = T.map((t: any) => {
      const out = Math.sign(t.pos.y - by) || 1;
      const cand = sim.defense.filter((d: any) => { const w = (d.pos.y - t.pos.y) * out; return w >= 0 && w <= 4 && Math.abs(d.pos.x - sim.los) < 2; });
      const r = cand.sort((a: any, b: any) => (b.pos.y - t.pos.y) * out - (a.pos.y - t.pos.y) * out)[0] ?? null;
      return { t, out, side: out === strong ? 'strong' : 'weak', r, x0: t.pos.x, y0: t.pos.y, stance: r ? (r.player.position === 'LB' || r.player.position === 'OLB' ? 'stand-up' : 'hand-down') : null,
        rslot: r?.slot ?? null, rw0: r ? +((r.pos.y - t.pos.y) * out).toFixed(2) : null, at: {} as any };
    });
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const k of [1.0, 1.5, 2.0, 2.5, 3.0, 3.5]) if (Math.abs(sim.t - k) < 0.026) for (const w of rows) {
        const t = w.t, r = w.r;
        w.at[k] = { depth: +((w.x0 - t.pos.x) * dir).toFixed(2), width: +((t.pos.y - w.y0) * w.out).toFixed(2),
          rDepth: r ? +((w.x0 - r.pos.x) * dir).toFixed(2) : null, rOut: r ? +((r.pos.y - t.pos.y) * w.out).toFixed(2) : null,
          beyond: r ? +((t.pos.x - r.pos.x) * dir).toFixed(2) : null, thrown: sim.throwAt >= 0,
          qbDepth: +((w.x0 - sim.qb.pos.x) * dir).toFixed(2), qbWidth: +((sim.qb.pos.y - by) * w.out).toFixed(2), rToQb: r ? +Math.hypot(r.pos.x - sim.qb.pos.x, r.pos.y - sim.qb.pos.y).toFixed(2) : null,
          rSpeed: r ? +Math.hypot(r.vel.x, r.vel.y).toFixed(2) : null, engaged: !!(r && r.engagement) };
      }
    };
    let res: any; try { res = sim.run(); } catch { break; }
    const sk = sim.events.find((e: any) => e.type === 'sack');
    const qbSet = { depth: +((sim.los - sim.qb.pos.x) * dir).toFixed(1), lat: +((sim.qb.pos.y - by)).toFixed(1) };
    console.log(JSON.stringify({ concept, drop: PASS_BY_ID[concept].drop, coverage, roster, seed, formation, strong, qbEnd: qbSet,
      sack: sk ? { t: +sk.t.toFixed(2), by: sim.agents[sk.a]?.slot ?? null } : null,
      tackles: rows.map((w) => ({ slot: w.t.slot, side: w.side, stance: w.stance, rslot: w.rslot, rw0: w.rw0, at: w.at, sackedBy: !!(sk && w.r && sk.a === w.r.idx) })) }));
    break;
  }
}
