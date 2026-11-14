// usage: [flags] node --import tsx scripts/diag/effective-mass/rip-clear.mts [first seed] [games] (Flex, 2026-11-14)
// Per rip resolution (RUSH_RIP): did the blocker's hands joint lose a hand / come off within 0.3 s; the joint's hold,
// grip and the rip force; and did the rep end in a shed within 1 s.
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const last = new Map<any, number>(), open: any[] = []; const tick = sim.tick.bind(sim);
  const ev0 = sim.event.bind(sim); const sheds: any[] = [];
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed') sheds.push({ a, t: sim.t }); return ev0(type, a, b, note); };
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      if (e.moveUntil !== last.get(e) && e.moveUntil > sim.t && e.move === 'rip') {
        open.push({ e, t: sim.t, on0: e.hands ? (e.hands.off ? 0 : e.hands.handsOn ?? 2) : -1, grip: !!e.hands?.grip, hold: e.hands?.hold ?? 0, cleared: false });
      }
      last.set(e, e.moveUntil);
    }
    for (const r of open) {
      if (r.done) continue;
      const h = r.e.hands, on = h ? (h.off ? 0 : h.handsOn ?? 2) : 0;
      if (r.on0 > 0 && on < r.on0) r.cleared = true;
      if (sim.t - r.t >= 0.3) { r.done = true; rows.push(r); }
    }
  };
  const out = sim.run();
  for (const r of rows) if (r.shed === undefined) r.shed = sheds.some((x) => x.a === r.e.defender && x.t - r.t >= 0 && x.t - r.t <= 1);
  return out;
} } });
const R = rows.filter((r) => r.on0 > 0);
console.log(`rips ${rows.length}, with blocker hands on ${R.length}: a hand cleared within 0.3 s ${(100 * R.filter((r) => r.cleared).length / Math.max(1, R.length)).toFixed(0)}% | gripped at the rip ${(100 * R.filter((r) => r.grip).length / Math.max(1, R.length)).toFixed(0)}% (cleared when gripped ${(100 * R.filter((r) => r.grip && r.cleared).length / Math.max(1, R.filter((r) => r.grip).length)).toFixed(0)}%, open ${(100 * R.filter((r) => !r.grip && r.cleared).length / Math.max(1, R.filter((r) => !r.grip).length)).toFixed(0)}%) | shed within 1 s: cleared ${(100 * R.filter((r) => r.cleared && r.shed).length / Math.max(1, R.filter((r) => r.cleared).length)).toFixed(0)}%, not ${(100 * R.filter((r) => !r.cleared && r.shed).length / Math.max(1, R.filter((r) => !r.cleared).length)).toFixed(0)}%`);
