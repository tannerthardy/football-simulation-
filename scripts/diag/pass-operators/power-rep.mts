// POWER_AIM's reads (#35 item 2b; Integration's gate 4). Staged pass plays, two sets: attached-end looks (double_outs,
// curl_flat from gun_trey_11 / ace_11 / ace_12 / gun_wing_12) and spread looks (four_verts, smash, dagger from
// gun_doubles_11), cover1/2/3/4, rosters 1-6, seeds 1-2. Per edge rusher (DE_S, DE_W) by plan: his first pass
// engagement (time, the blocker's slot), where on the blocker it lands (the rusher's offset across the blocker's chest
// at the engagement, + = outside the blocker, and his bearing off the blocker's facing), the rep's control 0.5 s later,
// whether he is past his blocker (beyond him toward the QB) at 1.5 / 2.5 s, whether he gets within 2 yd of the QB
// before the ball is out (pressure) and sacks (he is the sacker). Plus every attached end hit by him.
// usage: [POWER_AIM=1] node --import tsx scripts/diag/pass-operators/power-rep.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: any[] = [];
const SETS: [string[], string[]][] = [[['double_outs', 'curl_flat'], ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12']], [['four_verts', 'smash', 'dagger'], ['gun_doubles_11']]];
for (const [concepts, forms] of SETS) for (const concept of concepts) for (const formation of forms) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team);
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const R = sim.defense.filter((d: any) => (d.slot === 'DE_S' || d.slot === 'DE_W') && d.behavior?.kind === 'rush').map((d: any) => ({ d, plan: d.behavior.plan, set: formation === 'gun_doubles_11' ? 'spread' : 'attached', eng: null as any, ctl: null as any, past: {} as any, pressure: false, sack: false, hitEnd: false }));
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    for (const r of R) {
      const d = r.d, e = d.engagement;
      if (!r.eng && e && e.type === 'pass' && e.defender === d) {
        const b = e.blocker, rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, out = Math.sign(b.pos.y - sim.ballY) || 1;
        const fx = Math.cos(b.facing), fy = Math.sin(b.facing);
        r.eng = { t: +sim.t.toFixed(2), slot: b.slot, across: +(ry * out).toFixed(2), bearing: +(Math.atan2(rx * fy - ry * fx, rx * fx + ry * fy) * 180 / Math.PI * -out).toFixed(0), e, b };
      }
      if (r.eng && r.ctl === null && sim.t - r.eng.t >= 0.5) r.ctl = sim.engagements.includes(r.eng.e) ? +r.eng.e.control.toFixed(2) : 'ended';
      for (const k of [1.5, 2.5]) if (r.eng && r.past[k] === undefined && sim.t >= k) r.past[k] = (r.eng.b.pos.x - d.pos.x) * dir > 0;
      if (sim.throwAt < 0 && Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) r.pressure = true;
      for (const en of ends) if (Math.hypot(d.pos.x - en.pos.x, d.pos.y - en.pos.y) <= d.profile.radius + en.profile.radius + 0.15 && sim.t < 2) r.hitEnd = true;
    }
  }
  for (const r of R) rows.push({ set: r.set, slot: r.d.slot, plan: r.plan, eng: r.eng && { t: r.eng.t, slot: r.eng.slot, across: r.eng.across, bearing: r.eng.bearing }, ctl: r.ctl, past: r.past, pressure: r.pressure,
    sack: sim.events.some((ev: any) => ev.type === 'sack' && ev.a === r.d.idx), hitEnd: r.hitEnd });
}
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
for (const set of ['attached', 'spread']) for (const plan of ['power', 'finesse', 'speed']) {
  const S = rows.filter((r) => r.set === set && r.plan === plan); if (!S.length) continue;
  const E = S.filter((r) => r.eng);
  const slots = E.reduce((m: any, r) => (m[r.eng.slot] = (m[r.eng.slot] ?? 0) + 1, m), {});
  console.log(`${set} ${plan} n ${S.length}: engaged ${pc(E.length, S.length)} at p50 ${q(E.map((r) => r.eng.t)).toFixed(2)} s on ${JSON.stringify(slots)} | across the blocker p25/50/75 ${q(E.map((r) => r.eng.across), .25).toFixed(2)}/${q(E.map((r) => r.eng.across)).toFixed(2)}/${q(E.map((r) => r.eng.across), .75).toFixed(2)} yd, bearing p50 ${q(E.map((r) => r.eng.bearing))} deg | control +0.5 s p50 ${q(E.map((r) => r.ctl).filter((c: any) => typeof c === 'number')).toFixed(2)} (ended ${pc(E.filter((r) => r.ctl === 'ended').length, E.length)}) | past his blocker 1.5 / 2.5 s ${pc(E.filter((r) => r.past[1.5]).length, E.length)} / ${pc(E.filter((r) => r.past[2.5]).length, E.length)} | pressure ${pc(S.filter((r) => r.pressure).length, S.length)} | sacks ${S.filter((r) => r.sack).length} | hit the attached end ${S.filter((r) => r.hitEnd).length}`);
}
