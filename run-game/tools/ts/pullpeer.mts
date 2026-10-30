import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
let reqs = new Map<any, any>();
(globalThis as any).__SPCLOG = (a: any, req: any, post: any) => reqs.set(a, { req: { ...req.vel }, post: { ...post.vel } });
const C: Record<string, number> = {}; const add = (k: string) => C[k] = (C[k] ?? 0) + 1;
let ticks = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!['counter', 'power'].includes(sim.offCall.run?.scheme) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  while (sim.phase === 'live' && sim.t < 1.6) {
    reqs = new Map(); sim.tick();
    for (const o of pullers) {
      const pl = (o.behavior as any)?.plan; if (!pl || pl.kind !== 'pull') continue;
      const r = reqs.get(o); if (!r) continue; ticks++;
      const deeper = (-r.post.x + r.req.x) * dir;
      if (deeper < .5) continue;
      const near = sim.agents.filter((q: any) => q !== o).map((q: any) => ({ q, d: Math.hypot(q.pos.x - o.pos.x, q.pos.y - o.pos.y) })).sort((a: any, b: any) => a.d - b.d)[0];
      const q = near.q; const role = q.team === 'D' ? 'DEF ' + q.slot.replace(/_.*/, '') : q === sim.qb ? 'QB' : q.slot === 'RB' ? 'RB' : (q.behavior as any)?.plan?.kind === 'pull' ? 'other puller' : 'OL/TE ' + ((q.behavior as any)?.plan?.kind ?? '');
      add(`spacing pushes puller deeper >0.5 yd/s, nearest: ${role} (${near.d < 1.2 ? '<1.2' : '1.2+'} yd)`);
    }
  }
}
console.log('puller ticks', ticks); for (const [k, v] of Object.entries(C).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k);
