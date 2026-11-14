// What frees an interior rusher under the hand model (Flex, 2026-11-14; Integration: RUSH_HANDS on engine-60 doubles
// interior pressure and ends interior reps about 0.6 s early). Per interior pass rep (G/C against DL/LB) that ends while
// the QB holds the ball, after 0.5 s: why it ended (a shed note from beat(), or another disengage), the blocker's
// hands joint at the last engaged tick (hands on 2 / 1 / 0-off), how long since he last lost a hand, whether the
// rusher's long-arm was on, the move in flight and its time; then whether the rusher reached 2 yd of the QB within 1.5 s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/interior-free.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = []; let drops = 0;
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  drops++;
  const live = new Map<any, any>(), done: any[] = []; const tick = sim.tick.bind(sim);
  const ev0 = sim.event.bind(sim); const notes = new Map<any, string>();
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && note?.startsWith('pass')) notes.set(a, note.slice(6)); return ev0(type, a, b, note); };
  sim.tick = () => {
    const held = sim.carrier === sim.qb && sim.throwAt < 0;
    notes.clear();
    tick();
    const seen = new Set<any>();
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !['LG', 'C', 'RG'].includes(e.blocker.slot)) continue;
      seen.add(e);
      const r = live.get(e) ?? { e, d: e.defender, start: sim.t, lostAt: -1, prevOn: 2 };
      const h = e.hands, on = !h ? -1 : h.off ? 0 : h.handsOn ?? 2;
      if (on >= 0 && on < r.prevOn) r.lostAt = sim.t;
      r.prevOn = on >= 0 ? on : r.prevOn;
      r.last = { on, longArm: !!e.rusherHand && !e.rusherHand.off, move: e.move, inMove: e.moveUntil > sim.t, club: !!e.club, phi: e.phi * e.side, t: sim.t };
      live.set(e, r);
    }
    for (const [e, r] of live) {
      if (seen.has(e)) continue;
      live.delete(e);
      if (!held || sim.t < 0.5) continue;
      r.end = sim.t; r.why = notes.get(r.d) ?? 'other'; r.reached = false; done.push(r); rows.push(r);
    }
    for (const r of done) if (!r.reached && sim.carrier === sim.qb && sim.throwAt < 0 && sim.t - r.end <= 1.5 && Math.hypot(r.d.pos.x - sim.qb.pos.x, r.d.pos.y - sim.qb.pos.y) <= 2) r.reached = true;
  };
  return sim.run();
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : 'nan'; };
console.log(`dropbacks ${drops} | interior pass reps ended with the ball held, after 0.5 s: ${rows.length} (${(100 * rows.length / drops).toFixed(1)} /100) | reached 2 yd of the QB within 1.5 s ${rows.filter((r) => r.reached).length}`);
const key = (r: any) => `${r.why} | hands ${r.last.on < 0 ? 'no joint' : r.last.on === 0 ? 'off' : r.last.on}${r.last.longArm ? ' | long-arm on' : ''}${r.last.club ? ' | club' : ''}`;
const by = new Map<string, any[]>(); for (const r of rows) by.set(key(r), [...(by.get(key(r)) ?? []), r]);
for (const [k, R] of [...by].sort((a, b) => b[1].length - a[1].length)) {
  const mv = new Map<string, number>(); for (const r of R) mv.set(r.last.move, (mv.get(r.last.move) ?? 0) + 1);
  console.log(`  ${k.padEnd(44)} n ${String(R.length).padStart(4)} (${(100 * R.length / drops).toFixed(1)} /100) | reached ${R.filter((r) => r.reached).length} | rep length p50 ${q(R.map((r) => r.end - r.start))} s, ended at ${q(R.map((r) => r.end))} s | since a hand was lost p50 ${q(R.filter((r) => r.lostAt >= 0).map((r) => r.end - r.lostAt))} s (${R.filter((r) => r.lostAt >= 0).length} lost one) | leverage ${q(R.map((r) => r.last.phi))} | moves ${[...mv].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, n]) => m + ' ' + n).join(', ')}`);
}
