// Batted at the line (Integration / Tools' arrival cut, 2026-11-15: 77 deflected passes in 1,355 attempts against the
// NFL's tipped 0.5%). Per pass, every tick of the first 0.4 s of flight: each defender the ball passes within his
// hands' reach of (horizontal distance to his centre <= his reach, the ball no higher than 0.95 of his reaction reach:
// catching.ts' bat window) is a bat opportunity; whether he is engaged then, the blocker's hands joint load on him, his
// facing to the ball. Matched to the deflection events that follow ('batted at the line', 'off his body', pbu):
// opportunities, bats per opportunity, by engaged / free and by slot, the ball's height at the bat.
// usage: node --import tsx scripts/diag/pass-operators/bat-line.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let passes = 0; const opps: any[] = []; const defl: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const seen = new Map<any, any>(); let thrown = false;
  const ev = sim.event.bind(sim);
  sim.event = (k: string, a: any, b: any, why: string) => {
    if ((k === 'deflection' || k === 'pbu') && sim.ball.kind === 'air') {
      const tAir = sim.t - sim.ball.releaseT, bp = sim.ball.flight.pos;
      defl.push({ k, why, slot: a?.slot, engaged: !!a?.engagement, tAir, z: bp.z, behind: (bp.x - sim.los) * sim.attackDir(sim.qb.team) < 0, opp: seen.get(a) ?? null });
    }
    return ev(k, a, b, why);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.ball.kind !== 'air') return;
    if (!thrown) { thrown = true; passes++; }
    const tAir = sim.t - sim.ball.releaseT; if (tAir > 0.4) return;
    const bp = sim.ball.flight.pos;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const dh = Math.hypot(d.pos.x - bp.x, d.pos.y - bp.y);
      if (dh > d.profile.reach || bp.z > d.profile.reactReach * 0.95 || bp.z < 0.1) continue;
      if (seen.has(d)) continue;
      const j = d.engagement?.hands;
      const o = { slot: d.slot, engaged: !!d.engagement, N: j ? Math.max(0, j.normalForce ?? 0) : 0, z: bp.z, dh, tAir, height: d.profile.heightYd, rr: d.profile.reactReach };
      seen.set(d, o); opps.push(o);
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const bats = defl.filter(x => x.why === 'batted at the line'), body = defl.filter(x => x.why === 'off his body'), behind = defl.filter(x => x.behind);
console.log(`passes ${passes} | deflections ${defl.length} (${(100 * defl.length / passes).toFixed(1)}% of passes), behind the line ${behind.length} | batted at the line ${bats.length}, off his body ${body.length}, pbu ${defl.filter(x => x.k === 'pbu').length}`);
for (const [name, f] of [['engaged', (o: any) => o.engaged], ['free', (o: any) => !o.engaged]] as const) {
  const O = opps.filter(f), B = bats.filter((x: any) => f(x));
  console.log(`  ${name}: bat opportunities ${O.length} (${(O.length / passes).toFixed(2)} a pass) | batted ${B.length} (${(100 * B.length / Math.max(1, O.length)).toFixed(1)}% of opportunities) | ball height at the opportunity p50 ${q(O.map(o => o.z)).toFixed(2)} yd (his height p50 ${q(O.map(o => o.height)).toFixed(2)}, reaction reach ${q(O.map(o => o.rr)).toFixed(2)}) | blocker's joint load on him p50 ${q(O.map(o => o.N)).toFixed(0)} N`);
}
const bySlot: Record<string, number> = {}; for (const x of bats) bySlot[x.slot] = (bySlot[x.slot] ?? 0) + 1;
console.log(`  batted by slot: ${JSON.stringify(bySlot)} | ball height at the bat p50 ${q(bats.map((x: any) => x.z)).toFixed(2)} yd, tAir p50 ${q(bats.map((x: any) => x.tAir)).toFixed(2)} s`);
console.log(`  behind-the-line deflections by reason: ${JSON.stringify(behind.reduce((m: any, x: any) => (m[x.why ?? x.k] = (m[x.why ?? x.k] ?? 0) + 1, m), {}))}`);
