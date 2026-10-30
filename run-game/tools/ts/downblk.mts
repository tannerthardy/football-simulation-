/** Gap-run down blocks: per down blocker, snap lateral distance to his man, first contact time, the man's depth
 * (+ into the backfield) at 0.6 s and at contact, and whether he crossed the blocker's face (ended on the far side of
 * the blocker from where he started) before contact; grouped by snap distance band. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const rows: any[] = [];
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/^(power|counter|trap)$/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O');
  const downs = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'down' && o.behavior.plan.target && /^(DE|DT|NT)/.test(o.behavior.plan.target.slot))
    .map((o: any) => { const d = o.behavior.plan.target; return { o, d, lat0: d.pos.y - o.pos.y, contact: -1, dep06: 0, depC: 0, crossed: false, maxDep: -9 }; });
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    for (const r of downs) {
      const dep = (sim.los - r.d.pos.x) * dir; r.maxDep = Math.max(r.maxDep, dep);
      if (Math.abs(sim.t - 0.6) < 1e-6) r.dep06 = dep;
      if (r.contact < 0 && r.o.engagement?.defender === r.d) { r.contact = sim.t; r.depC = dep; r.crossed = Math.sign(r.d.pos.y - r.o.pos.y) !== Math.sign(r.lat0) && Math.abs(r.d.pos.y - r.o.pos.y) > .3; }
    }
  }
  for (const r of downs) rows.push({ sch: sim.offCall.run.scheme, slot: r.o.slot, lat: Math.abs(r.lat0), contact: r.contact, dep06: r.dep06, depC: r.depC, crossed: r.crossed, maxDep: r.maxDep });
}
const med = (v: number[]) => v.length ? v.slice().sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
for (const [lo, hi, name] of [[0, 1, '<1 yd'], [1, 2, '1-2 yd'], [2, 3, '2-3 yd'], [3, 9, '3+ yd']] as const) {
  const g = rows.filter((r) => r.lat >= lo && r.lat < hi); if (!g.length) continue;
  const hit = g.filter((r) => r.contact > 0);
  console.log(`${name}: n ${g.length} | ever engaged ${(hit.length / g.length).toFixed(2)} | contact at ${med(hit.map((r) => r.contact))} s | man's depth at 0.6 s ${med(g.map((r) => r.dep06))} | at contact ${med(hit.map((r) => r.depC))} | max depth by 3 s ${med(g.map((r) => r.maxDep))} | >1 yd deep before 3 s ${(g.filter((r) => r.maxDep > 1).length / g.length).toFixed(2)} | crossed face before contact ${(hit.filter((r) => r.crossed).length / Math.max(1, hit.length)).toFixed(2)} | slots ${[...new Set(g.map((r) => r.slot))].join(',')}`);
}
