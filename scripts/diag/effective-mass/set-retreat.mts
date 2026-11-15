// The interior pass set's retreat, ours (Integration, 2026-11-15; the meeting): each of LG / C / RG on dropbacks, by
// time after the snap: his requested velocity away from the line (his own intent this tick, retreat +), his achieved
// retreat, his depth behind his snap spot, his set-depth target (passSet.depth or passSetDepth), and whether he is engaged.
// 2026-11-15: to 2.5 s, and engaged rows split by the rusher's move (bull / other).
// usage: node --import tsx scripts/diag/effective-mass/set-retreat.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const BINS = [[0, .3], [.3, .5], [.5, .8], [.8, 1.0], [1.0, 1.5], [1.5, 2.0], [2.0, 2.5]]; const rows: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const x0 = new Map<any, number>(); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.throwAt >= 0 || sim.t > 2.5) return; const dir = sim.attackDir(sim.qb.team);
    for (const b of sim.offense) { if (!['LG', 'C', 'RG'].includes(b.slot)) continue;
      if (!x0.has(b)) x0.set(b, b.pos.x);
      const iv = sim.intents?.[b.idx]?.vel ?? { x: 0, y: 0 };
      rows.push({ t: sim.t, req: -iv.x * dir, got: -b.vel.x * dir, depth: (x0.get(b)! - b.pos.x) * dir, target: b.passSet?.depth ?? null, eng: !!b.engagement, move: b.engagement?.move ?? null }); } };
  return sim.run();
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(0.5 * (s.length - 1))] : NaN; };
for (const [a, b] of BINS) { const F = rows.filter(r => r.t >= a && r.t < b);
  console.log(`${a.toFixed(1)}-${b.toFixed(1)} s (${F.length}): retreat requested / achieved p50 ${q(F.map(r => r.req)).toFixed(2)} / ${q(F.map(r => r.got)).toFixed(2)} yd/s | depth ${q(F.map(r => r.depth)).toFixed(2)} yd | set target (behind the line) ${q(F.map(r => r.target)).toFixed(2)} | engaged ${(100 * F.filter(r => r.eng).length / Math.max(1, F.length)).toFixed(0)}% | engaged: req / got ${q(F.filter(r => r.eng).map(r => r.req)).toFixed(2)} / ${q(F.filter(r => r.eng).map(r => r.got)).toFixed(2)}, not: ${q(F.filter(r => !r.eng).map(r => r.req)).toFixed(2)} / ${q(F.filter(r => !r.eng).map(r => r.got)).toFixed(2)}`);
  // 2026-11-15 (SET_SPOT, the late pocket): engaged rows by the rusher's current move, bull against the rest.
  const B = F.filter(r => r.eng && r.move === 'bull'), O = F.filter(r => r.eng && r.move !== 'bull');
  console.log(`   engaged by move: bull ${(100 * B.length / Math.max(1, F.filter(r => r.eng).length)).toFixed(0)}%, req / got ${q(B.map(r => r.req)).toFixed(2)} / ${q(B.map(r => r.got)).toFixed(2)} | other req / got ${q(O.map(r => r.req)).toFixed(2)} / ${q(O.map(r => r.got)).toFixed(2)}`); }
