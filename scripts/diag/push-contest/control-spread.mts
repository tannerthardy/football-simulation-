// Diagnostic, observation only. Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json
// (scripts/diag/edge/capture-runs.ts): node --import tsx scripts/diag/push-contest/control-spread.mts
// Solo DL-OL run engagements lasting >= 1.8 s: mean hand-fight control over [0.3, 1.8] s after the start
// (+ = blocker controls), its spread, and how DL displacement over that window depends on it and on leg ratio.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const OL = ['LT','LG','C','RG','RT']; const R: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone', 'insideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); const reps = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const d of sim.defense) { const e = d.engagement; if (!e || e.type !== 'run' || !/^(DE|DT|NT)/.test(d.slot) || !OL.includes(e.blocker.slot)) continue;
      let r = reps.get(e); if (!r) { r = { solo: true, c: [], x0: null, x1: null, lr: supportParams(e.blocker.profile).pushForce / supportParams(d.profile).pushForce }; reps.set(e, r); }
      if (e.helpers.length) r.solo = false; const age = sim.t - e.start, depth = (d.pos.x - sim.los) * up;
      if (age >= 0.3 && r.x0 === null) r.x0 = depth;
      if (age >= 0.3 && age <= 1.8) { r.c.push(e.control); r.x1 = depth; r.age = age; } } };
  sim.run();
  for (const r of reps.values()) if (r.solo && r.x0 !== null && r.age >= 1.75) R.push({ ctrl: r.c.reduce((s: number, x: number) => s + x, 0) / r.c.length, back: r.x1 - r.x0, lr: r.lr });
}
const q = (a: number[], f: number) => { const s = [...a].sort((p, r) => p - r); return s[Math.floor(f * (s.length - 1))].toFixed(2); };
const corr = (a: number[], b: number[]) => { const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return (sab / Math.sqrt(saa * sbb)).toFixed(2); };
console.log(`solo reps lasting 1.8 s: n ${R.length} | mean control p10/p50/p90 ${q(R.map(r => r.ctrl), .1)} / ${q(R.map(r => r.ctrl), .5)} / ${q(R.map(r => r.ctrl), .9)}`);
console.log(`DL displacement over 1.5 s (+ = driven back) p10/p50/p90 ${q(R.map(r => r.back), .1)} / ${q(R.map(r => r.back), .5)} / ${q(R.map(r => r.back), .9)} | driven back >= 0.5: ${(100 * R.filter(r => r.back >= 0.5).length / R.length).toFixed(0)}%`);
console.log(`corr(control, displacement) ${corr(R.map(r => r.ctrl), R.map(r => r.back))} | corr(leg ratio, displacement) ${corr(R.map(r => r.lr), R.map(r => r.back))}`);
for (const [lo, hi] of [[-1, -0.2], [-0.2, 0.2], [0.2, 0.5], [0.5, 1.01]]) { const b = R.filter(r => r.ctrl >= lo && r.ctrl < hi); if (b.length) console.log(`  control ${lo}..${hi}: n ${b.length}, driven back ${(100 * b.filter(r => r.back >= 0.5).length / b.length).toFixed(0)}%, median ${q(b.map(r => r.back), .5)}`); }
