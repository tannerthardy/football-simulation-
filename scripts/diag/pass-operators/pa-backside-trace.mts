// LABELS (2026-11-16): DE_W in gun_doubles_11 is the FAKE-SIDE end (the offset back fakes to his own side, the weak side);
// DE_S is the away-side end. Earlier notes calling DE_W 'the backside end' were wrong. Why play action's fake-side end beats the tackle he is engaged with (follow-up to pa-backside.mts; the QB lane's grid:
// gun_doubles_11, eight coverages, rosters 3 / 7 / 11 / 19, seeds 1-6, CONCEPT_DROPS=1 QB_FOOTWORK=1). PA (pa_flood,
// pa_post_dig, pa_shot) against dropbacks (post_cross, seam_slant, flood). At 1.0 / 1.5 / 2.0 s, p50: the QB's depth
// behind the line and his width toward DE_W's side of the ball (+ = toward DE_W), the LT's (DE_W's blocker's) depth and
// width from his snap spot (+ = outside), DE_W's depth past the line and his offset outside the LT (+ = outside him),
// DE_W's distance to the QB; the share where the engagement has ended by 2.0 s, and the LT's stance at 0.3 s.
// usage: [PAB_CONCEPTS=oz_weak] CONCEPT_DROPS=1 QB_FOOTWORK=1 node --import tsx scripts/diag/pass-operators/pa-backside-trace.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const T = [1.0, 1.5, 2.0];
const rows: any[] = [];
// PAB_CONCEPTS: a comma list instead (Defense, 2026-11-16: oz_weak = outside zone toward DE_W, oz_strong = toward DE_S);
// rows group as 'PA' when the concept is a pass with a fake or any run, else 'dropback'.
const CONCEPTS = process.env.PAB_CONCEPTS ? process.env.PAB_CONCEPTS.split(',') : ['pa_flood', 'pa_post_dig', 'pa_shot', 'post_cross', 'seam_slant', 'flood'];
for (const concept of CONCEPTS)
  for (const coverage of ['cover1', 'cover2man', 'cover2', 'tampa2', 'cover3', 'cover3_match', 'cover4', 'cover6']) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const de = sim.defense.find((d: any) => d.slot === 'DE_W'), lt = sim.slot('LT'); if (!de || !lt) continue;
    const dir = sim.attackDir(sim.offense[0].team), side = Math.sign(de.pos.y - sim.ballY) || 1, lt0 = { ...lt.pos };
    const ds = sim.defense.find((d: any) => d.slot === 'DE_S'), ds0y = ds?.pos.y ?? 0;
    const ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
    const r: any = { pa: concept.startsWith('pa_') || !!process.env.PAB_CONCEPTS, at: {}, stance: null, ended: false };
    while (sim.phase === 'live' && sim.t < 2.05) {
      const t0 = sim.t; sim.tick();
      if (r.stance === null && sim.t >= 0.3) r.stance = lt.stance;
      for (const k of T) if (t0 < k && sim.t >= k && sim.throwAt < 0) r.at[k] = {
        qbD: (sim.los - sim.qb.pos.x) * dir, qbW: (sim.qb.pos.y - sim.ballY) * side,
        ltD: (lt0.x - lt.pos.x) * dir, ltW: (lt.pos.y - lt0.y) * side,
        deD: (sim.los - de.pos.x) * dir, deOut: (de.pos.y - lt.pos.y) * side, deQb: Math.hypot(de.pos.x - sim.qb.pos.x, de.pos.y - sim.qb.pos.y),
        deOl: Math.min(...ol.map((o: any) => Math.hypot(o.pos.x - de.pos.x, o.pos.y - de.pos.y))),
        dsD: ds ? (sim.los - ds.pos.x) * dir : NaN, dsIn: ds ? (ds0y - ds.pos.y) * -side : NaN, dsOl: ds ? Math.min(...ol.map((o: any) => Math.hypot(o.pos.x - ds.pos.x, o.pos.y - ds.pos.y))) : NaN };
      if (sim.t >= 1.3 && !de.engagement && !r.ended && r.wasEng) r.ended = true;
      if (de.engagement) r.wasEng = true;
    }
    rows.push(r);
  }
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const pa of [true, false]) {
  const S = rows.filter((r) => r.pa === pa);
  console.log(`${pa ? 'PA' : 'dropback'} (n ${S.length}): LT stance at 0.3 s ${JSON.stringify(S.reduce((m: any, r) => (m[r.stance] = (m[r.stance] ?? 0) + 1, m), {}))} | engagement ended after 1.3 s ${(100 * S.filter((r) => r.ended).length / S.length).toFixed(0)}%`);
  for (const k of T) { const R = S.filter((r) => r.at[k]); console.log(`  ${k} s (n ${R.length}): QB depth ${q(R.map((r) => r.at[k].qbD))} width to DE_W's side ${q(R.map((r) => r.at[k].qbW))} | LT depth ${q(R.map((r) => r.at[k].ltD))} width ${q(R.map((r) => r.at[k].ltW))} | DE_W depth ${q(R.map((r) => r.at[k].deD))} outside the LT ${q(R.map((r) => r.at[k].deOut))} | DE_W to QB ${q(R.map((r) => r.at[k].deQb))} | DE_W (fake side) nearest OL ${q(R.map((r) => r.at[k].deOl))} (within 1.5 yd ${(100 * R.filter((r) => r.at[k].deOl <= 1.5).length / Math.max(1, R.length)).toFixed(0)}%) | DE_S (away side) depth ${q(R.map((r) => r.at[k].dsD))} toward the ball ${q(R.map((r) => r.at[k].dsIn))} nearest OL ${q(R.map((r) => r.at[k].dsOl))}`); }
}
