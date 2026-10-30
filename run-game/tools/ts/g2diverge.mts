/** Per-tick body state for one declared play. usage: node --import tsx g2diverge.mts set.bin ID out.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const p = (deserialize(readFileSync(process.argv[2])) as any[]).find(q => q.id === process.argv[3]);
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
const rows: any[] = [];
while (sim.phase === 'live' && sim.t < 6) {
  sim.tick();
  rows.push({ t: +sim.t.toFixed(2), a: sim.agents.map((a: any) => {
    const pl = a.behavior?.plan, c = pl?.combination;
    return [a.slot, +a.pos.x.toFixed(4), +a.pos.y.toFixed(4), +a.body.vel.x.toFixed(4), +a.body.vel.y.toFixed(4),
      pl ? `${pl.kind}:${pl.target?.slot ?? '-'}:${c ? (c.released ? 'rel' : 'held') : ''}:${(a.behavior as any).departureAccess?.kind ?? ''}` : ''];
  }), eng: sim.engagements.map((e: any) => `${e.blocker.slot}>${e.defender.slot}`).sort().join(' ') });
}
writeFileSync(process.argv[4], JSON.stringify(rows));
