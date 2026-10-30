/** Draw doubles after the show: per member-tick in 1.0-2.5 s (before the carrier crosses LOS), which stage holds the double. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const acc: Record<string, number> = {}; let combos = 0, released = 0, relT: number[] = [];
const tag = (k: string) => { acc[k] = (acc[k] ?? 0) + 1; };
const jc: Record<string, number> = {}; let on = false;
(globalThis as any).__JC = (k: string) => { if (on) jc[k] = (jc[k] ?? 0) + 1; };
(globalThis as any).__KC = (k: string) => { if (on) jc['  keeper: ' + k] = (jc['  keeper: ' + k] ?? 0) + 1; };
for (const seed of process.argv.slice(2)) {
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
    if (p.pass) continue;
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    if (!/^(draw|qbDraw)$/.test(sim.offCall.run?.scheme ?? '')) continue;
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
    const dir = sim.attackDir('O'); const seen = new Set<any>(); let crossT = 9;
    while (sim.phase === 'live' && sim.t < 2.5) {
      on = sim.t >= 1.0 && /^(draw|qbDraw)$/.test(sim.offCall.run?.scheme ?? ''); sim.tick();
      if (sim.t < 1.0) continue;
      const c = sim.carrier; if (c && c !== sim.qb && (c.pos.x - sim.los) * dir > 0) { crossT = sim.t; break; }
      for (const o of sim.offense) {
        const b: any = o.behavior;
        if (!(b instanceof RunBlocker) || !b.plan.combination) continue;
        const cb = b.plan.combination; if (!seen.has(cb)) { seen.add(cb); combos++; }
        if (cb.released) { if (!cb._n) { cb._n = 1; released++; relT.push(sim.t); } tag('released'); continue; }
        if (!cb.backer) { tag('no backer'); continue; }
        if (cb.backer.isDown(sim.t)) { tag('backer down'); continue; }
        if (!cb.members.every((m: any) => m.behavior instanceof RunBlocker && m.behavior.plan.combination === cb && m.behavior.plan.target === cb.defender)) { tag('member off the double (target/plan)'); continue; }
        const e = cb.defender.engagement;
        if (!e) { tag(o.engagement ? 'defender unengaged, member engaged elsewhere' : 'defender unengaged'); continue; }
        if (e.type !== 'run') { tag('defender engagement type ' + e.type); continue; }
        if (!cb.members.includes(e.blocker)) { tag('defender engaged by non-member'); continue; }
        const joined = cb.members.every((m: any) => m.engagement === e);
        if (!joined) { tag(o.engagement === e ? 'only this member on him' : o.engagement ? 'this member on someone else' : 'partner on him, this member free'); continue; }
        tag('joined');
      }
    }
    for (const e of sim.events) if (e.type === 'block_climb' && e.t <= crossT) { released++; relT.push(e.t); }
  }
}
const N = Object.values(acc).reduce((s, v) => s + v, 0);
console.log(`draw combos ${combos}, released before cross/2.5 s ${released}, median t ${relT.sort()[relT.length >> 1]?.toFixed(2)}`);
for (const [k, v] of Object.entries(acc).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${(100 * v / N).toFixed(1)}%`);

console.log('joined reads:', JSON.stringify(jc, null, 1));
