// Free first pressures on dropbacks (game hooks): first defender within 2 yd of the QB from 0.3 s before the throw with no
// offensive player within 1.2 yd. Truth: his slot and behaviour kind, snap spot, declared on the line by protection, ever
// assigned and to whom, assigned at the moment; protectors, backs still in vs released (and when); spare protectors at
// the moment (assigned to an already-engaged man, or nothing). usage: node --import tsx _freepass.mts [first seed] [games] [--league]
// --league: league-sampled teams (leagueSample: habits and coordinators per seed) instead of the fixed IRN/COM pair.
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const league = process.argv.includes('--league');
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PassProtector } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--step');
const first = Number(pos[0] ?? 11), games = Number(pos[1] ?? 8);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; let n = 0;
// --step 1: consecutive seeds, the same games as sim-export --seed first --games N.
const step = Number(process.argv[process.argv.indexOf('--step') + 1] ?? 2) || 2;
for (let s = first; s < first + step * games; s += step) {
  // With --step 1 the rosters come from the first seed, as in sim-export (one roster pair, sampled per game).
  const rng = new Rng(step === 1 ? first : s);
  const h0 = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), a0 = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const home = league ? leagueSample(h0, s) : h0, away = league ? leagueSample(a0, s) : a0;
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || sim.offCall?.pass?.family === 'screen') return undefined;
    n++; const dir = sim.attackDir('O'), los = sim.los;
    const prot = sim.offense.filter((o: any) => o.behavior instanceof PassProtector);
    const coord = (prot.find((o: any) => /^(LT|LG|C|RG|RT)$/.test(o.slot))?.behavior as any)?.coord;
    const ever = new Map<any, Set<string>>(); const relAt = new Map<any, number>(); let hit: any = null; const touched = new Set<any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (hit || sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      for (const o of sim.offense) if (o.engagement) touched.add(o.engagement.defender);
      if (coord) for (const [b, r] of coord.assigned) if (r) { if (!ever.has(r)) ever.set(r, new Set()); ever.get(r)!.add(b.slot); }
      for (const b of prot) if (!/^(LT|LG|C|RG|RT)$/.test(b.slot) && (b.behavior as any).released && !relAt.has(b)) relAt.set(b, sim.t);
      if (sim.t < 0.3) return;
      const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (!d) return;
      const free = !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2);
      const backsIn = prot.filter((b: any) => !/^(LT|LG|C|RG|RT)$/.test(b.slot) && !(b.behavior as any).released && !b.isDown?.(sim.t));
      const spare = coord ? [...coord.assigned].filter(([b, r]: any) => !b.engagement && (!r || r.engagement)).length : 0;
      hit = { d, t: sim.t, free, backsIn: backsIn.length, backsRel: [...relAt.values()].filter((t) => t < sim.t).length, spare, touchedEver: touched.has(d),
        assignedNow: coord ? [...coord.assigned].find(([, r]: any) => r === d)?.[0]?.slot ?? null : null }; };
    const res = sim.run();
    if (!hit) return res;
    inc('pressure'); if (!hit.free) { inc('blocked'); return res; }
    const d = hit.d, x0 = (sim.snapX[d.idx] - los) * dir; const bk = d.behavior?.kind ?? '?';
    const ol = sim.offense.filter((o: any) => /^(LT|LG|C|RG|RT)$/.test(o.slot)).map((o: any) => o.pos.y);
    const grp = /^(DE|DT|NT)/.test(d.slot) ? 'DL' : /LB/.test(d.slot) ? 'LB' : 'DB';
    const declared = coord?.declaredOn?.has(d) ? 'declared' : 'not declared';
    const ev = ever.get(d); const asg = ev ? `assigned to ${[...ev].sort().join('+')}` : 'never assigned';
    const tag = `${grp} ${x0 <= 1.6 ? 'line' : 'off'} kind=${bk}`;
    inc('free'); inc(`A ${tag}`); inc(`B ${tag} | ${declared} | ${ev ? 'ever assigned' : 'never assigned'}`);
    inc(`C ${tag} | backs in ${hit.backsIn}, released before ${hit.backsRel} | spare protectors ${hit.spare > 0 ? 'yes' : 'no'}`);
    inc(`D ${tag} | ${asg} | engaged before ${hit.touchedEver ? 'yes' : 'no'}`);
    return res; } } });
}
console.log('dropbacks', n); for (const k of Object.keys(C).sort((a, b) => (a[0] === b[0] ? C[b] - C[a] : a < b ? -1 : 1))) console.log(String(C[k]).padStart(4), k);
