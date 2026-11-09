// Diagnostic, observation only. Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json
// (scripts/diag/edge/capture-runs.ts): node --import tsx scripts/diag/push-contest/engaged-lean.mts
// Engaged DL in a run rep with an OL, 0.2-1.0 s after engagement start: requested vs achieved speed into the
// backfield (+), split by the controller branch inferred from the request (attack press vs hold-depth).
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const OL = ['LT','LG','C','RG','RT']; const S: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone', 'insideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); const dm = new Map<any, any>();
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph === 'defender-movement') dm.set(e.defender, data); });
  const tick = sim.tick.bind(sim);
  sim.tick = () => { dm.clear(); tick();
    for (const d of sim.defense) { const e = d.engagement; if (!e || e.type !== 'run' || !/^(DE|DT|NT)/.test(d.slot) || !OL.includes(e.blocker.slot)) continue;
      const age = sim.t - e.start; if (age < 0.2 || age > 1.0) continue; const m = dm.get(d); if (!m) continue;
      const req = -up * m.command.vel.x, ach = -up * d.vel.x;
      const branch = m.workOff ? 'working off' : m.declared ? 'declared runner' : m.squeeze ? 'squeeze' : req >= 1.4 ? 'attack press' : 'hold depth';
      S.push({ branch, req, ach, flat: d.tags.has('work-across') }); } };
  sim.run();
}
const mean = (a: number[]) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : '—';
console.log(`engaged DL ticks ${S.length}: into-backfield req ${mean(S.map(s => s.req))} ach ${mean(S.map(s => s.ach))}`);
const by: Record<string, any[]> = {}; for (const s of S) (by[s.branch] ??= []).push(s);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k}: ${(100 * v.length / S.length).toFixed(0)}% | req ${mean(v.map(s => s.req))} ach ${mean(v.map(s => s.ach))}`);
