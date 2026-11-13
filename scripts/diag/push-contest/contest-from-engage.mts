// Diagnostic, observation only. Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json
// (scripts/diag/edge/capture-runs.ts): node --import tsx scripts/diag/push-contest/contest-from-engage.mts
// Solo DL-OL run engagements: DL position at engagement start + 0.3 s, then driven back >= 0.5 yd within 1.5 s
// (or by the end of the engagement, if the rep lasts). Only reps engaged at least 0.3 s.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const R: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone', 'insideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); const reps = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const d of sim.defense) { const e = d.engagement; if (!e || !/^(DE|DT|NT)/.test(d.slot) || !['LT','LG','C','RG','RT'].includes(e.blocker.slot)) continue;
      let r = reps.get(e); if (!r) { r = { start: e.start, startT: sim.t, solo: true, x: null, min: Infinity, end: null }; reps.set(e, r); }
      if (e.helpers.length) r.solo = false;
      const depth = (d.pos.x - sim.los) * up; // + = defense side (driven back)
      if (r.x === null && sim.t - e.start >= 0.3) { r.x = depth; r.t1 = sim.t; }
      if (r.x !== null && sim.t - r.t1 <= 1.5) { r.maxBack = Math.max(r.maxBack ?? -Infinity, depth - r.x); r.last = sim.t; } } };
  sim.run();
  for (const r of reps.values()) if (r.x !== null) R.push({ solo: r.solo, back: r.maxBack, dur: r.last - r.t1, startT: r.startT });
}
const pct = (a: any[], f: (x: any) => boolean) => (100 * a.filter(f).length / Math.max(1, a.length)).toFixed(0);
for (const solo of [true, false]) { const w = R.filter(r => r.solo === solo), full = w.filter(r => r.dur >= 1.45);
  console.log(`${solo ? 'solo' : 'helped'}: n ${w.length} | engagement starts (median) ${[...w.map(r => r.startT)].sort((a, b) => a - b)[Math.floor(w.length / 2)]?.toFixed(2)} s | driven back >= 0.5 yd within 1.5 s of start+0.3: ${pct(w, r => r.back >= 0.5)}% | reps lasting the full 1.5 s: n ${full.length}, driven back ${pct(full, r => r.back >= 0.5)}%`); }
