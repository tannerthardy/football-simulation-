// The interior pass-rush hand fight in ours (Integration, 2026-11-14, before the hand-fight note): per interior pass rep
// (LG / C / RG against his man, until the throw): how many move decisions fire and which, how many land (moveOk), what
// each changes physically while it lasts (the blocker's hands' steer and push scaled, a World strike's impulse, the hands
// joint's load), and the share of the rep the hands joint is loaded (normal > 0) and loaded continuously.
// usage: node --import tsx scripts/diag/effective-mass/moves-fight.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const IN = new Set(['LG', 'C', 'RG']);
const reps: any[] = []; const moves: Record<string, { n: number; landed: number; strike: number[]; nDuring: number[]; nBefore: number[] }> = {};
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const st = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0) return;
    const rep: any = sim.world.report;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !IN.has(e.blocker.slot)) continue;
      const s = st.get(e) ?? { ticks: 0, loaded: 0, run: 0, maxRun: 0, moves: 0, last: undefined, lastStart: -1, moveRec: null };
      s.ticks++;
      const N = Math.max(0, e.hands?.normalForce ?? 0);
      if (N > 0) { s.loaded++; s.run++; s.maxRun = Math.max(s.maxRun, s.run); } else s.run = 0;
      // A new move decision: the move's window starts again.
      if (e.moveUntil > sim.t && e.moveUntil !== s.lastStart) {
        s.moves++; s.lastStart = e.moveUntil; s.last = e.move;
        const r = (moves[e.move] ??= { n: 0, landed: 0, strike: [], nDuring: [], nBefore: [] }); r.n++; if (e.moveOk) r.landed++;
        s.moveRec = { r, until: e.moveUntil, N0: N, Ns: [] as number[] }; r.nBefore.push(N);
      }
      if (s.moveRec && sim.t <= s.moveRec.until) {
        s.moveRec.Ns.push(N);
        for (const k of rep?.strikes ?? []) if ((k.i === e.defender.idx && k.j === e.blocker.idx) || (k.i === e.blocker.idx && k.j === e.defender.idx)) s.moveRec.r.strike.push(Math.hypot(k.impulse.x, k.impulse.y));
      } else if (s.moveRec) { const a = s.moveRec.Ns; if (a.length) s.moveRec.r.nDuring.push(a.reduce((x: number, y: number) => x + y, 0) / a.length); s.moveRec = null; }
      st.set(e, s);
    }
  };
  const res = sim.run();
  for (const s of st.values()) reps.push(s);
  return res;
} } });
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const dt = 0.05;
console.log(`interior pass reps ${reps.length} | rep length p50 ${q(reps.map((r) => r.ticks * dt)).toFixed(2)} s | move decisions per rep p50/p90 ${q(reps.map((r) => r.moves))}/${q(reps.map((r) => r.moves), .9)} | per second of rep ${(reps.reduce((a, r) => a + r.moves, 0) / Math.max(1e-9, reps.reduce((a, r) => a + r.ticks * dt, 0))).toFixed(2)}`);
console.log(`hands joint loaded: share of the rep p50 ${(100 * q(reps.map((r) => r.loaded / Math.max(1, r.ticks)))).toFixed(0)}% | longest continuous loaded stretch p50 ${(q(reps.map((r) => r.maxRun)) * dt).toFixed(2)} s`);
for (const [m, r] of Object.entries(moves).sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${m.padEnd(8)} n ${String(r.n).padStart(4)} | landed ${(100 * r.landed / r.n).toFixed(0)}% | hands' load before / during p50 ${q(r.nBefore).toFixed(0)} / ${q(r.nDuring).toFixed(0)} N | strikes in the window ${r.strike.length}, impulse p50 ${q(r.strike).toFixed(0)}`);
