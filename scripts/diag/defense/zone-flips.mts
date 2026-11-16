// Commit-rule check on two zone choices, with exact pictures (Integration, from Tools' near-field attribution #777):
// (1) the zone dropper's target (ZoneCoverage.target, set from the threat set each tick) and (2) whom he reads the
// quarterback's eyes on (seenQbEyes). Staged zone calls, every pass concept but screens; for each zone defender while
// the ball is held: changes per second and reversals (a change back to the value he had within 0.3 s before).
//   node --import tsx scripts/diag/defense/zone-flips.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { seenQbEyes } = await import(`${W}/src/sim/behaviors/defense.ts`);
type Track = { last: any; hist: { t: number; v: any }[]; changes: number; reversals: number; time: number };
const mk = (): Track => ({ last: undefined, hist: [], changes: 0, reversals: 0, time: 0 });
const tot: Record<string, Track> = {};
const step = (tr: Track, v: any, t: number, dt: number) => {
  tr.time += dt;
  if (tr.last === undefined) { tr.last = v; tr.hist.push({ t, v }); return; }
  if (v !== tr.last) {
    tr.changes++;
    if (tr.hist.some((h) => h.v === v && t - h.t <= 0.3 + 1e-9 && h.v !== tr.last)) tr.reversals++;
    tr.last = v;
  }
  tr.hist.push({ t, v }); while (tr.hist.length && t - tr.hist[0].t > 0.35) tr.hist.shift();
};
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const tr = new Map<any, { tg: Track; eyes: Track; job: string }>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          if (sim.ball.kind !== 'held' || sim.ball.carrier !== sim.qb || sim.t < 0.5) return;
          for (const d of sim.defense) {
            const b = d.behavior; if (b?.constructor?.name !== 'ZoneCoverage') continue;
            let r = tr.get(d); if (!r) { r = { tg: mk(), eyes: mk(), job: b.deep ? 'deep' : /^(hook|curl|flat)/.test(b.zone) ? b.zone.replace(/_(s|w|mid)$/, '') : 'other' }; tr.set(d, r); }
            step(r.tg, b.target ?? null, sim.t, sim.dt);
            step(r.eyes, seenQbEyes(d, sim), sim.t, sim.dt);
          }
        };
        sim.run();
        for (const r of tr.values()) for (const [k, t] of [[`${r.job} target`, r.tg], [`${r.job} QB eyes`, r.eyes]] as const) {
          const T = (tot[k] ??= mk()); T.time += t.time; T.changes += t.changes; T.reversals += t.reversals;
        }
      }
for (const [k, T] of Object.entries(tot).sort()) console.log(`${k.padEnd(20)} time ${T.time.toFixed(0)} s | changes ${(T.changes / T.time).toFixed(3)}/s | reversed within 0.3 s ${(T.reversals / T.time).toFixed(3)}/s (${(T.reversals / Math.max(1, T.changes)).toFixed(2)} of changes)`);
