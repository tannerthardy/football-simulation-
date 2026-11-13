// How interior rushers get free to pressure (RUSH_HANDS re-diagnosis, 2026-11-13). Per pass play whose first presser
// (a defender within 2 yd of the QB before the throw) had been engaged by a guard or the center: his last rep's end
// (the shed note, 'none' if still engaged), whether a hand had been cleared in it, the time from the rep's end to the
// pressure, and whether he was free then (no offensive non-QB within 1.0 yd).
// usage: [flags] node --import tsx scripts/diag/effective-mass/interior-free.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
let dropbacks = 0;
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    dropbacks++;
    const reps = new Map<any, any>();       // defender -> his last interior rep
    let hit: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = new Set<any>(sim.engagements);
      tick();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !['LG', 'C', 'RG'].includes(e.blocker.slot)) continue;
        let r = reps.get(e.defender);
        if (!r || r.e !== e) { r = { e, start: sim.t, cleared: false, both: false, end: null, why: 'none', helpers: 0 }; reps.set(e.defender, r); }
        if (e.hands && (e.hands.off || (e.hands.handsOn ?? 2) < 2)) { r.cleared = true; if (e.hands.off) r.both = true; }
        r.helpers = Math.max(r.helpers, e.helpers.length);
      }
      for (const e of before) if (!sim.engagements.includes(e)) {
        const r = reps.get(e.defender);
        if (r && r.e === e && r.end === null) { r.end = sim.t; const ev = [...sim.events].reverse().find((x: any) => x.type === 'shed' && sim.agents[x.a] === e.defender); r.why = ev?.note ?? 'other'; }
      }
      if (!hit && sim.carrier === sim.qb && sim.throwAt < 0) {
        for (const d of sim.defense) if (Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2) {
          const free = !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.0);
          hit = { d, t: sim.t, free }; break;
        }
      }
    };
    const res = sim.run();
    if (hit && reps.has(hit.d)) { const r = reps.get(hit.d); rows.push({ ...r, e: undefined, t: hit.t, free: hit.free, gap: r.end === null ? null : hit.t - r.end }); }
    return res; } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`dropbacks ${dropbacks} | first presser from a guard/center rep ${rows.length} (${pc(rows.length, dropbacks)} of dropbacks), free ${pc(rows.filter((r) => r.free).length, rows.length)}, at t p50 ${q(rows.map((r) => r.t))}`);
const why: Record<string, number> = {}; for (const r of rows) why[r.why] = (why[r.why] ?? 0) + 1;
console.log(`  his last rep ended: ${Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pc(v, rows.length)}`).join(', ')}`);
console.log(`  a hand cleared in it ${pc(rows.filter((r) => r.cleared).length, rows.length)} (both ${pc(rows.filter((r) => r.both).length, rows.length)}) | doubled ${pc(rows.filter((r) => r.helpers > 0).length, rows.length)} | rep end to pressure p50 ${q(rows.filter((r) => r.gap !== null).map((r) => r.gap))} s | rep length p50 ${q(rows.filter((r) => r.end !== null).map((r) => r.end - r.start))} s`);
