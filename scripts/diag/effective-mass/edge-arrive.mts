// Edge DL falls within 0.4 s of the rep's start (Flex, 2026-11-14): his balance (availability, xi vs base, direction) over the 0.4 s before
// the rep started and at its first ticks, his speed and turn rate, the first press. 
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-arrive.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const sup_ = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const out: string[] = []; let early = 0, all = 0, offBefore = 0;
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const hist = new Map<any, any[]>(); const tick = sim.tick.bind(sim);
  const des = () => sim.defense.filter((a: any) => /^DE/.test(a.slot));
  sim.tick = () => {
    const held = sim.carrier === sim.qb && sim.throwAt < 0;
    const wasUp = new Map(des().map((d: any) => [d, d.body.support?.state === 'up']));
    tick();
    for (const d of des()) {
      const sup = d.body.support; if (!sup) continue;
      const sp = supportParams(d.profile), a = sup.state === 'up' ? sup_.availability(sup, sp, 1) : 0;
      const e = sim.engagements.find((e: any) => e.defender === d && e.type === 'pass');
      const f = sup.felt, v = d.vel;
      const h = hist.get(d) ?? []; h.push({ t: sim.t, a, xi: Math.hypot(sup.xi.x, sup.xi.y) / sp.baseRadius, xiAlongV: (sup.xi.x * v.x + sup.xi.y * v.y) / (Math.hypot(v.x, v.y) || 1) / sp.baseRadius, sp: Math.hypot(v.x, v.y), press: Math.hypot(f.x, f.y), rep: e ? e.start : null, facing: d.body.facing }); if (h.length > 20) h.shift(); hist.set(d, h);
      if (held && sim.t >= 0.5 && wasUp.get(d) && sup.state !== 'up' && e) {
        all++;
        if (sim.t - e.start > 0.4) continue;
        early++;
        const pre = h.filter((r) => r.t < e.start - 1e-9).slice(-8), inRep = h.filter((r) => r.t >= e.start - 1e-9);
        if (pre.length && pre[pre.length - 1].a < 0.9) offBefore++;
        out.push(`${d.slot} fall ${sim.t.toFixed(2)} rep ${e.start.toFixed(2)} | before: avail ${pre.map((r) => r.a.toFixed(2)).join(' ')} xi/base ${pre.map((r) => r.xi.toFixed(2)).join(' ')} along-v ${pre.map((r) => r.xiAlongV.toFixed(2)).join(' ')} speed ${pre.map((r) => r.sp.toFixed(1)).join(' ')} | in rep: avail ${inRep.map((r) => r.a.toFixed(2)).join(' ')} press ${inRep.map((r) => r.press.toFixed(0)).join(' ')}`);
      }
    }
  };
  return sim.run();
} } });
console.log(`edge falls in a pass rep ${all}; within 0.4 s of the rep's start ${early}; already below 0.9 availability the tick before the rep ${offBefore}`);
console.log(out.join('\n'));
