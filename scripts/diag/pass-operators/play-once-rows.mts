// PLAY_ONCE's before / after rows (Integration, 2026-11-15): per pass attempt, the coverage (man / zone by the called
// coverage's family), the target's depth (air yards at the throw's aim: short < 5, medium 5-15, deep > 15), and the
// outcome: complete, intercepted, broken up (a pbu event by a defender), other incomplete; and for each pbu the
// defender's position relative to the receiver at the event (in front of him toward the QB, behind, or beside).
// usage: node --import tsx scripts/diag/pass-operators/play-once-rows.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const rows: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const r: any = { cov: /man|cover0|cover1|2man/i.test(String(sim.defCall?.coverage?.id ?? sim.defCall?.coverage?.family ?? '')) ? 'man' : 'zone', thrown: false, depth: null, pbu: null, out: null };
  const ev = sim.event.bind(sim);
  sim.event = (k: string, a: any, b: any, why: string) => {
    if (k === 'pbu' && a && sim.ball.kind === 'air' && r.pbu === null) {
      const R = sim.ball.target, qb = sim.qb;
      if (R) { const ux = qb.pos.x - R.pos.x, uy = qb.pos.y - R.pos.y, L = Math.hypot(ux, uy) || 1, along = ((a.pos.x - R.pos.x) * ux + (a.pos.y - R.pos.y) * uy) / L;
        r.pbu = along > 0.5 ? 'in front' : along < -0.5 ? 'behind' : 'beside'; } else r.pbu = 'beside';
    }
    return ev(k, a, b, why);
  };
  const poss = sim.possess.bind(sim);
  sim.possess = (a: any, how: string) => { if (r.thrown && r.got === undefined && sim.ball.kind === 'air') r.got = how === 'interception' ? 'int' : a.team === sim.qb.team ? 'comp' : 'int'; return poss(a, how); };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (!r.thrown && sim.ball.kind === 'air') { r.thrown = true; const aim = sim.ball.flight.target ?? sim.ball.target?.pos; r.depth = aim ? (aim.x - sim.los) * sim.attackDir(sim.qb.team) : null; } };
  const res = sim.run();
  if (r.thrown) { r.o = String(sim.outcome ?? ''); r.out = r.got ?? 'inc'; rows.push(r); }
  return res;
} } });
const pct = (a: number, n: number) => `${(100 * a / Math.max(1, n)).toFixed(1)}%`;
const outs = [...new Set(rows.map(r => r.o))];
console.log(`attempts ${rows.length} | outcome labels seen: ${outs.join(', ')}`);
for (const [name, f] of [['all', () => true], ['man', (r: any) => r.cov === 'man'], ['zone', (r: any) => r.cov === 'zone'],
  ['short <5', (r: any) => r.depth !== null && r.depth < 5], ['medium 5-15', (r: any) => r.depth >= 5 && r.depth <= 15], ['deep >15', (r: any) => r.depth > 15]] as const) {
  const G = rows.filter(f as any);
  console.log(`  ${name}: ${G.length} | complete ${pct(G.filter(r => r.out === 'comp').length, G.length)} | intercepted ${pct(G.filter(r => r.out === 'int').length, G.length)} | broken up ${pct(G.filter(r => r.pbu).length, G.length)}`);
}
const P = rows.filter(r => r.pbu);
console.log(`  pbu by the defender's position: in front ${P.filter(r => r.pbu === 'in front').length}, beside ${P.filter(r => r.pbu === 'beside').length}, behind ${P.filter(r => r.pbu === 'behind').length}`);
