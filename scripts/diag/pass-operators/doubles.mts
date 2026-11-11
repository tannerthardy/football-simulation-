// Doubles on down linemen (PRO_CALL verification): on league-sampled dropbacks, each down lineman (DE/DT/NT slot,
// aligned on the line) at 1.0 s and 1.5 s after the snap (pass-set contact comes after 0.5 s): unblocked, single (one blocker engaged), or doubled (a
// helper on the engagement, or two protectors engaged); whether he became the free first pressure (freepass.mts's
// rule: first defender within 2 yd of the QB from 0.3 s with no offensive player within 1.2 yd); and, with PRO_CALL,
// how many linemen were then assigned to a declared walked-up threat who had not come. Passive.
//   [PRO_CALL=1] node --import tsx scripts/diag/pass-operators/doubles.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { PassProtector } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--step');
const first = Number(pos[0] ?? 101), games = Number(pos[1] ?? 16);
const C: Record<string, number> = {}; const inc = (k: string, v = 1) => C[k] = (C[k] ?? 0) + v; let n = 0;
const OL = /^(LT|LG|C|RG|RT)$/;
// --step 1: consecutive seeds, the same games as sim-export --seed first --games N.
const step = Number(process.argv[process.argv.indexOf('--step') + 1] ?? 2) || 2;
for (let s = first; s < first + step * games; s += step) {
  // With --step 1 the rosters come from the first seed, as in sim-export (one roster pair, sampled per game).
  const rng = new Rng(step === 1 ? first : s);
  const home = leagueSample(generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), s), away = leagueSample(generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }), s);
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || sim.offCall?.pass?.family === 'screen') return undefined;
    n++;
    const dl = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && sim.snapX[d.idx] < sim.los + 1.5);
    const prot = sim.offense.filter((o: any) => o.behavior instanceof PassProtector);
    const coord = (prot.find((o: any) => OL.test(o.slot))?.behavior as any)?.coord;
    const state = new Map<any, Record<string, string>>(); let hit: any = null; const marks = [1.0, 1.5]; const seen = new Set<number>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.carrier !== sim.qb || sim.throwAt >= 0) return;
      for (const m of marks) if (!seen.has(m) && sim.t >= m - 1e-9) {
        seen.add(m);
        for (const d of dl) {
          const on = sim.offense.filter((o: any) => o.engagement && o.engagement.defender === d);
          const helpers = on.reduce((k: number, o: any) => k + (o.engagement.helpers?.length ?? 0), 0);
          const k = on.length + helpers;
          const st = k === 0 ? 'unblocked' : k === 1 ? 'single' : 'doubled';
          (state.get(d) ?? state.set(d, {}).get(d)!)[m.toFixed(1)] = st;
          if (st === 'single') state.get(d)![`by ${m.toFixed(1)}`] = on[0].slot;
          inc(`at ${m.toFixed(1)} s: ${st}`);
        }
        if (coord?.called) {
          const heldPairs = [...coord.assigned].filter(([b, r]: any) => OL.test(b.slot) && r && coord.called.has(r) && !r.engagement
            && (r.pos.x - sim.los) > 0.5);
          inc(`at ${m.toFixed(1)} s: linemen on a declared backer not yet come`, heldPairs.length);
          // Who the held lineman is held on: the backer's downhill speed and depth.
          for (const [, r] of heldPairs as any) {
            const v = -r.vel.x, dep = r.pos.x - sim.los;
            inc(`held at ${m.toFixed(1)} s: backer downhill ${v < 0.5 ? '<0.5' : v < 1 ? '0.5-1' : v < 2 ? '1-2' : '2+'} yd/s, ${dep < 1.5 ? '<1.5' : dep < 2.5 ? '1.5-2.5' : '2.5+'} yd off`);
          }
        }
      }
      if (hit || sim.t < 0.3) return;
      const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (!d) return;
      hit = { d, free: !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2) };
    };
    const res = sim.run();
    for (const d of dl) {
      const st = state.get(d) ?? {};
      const free = !!hit && hit.d === d && hit.free;
      for (const m of ['1.0', '1.5']) if (st[m]) {
        inc(`DL ${st[m]} at ${m} s`);
        if (free) inc(`DL ${st[m]} at ${m} s -> free first pressure`);
        if (st[m] === 'single') { const b = st[`by ${m}`]; const g = OL.test(b) ? 'lineman' : b === 'RB' || b === 'F' ? 'back' : 'end/other';
          inc(`single blocker at ${m} s: ${g}`); if (free) inc(`single blocker at ${m} s: ${g} -> free first pressure`); }
      }
    }
    return res; } } });
}
console.log('dropbacks', n);
for (const k of Object.keys(C).sort()) console.log(String(C[k]).padStart(6), k);
const rate = (st: string, m: string) => `${(100 * (C[`DL ${st} at ${m} s -> free first pressure`] ?? 0) / Math.max(1, C[`DL ${st} at ${m} s`] ?? 0)).toFixed(1)}%`;
for (const m of ['1.0', '1.5']) console.log(`free first pressure per down lineman, by state at ${m} s: single ${rate('single', m)}, doubled ${rate('doubled', m)}, unblocked ${rate('unblocked', m)}`);
