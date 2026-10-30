/** Counter: per play, pullers' roles (at the snap), each crease read (t, selected lateral +pull side, its risk, best
 * pull-side candidate's risk), and where the carrier crossed. Summary: share crossing backside; for backside crossers,
 * first read that selected backside, and the risk margin. args: scheme seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
const [scheme, ...seeds] = process.argv.slice(2);
const rows: any[] = [];
for (const seed of seeds) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== scheme || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O'), by = sim.ballY;
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const roles = pullers.map((o: any) => o.slot + '/' + o.behavior.plan.pullRole).join(',');
  const pdir = Math.sign(pullers.reduce((s: number, o: any) => s + ((o.behavior.plan.pullPath?.at(-1)?.y ?? o.pos.y) - o.pos.y), 0)) || 1;
  const reads: any[] = [];
  runReadObservers.set(sim, (e: any) => {
    if (e.phase !== 'aim' || !e.selected) return;
    const lat = (y: number) => (y - by) * pdir;
    const pull = (e.candidates ?? []).filter((k: any) => lat(k.entry.y) > 0.3).sort((x: any, y: any) => x.risk - y.risk)[0];
    const sel = (e.candidates ?? []).find((k: any) => Math.abs(k.entry.x - e.selected.x) < 1e-6 && Math.abs(k.entry.y - e.selected.y) < 1e-6);
    reads.push({ t: e.t, sel: lat(e.selected.y), selRisk: sel?.risk, pullRisk: pull?.risk, pullLat: pull ? lat(pull.entry.y) : null });
  });
  let cross: number | null = null;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    const c = sim.carrier; if (!c || c === sim.qb) continue;
    if (cross === null && (c.pos.x - sim.los) * dir > 0) { cross = (c.pos.y - by) * pdir; break; }
  }
  const firstBack = reads.find(r => r.sel < -0.3);
  rows.push({ seed, pi, roles, cross, nReads: reads.length, firstRead: reads[0], firstBack });
}
for (const r of rows) {
  const f = (x: any) => x ? `t ${x.t.toFixed(2)} sel ${x.sel.toFixed(1)} risk ${x.selRisk?.toFixed(2)} | best pull-side ${x.pullLat?.toFixed(1)} risk ${x.pullRisk?.toFixed(2)}` : '-';
  console.log(`s${r.seed}#${r.pi} ${r.roles.padEnd(16)} crossed ${r.cross?.toFixed(1) ?? 'never'} | reads ${r.nReads} | first: ${f(r.firstRead)} | first backside: ${f(r.firstBack)}`);
}
const n = rows.length, crossed = rows.filter(r => r.cross !== null), back = crossed.filter(r => r.cross! < 0);
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
console.log(`plays ${n} | crossed ${crossed.length} | crossed backside ${back.length} (${(back.length / Math.max(1, crossed.length)).toFixed(2)}) | backside crossers with a backside read ${back.filter(r => r.firstBack).length}`);
const fb = rows.map(r => r.firstBack).filter(Boolean);
console.log(`first backside read: t ${med(fb.map((x: any) => x.t))} | chosen risk ${med(fb.map((x: any) => x.selRisk))} | best pull-side risk ${med(fb.map((x: any) => x.pullRisk))} | margin ${med(fb.map((x: any) => x.pullRisk - x.selRisk))}`);
const fr = rows.map(r => r.firstRead).filter(Boolean);
console.log(`first read: t ${med(fr.map((x: any) => x.t))} | selected lateral ${med(fr.map((x: any) => x.sel))} | share backside ${(fr.filter((x: any) => x.sel < -0.3).length / fr.length).toFixed(2)} | best pull-side risk ${med(fr.map((x: any) => x.pullRisk))}`);
