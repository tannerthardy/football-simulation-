/** Head-on first touches (defender center within 1.0 yd; at t-0.1: cos > .7 and closing > 3): the carrier's commanded
 * speed (from the carrier command observer) and achieved speed at t-0.3, t-0.1, t, t+0.2, by band. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
const acc: Record<string, number[]> = {}; const add = (k: string, v: number) => (acc[k] ??= []).push(v);
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O'); let cmd = NaN;
  runReadObservers.set(sim, (e: any) => { if (e.phase === 'command') cmd = Math.hypot(e.vel.x, e.vel.y); });
  const hist: any[] = []; let touch: any = null;
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    const c = sim.carrier; if (!c || c === sim.qb) { cmd = NaN; continue; }
    hist.push({ t: sim.t, cmd, v: c.speed, pos: { ...c.pos }, vel: { ...c.vel }, d: sim.defense.map((d: any) => ({ pos: { ...d.pos }, vel: { ...d.vel } })) });
    cmd = NaN;
    if (!touch && sim.t > 0.3) { const j = sim.defense.findIndex((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1.0); if (j >= 0) touch = { i: hist.length - 1, j, x: (c.pos.x - sim.los) * dir }; }
    if (touch && hist.length > touch.i + 5) break;
  }
  if (!touch || touch.i < 7) continue;
  const g = hist[touch.i - 2], D = g.d[touch.j]; const dx = D.pos.x - g.pos.x, dy = D.pos.y - g.pos.y, L = Math.hypot(dx, dy), sp = Math.hypot(g.vel.x, g.vel.y) || 1e-6;
  const cos = (g.vel.x * dx + g.vel.y * dy) / (sp * L), closing = ((g.vel.x - D.vel.x) * dx + (g.vel.y - D.vel.y) * dy) / L;
  if (!(cos > .7 && closing > 3)) continue;
  const band = touch.x < 0 ? 'behind' : touch.x < 3 ? '0-3' : '3+';
  for (const [lab, k] of [['-0.3', -6], ['-0.1', -2], ['0', 0], ['+0.2', 4]] as const) { const h = hist[touch.i + k]; if (!h) continue; if (Number.isFinite(h.cmd)) add(`${band} cmd ${lab}`, h.cmd); add(`${band} v ${lab}`, h.v); }
  add(`${band} n`, 1);
}
const med = (v?: number[]) => v?.length ? v.slice().sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
for (const b of ['behind', '0-3', '3+']) console.log(`${b}: n ${acc[`${b} n`]?.length ?? 0} | commanded speed -0.3/-0.1/0/+0.2 s: ${['-0.3', '-0.1', '0', '+0.2'].map((l) => med(acc[`${b} cmd ${l}`])).join(' / ')} | achieved: ${['-0.3', '-0.1', '0', '+0.2'].map((l) => med(acc[`${b} v ${l}`])).join(' / ')}`);
