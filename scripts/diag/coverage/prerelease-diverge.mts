// Paired staged plays, FLIGHT_BREAK=0 vs on: the first tick before the release (ball not yet in the air) at which any
// defender's position differs between the arms, which defender, and what FLIGHT_BREAK had him doing (flightBreakOf's call
// site). A pre-release difference can only come from a break on an arm cue (a pump or an early read). Read-only.
//   node --import tsx scripts/diag/coverage/prerelease-diverge.mts [coverages] [seeds]
const W = process.cwd();
const COVS = (process.argv[2] ?? 'cover6,cover6_rev,cover8_trix').split(',');
const seeds = Number(process.argv[3] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { flightBreakOf } = await import(`${W}/src/sim/behaviors/defense.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const run = (flag: string, setup: any) => {
  process.env.FLIGHT_BREAK = flag;
  const sim: any = new PlaySim(setup), frames: any[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.ball?.kind !== 'air' && !(frames as any).released) frames.push({ t: sim.t, pos: sim.defense.map((d: any) => [d.pos.x, d.pos.y]),
    fb: sim.defense.map((d: any) => { const f = flightBreakOf(d); return f && sim.t - f.t < 0.06 ? f.via : null; }), pump: sim.events?.some?.((e: any) => e.type === 'pump') ?? false });
    else (frames as any).released = true; };
  let res: any; try { res = sim.run(); } catch { return null; }
  return { frames, slots: sim.defense.map((d: any) => d.slot), res };
};
const tally = new Map<string, number>(); let plays = 0, diverged = 0;
for (const concept of concepts) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  const setup = () => nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip });
  let A: any, B: any; try { A = run('0', setup()); B = run('1', setup()); } catch { continue; }
  if (!A || !B) continue;
  plays++;
  const n = Math.min(A.frames.length, B.frames.length);
  for (let k = 0; k < n; k++) {
    const d = A.frames[k].pos.findIndex((p: number[], i: number) => Math.hypot(p[0] - B.frames[k].pos[i][0], p[1] - B.frames[k].pos[i][1]) > 1e-6);
    if (d < 0) continue;
    diverged++;
    const via = B.frames[Math.max(0, k - 1)].fb[d] ?? B.frames[k].fb[d] ?? 'none';
    const key = `${via} | ${A.slots[d]} | pump ${B.frames[k].pump}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
    if (diverged <= 12) console.log(`${concept} ${coverage} s${seed}${flip ? 'f' : ''}: t ${A.frames[k].t.toFixed(2)} ${A.slots[d]} via ${via} pump ${B.frames[k].pump} | ${A.res.outcome} ${A.res.yards} -> ${B.res.outcome} ${B.res.yards}`);
    break;
  }
}
delete process.env.FLIGHT_BREAK;
console.log(JSON.stringify({ plays, divergedBeforeRelease: diverged, by: [...tally].sort((a, b) => b[1] - a[1]).slice(0, 12) }));
