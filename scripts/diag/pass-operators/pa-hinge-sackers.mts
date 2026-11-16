// Who sacks on play action with PA_HINGE under the measured fake (Integration, 2026-11-16: hinge + END_KEY=2 + EDGE_SET at
// QB_FOOTWORK=19, 56 PA sacks against 25 off). The QB lane's grid (pa_flood / pa_post_dig / pa_shot, gun_doubles_11, eight
// coverages, rosters 3 / 7 / 11 / 19, seeds 1-6). Per sack: the sacker's slot, the sack time, whether he was engaged when he
// first got within 2 yd of the QB, and if free then how (never engaged before / released from whom, at what time), and
// whom the protection had on him (first assignee). Per play: the QB's set / plant time (his setAt) and the throw time.
// usage: CONCEPT_DROPS=1 QB_FOOTWORK=19 [PA_HINGE=1 END_KEY=2 EDGE_SET=1] node --import tsx scripts/diag/pass-operators/pa-hinge-sackers.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const sacks: any[] = [], plays: any[] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot'])
  for (const coverage of ['cover1', 'cover2man', 'cover2', 'tampa2', 'cover3', 'cover3_match', 'cover4', 'cover6']) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const st = new Map<any, any>(sim.defense.map((d: any) => [d, { eng: [] as any[], cur: null as any, first: null as any, assigned: null as any }]));
    let setAt = -1;
    while (sim.phase === 'live' && sim.t < 5) {
      sim.tick();
      const qbb = sim.qb.behavior; if (setAt < 0 && qbb?.setAt >= 0) setAt = qbb.setAt;
      const coord = sim.offense.find((a: any) => a.behavior?.coord)?.behavior?.coord;
      for (const [d, s] of st) {
        if (!s.assigned && coord) for (const [k, v] of coord.assigned) if (v === d) { s.assigned = k.slot; break; }
        const e = d.engagement;
        if (e && !s.cur) { s.cur = { by: e.blocker.slot, t0: sim.t }; }
        if (!e && s.cur) { s.eng.push({ ...s.cur, t1: sim.t }); s.cur = null; }
        if (!s.first && sim.throwAt < 0 && Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2)
          s.first = { t: sim.t, engaged: !!e, last: s.cur ?? s.eng[s.eng.length - 1] ?? null };
      }
    }
    const sk = sim.events.find((e: any) => e.type === 'sack');
    plays.push({ concept, setAt, throwAt: sim.throwAt, sack: !!sk });
    if (sk) { const d = sim.agents[sk.a] ?? sim.defense.find((x: any) => x.idx === sk.a); const s = st.get(d);
      sacks.push({ concept, slot: d?.slot, t: sim.t, setAt, first: s?.first, assigned: s?.assigned, nEng: (s?.eng.length ?? 0) + (s?.cur ? 1 : 0) }); }
  }
const q = (v: number[]) => { const z = v.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
const cnt = (S: any[], f: (r: any) => any) => JSON.stringify(S.reduce((m: any, r) => { const k = f(r) ?? 'none'; m[k] = (m[k] ?? 0) + 1; return m; }, {}));
console.log(`plays ${plays.length}, sacks ${sacks.length} | QB set p50 ${q(plays.map((p) => p.setAt))} s, throw p50 ${q(plays.map((p) => p.throwAt))} s | sacks by concept ${cnt(sacks, (r) => r.concept)}`);
console.log(`  sacker ${cnt(sacks, (r) => r.slot)} | sack time p50 ${q(sacks.map((r) => r.t))} s, QB set on those p50 ${q(sacks.map((r) => r.setAt))} s | within 2 yd at p50 ${q(sacks.map((r) => r.first?.t ?? NaN))} s`);
console.log(`  at 2 yd: engaged ${sacks.filter((r) => r.first?.engaged).length}, free ${sacks.filter((r) => r.first && !r.first.engaged).length} (never engaged ${sacks.filter((r) => r.first && !r.first.engaged && !r.first.last).length}; released from ${cnt(sacks.filter((r) => r.first && !r.first.engaged && r.first.last), (r) => r.first.last.by)} after p50 ${q(sacks.filter((r) => r.first && !r.first.engaged && r.first.last).map((r) => r.first.last.t1 - r.first.last.t0))} s held, released at p50 ${q(sacks.filter((r) => r.first && !r.first.engaged && r.first.last).map((r) => r.first.last.t1))} s)`);
console.log(`  first assigned to ${cnt(sacks, (r) => r.assigned)}`);
