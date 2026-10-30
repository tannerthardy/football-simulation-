import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const p = (deserialize(readFileSync(process.argv[2])) as any[]).find(q => q.id === 'S8-P004');
for (const trace of [false, true]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const tr = trace ? sim.recordCommands({ actor: { team: 'O', slot: 'LG' }, from: 0, to: 8 }) : null;
  const r = sim.run();
  console.log('trace', trace, r.outcome, r.yards.toFixed(2), 'steps', tr?.steps.length, 'events', sim.events.slice(0, 4).map((e: any) => e.type).join(','),
    'LG plan kinds', tr ? [...new Set(tr.steps.map((s: any) => s.start.behavior.job))].join(',') : '');
}
