// Walked-up off-ball defenders (snap 1.5-3 yd off the ball, inside the OL width +-1.5) who do not rush (behaviour kind not
// rush/blitz): how often a protector is ever assigned to them before the throw, and how often a rusher comes free (first
// pressure unblocked) on those dropbacks. usage: node --import tsx _fakeblitz.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PassProtector } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; const OL = /^(LT|LG|C|RG|RT)$/;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || sim.offCall?.pass?.family === 'screen') return undefined;
    const prot = sim.offense.filter((o: any) => o.behavior instanceof PassProtector);
    const coord = (prot.find((o: any) => OL.test(o.slot))?.behavior as any)?.coord; if (!coord) return undefined;
    const dir = sim.attackDir('O'); const ys = sim.offense.filter((o: any) => OL.test(o.slot)).map((o: any) => o.pos.y);
    const lo = Math.min(...ys) - 1.5, hi = Math.max(...ys) + 1.5;
    const fakes = sim.defense.filter((d: any) => { const x = (sim.snapX[d.idx] - sim.los) * dir; return x >= 1.5 && x < 3 && d.pos.y >= lo && d.pos.y <= hi && !['rush', 'blitz'].includes(d.behavior?.kind); });
    if (!fakes.length) return undefined;
    inc('dropbacks with a walked-up non-rusher'); const asg = new Set<any>(); let hit: any = null; const touched = new Set<any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (hit || sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      for (const o of sim.offense) if (o.engagement) touched.add(o.engagement.defender);
      for (const [, r] of coord.assigned) if (r && fakes.includes(r)) asg.add(r);
      if (sim.t < 0.3) return; const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (d) hit = { free: !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2) }; };
    const res = sim.run();
    inc(`non-rushers ${fakes.length}`); for (const f of fakes) inc(asg.has(f) ? 'non-rusher assigned a protector' : 'non-rusher left alone');
    inc(hit ? (hit.free ? 'first pressure FREE' : 'first pressure blocked') : 'no pressure');
    return res; } } });
}
for (const k of Object.keys(C).sort()) console.log(String(C[k]).padStart(5), k);
