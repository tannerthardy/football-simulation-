// usage: [FLAGS] COVS=cover3 node --import tsx scripts/diag/yac/deep-flight2.mts SEEDS out.json   (frames from the snap through the end of the play, with the carrier)
// Deep defenders from the snap to the catch on staged zone completions: per frame (every 3 ticks) each defender's
// position, controller, zone deep flag, landmark, his match (turnedWith), the facing label, and whether he has
// observed the flight; the release (throwAt) and catch times and the catch point.
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3);
const outPath = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { hasObservedFlight } = await import(`${W}/src/sim/possession-read.ts`);
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(',');
const rows: any[] = [];
const r2 = (v: number) => Math.round(v * 100) / 100;
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
    for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      const dir = sim.attackDir(sim.offense[0].team); const los = sim.los;
      const fr: any[] = []; let k = 0, C: any = null, tc = -1, cp: any = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) { C = sim.ball.carrier; tc = sim.t; cp = { x: r2((C.pos.x - los) * dir), y: r2(C.pos.y) }; }
        if (k++ % 3 !== 0) return;
        const H = sim.ball.kind === 'held' ? sim.ball.carrier : null;
        fr.push({ t: r2(sim.t), c: H && H.team === sim.offense[0].team && H !== sim.qb ? { x: r2((H.pos.x - los) * dir), y: r2(H.pos.y) } : null, d: sim.defense.map((d: any) => { const b: any = d.behavior;
          return { i: d.idx, x: r2((d.pos.x - los) * dir), y: r2(d.pos.y), cls: b?.constructor?.name ?? '-', deep: b?.deep ?? null,
            lm: b?.landmark ? { x: r2((b.landmark.x - los) * dir), y: r2(b.landmark.y) } : null, match: b?.turnedWith?.slot ?? null,
            seen: hasObservedFlight(d), slot: d.slot }; }) });
      };
      sim.run();
      if (!C || !sim.stats.completed) continue;
      rows.push({ concept, coverage, formation, seed, flip, snapAt: sim.snapAt ?? 0, throwAt: r2(sim.throwAt), catchAt: r2(tc), cp, target: C.slot, fr });
    }
writeFileSync(outPath, JSON.stringify(rows));
console.log(`rows ${rows.length}`);
