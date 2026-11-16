// Play action's backside end (Integration, 2026-11-16, from the QB lane's paired staged runs: PA sacks 15-20% vs 5% on
// dropbacks, DE_W the sacker on most). Staged plays on develop, the same fronts on PA (pa_flood, pa_post_dig, pa_shot)
// and on straight dropbacks with the same back job (post_cross / seam_slant: back 'block'; flood: back on a route), from
// gun_doubles_11 / ace_11 / gun_trey_11 / ace_12 x cover1 / cover3 x rosters 1-6 x seeds 1-2. For DE_W (the end away from
// the strength) per play: who the protection first assigns him (slot, time), who first engages him (slot, time), the
// back's fake side and where the back is at 0.8 s relative to DE_W (lateral yd), when DE_W first gets within 2 yd of the
// QB (before the ball is out), and whether he sacks.
// usage: node --import tsx scripts/diag/pass-operators/pa-backside.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: any[] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot', 'post_cross', 'seam_slant', 'flood']) for (const formation of ['gun_doubles_11', 'ace_11', 'gun_trey_11', 'ace_12'])
  for (const coverage of ['cover1', 'cover3']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    const de = sim.defense.find((d: any) => d.slot === 'DE_W'); if (!de) continue;
    const back = sim.slot('RB');
    const r: any = { concept, formation, pa: concept.startsWith('pa_'), assigned: null, engaged: null, reach: null, sack: false, backLat: null, deSide: Math.sign(de.pos.y - sim.ballY), strongSign: sim.offAlign.strongSign, backKind0: back?.behavior?.kind };
    while (sim.phase === 'live' && sim.t < 4) {
      sim.tick();
      if (!r.assigned) { const coord = sim.offense.find((a: any) => a.behavior?.coord)?.behavior?.coord; if (coord) for (const [k, v] of coord.assigned) if (v === de) { r.assigned = { slot: k.slot, t: +sim.t.toFixed(2) }; break; } }
      if (!r.engaged && de.engagement) r.engaged = { slot: de.engagement.blocker.slot, t: +sim.t.toFixed(2) };
      if (r.backLat === null && back && sim.t >= 0.8) r.backLat = +((back.pos.y - de.pos.y) * r.deSide).toFixed(2);
      if (!r.reach && sim.throwAt < 0 && Math.hypot(de.pos.x - sim.qb.pos.x, de.pos.y - sim.qb.pos.y) <= 2) r.reach = +sim.t.toFixed(2);
    }
    r.sack = sim.events.some((e: any) => e.type === 'sack' && e.a === de.idx);
    r.anySack = sim.events.some((e: any) => e.type === 'sack');
    rows.push(r);
  }
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)] : NaN; };
const cnt = (S: any[], f: (r: any) => any) => S.reduce((m: any, r) => { const k = f(r) ?? 'nobody'; m[k] = (m[k] ?? 0) + 1; return m; }, {});
for (const c of ['pa_flood', 'pa_post_dig', 'pa_shot', 'post_cross', 'seam_slant', 'flood']) {
  const S = rows.filter((r) => r.concept === c); if (!S.length) continue;
  console.log(`${c} (n ${S.length}): DE_W first assigned to ${JSON.stringify(cnt(S, (r) => r.assigned?.slot))} at p50 ${q(S.filter((r) => r.assigned).map((r) => r.assigned.t))} s | first engaged by ${JSON.stringify(cnt(S, (r) => r.engaged?.slot))} at p50 ${q(S.filter((r) => r.engaged).map((r) => r.engaged.t))} s | reached the QB ${pc(S.filter((r) => r.reach !== null).length, S.length)} at p50 ${q(S.filter((r) => r.reach !== null).map((r) => r.reach))} s | DE_W sacks ${S.filter((r) => r.sack).length} of ${S.filter((r) => r.anySack).length} | back at 0.8 s, yd toward DE_W's side of him (+ = beyond him, outside) p50 ${q(S.map((r) => r.backLat))} | DE_W on the weak side ${pc(S.filter((r) => r.deSide !== r.strongSign).length, S.length)}`);
}
