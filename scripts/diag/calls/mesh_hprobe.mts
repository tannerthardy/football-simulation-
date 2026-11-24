const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
for (const [cov] of [['cover1'], ['cover3']] as const) for (const seed of [1, 3]) {
  const setup: any = nativeTraceSetup({ concept: 'mesh', coverage: cov, seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  const sim: any = new PlaySim(setup); sim.throwBall = () => undefined;
  const H = sim.slot(sim.offAlign.numbering.W2); const nb = sim.defense.find((d: any) => d.slot === 'NB');
  let snap: number | null = null; const rows: string[] = []; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.t;
    if (snap !== null) { const t = sim.t - snap; if (Math.abs(t * 4 - Math.round(t * 4)) < 0.05 && t >= 0.75 && t <= 3.01) {
      const b = H.behavior; const tgt = b?.target ?? b?.aim ?? null;
      rows.push(`${t.toFixed(2)} H x${(H.pos.x - sim.los).toFixed(1)} y${H.pos.y.toFixed(1)} | NB dx${(nb.pos.x - H.pos.x).toFixed(1)} dy${(nb.pos.y - H.pos.y).toFixed(1)} | leg ${b?.legIdx ?? b?.leg ?? '?'} craft ${b?.craft?.mode ?? b?.craftMode ?? ''} ${tgt ? `aim x${(tgt.x - sim.los).toFixed(1)}` : ''}`); } }
    if (sim.t > 4) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  const ev = (sim.events as any[]).filter((e) => (e.a === H.idx || e.b === H.idx) && e.t - (snap ?? 0) < 3).map((e) => `${e.type}@${(e.t - (snap ?? 0)).toFixed(2)}`);
  console.log(`== ${cov} seed ${seed}: events ${[...new Set(ev)].join(', ')}`); console.log([...new Set(rows)].join('\n'));
}
