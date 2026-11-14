// Hands vs torso across one gap (Integration, 2026-11-14, before the pair contact model). Per engaged pair tick: the
// bodies' gap beyond their radii, the hands joint's normal force, and the torso contact's normal force for the same pair
// (world.report.contacts, impulse / dt). Binned by the gap against the blocker's bent base (arm x 0.3) and contact, for
// four populations: edge pass reps (a DE on a tackle), interior pass reps, OL run blocks, and receiver stalks (a WR or
// TE blocking a DB on a run or screen). Reports per bin: the share of ticks, hands N and torso N (p50), the share of ticks
// where both carry load (> 100 N each), and where neither does.
// usage: [flags] node --import tsx scripts/diag/effective-mass/contact-share.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const T: Record<string, number[][]> = { 'edge pass': [], 'interior pass': [], 'OL run block': [], 'stalk (WR/TE on a DB)': [] };
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage') return undefined;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const rep = sim.world.report, dt = sim.dt;
    const torso = new Map<string, number>();
    for (const c of rep?.contacts ?? []) torso.set(`${Math.min(c.i, c.j)}:${Math.max(c.i, c.j)}`, c.impulse / dt);
    for (const e of sim.engagements) {
      const b = e.blocker, d = e.defender, h = e.hands;
      let pop: string | null = null;
      if (e.type === 'pass' && OL.has(b.slot)) pop = (b.slot === 'LT' || b.slot === 'RT') && /^DE/.test(d.slot) ? 'edge pass' : /^(DT|NT|DE)/.test(d.slot) ? 'interior pass' : null;
      else if (e.type === 'run' && OL.has(b.slot)) pop = 'OL run block';
      else if (e.type === 'run' && /^(WR|TE|SL|X|Z|Y)/.test(b.slot) && /^(CB|NB|FS|SS|S)/.test(d.slot)) pop = 'stalk (WR/TE on a DB)';
      if (!pop) continue;
      const bodies = b.profile.radius + d.profile.radius, base = b.player.measurables.armIn / 36 * 0.3;
      const gap = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - bodies;
      const N = h && !h.off ? Math.max(0, h.normalForce ?? 0) : 0;
      const tN = torso.get(`${Math.min(b.idx, d.idx)}:${Math.max(b.idx, d.idx)}`) ?? 0;
      T[pop].push([gap, base, N, tN]);
    }
  };
  return sim.run();
} } });
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)].toFixed(0) : '-'; };
for (const [pop, rows] of Object.entries(T)) {
  if (!rows.length) continue;
  console.log(`== ${pop}: ${rows.length} engaged ticks`);
  const bins: [string, (r: number[]) => boolean][] = [
    ['beyond the bent base (gap > base + 0.05)', (r) => r[0] > r[1] + 0.05],
    ['at the bent base (within 0.05)', (r) => Math.abs(r[0] - r[1]) <= 0.05],
    ['inside the base, bodies apart (0 < gap < base - 0.05)', (r) => r[0] > 0 && r[0] < r[1] - 0.05],
    ['bodies touching (gap <= 0)', (r) => r[0] <= 0],
  ];
  for (const [lab, f] of bins) {
    const S = rows.filter(f); if (!S.length) continue;
    const both = S.filter((r) => r[2] > 100 && r[3] > 100).length, none = S.filter((r) => r[2] <= 100 && r[3] <= 100).length;
    console.log(`   ${lab.padEnd(54)} ${(100 * S.length / rows.length).toFixed(0).padStart(3)}% of ticks | hands N p50 ${q(S.map((r) => r[2])).padStart(5)} | torso N p50 ${q(S.map((r) => r[3])).padStart(5)} | both > 100 N ${(100 * both / S.length).toFixed(0)}% | neither ${(100 * none / S.length).toFixed(0)}%`);
  }
}
