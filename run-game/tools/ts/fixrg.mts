import { readFileSync } from 'node:fs'; import { gunzipSync } from 'node:zlib';
for (const k of ['OL_SPLITS','OL_STAGGER','FRONT_ALIGN','FRONT_MENU','PAD_LEVERAGE','DL_ANCHOR','SNAP_REACT','LB_LANDMARK','ARM_PRESS']) process.env[k] = '0';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const fixture = JSON.parse(gunzipSync(readFileSync(root + '/test/fixtures/combo-strike-access.json.gz')).toString());
const sim: any = new PlaySim(structuredClone(fixture.setup));
const rg = sim.slot('RG'), rt = sim.slot('RT'), lb = sim.slot('LB_M'), dt = sim.slot('DT_S');
let last = '';
while (sim.phase === 'live' && sim.t < 3.2) {
  sim.tick();
  const p = rg.behavior.plan;
  const s = `${p.kind}->${p.target?.slot ?? '-'}${p.departure ? ' dep' : ''} eng ${rg.engagement ? rg.engagement.defender.slot : '-'} | RT eng ${rt.engagement ? rt.engagement.defender.slot : '-'}`;
  if (s !== last || Math.abs(sim.t*4 - Math.round(sim.t*4)) < 1e-6) { console.log(sim.t.toFixed(2), s, `RG-LB ${Math.hypot(rg.pos.x - lb.pos.x, rg.pos.y - lb.pos.y).toFixed(2)} DT x ${(dt.pos.x - sim.los).toFixed(2)}`); last = s; }
}
console.log('first carrier contact', sim.events.find((e: any) => e.type === 'carrier_contact')?.t, sim.agents[sim.events.find((e: any) => e.type === 'carrier_contact')?.b]?.slot);
