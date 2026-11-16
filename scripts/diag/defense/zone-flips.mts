// Commit-rule check on two zone choices (and ZONE_HOLD's gates: lag to a real switch, look-off pull), with exact pictures (Integration, from Tools' near-field attribution #777):
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
const lagEyes: number[] = [], lagBand: number[] = []; let lookoffs = 0, pulled = 0, lookTotal = 0;
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
        let truthEyes: any = null; const pendEyes = new Map<any, { x: any; t: number }>(); const pendBand = new Map<any, { r: any; t: number }>();
        const eyesHist: { t: number; v: any }[] = []; let thrown = false;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          if (!thrown && sim.ball.kind === 'air') {
            thrown = true; const tgt = sim.ball.target; const back = eyesHist.find((h) => h.t >= sim.t - 0.35);
            if (back?.v && back.v !== tgt) { lookoffs++; for (const d of sim.defense) if (d.behavior?.constructor?.name === 'ZoneCoverage' && !d.behavior.deep) { lookTotal++; if (seenQbEyes(d, sim) === back.v) pulled++; } }
          }
          if (sim.ball.kind !== 'held' || sim.ball.carrier !== sim.qb || sim.t < 0.5) return;
          eyesHist.push({ t: sim.t, v: sim.qbEyes }); while (eyesHist.length && sim.t - eyesHist[0].t > 0.5) eyesHist.shift();
          if (sim.qbEyes !== truthEyes) { truthEyes = sim.qbEyes; if (truthEyes) for (const d of sim.defense) if (d.behavior?.constructor?.name === 'ZoneCoverage') pendEyes.set(d, { x: truthEyes, t: sim.t }); }
          for (const d of sim.defense) {
            const b = d.behavior; if (b?.constructor?.name !== 'ZoneCoverage') continue;
            let r = tr.get(d); if (!r) { r = { tg: mk(), eyes: mk(), job: b.deep ? 'deep' : /^(hook|curl|flat)/.test(b.zone) ? b.zone.replace(/_(s|w|mid)$/, '') : 'other' }; tr.set(d, r); }
            step(r.tg, b.target ?? null, sim.t, sim.dt);
            const se = seenQbEyes(d, sim); step(r.eyes, se, sim.t, sim.dt);
            const pe = pendEyes.get(d); if (pe) { if (pe.x !== truthEyes) pendEyes.delete(d); else if (se === pe.x) { lagEyes.push(sim.t - pe.t); pendEyes.delete(d); } else if (sim.t - pe.t > 1.0) pendEyes.delete(d); }
            const tg = b.target; const pb = pendBand.get(d);
            if (pb) { if (tg !== pb.r) { lagBand.push(sim.t - pb.t); pendBand.delete(d); } else if (sim.t - pb.t > 1.0) pendBand.delete(d); }
            else if (tg && b.band) { const fy = tg.pos.y + tg.vel.y * 0.7; const [lo, hi] = b.band; if (fy < lo || fy > hi) pendBand.set(d, { r: tg, t: sim.t }); }
          }
        };
        sim.run();
        for (const r of tr.values()) for (const [k, t] of [[`${r.job} target`, r.tg], [`${r.job} QB eyes`, r.eyes]] as const) {
          const T = (tot[k] ??= mk()); T.time += t.time; T.changes += t.changes; T.reversals += t.reversals;
        }
      }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : '-'; };
console.log(`lag to a real switch: QB eyes truly on a new receiver -> his read follows, n ${lagEyes.length}, p50 ${q(lagEyes, .5)} p90 ${q(lagEyes, .9)} s | his target's pictured future leaves his band -> he drops it, n ${lagBand.length}, p50 ${q(lagBand, .5)} p90 ${q(lagBand, .9)} s`);
console.log(`look-offs (eyes 0.3 s before the throw on another receiver): ${lookoffs} plays; underneath droppers reading the decoy at the throw ${pulled}/${lookTotal} (${(pulled / Math.max(1, lookTotal)).toFixed(2)})`);
for (const [k, T] of Object.entries(tot).sort()) console.log(`${k.padEnd(20)} time ${T.time.toFixed(0)} s | changes ${(T.changes / T.time).toFixed(3)}/s | reversed within 0.3 s ${(T.reversals / T.time).toFixed(3)}/s (${(T.reversals / Math.max(1, T.changes)).toFixed(2)} of changes)`);
