// Where the rusher who hits an attached end was going (#35 item 2 (b)). Staged double_outs (as attached-release.mts):
// for the first DL whose body touches the end before 2 s, his rush gap and plan, his lane point's lateral offset from
// the end's snap spot (+ = outside the end), his own snap offset from the end, and the bearing of his requested velocity
// against the line to the end in the 0.3 s before the touch (0 = straight at him).
// usage: [RELEASE_COMMIT=1 ...] node --import tsx scripts/diag/pass-operators/attached-rusher-lane.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { gapY } = await import(`${W}/src/playbook/alignment.ts`);
const rows: any[] = [];
for (const formation of ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12']) for (const coverage of ['cover1', 'cover3', 'cover2', 'cover4']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'double_outs', seed, roster, formation, flip: false }));
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const st = new Map<any, any>(); const hist = new Map<any, any[]>();
  const by = sim.ballY;
  const y0 = new Map<any, number>(sim.agents.map((x: any) => [x, x.pos.y]));
  while (sim.phase === 'live' && sim.t < 2.0) {
    sim.tick();
    for (const a of ends) {
      const H = hist.get(a) ?? []; hist.set(a, H);
      H.push(sim.defense.map((d: any) => ({ d, req: sim.cmds[sim.agents.indexOf(d)]?.vel, dp: { ...d.pos }, ap: { ...a.pos } })));
      if (H.length > 13) H.shift();
      if (st.has(a)) continue;
      for (const d of sim.defense) if ((d.player.position === 'EDGE' || d.player.position === 'DT') && Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= a.profile.radius + d.profile.radius + 0.15) {
        const b = d.behavior, out = Math.sign(y0.get(a)! - by) || 1;
        let lane = NaN; try { if (gapY && b?.laneGap) lane = (gapY(sim.offAlign, b.laneGap, b.gapSign) - y0.get(a)!) * out; } catch {}
        const bear = H.map((fr) => fr.find((f: any) => f.d === d)).filter((f: any) => f?.req && Math.hypot(f.req.x, f.req.y) > 1).map((f: any) => {
          const tx = f.ap.x - f.dp.x, ty = f.ap.y - f.dp.y; return Math.acos(Math.max(-1, Math.min(1, (tx * f.req.x + ty * f.req.y) / (Math.hypot(tx, ty) * Math.hypot(f.req.x, f.req.y))))) * 180 / Math.PI; });
        st.set(a, { slot: d.slot, gap: b?.gap, laneGap: b?.laneGap, plan: b?.plan, kind: b?.kind, tags: [...d.tags].filter((x: string) => /rush|arc|twist|game|key|squeeze/.test(x)).join(','), snapOff: +((y0.get(d)! - y0.get(a)!) * out).toFixed(2), lane: +lane.toFixed(2), bearing: bear.length ? +bear.sort((p: number, q: number) => p - q)[Math.floor(bear.length / 2)].toFixed(0) : null });
        break;
      }
    }
  }
  for (const v of st.values()) rows.push(v);
}
const C = (k: string) => rows.reduce((m: any, r) => (m[r[k]] = (m[r[k]] ?? 0) + 1, m), {});
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
console.log(`touches ${rows.length} | by slot ${JSON.stringify(C('slot'))} | lane gap ${JSON.stringify(C('laneGap'))} | plan ${JSON.stringify(C('plan'))} | tags ${JSON.stringify(C('tags'))}`);
console.log(`rusher's snap offset from the end (+ outside) p25/50/75 ${q(rows.map((r) => r.snapOff), .25)}/${q(rows.map((r) => r.snapOff))}/${q(rows.map((r) => r.snapOff), .75)} | his lane point's offset ${q(rows.map((r) => r.lane), .25)}/${q(rows.map((r) => r.lane))}/${q(rows.map((r) => r.lane), .75)} | request's bearing off the line to the end, 0.3 s before p25/50/75 ${q(rows.map((r) => r.bearing), .25)}/${q(rows.map((r) => r.bearing))}/${q(rows.map((r) => r.bearing), .75)} deg`);
for (const p of Object.keys(C('plan'))) { const S = rows.filter((r) => String(r.plan) === p); console.log(`  plan ${p} n ${S.length}: snap ${q(S.map((r) => r.snapOff))}, lane ${q(S.map((r) => r.lane))}, bearing ${q(S.map((r) => r.bearing))}`); }
