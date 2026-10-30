import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [seed, idx] = process.argv.slice(2).map(Number);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const r = sim.run();
const ev = sim.events.filter((e: any) => ['block_climb', 'carrier_contact', 'tackle_wrap', 'tackle'].includes(e.type)).slice(0, 14)
  .map((e: any) => `${e.t.toFixed(2)} ${e.type} ${sim.agents[e.a]?.slot ?? ''}${e.b != null ? '>' + sim.agents[e.b]?.slot : ''}`);
const backers = sim.defense.filter((d: any) => /^LB/.test(d.slot)).map((d: any) => `${d.slot}:${d.engagement ? 'blocked by ' + d.engagement.blocker.slot : 'free'}`);
console.log(sim.offCall.run?.scheme, 'yards', r?.yards ?? sim.result?.yards, '|', ev.join(' | '), '| end:', backers.join(' '));
