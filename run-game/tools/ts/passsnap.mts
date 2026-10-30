import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const p = (JSON.parse(readFileSync('out/matched-restage/seed13-run.json', 'utf8')) as any[])[77];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
console.log('call', sim.offCall.kind, sim.offCall.run?.scheme, sim.offCall.label, 'isPass', sim.isPass);
const combos = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker).map((o: any) => `${o.slot}:${o.behavior.plan.kind}${o.behavior.plan.combination ? '*' : ''}`);
console.log('run blockers', combos.join(' '));
let firstRel: any = null;
while (sim.phase === 'live' && sim.t < 8) { sim.tick(); const ev = sim.events?.find?.((e: any) => e.type === 'block_climb'); if (ev && !firstRel) firstRel = ev; }
const r = sim.result ?? sim.stats;
console.log('yards', sim.yards ?? r?.yards, 'events', (sim.events ?? []).filter((e: any) => /climb|throw|catch|tackle/.test(e.type)).slice(0, 8).map((e: any) => `${e.t?.toFixed?.(2)} ${e.type} ${e.note ?? ''}`).join(' | '));
