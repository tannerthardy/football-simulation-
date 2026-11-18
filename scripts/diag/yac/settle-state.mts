// At the release: underneath ZoneCoverage men within 8 yd of the true catchable track; settled? sinking to depth?
// dropping (>=1 yd/s deeper)? depth vs landmark. Also when settledAt fired relative to the release.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation, flip })); } catch { continue; }
        let snap: any[] | null = null; const hist = new Map<any, any[]>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => { const t = sim.t; tick(); { const dir = sim.attackDir(sim.offense[0].team); for (const d of sim.defense) (hist.get(d) ?? hist.set(d, []).get(d)!).push({ t, down: d.vel.x * dir }); } if (!snap && sim.ball?.kind === 'air') {
          const dir = sim.attackDir(sim.offense[0].team);
          snap = sim.defense.filter((d: any) => d.behavior?.constructor?.name === 'ZoneCoverage' && !isDeepZone(d.behavior.zone)).map((d: any) => ({ d, rel: t, settled: d.behavior.settledAt, sinking: d.behavior.sinkingToDepth, down: d.vel.x * dir, depth: (d.pos.x - sim.los) * dir, pos: { ...d.pos }, tags: [...d.tags], hist: hist.get(d) ?? [] })); } };
        try { sim.run(); } catch { continue; }
        if (!snap || !sim.ballPath?.length) continue;
        for (const s of snap) {
          const track = sim.ballPath.filter((p: any) => p.z <= s.d.profile.maxCatchHeight);
          if (!track.length || Math.min(...track.map((p: any) => Math.hypot(p.x - s.pos.x, p.y - s.pos.y))) > 8) continue;
          rows.push(s);
        }
      }
const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const drop = rows.filter((r) => r.down >= 1), not = rows.filter((r) => r.down < 1);
for (const [name, R] of [['dropping >=1 yd/s', drop], ['not dropping', not]] as const) {
  const set = R.filter((r: any) => r.settled >= 0), sink = set.filter((r: any) => r.sinking);
  console.log(`${name} n ${R.length}: settled ${set.length} (of them still sinking to depth ${sink.length}), not settled ${R.length - set.length} | settled at (s before release) ${q(set.map((r: any) => r.rel - r.settled))} | depth ${q(R.map((r: any) => r.depth))} yd | downfield ${q(R.map((r: any) => r.down))} yd/s`);
}

const sd = drop.filter((r) => r.settled >= 0 && !r.sinking);
const tg = new Map<string, number>(); for (const r of sd) for (const t of new Set<string>(r.tags)) tg.set(t, (tg.get(t) ?? 0) + 1);
console.log(`settled, not sinking, still dropping n ${sd.length}: downfield at the settle ${q(sd.map((r: any) => r.hist.find((h: any) => h.t >= r.settled - 1e-6)?.down ?? NaN))} -> at the release ${q(sd.map((r: any) => r.down))} yd/s | max downfield between ${q(sd.map((r: any) => Math.max(...r.hist.filter((h: any) => h.t >= r.settled - 1e-6).map((h: any) => h.down))))}`);
console.log('  tags at the release: ' + [...tg].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v}`).join(', '));
