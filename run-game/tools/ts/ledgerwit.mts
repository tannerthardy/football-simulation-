import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { initialJobCensus } = await import(root + '/src/sim/responsibility-views.ts');
(PlaySim as any).recordedSingleStream = true;
const cases = JSON.parse(readFileSync(root + '/test/fixtures/responsibility-ledger-cases.json', 'utf8'));
for (const id of process.argv.slice(2)) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(cases.plays.find((p: any) => p.id === id).setup, 'base64')));
  const ledger = sim.recordResponsibility(); const res = sim.run();
  const d = ledger.data, slot = (i: number | null) => i === null ? null : d.actors[i]?.slot;
  const first = initialJobCensus(d)[0]?.firstCarrierContact;
  console.log(`== ${id} ${sim.offCall.run?.scheme} | first contact ${first?.t} ${JSON.stringify(first?.defenders.map(slot))} | carrier events ${d.play.carrierEvents.slice(0, 5).map((e: any) => `${e.t}:${slot(e.defender)}`).join(' ')}`);
  for (const c of d.changes.filter((c: any) => ['combination-release', 'threat-reread', 'combination-abandoned'].some(r => c.reason.startsWith(r))))
    console.log(`   ${c.t} ${slot(c.actor)} ${c.reason} ${slot(c.before.target)} -> ${slot(c.after.target)}`);
  const C = d.actors.findIndex((a: any) => a.slot === 'C');
  const loads = new Set<string>(); for (const r of d.rows.filter((r: any) => r.actor === C)) for (const h of r.hands) if (h.loaded) loads.add(`${slot(h.defender)}`);
  console.log(`   C loaded: ${[...loads].join(',')} | C targets DT_S after release: ${d.changes.some((c: any) => slot(c.actor) === 'C' && slot(c.after.target) === 'DT_S' && c.t > 1)}`);
}
