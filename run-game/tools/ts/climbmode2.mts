/** Released zone climbers (plan.departure set or plan climb after a combination) on run-only captures: per tick, the
 * access mode (direct / detour / unvalidated-brake / unvalidated-original / no departure read), the final intent and
 * achieved motion (upfield = attack direction), and whether spacing rewrote the command. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const fam = process.argv[2]; const seeds = process.argv.slice(3);
const acc2: Record<string, Record<string, number>> = {};
const acc: Record<string, { n: number; req: number; reqUp: number; vel: number; velUp: number; toward: number }> = {};
let climbers = 0;
for (const seed of seeds) {
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
    if (p.pass) continue;
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const sch = sim.offCall.run?.scheme ?? '';
    if (fam === 'DRAW' ? !/^(draw|qbDraw)$/.test(sch) : fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : !/insideZone|splitZone/.test(sch)) continue;
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
    const dir = sim.attackDir('O'); const seen = new Set<any>(); const ledger = sim.recordResponsibility();
    while (sim.phase === 'live' && sim.t < 4) {
      const pre = new Map(sim.offense.map((o: any) => [o, { ...o.vel }]));
      sim.tick();
      const c = sim.carrier;
      for (const o of sim.offense) {
        const b: any = o.behavior;
        if (!(b instanceof RunBlocker) || b.plan.kind !== 'climb' || o.engagement || !b.plan.target) continue;
        if (!b.plan.departure && !b.plan.combination) continue; // released combination members only
        if (c && c !== sim.qb && (c.pos.x - b.plan.target.pos.x) * dir > -1) continue; // carrier already there
        if (!seen.has(o)) { seen.add(o); climbers++; }
        const a = b.departureAccess?.kind, mode = !b.plan.departure ? 'climb (departure ended)' : a === 'unvalidated'
          ? (b.departureAccess.command.vel.x === 0 && b.departureAccess.command.vel.y === 0 ? 'unvalidated: brake' : 'unvalidated: original') : a ?? 'no access read';
        const iv = sim.intents[o.idx].vel, v = o.vel, t = b.plan.target;
        const tx = t.pos.x - o.pos.x, ty = t.pos.y - o.pos.y, tl = Math.hypot(tx, ty) || 1;
        const r = (acc[mode] ??= { n: 0, req: 0, reqUp: 0, vel: 0, velUp: 0, toward: 0 });
        const row = [...ledger.data.rows].reverse().find((q: any) => q.actor === o.idx);
        const tag = (k: string) => { const q = (acc2[mode] ??= {}); q[k] = (q[k] ?? 0) + 1; };
        if (row) { if (row.command?.rewrittenBy?.length) tag('rewritten by ' + row.command.rewrittenBy.join('>')); if (row.torso.some((k: any) => k.impulse > 1e-6)) tag('torso contact'); if (row.hands.length) tag('hand joint present'); if (row.hands.some((h: any) => h.loaded)) tag('hands loaded'); }
        r.n++; r.req += Math.hypot(iv.x, iv.y); r.reqUp += iv.x * dir; r.vel += Math.hypot(v.x, v.y); r.velUp += v.x * dir; r.toward += (v.x * tx + v.y * ty) / tl;
      }
    }
  }
}
const N = Object.values(acc).reduce((s, r) => s + r.n, 0);
console.log(`${fam}: released climbers ${climbers}, ticks ${N}`);
for (const [k, r] of Object.entries(acc).sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${k}: ` + Object.entries(acc2[k] ?? {}).map(([t, v]) => `${t} ${(100 * v / r.n).toFixed(0)}%`).join('; ')),
  console.log(`  ${k}: ${(100 * r.n / N).toFixed(0)}% of ticks | request ${(r.req / r.n).toFixed(2)} (up ${(r.reqUp / r.n).toFixed(2)}) | achieved ${(r.vel / r.n).toFixed(2)} (up ${(r.velUp / r.n).toFixed(2)}, toward backer ${(r.toward / r.n).toFixed(2)})`);
