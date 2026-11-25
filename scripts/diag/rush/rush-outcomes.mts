// RUSH_RELEASE game outcomes (Integration, 2026-11-25): per dropback, sacks; pressure (a rusher -- rush or blitz -- within
// his reach of the passer from the release to 1.0 s after it); per pass, the lane crossing (Flex's lane-cross operator:
// the closest horizontal distance from the ball to any DL in its first 0.4 s of flight, within 0.55 / 0.95 yd; NFL 5.9 /
// 18.0% of passes) and batted at the line per crossing (NFL about 5% within 0.95 yd). usage: [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let drop = 0, sacks = 0, passes = 0, pressured = 0, cross55 = 0, cross95 = 0, bats = 0, batsOnCross = 0;
const isDL = (d: any) => /^(DE|DT|NT)/.test(d.slot);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  drop++;
  let rel = -1, minDL = Infinity, press = false, sack = false, bat = false;
  const ev = sim.event.bind(sim);
  sim.event = (k: string, a: any, b: any, why: string) => { if (k === 'sack') sack = true; if (k === 'deflection' && why === 'batted at the line') bat = true; return ev(k, a, b, why); };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const q = sim.qb;
    if (rel < 0 && sim.ball.kind === 'air') rel = sim.t;
    if (!press && (rel < 0 || sim.t - rel <= 1.0)) for (const d of sim.defense) if (['rush', 'blitz'].includes(d.behavior?.kind) && !d.isDown(sim.t)
      && Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y) <= q.profile.radius + d.profile.radius + d.player.measurables.armIn / 36 && (rel >= 0 || sim.ball.carrier === q)) { if (rel >= 0) press = true; }
    if (rel >= 0 && sim.ball.kind === 'air' && sim.t - sim.ball.releaseT <= 0.4) { const b = sim.ball.flight.pos;
      for (const d of sim.defense) if (isDL(d)) minDL = Math.min(minDL, Math.hypot(d.pos.x - b.x, d.pos.y - b.y)); }
  };
  const out = sim.run();
  if (sack) sacks++;
  if (rel >= 0) { passes++; if (press) pressured++; if (minDL <= 0.55) cross55++; if (minDL <= 0.95) { cross95++; if (bat) batsOnCross++; } if (bat) bats++; }
  return out;
} } });
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(1)}%`;
console.log(`dropbacks ${drop} | sacks ${sacks} (${pc(sacks, drop)}) | passes ${passes} | pressured after the release ${pressured} (${pc(pressured, passes)}) | lane crossings 0.55 / 0.95 yd ${pc(cross55, passes)} / ${pc(cross95, passes)} | batted ${bats} (${pc(bats, passes)} of passes), ${batsOnCross} of ${cross95} crossings (${pc(batsOnCross, cross95)})`);
