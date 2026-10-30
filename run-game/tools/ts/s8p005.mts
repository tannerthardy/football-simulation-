/** S8-P005 from the responsibility-ledger fixture: first carrier contact, carrier events, and a per-tick dump of
 * bodies (pos/vel), engagements and offensive plans to out/s8p005-<tag>.json. args: tag */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { initialJobCensus } = await import(root + '/src/sim/responsibility-views.ts');
const { runContactObservers } = await import(root + '/src/sim/engagement.ts');
(PlaySim as any).recordedSingleStream = true;
const cases = JSON.parse(readFileSync(root + '/test/fixtures/responsibility-ledger-cases.json', 'utf8'));
const setup = Buffer.from(cases.plays.find((p: any) => p.id === 'S8-P005').setup, 'base64');
const sim: any = new PlaySim(restoreSetup(setup));
const ledger = sim.recordResponsibility();
const ticks: any[] = []; const moves: any[] = [];
runContactObservers?.set?.(sim, (e: any, phase: string, data: any) => {
  if (phase === 'defender-movement' && data.supportRunner) moves.push({ t: +sim.t.toFixed(4), d: e.defender.slot, b: e.blocker.slot, workSide: data.workSide, workOff: data.workOff, exitAim: !!data.exitAim });
});
const tick0 = sim.tick.bind(sim);
sim.tick = () => { tick0(); ticks.push({ t: +sim.t.toFixed(4), a: sim.agents.map((a: any) => [a.slot, +a.pos.x.toFixed(4), +a.pos.y.toFixed(4), +a.vel.x.toFixed(4), +a.vel.y.toFixed(4), a.engagement ? `${a.engagement.blocker.slot}>${a.engagement.defender.slot}` : '', a.behavior?.plan ? `${a.behavior.plan.kind}:${a.behavior.plan.target?.slot ?? ''}` : a.behavior?.kind]) }); };
const result = sim.run();
const census = initialJobCensus(ledger.data);
const slot = (i: number | null) => i === null ? null : ledger.data.actors[i].slot;
const first = census[0]?.firstCarrierContact;
console.log('first contact', first?.t, first?.defenders.map(slot), 'yards', result.yards ?? result.gain);
console.log('carrier events', ledger.data.play.carrierEvents.slice(0, 6).map((e: any) => `${e.t} ${slot(e.defender)} ${e.kind ?? ''}`).join(' | '));
console.log('support-runner work-off steps', moves.length, moves.slice(0, 4));
mkdirSync('out', { recursive: true });
writeFileSync(`out/s8p005-${process.argv[2]}.json`, JSON.stringify({ ticks, moves }));
