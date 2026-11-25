// Defense: who recognizes a fumble when (LOOSE_SEEN's live path), by where each man's head pointed at the strip.
// Run plays (iz_strong, power, oz_strong, iz_weak; Cover 3; seeds 1..N): the carrier is made to fumble 1.5 yd past the line
// (as test/loose-seen.test.ts). Per defender and per offensive player: head off the ball at the strip (deg), distance,
// and when he joined the scramble (s after the strip; '-' never). Usage: node --import tsx scripts/diag/loose/fumble-sight.mts [N=12]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const N = Number(process.argv[2] ?? 12);
const ang = (a: number, b: number) => Math.round(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 57.3);
const bins: Record<string, number[]> = {}; let onTickAway = 0, plays = 0;
for (const concept of ['iz_strong', 'power', 'oz_strong', 'iz_weak']) for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: seed, formation: 'pistol_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team); let at = -1, lost: any = null; const first = new Map<number, number>(); let geo: Map<number, { head: number; d: number }> | null = null;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier;
    if (at < 0 && c && c !== sim.qb && sim.ball.kind === 'held' && (c.pos.x - sim.los) * dir > 1.5) {
      lost = c; geo = new Map(sim.agents.map((a: any) => [a.idx, { head: ang(a.head ?? a.body.facing, Math.atan2(c.pos.y - a.pos.y, c.pos.x - a.pos.x)), d: Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y) }]));
      sim.fumble(c, null); at = sim.t; }
    if (at >= 0) for (const a of sim.agents) if (a.behavior?.kind === 'scramble-ball' && !first.has(a.idx)) first.set(a.idx, +(sim.t - at).toFixed(2));
    if (sim.t > 12) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  if (at < 0 || !geo) continue; plays++;
  for (const a of sim.agents) { if (a === lost) continue; const g = geo.get(a.idx)!; const away = g.head > 90; const near = g.d <= 10;
    const k = `${a.team === sim.defense[0].team ? 'D' : 'O'} ${away ? 'head away (>90)' : 'head toward'} ${near ? '<=10yd' : '>10yd'}`;
    const f = first.get(a.idx); (bins[k] ??= []).push(f ?? Infinity); if (away && f !== undefined && f <= 1e-9) onTickAway++; }
}
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
console.log('plays with a strip', plays, '| away-facing men in the scramble on the strip tick:', onTickAway);
for (const [k, v] of Object.entries(bins).sort()) console.log(k.padEnd(30), 'n', v.length, 'joined', v.filter(Number.isFinite).length, 'p25/p50/p75', q(v, .25), q(v, .5), q(v, .75));
