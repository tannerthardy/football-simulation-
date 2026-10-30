import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
PlaySim.recordedSingleStream = false;
const fx = JSON.parse(readFileSync(root + '/test/fixtures/overtake-climb.json', 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(fx.setup, 'base64')));
const ledger = sim.recordResponsibility();
const lg = sim.slot('LG'), c = sim.slot('C'), dt = sim.slot('DT_W');
while (sim.phase === 'live' && sim.t < 1.3) {
  sim.tick();
  if (sim.t >= .55) { const e = dt.engagement; console.log(sim.t.toFixed(2), 'eng', e ? `${e.blocker.slot}+[${e.helpers.map((h: any) => h.slot)}]` : '-', 'LG eng', lg.engagement?.defender?.slot ?? '-', 'LG plan', lg.behavior.plan.kind, lg.behavior.plan.target?.slot, 'tags', [...lg.tags].filter((t: string) => /combo|climb|overtake/.test(t)).join(','), 'dtvy', (dt.vel.y).toFixed(2)); }
}
for (const ch of ledger.data.changes.filter((x: any) => x.actor === lg.idx || x.actor === c.idx)) console.log('change', sim.agents[ch.actor].slot, ch.t, ch.reason, ch.after.kind);
for (const ev of sim.events.filter((e: any) => /climb|block/.test(e.type) && e.t < 1.3)) console.log('ev', ev.t, ev.type, sim.agents[ev.a]?.slot, ev.b != null ? sim.agents[ev.b]?.slot : '', ev.note ?? '');
