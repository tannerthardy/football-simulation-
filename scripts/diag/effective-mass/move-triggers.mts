// Under the hand model, what brings a rusher's next move forward (Flex, 2026-11-14). Per pass rep tick: if nextMoveAt
// fell (the felt-unload counter trigger, stepPassRep), record the time since his last club ended and since his last
// move resolution; count move resolutions per rep-second and by move; and how many resolutions came from the
// trigger (nextMoveAt brought forward in the 0.4 s before) against his timer.
// usage: RUSH_HANDS=1 [flags] node --import tsx scripts/diag/effective-mass/move-triggers.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); let repTime = 0; const res = new Map<string, { n: number; trig: number }>(); const trig: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const st = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const pre = new Map<any, any>();
    for (const e of sim.engagements) if (e.type === 'pass') pre.set(e, { next: e.nextMoveAt, until: e.moveUntil, club: !!e.club });
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !pre.has(e)) continue;
      const p = pre.get(e), s = st.get(e) ?? { clubEnd: -9, lastRes: -9, trigAt: -9 }; st.set(e, s);
      repTime += sim.dt;
      if (p.club && !e.club) s.clubEnd = sim.t;
      if (e.moveUntil !== p.until && e.moveUntil > sim.t) {
        const k = res.get(e.move) ?? { n: 0, trig: 0 }; k.n++;
        if (sim.t - s.trigAt <= 0.4) k.trig++;
        res.set(e.move, k); s.lastRes = sim.t;
      } else if (e.nextMoveAt < p.next - 1e-9) {
        s.trigAt = sim.t; trig.push({ sinceClub: sim.t - s.clubEnd, sinceRes: sim.t - s.lastRes, inter: ['LG', 'C', 'RG'].includes(e.blocker.slot) });
      }
    }
  };
  return sim.run();
} } });
const n = [...res.values()].reduce((a, b) => a + b.n, 0), nt = [...res.values()].reduce((a, b) => a + b.trig, 0);
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : 'nan'; };
console.log(`move resolutions ${n} (${(n / repTime).toFixed(2)} per rep-second), ${nt} (${(100 * nt / Math.max(1, n)).toFixed(0)}%) within 0.4 s of a felt-unload trigger | triggers ${trig.length}: within 1 s after his own club ${(100 * trig.filter((x) => x.sinceClub <= 1).length / Math.max(1, trig.length)).toFixed(0)}% (since the club p50 ${q(trig.map((x) => x.sinceClub))} s), since his last move p50 ${q(trig.map((x) => x.sinceRes))} s`);
for (const [m, k] of [...res].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${m.padEnd(8)} ${String(k.n).padStart(5)} (${(k.n / repTime).toFixed(2)} /rep-s) | by the trigger ${(100 * k.trig / Math.max(1, k.n)).toFixed(0)}%`);
