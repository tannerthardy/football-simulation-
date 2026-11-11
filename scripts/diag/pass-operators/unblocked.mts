// Unblocked down linemen (PRO_CALL trace): on league-sampled dropbacks, each down lineman (DE/DT/NT slot, aligned on
// the line) who is unblocked at 1.0 s (no protector engaged on him): his assignment history from the protection
// coordinator (who had him, and whether that protector was moved to a called walked-up backer, another lineman or
// nobody, and when), and whether he became the free first pressure (freepass.mts's rule). Passive.
//   [PRO_CALL=1] node --import tsx scripts/diag/pass-operators/unblocked.mts [first seed] [games] [--step 1]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PassProtector } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--step');
const first = Number(pos[0] ?? 101), games = Number(pos[1] ?? 16);
const step = Number(process.argv[process.argv.indexOf('--step') + 1] ?? 2) || 2;
const C: Record<string, number> = {}; const inc = (k: string, v = 1) => C[k] = (C[k] ?? 0) + v; let n = 0;
const OL = /^(LT|LG|C|RG|RT)$/;
const grp = (a: any) => OL.test(a.slot) ? 'lineman' : a.slot === 'RB' || a.slot === 'F' ? 'back' : 'end/other';
for (let s = first; s < first + step * games; s += step) {
  const rng = new Rng(step === 1 ? first : s);
  const home = leagueSample(generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), s), away = leagueSample(generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }), s);
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || sim.offCall?.pass?.family === 'screen') return undefined;
    n++;
    const dl = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && sim.snapX[d.idx] < sim.los + 1.5);
    const isDL = new Set(dl);
    let coord: any = null;
    // Per down lineman: blockers ever assigned to him, and each blocker's moves off him (time, to whom).
    const had = new Map<any, Set<any>>(); const moves = new Map<any, string[]>(); const last = new Map<any, any>();
    let at1: Map<any, any> | null = null; let hit: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.carrier !== sim.qb || sim.throwAt >= 0) return;
      if (!coord) coord = (sim.offense.find((o: any) => o.behavior instanceof PassProtector && OL.test(o.slot))?.behavior as any)?.coord;
      if (coord) for (const [b, r] of coord.assigned as Map<any, any>) {
        const prev = last.get(b);
        if (prev === r) continue;
        last.set(b, r);
        if (r && isDL.has(r)) (had.get(r) ?? had.set(r, new Set()).get(r)!).add(b);
        if (prev && isDL.has(prev)) {
          const to = !r ? 'nobody' : isDL.has(r) ? 'another down lineman' : coord.called?.has(r) ? 'a called backer' : 'another rusher';
          (moves.get(prev) ?? moves.set(prev, []).get(prev)!).push(`${grp(b)} moved to ${to} at ${sim.t < 0.5 ? '<0.5' : sim.t < 1.0 ? '0.5-1.0' : '1.0+'} s`);
        }
      }
      if (!at1 && sim.t >= 1.0 - 1e-9) {
        at1 = new Map();
        for (const d of dl) {
          if (sim.offense.some((o: any) => o.engagement && (o.engagement.defender === d || o.engagement.helpers?.includes?.(d)))) continue;
          const holders = coord ? [...coord.assigned].filter(([, r]: any) => r === d).map(([b]: any) => b) : [];
          at1.set(d, { holders: holders.map(grp).sort().join('+') || 'none',
            olOnCalled: coord ? [...coord.assigned].filter(([b, r]: any) => OL.test(b.slot) && r && coord.called?.has(r) && !isDL.has(r)).length : 0 });
        }
      }
      if (hit || sim.t < 0.3) return;
      const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (!d) return;
      hit = { d, free: !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2) };
    };
    const res = sim.run();
    if (at1) for (const [d, u] of at1) {
      const free = !!hit && hit.d === d && hit.free;
      const tags = [`assigned at 1.0 s to: ${u.holders}`,
        `history: ${!had.get(d)?.size ? 'never assigned' : moves.get(d)?.length ? 'assigned, then moved off' : 'assigned throughout'}`,
        ...(moves.get(d) ?? []).map((m) => `move: ${m}`),
        `linemen on a called backer at 1.0 s: ${Math.min(u.olOnCalled, 2)}${u.olOnCalled >= 2 ? '+' : ''}`];
      inc('unblocked DL at 1.0 s'); if (free) inc('unblocked DL at 1.0 s -> free first pressure');
      for (const t of new Set(tags)) { inc(t); if (free) inc(`${t} -> free`); }
    }
    return res; } } });
}
console.log('dropbacks', n);
for (const k of Object.keys(C).sort()) console.log(String(C[k]).padStart(6), k);
