// The tackle's re-pickup after the hinge (Integration, 2026-11-16, PA_HINGE's cost: the backside end unblocked late).
// The QB lane's grid on the PA concepts (gun_doubles_11, eight coverages, rosters 3 / 7 / 11 / 19, seeds 1-6). For DE_W per
// play: when he turns upfield (first time after the snap his velocity past the line exceeds 1.5 yd/s and he is past the
// line by 0.5 yd), where he is then relative to his tackle (LT; + = outside / inside), the LT's own state then (engaged
// with whom, his assignment, his distance to DE_W), the time from the turn to his first engagement with anyone, and for
// those never engaged before the ball is out: the cause at the turn (LT engaged with someone else / LT assigned someone
// else / LT assigned DE_W but too far: distance) and whether DE_W then got within 2 yd of the QB.
// usage: CONCEPT_DROPS=1 QB_FOOTWORK=1 PA_HINGE=1 node --import tsx scripts/diag/pass-operators/pa-hinge-pickup.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: any[] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot'])
  for (const coverage of ['cover1', 'cover2man', 'cover2', 'tampa2', 'cover3', 'cover3_match', 'cover4', 'cover6']) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const de = sim.defense.find((d: any) => d.slot === 'DE_W'), lt = sim.slot('LT'); if (!de || !lt) continue;
    const dir = sim.attackDir(sim.offense[0].team), side = Math.sign(de.pos.y - sim.ballY) || 1;
    const r: any = { concept, turn: null, eng: null, reach: false, state: null };
    while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0) {
      sim.tick();
      if (!r.eng && de.engagement) r.eng = { t: sim.t, by: de.engagement.blocker.slot };
      if (!r.turn && (sim.los - de.pos.x) * dir > 0.5 && -de.vel.x * dir > 1.5 && sim.t > 0.3) {
        const coord = lt.behavior?.coord;
        r.turn = { t: sim.t, out: (de.pos.y - lt.pos.y) * side, ltEng: lt.engagement ? lt.engagement.defender.slot : null, ltHas: coord?.assigned.get(lt)?.slot ?? null, dist: Math.hypot(de.pos.x - lt.pos.x, de.pos.y - lt.pos.y) };
      }
      if (Math.hypot(de.pos.x - sim.qb.pos.x, de.pos.y - sim.qb.pos.y) <= 2) r.reach = true;
    }
    rows.push(r);
  }
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
for (const c of ['all', 'pa_flood', 'pa_post_dig', 'pa_shot']) {
  const S = rows.filter((r) => c === 'all' || r.concept === c);
  const T = S.filter((r) => r.turn), never = T.filter((r) => !r.eng || r.eng.t < r.turn.t ? !r.eng : false);
  const cause = (r: any) => r.turn.ltEng ? (r.turn.ltEng === 'DE_W' ? 'LT engaged with him' : `LT engaged with ${r.turn.ltEng}`) : r.turn.ltHas === 'DE_W' ? (r.turn.dist > 2 ? 'LT has him, > 2 yd away' : 'LT has him, near') : `LT has ${r.turn.ltHas ?? 'nobody'}`;
  const C = never.reduce((m: any, r) => (m[cause(r)] = (m[cause(r)] ?? 0) + 1, m), {});
  console.log(`${c} (n ${S.length}): DE_W turned upfield ${pc(T.length, S.length)} at p50 ${q(T.map((r) => r.turn.t))} s, ${q(T.map((r) => r.turn.out))} yd outside the LT, LT ${q(T.map((r) => r.turn.dist))} yd away | engaged after the turn p50 ${q(T.filter((r) => r.eng && r.eng.t >= r.turn.t).map((r) => r.eng.t - r.turn.t))} s later | never engaged before the ball ${never.length} (reached the QB ${pc(never.filter((r) => r.reach).length, never.length)}), cause at the turn ${JSON.stringify(C)}`);
}
