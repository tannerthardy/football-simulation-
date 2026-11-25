// Defense (RUSH_RELEASE): the pass rusher through the passer's load and release, Coverage's rush-turn operator (turn = from the
// release, velocity toward the catch point >= 1.5 yd/s held 0.2 s). Usage: [COV=cover3] <flags> node --import tsx scripts/diag/rush/load-pull.mts [N=16]
// Defense: the pass rusher through the passer's load and release (Coverage's turn measure). Natural passes vs Cover 3, seeds
// 1..N; per rusher (behavior 'rush'): at the passer's first 'load' tick his distance to the passer, engaged or free; his
// release belief's loadingAt (s after the true load); his velocity toward the catch point at the release; the turn (first
// time from the release his velocity toward the catch point stays >= 1.5 yd/s for 0.2 s).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const RB: any = await import(`${W}/src/sim/release-belief.ts`);
const N = Number(process.argv[2] ?? 16);
const rows: any[] = [];
for (const concept of ['curl_flat', 'stick', 'slant_flat', 'smash', 'four_verts']) for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: process.env.COV ?? 'cover3', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  let loadT = -1, relT = -1; const per = new Map<number, any>(); const series = new Map<number, { t: number; p: any; v: any }[]>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (loadT < 0 && sim.qb.arm === 'load') { loadT = sim.t;
      for (const d of sim.defense) if (d.behavior?.kind === 'rush') per.set(d.idx, { slot: d.slot, dist: Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y), engaged: !!d.engagement, sawLoad: null }); }
    if (relT < 0 && sim.ball.kind === 'air') relT = sim.t;
    if (loadT >= 0) for (const [i, r] of per) { const d = sim.agents[i];
      if (r.sawLoad === null) { const b = RB.releaseBelief(sim, d); if (b.loadingAt !== undefined) r.sawLoad = +(sim.t - loadT).toFixed(2); }
      if (relT >= 0 && r.engEnd === undefined && !d.engagement) r.engEnd = +(sim.t - relT).toFixed(2);
      (series.get(i) ?? series.set(i, []).get(i)!).push({ t: sim.t, p: { ...d.pos }, v: { ...d.vel } }); }
    if (sim.t > 8) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  const catchEv = sim.events.find((e: any) => e.type === 'catch');
  if (loadT < 0 || relT < 0 || !catchEv) continue;
  const C = sim.agents[catchEv.a]; const cp = catchEv.at ?? C.pos;
  for (const [i, r] of per) { const S = series.get(i) ?? [];
    const tow = (s: any) => { const dx = cp.x - s.p.x, dy = cp.y - s.p.y, L = Math.hypot(dx, dy) || 1; return (s.v.x * dx + s.v.y * dy) / L; };
    const atRel = S.find(s => s.t >= relT - 1e-9); let turn: number | null = null;
    for (let k = 0; k < S.length; k++) { if (S[k].t < relT) continue; const w = S.slice(k, k + 5); if (w.length === 5 && w.every(s => tow(s) >= 1.5)) { turn = +(S[k].t - relT).toFixed(2); break; } }
    rows.push({ concept, seed, ...r, dist: +r.dist.toFixed(2), loadToRel: +(relT - loadT).toFixed(2), towAtRel: atRel ? +tow(atRel).toFixed(2) : null, turn });
  }
}
const q = (v: number[], p: number) => { const s = v.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
for (const [k, f] of [['free, <=3 yd at load', (r: any) => !r.engaged && r.dist <= 3], ['free, 3-6 yd', (r: any) => !r.engaged && r.dist > 3 && r.dist <= 6], ['free, >6 yd', (r: any) => !r.engaged && r.dist > 6], ['engaged at load', (r: any) => r.engaged]] as const) {
  const R = rows.filter(f as any);
  console.log(k.padEnd(22), 'n', R.length, '| saw load (s after) p50', q(R.map(r => r.sawLoad), .5), 'seen', R.filter(r => r.sawLoad !== null).length,
    '| toward catch at release p25/50/75', q(R.map(r => r.towAtRel), .25), q(R.map(r => r.towAtRel), .5), q(R.map(r => r.towAtRel), .75),
    '| turn after release p25/50/75', q(R.map(r => r.turn), .25), q(R.map(r => r.turn), .5), q(R.map(r => r.turn), .75), 'never', R.filter(r => r.turn === null).length);
}
console.log('load to release p50', q(rows.map(r => r.loadToRel), .5));
const E = rows.filter((r: any) => r.engaged); console.log('engaged at load: engagement ends after release p25/50/75', q(E.map((r: any) => r.engEnd), .25), q(E.map((r: any) => r.engEnd), .5), q(E.map((r: any) => r.engEnd), .75), '| turn - engagement end p50', q(E.filter((r: any) => r.turn != null && r.engEnd != null).map((r: any) => r.turn - r.engEnd), .5));
