/** Run plays: unengaged run blockers with a target within 3 yd (their own picture is not used; truth positions).
 * Per tick: request speed toward the target before spacing vs after; share of ticks cut by > 1 yd/s, by blocker kind
 * and by the teammate responsible (engaged or not, OL/TE/back). args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const acc: Record<string, number> = {}; const add = (k: string, v = 1) => acc[k] = (acc[k] ?? 0) + v;
let sim: any; let cuts = new Map<any, Array<{ b: any; cut: number }>>();
(globalThis as any).__SPC = (a: any, b: any, cut: number) => { (cuts.get(a) ?? cuts.set(a, []).get(a)!).push({ b, cut }); };
(globalThis as any).__SPCEND = (a: any, before: any, after: any) => {
  if (!sim || a.team !== 'O' || !(a.behavior instanceof RunBlocker) || a.engagement) return;
  const plan = a.behavior.plan, tg = plan?.target; if (!tg) return;
  const dx = tg.pos.x - a.pos.x, dy = tg.pos.y - a.pos.y, d = Math.hypot(dx, dy); if (d > 3 || d < 1e-6) return;
  const ux = dx / d, uy = dy / d, b0 = before.vel.x * ux + before.vel.y * uy, b1 = after.vel.x * ux + after.vel.y * uy;
  if (b0 < 1) return; // not asking to go at him
  const kind = plan.kind === 'pull' ? 'pull/' + plan.pullRole : plan.kind;
  add(kind + ' ticks');
  if (b0 - b1 > 1) {
    add(kind + ' cut>1');
    const cs = cuts.get(a) ?? []; const top = cs.sort((x, y) => y.cut - x.cut)[0];
    if (top) { const eng = sim.engagements.some((e: any) => e.blocker === top.b || e.helpers?.includes(top.b)); add(`  by ${eng ? 'engaged' : 'free'} ${/^(LT|LG|C|RG|RT)$/.test(top.b.slot) ? 'OL' : top.b.slot}`); }
    else add('  by (route/gather, no radial cut)');
  }
};
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!sim.offCall.run || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  while (sim.phase === 'live' && sim.t < 4) { cuts = new Map(); sim.tick(); }
}
for (const k of Object.keys(acc).filter(k => k.endsWith(' ticks')).sort()) { const b = k.replace(' ticks', ''); console.log(`${b.padEnd(14)} ticks ${acc[k]} | cut >1 yd/s toward his man ${((acc[b + ' cut>1'] ?? 0) / acc[k]).toFixed(2)}`); }
for (const k of Object.keys(acc).filter(k => k.startsWith('  by')).sort((x, y) => acc[y] - acc[x])) console.log(k, acc[k]);
