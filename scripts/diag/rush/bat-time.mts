// Batted-ball timeline under RUSH_RELEASE: for each rusher the ball passes within his reach of in its first 0.4 s, when
// he saw the load and wanted his hands up (relative to the release), his hand level and raised top at the closest
// approach, and the ball's height there.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const RH: any = await import(`${W}/src/sim/rush-hands.ts`);
const { bodyHeight, SHOULDER } = await import(`${W}/src/sim/sight.ts`);
const rows: any[] = [];
for (const cov of ['cover3', 'cover1']) for (const concept of ['curl_flat', 'stick', 'slant_flat', 'smash', 'mesh']) for (let seed = 1; seed <= 8; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: seed % 2 === 0 }));
  let rel = -1; const wantAt = new Map<number, number>(); const best = new Map<number, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    for (const d of sim.defense) if (RH.handsWanted.get(d) && !wantAt.has(d.idx)) wantAt.set(d.idx, sim.t);
    if (rel < 0 && sim.ball.kind === 'air') rel = sim.t;
    if (rel >= 0 && sim.ball.kind === 'air' && sim.t - rel <= 0.4) { const b = sim.ball.flight.pos;
      for (const d of sim.defense) if (['rush', 'blitz'].includes(d.behavior?.kind)) { const dh = Math.hypot(b.x - d.pos.x, b.y - d.pos.y);
        if (dh <= d.profile.reach && (!best.has(d.idx) || dh < best.get(d.idx).dh)) best.set(d.idx, { dh, z: b.z, tAir: sim.t - rel, eng: !!d.engagement, lvl: RH.handsLevel(d), top: RH.handsTop(d), sh: bodyHeight(d, SHOULDER), reach: d.profile.reactReach }); } }
    if (sim.t > 8 || (rel >= 0 && sim.t - rel > 0.5)) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  for (const [i, r] of best) rows.push({ ...r, want: wantAt.has(i) ? wantAt.get(i)! - rel : null });
}
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : NaN; };
for (const [k, f] of [['engaged', (r: any) => r.eng], ['free', (r: any) => !r.eng]] as const) { const R = rows.filter(f as any);
  console.log(k, 'n', R.length, '| wanted hands up', R.filter(r => r.want !== null).length, ', at (s from release) p25/50/75', q(R.map(r => r.want), .25), q(R.map(r => r.want), .5), q(R.map(r => r.want), .75),
    '| ball reaches him tAir p50', q(R.map(r => r.tAir), .5), '| level there p50/p90', q(R.map(r => r.lvl), .5), q(R.map(r => r.lvl), .9),
    '| hands top above shoulder p90', q(R.map(r => r.top - r.sh), .9), '| ball above shoulder p50', q(R.map(r => r.z - r.sh), .5), '| shoulder→reach', q(R.map(r => r.reach - r.sh), .5)); }
