const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 201), games = Number(process.argv[3] ?? 4);
const rows: any[] = [];
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const tackles = ['LT', 'RT'].map((x) => sim.slot(x)).filter(Boolean);
    const lastEng = new Map<any, number>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      for (const d of sim.defense) if (d.engagement) lastEng.set(d, sim.t);
      const before = new Map<any, any>();
      if (sim.t >= 0.95 && sim.t <= 1.8 && sim.carrier === sim.qb && sim.throwAt < 0) {
        for (const tk of tackles) {
          const side = Math.sign(tk.pos.y - sim.ballY);
          for (const d of sim.defense) {
            if (d.behavior?.kind !== 'rush' || d.engagement) continue;
            if (side * (d.pos.y - tk.pos.y) < -0.3 || d.pos.x - tk.pos.x < -0.3) continue;
            const gap = Math.hypot(d.pos.x - tk.pos.x, d.pos.y - tk.pos.y);
            if (gap <= 1.2 || gap > 2.6 || Math.abs(d.pos.y - sim.ballY) < 3) continue;
            before.set(d, { tk, gap, side });
          }
        }
      }
      tick();
      for (const [d, b] of before) {
        const gap1 = Math.hypot(d.pos.x - b.tk.pos.x, d.pos.y - b.tk.pos.y);
        const req = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
        const reqS = Math.hypot(req.x, req.y), sp = Math.hypot(d.vel.x, d.vel.y);
        const ux = (b.tk.pos.x - d.pos.x) / gap1, uy = (b.tk.pos.y - d.pos.y) / gap1;
        rows.push({ br: d.__br ?? '?', plan: d.behavior.plan, rate: (gap1 - b.gap) / sim.dt, reqS, sp, vmax: d.profile.vmax,
          towardTk: sp > 0.3 ? (d.vel.x * ux + d.vel.y * uy) / sp : 0, reqToward: reqS > 0.3 ? (req.x * ux + req.y * uy) / reqS : 0,
          tkvx: b.tk.vel.x,
          up: d.body.support?.state ?? '?', xi: Math.hypot(d.body.support?.xi.x ?? 0, d.body.support?.xi.y ?? 0),
          joints: sim.world.joints.filter((j: any) => (j.a === d.body || j.b === d.body) && !(j.kind === 'grasp' && j.broken)).map((j: any) => j.kind).join('+') || 'none',
          touching: sim.agents.filter((o: any) => o !== d && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= o.profile.radius + d.profile.radius + 0.1).map((o: any) => o.team === 'O' ? o.slot : 'D').join(',') || 'none',
          sinceEng: lastEng.has(d) ? sim.t - lastEng.get(d)! : -1, rvx: d.vel.x, outW: b.side * (d.pos.y - b.tk.pos.y) });
      }
    };
    const res = sim.run();
    return res; } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const groups: Record<string, any[]> = { 'not closing (rate >= -0.3)': rows.filter((r) => r.rate >= -0.3), 'closing (rate < -0.3)': rows.filter((r) => r.rate < -0.3) };
for (const [g, R] of Object.entries(groups)) {
  const br: Record<string, number> = {}; for (const r of R) br[`${r.br}/${r.plan}`] = (br[`${r.br}/${r.plan}`] ?? 0) + 1;
  const top = Object.entries(br).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${(100 * v / R.length).toFixed(0)}%`).join(', ');
  console.log(`${g}: ticks ${R.length} (${(100 * R.length / rows.length).toFixed(0)}%) | branch/plan ${top}`);
  const cnt = (f: (r: any) => string) => { const c: Record<string, number> = {}; for (const r of R) c[f(r)] = (c[f(r)] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${(100 * v / R.length).toFixed(0)}%`).join(', '); };
  console.log(`   support ${cnt((r) => r.up)} | xi p50 ${q(R.map((r) => r.xi))} | joints on him ${cnt((r) => r.joints)} | touching ${cnt((r) => r.touching)} | a block of his ended ${cnt((r) => r.sinceEng < 0 ? 'never' : r.sinceEng < 0.3 ? '< 0.3 s ago' : r.sinceEng < 1 ? '0.3-1 s ago' : '> 1 s ago')}`);
  console.log(`   rusher asks ${q(R.map((r) => r.reqS))} yd/s (of vmax ${q(R.map((r) => r.reqS / r.vmax))}), achieves ${q(R.map((r) => r.sp))} | heading toward the tackle: asked ${q(R.map((r) => r.reqToward))}, achieved ${q(R.map((r) => r.towardTk))} (1 = straight at him, 0 = across) | width outside ${q(R.map((r) => r.outW))} | rusher x-vel ${q(R.map((r) => r.rvx))}, tackle x-vel ${q(R.map((r) => r.tkvx))}`);
}
