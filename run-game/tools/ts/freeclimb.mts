// From a worktree root: free climbers (plan climb, target a box backer, no engagement, no departure, 0.5+ yd past LOS,
// 1.2+ yd from every DL) on zone runs, shift 0: requested vs achieved speed, toward-backer components, by distance to backer.
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const bins: Record<string, { n: number; req: number; ach: number; reqTo: number; achTo: number; bv: number; posture: number }> = {};
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(root + `/../fs-bk/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/Zone|zone/.test(sim.offCall.run?.scheme ?? '')) continue;
  const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    for (const o of sim.offense) {
      const b: any = o.behavior;
      if (!(b instanceof RunBlocker) || b.plan.kind !== 'climb' || o.engagement || b.plan.departure || !b.target || b.target.team !== 'D') continue;
      if ((o.pos.x - sim.los) * dir < .5) continue;
      if (sim.defense.some((d: any) => d !== b.target && Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < 1.2)) continue;
      const t = b.target, dx = t.pos.x - o.pos.x, dy = t.pos.y - o.pos.y, dist = Math.hypot(dx, dy);
      if (dist > 6) continue;
      const k = dist < 1.5 ? '<1.5' : dist < 3 ? '1.5-3' : '3-6';
      const iv = sim.intents[o.idx], r = (bins[k] ??= { n: 0, req: 0, ach: 0, reqTo: 0, achTo: 0, bv: 0, posture: 0 });
      r.n++; r.req += Math.hypot(iv.vel.x, iv.vel.y); r.ach += Math.hypot(o.vel.x, o.vel.y);
      r.reqTo += (iv.vel.x * dx + iv.vel.y * dy) / dist; r.achTo += (o.vel.x * dx + o.vel.y * dy) / dist;
      r.bv += Math.hypot(t.vel.x, t.vel.y); r.posture += iv.posture ?? 1;
    }
  }
}
for (const [k, r] of Object.entries(bins)) console.log(`dist ${k}: ticks ${r.n} | request ${(r.req / r.n).toFixed(2)} (toward ${(r.reqTo / r.n).toFixed(2)}) | achieved ${(r.ach / r.n).toFixed(2)} (toward ${(r.achTo / r.n).toFixed(2)}) | backer speed ${(r.bv / r.n).toFixed(2)} | posture ${(r.posture / r.n).toFixed(2)}`);
