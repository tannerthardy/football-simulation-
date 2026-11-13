// Off-ball blitzers on dropbacks (game hooks): when first assigned and to whom; at that moment the assignee's distance to him,
// engaged or not; the backs in protection (where, assigned to whom, distance to the blitzer); outcome: picked up (engaged by
// anyone before the throw) or free (reached 2 yd of the QB unblocked) or neither.
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PassProtector } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const C: Record<string, number> = {}; const R: Record<string, number[]> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; const push = (k: string, v: number) => (R[k] ??= []).push(v);
const OL = /^(LT|LG|C|RG|RT)$/;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || sim.offCall?.pass?.family === 'screen') return undefined;
    const prot = sim.offense.filter((o: any) => o.behavior instanceof PassProtector);
    const coord = (prot.find((o: any) => OL.test(o.slot))?.behavior as any)?.coord; if (!coord) return undefined;
    const bl = sim.defense.filter((d: any) => d.behavior?.kind === 'blitz' && /LB/.test(d.slot));
    if (!bl.length) return undefined;
    const st = new Map<any, any>(bl.map((d: any) => [d, { first: null, engaged: false, free: false, backAt: null }]));
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      for (const d of bl) { const s = st.get(d);
        if (d.engagement) s.engaged = true;
        if (!s.first) { const e = [...coord.assigned].find(([, r]: any) => r === d); if (e) { const b = e[0];
          s.first = { t: sim.t, who: OL.test(b.slot) ? b.slot : 'back', dist: Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y), engaged: !!b.engagement,
            ddepth: (d.pos.x - sim.los) * sim.attackDir('O') }; } }
        if (!s.backAt && sim.t >= 0.3) { const backs = prot.filter((b: any) => !OL.test(b.slot) && !(b.behavior as any).released);
          s.backAt = { n: backs.length, near: backs.length ? Math.min(...backs.map((b: any) => Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y))) : NaN,
            busy: backs.some((b: any) => { const r = coord.assigned.get(b); return r && r !== d; }) }; }
        if (!s.engaged && !s.free && sim.t >= 0.3 && Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) s.free = true; } };
    const res = sim.run();
    for (const d of bl) { const s = st.get(d); const out = s.engaged ? 'picked up' : s.free ? 'FREE' : 'neither';
      inc(`n`); inc(`out ${out}`); const w = s.first ? s.first.who : 'never assigned'; inc(`${w} -> ${out}`);
      if (s.first) { push(`${w} t`, s.first.t); push(`${w} dist`, s.first.dist); push(`${w} depth`, s.first.ddepth); if (s.first.engaged) inc(`${w} assignee engaged at assignment`); }
      if (s.backAt) inc(`back in at 0.3s: ${s.backAt.n} ${s.backAt.n ? (s.backAt.busy ? 'busy elsewhere' : 'not busy') : ''} -> ${out}`); }
    return res; } } });
}
const med = (v: number[] = []) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
for (const k of Object.keys(C).sort()) console.log(String(C[k]).padStart(4), k);
for (const w of ['C', 'LG', 'RG', 'LT', 'RT', 'back']) if (R[`${w} t`]) console.log(`${w}: first assigned at p50 ${med(R[`${w} t`])} s, assignee distance ${med(R[`${w} dist`])} yd, blitzer depth ${med(R[`${w} depth`])} yd (n ${R[`${w} t`].length})`);
