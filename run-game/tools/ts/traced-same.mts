import { readFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [setFile, ...ids] = process.argv.slice(2);
const set = deserialize(readFileSync(setFile)) as any[];
for (const id of ids) {
  const p = set.find(q => q.id === id);
  const h = (trace: boolean) => { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
    if (trace) sim.recordCommands({ actor: { team: 'O', slot: 'RT' }, from: 0, to: 9 });
    const r = sim.run(); return createHash('sha256').update(JSON.stringify([r.yards, r.outcome, sim.events, sim.agents.map((a: any) => [a.pos, a.body.vel])])).digest('hex').slice(0, 16); };
  console.log(id, h(false), h(true));
}
