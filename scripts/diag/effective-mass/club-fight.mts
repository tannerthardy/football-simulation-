// FITTED_HANDS stage 1 gate: per interior pass rep (LG / C / RG, to the throw), each club the rusher throws (e.club set:
// RUSH_HANDS' clubHand), the blocker's hands on before it and after it, the hands joint's load the tick before and
// 0.1 / 0.25 s after, and the share of the rep with 2 / 1 / 0 hands on. The club lasts about 0.03 s (shorter than a
// tick), so its window is read around it, not inside it (moves-fight.mts reads windows by moveUntil, which a club ends
// inside one tick).
// usage: node --import tsx scripts/diag/effective-mass/club-fight.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const IN = new Set(['LG', 'C', 'RG']);
const clubs: any[] = []; const reps: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const st = new Map<any, any>(); const open: any[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const pre = new Map<any, any>();
    for (const e of sim.engagements) if (e.type === 'pass' && IN.has(e.blocker.slot)) pre.set(e, { N: Math.max(0, e.hands?.normalForce ?? 0), on: e.hands?.off ? 0 : e.hands?.handsOn ?? 2, club: e.club });
    tick();
    if (sim.throwAt >= 0) return;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !IN.has(e.blocker.slot)) continue;
      const s = st.get(e) ?? { ticks: 0, on: [0, 0, 0], clubs: 0, lastClear: -Infinity, rel: null, offAt: null, offDur: [] as number[] }; st.set(e, s);
      const on = e.hands?.off ? 0 : e.hands?.handsOn ?? 2; s.ticks++; s.on[on]++;
      const pv = pre.get(e)?.on ?? 2;
      if (on < pv) { s.lastClear = sim.t; s.offAt ??= sim.t; }
      if (on === 2 && s.offAt !== null) { s.offDur.push(sim.t - s.offAt); s.offAt = null; }
      // First release, as interior-fight.py: separation past 1.2 yd (centres) after they were within it.
      const sep = Math.hypot(e.defender.pos.x - e.blocker.pos.x, e.defender.pos.y - e.blocker.pos.y);
      if (sep <= 1.2) s.touched = true;
      if (!s.rel && s.touched && sep > 1.2) s.rel = { t: sim.t - e.start, on, since: sim.t - s.lastClear, ext: e.hands?.extension };
      const p = pre.get(e);
      if (e.club && (!p || p.club !== e.club)) { s.clubs++; open.push({ e, t: sim.t, N0: p?.N ?? 0, on0: p?.on ?? 2, on1: undefined, N1: undefined, N2: undefined }); }
    }
    for (const c of open) {
      const dt = sim.t - c.t, on = c.e.hands?.off ? 0 : c.e.hands?.handsOn ?? 2, N = Math.max(0, c.e.hands?.normalForce ?? 0);
      if (c.on1 === undefined && dt > 0) c.on1 = on, c.minOn = on;
      if (dt > 0) c.minOn = Math.min(c.minOn, on);
      if (c.N1 === undefined && dt >= 0.1 - 1e-9) c.N1 = N;
      if (c.N2 === undefined && dt >= 0.25 - 1e-9) { c.N2 = N; clubs.push(c); c.done = true; }
    }
    for (let i = open.length - 1; i >= 0; i--) if (open[i].done) open.splice(i, 1);
  };
  const res = sim.run();
  for (const s of st.values()) reps.push(s);
  return res;
} } });
const q = (a: number[], p: number) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const secs = reps.reduce((s, r) => s + r.ticks, 0) * 0.05;
console.log(`interior pass reps ${reps.length} | clubs ${clubs.length} (${(clubs.length / Math.max(1e-9, secs)).toFixed(2)} a second of rep; per rep p50 ${q(reps.map(r => r.clubs), 0.5)} p90 ${q(reps.map(r => r.clubs), 0.9)})`);
const tot = reps.reduce((s, r) => [s[0] + r.on[0], s[1] + r.on[1], s[2] + r.on[2]], [0, 0, 0]), T = tot[0] + tot[1] + tot[2];
console.log(`hands on, share of rep ticks: 2 ${(100 * tot[2] / T).toFixed(0)}% | 1 ${(100 * tot[1] / T).toFixed(0)}% | 0 ${(100 * tot[0] / T).toFixed(0)}%`);
const cleared = clubs.filter(c => c.minOn < c.on0);
console.log(`clubs on hands: from 2 ${clubs.filter(c => c.on0 === 2).length}, from 1 ${clubs.filter(c => c.on0 === 1).length} | a hand cleared within 0.25 s ${cleared.length} (${(100 * cleared.length / Math.max(1, clubs.length)).toFixed(0)}%)`);
console.log(`hands' load before / 0.1 s after / 0.25 s after the club, p50: ${q(clubs.map(c => c.N0), .5).toFixed(0)} / ${q(clubs.map(c => c.N1), .5).toFixed(0)} / ${q(clubs.map(c => c.N2), .5).toFixed(0)} N`);
const rel = reps.filter(r => r.rel);
console.log(`released past 1.2 yd: ${rel.length} of ${reps.length} | hands on at the release: 2 ${rel.filter(r => r.rel.on === 2).length}, 1 ${rel.filter(r => r.rel.on === 1).length}, 0 ${rel.filter(r => r.rel.on === 0).length} | within 0.5 s of a hand cleared ${rel.filter(r => r.rel.since <= 0.5).length}`);
console.log(`time with a hand off (until both on again) p50 / p90: ${q(reps.flatMap(r => r.offDur), .5).toFixed(2)} / ${q(reps.flatMap(r => r.offDur), .9).toFixed(2)} s`);
console.log(`  share of clubs where the load fell by 0.1 s: ${(100 * clubs.filter(c => c.N1 < c.N0).length / Math.max(1, clubs.length)).toFixed(0)}%`);
