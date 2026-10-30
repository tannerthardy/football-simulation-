/** IZ doubles with a climb backer: released before the carrier reaches the backer? For each one that has not, the
 * read stage each member hits per read (joined path) or the unjoined state, from 0.5 s to the carrier's arrival. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const st: Record<string, number> = {}; let combos = 0, early = 0, late = 0, never = 0; const relT: number[] = [];
let cur: Map<any, any> | null = null;
(globalThis as any).__JC = (obs: any, k: string) => { const c = cur?.get(obs); if (c) c.stages[k] = (c.stages[k] ?? 0) + 1; };
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/^(insideZone|splitZone)$/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O'); const by = new Map<any, any>(); cur = new Map();
  for (const o of sim.offense) { const b: any = o.behavior; const cb = b?.plan?.combination; if (cb?.backer && !by.has(cb)) by.set(cb, { cb, stages: {} as Record<string, number>, unjoined: {} as Record<string, number>, rel: -1, arrive: -1 }); }
  for (const r of by.values()) for (const m of r.cb.members) cur.set(m, r);
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    const c = sim.carrier;
    for (const r of by.values()) {
      if (r.rel < 0 && r.cb.released) r.rel = sim.t;
      if (r.arrive < 0 && c && c !== sim.qb && (c.pos.x - r.cb.backer.pos.x) * dir > -1) r.arrive = sim.t;
      if (r.rel < 0 && r.arrive < 0 && sim.t >= .5) {
        const e = r.cb.defender.engagement, joined = e && r.cb.members.every((m: any) => m.engagement === e);
        if (!joined) { const k = !e ? 'defender unengaged' : r.cb.members.filter((m: any) => m.engagement === e).length === 1 ? 'one member on him' : 'members elsewhere'; r.unjoined[k] = (r.unjoined[k] ?? 0) + 1; }
      }
    }
  }
  for (const r of by.values()) {
    combos++;
    const arrive = r.arrive < 0 ? 9 : r.arrive;
    if (r.rel >= 0 && r.rel <= arrive) { early++; relT.push(r.rel); continue; }
    if (r.rel >= 0) late++; else never++;
    const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
    const tot = Object.values(r.unjoined).reduce((a: number, b: any) => a + b, 0) as number;
    const k = `unjoined ${tot} ticks (${top(r.unjoined)}) | joined reads: ${top(r.stages)}`;
    st[top(r.stages) + (tot > 5 ? ' / mostly unjoined: ' + top(r.unjoined) : '')] = (st[top(r.stages) + (tot > 5 ? ' / mostly unjoined: ' + top(r.unjoined) : '')] ?? 0) + 1;
  }
}
relT.sort((a, b) => a - b);
console.log(`IZ doubles with a backer: ${combos}; released before carrier reaches the backer ${early} (median ${relT[relT.length >> 1]?.toFixed(2)} s), after ${late}, never ${never}`);
for (const [k, v] of Object.entries(st).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
