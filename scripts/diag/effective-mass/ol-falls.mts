// Which offensive-line falls are new (Integration, 2026-11-14, VERTICAL_SET's adverse row). Per OL fall before the
// throw (the World's fall event on a lineman, from 0.3 s): his slot (tackle / interior), the time, the man he was
// engaged with and that man's move, the rep's age, his own speed and retreat just before (0.1 s), the largest torso
// closing speed with that man in the 0.3 s before, his support deviation trend, and whether he had just been struck
// (a contact closing above 2 yd/s in the 0.15 s before: the impact family) or was going down under a steady press.
// usage: [flags] node --import tsx scripts/diag/effective-mass/ol-falls.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = []; let dropbacks = 0;
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  dropbacks++;
  const hist = new Map<any, any[]>(); const repStart = new Map<any, number>(); const seenFall = new Set<any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const off = sim.attackDir('O'), rep: any = (sim.world as any).report;
    for (const a of sim.offense) {
      if (!OL.has(a.slot)) continue;
      const e = a.engagement, h = hist.get(a) ?? [];
      let closing = 0;
      if (e) {
        if (!repStart.has(e)) repStart.set(e, sim.t);
        const c = (rep?.contacts ?? []).find((c: any) => (c.i === a.idx && c.j === e.defender.idx) || (c.j === a.idx && c.i === e.defender.idx));
        closing = c?.closing ?? 0;
      }
      h.push({ t: sim.t, v: Math.hypot(a.vel.x, a.vel.y), back: -a.vel.x * off, closing, move: e?.move, d: e?.defender?.slot, age: e ? sim.t - (repStart.get(e) ?? sim.t) : null, state: a.body.support?.state });
      if (h.length > 8) h.shift();
      hist.set(a, h);
    }
    for (const ev of sim.events) {
      if (ev.type !== 'fall' || seenFall.has(ev) || ev.t < 0.3 || sim.throwAt >= 0 && ev.t > sim.throwAt) continue;
      const a = sim.agents[ev.a]; if (!a || a.team !== 'O' || !OL.has(a.slot)) continue;
      seenFall.add(ev);
      const h = hist.get(a) ?? []; const pre = h.filter((x) => x.t <= ev.t - 0.05).slice(-2); const last = pre.at(-1) ?? h[0];
      const struck = h.filter((x) => x.t >= ev.t - 0.15).some((x) => x.closing > 2);
      rows.push({ tackle: a.slot === 'LT' || a.slot === 'RT', t: ev.t, move: last?.move ?? 'none', d: last?.d ?? '-', age: last?.age, v: last?.v ?? 0, back: last?.back ?? 0,
        maxClose: Math.max(0, ...h.map((x) => x.closing)), struck });
    }
  };
  return sim.run();
} } });
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`dropbacks ${dropbacks}; OL falls before the throw ${rows.length} (${(100 * rows.length / Math.max(1, dropbacks)).toFixed(1)} /100)`);
for (const [lab, f] of [['tackles', (r: any) => r.tackle], ['interior', (r: any) => !r.tackle]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  const mv: Record<string, number> = {}; for (const r of R) mv[r.move] = (mv[r.move] ?? 0) + 1;
  console.log(`${lab.padEnd(9)} ${R.length} (${(100 * R.length / Math.max(1, dropbacks)).toFixed(1)} /100) | struck (a contact closing > 2 yd/s in the 0.15 s before) ${pc(R.filter((r) => r.struck).length, R.length)} | rep age p50 ${q(R.map((r) => r.age))} s, time p50 ${q(R.map((r) => r.t))} s | his speed / retreat just before p50 ${q(R.map((r) => r.v))} / ${q(R.map((r) => r.back))} yd/s, retreating > 2 yd/s ${pc(R.filter((r) => r.back > 2).length, R.length)} | max closing p50 ${q(R.map((r) => r.maxClose))} | his man's move: ${Object.entries(mv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
