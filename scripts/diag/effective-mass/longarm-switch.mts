// The long-arm's "no reach" switch under the hand model (Flex, 2026-11-14; Integration: is it a step that disarms the
// blocker, and does it flicker?). Per long-arm episode (e.rusherHand on): its duration; the share of its ticks with the
// switch on (gap between bodies beyond the blocker's arm: his push, hold and steer zeroed, stepLongArm); the switch's
// toggles; the rusher's and blocker's arm lengths; the counter (a club on the arm) and whether the arm came off; and
// whether the rep ended 'past him' during or within 0.5 s after. Interior vs tackle.
// usage: RUSH_HANDS=1 [flags] node --import tsx scripts/diag/effective-mass/longarm-switch.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const eps: any[] = []; let decisions = 0, armDiffs: number[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const open = new Map<any, any>(); const tick = sim.tick.bind(sim); const sheds: any[] = [];
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && note?.includes('past')) sheds.push({ a, t: sim.t }); return ev0(type, a, b, note); };
  sim.tick = () => {
    const pre = new Map<any, any>(); for (const e of sim.engagements) if (e.type === 'pass') pre.set(e, e.nextMoveAt);
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      if (pre.has(e) && sim.t - sim.dt >= pre.get(e)) { decisions++; armDiffs.push(e.defender.player.measurables.armIn - e.blocker.player.measurables.armIn); }
      const j = e.rusherHand;
      let r = open.get(e);
      if (j && !j.off) {
        if (!r) { r = { e, t0: sim.t, ticks: 0, on: 0, toggles: 0, last: null as boolean | null, d: e.defender, armD: e.defender.player.measurables.armIn, armB: e.blocker.player.measurables.armIn, interior: ['LG', 'C', 'RG'].includes(e.blocker.slot), countered: false }; open.set(e, r); }
        const b = e.blocker, d = e.defender, gap = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - b.profile.radius - d.profile.radius;
        const sw = gap > b.player.measurables.armIn / 36;
        r.ticks++; if (sw) r.on++; if (r.last !== null && sw !== r.last) r.toggles++; r.last = sw;
        if (e.counterAt !== undefined && sim.t >= e.counterAt) r.countered = true;
      } else if (r) { r.t1 = sim.t; r.armOff = !!j?.off; open.delete(e); eps.push(r); }
    }
    for (const [e, r] of open) if (!sim.engagements.includes(e)) { r.t1 = sim.t; r.repEnded = true; open.delete(e); eps.push(r); }
  };
  const out = sim.run();
  for (const r of eps) if (r.past === undefined) r.past = sheds.some((x) => x.a === r.d && x.t >= r.t0 && x.t <= (r.t1 ?? 99) + 0.5);
  return out;
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
armDiffs.sort((a, b) => a - b);
console.log(`move decisions ${decisions} | rusher minus blocker arm (in) p10/50/90 ${q(armDiffs, .1)}/${q(armDiffs)}/${q(armDiffs, .9)}, rusher longer ${(100 * armDiffs.filter((x) => x > 0).length / Math.max(1, armDiffs.length)).toFixed(0)}%, by under an inch ${(100 * armDiffs.filter((x) => x > 0 && x < 1).length / Math.max(1, armDiffs.length)).toFixed(0)}%`);
for (const inter of [true, false]) {
  const R = eps.filter((r) => r.interior === inter);
  console.log(`${inter ? 'interior' : 'tackle'} long-arm episodes ${R.length} (${(R.length / Math.max(1, decisions) * 100).toFixed(0)}% of decisions) | duration p50 ${q(R.map((r) => (r.t1 ?? r.t0) - r.t0))} s | switch on (blocker disarmed) ${q(R.map((r) => r.on / Math.max(1, r.ticks)))} of ticks p50, any ${(100 * R.filter((r) => r.on > 0).length / Math.max(1, R.length)).toFixed(0)}% | toggles p50 ${q(R.map((r) => r.toggles))}, p90 ${q(R.map((r) => r.toggles), .9)} | arm diff p50 ${q(R.map((r) => r.armD - r.armB))} in | countered ${(100 * R.filter((r) => r.countered).length / Math.max(1, R.length)).toFixed(0)}%, arm knocked off ${(100 * R.filter((r) => r.armOff).length / Math.max(1, R.length)).toFixed(0)}% | past him during or within 0.5 s ${(100 * R.filter((r) => r.past).length / Math.max(1, R.length)).toFixed(0)}% (switch-on episodes ${(100 * R.filter((r) => r.past && r.on > 0).length / Math.max(1, R.filter((r) => r.on > 0).length)).toFixed(0)}%, never ${(100 * R.filter((r) => r.past && r.on === 0).length / Math.max(1, R.filter((r) => r.on === 0).length)).toFixed(0)}%)`);
}
// Split by arm difference (Integration: a shorter man may choose it; check it then fails physically): past him and the
// switch's share, rusher shorter vs longer than the blocker.
for (const inter of [true, false]) for (const [lab, f] of [['shorter', (r: any) => r.armD < r.armB], ['longer', (r: any) => r.armD > r.armB]] as const) {
  const R = eps.filter((r) => r.interior === inter && f(r));
  console.log(`  ${inter ? 'interior' : 'tackle'} rusher ${lab}: episodes ${R.length} | gap beyond the blocker's arm at all ${(100 * R.filter((r) => r.on > 0).length / Math.max(1, R.length)).toFixed(0)}% | past him during or within 0.5 s ${(100 * R.filter((r) => r.past).length / Math.max(1, R.length)).toFixed(1)}%`);
}
