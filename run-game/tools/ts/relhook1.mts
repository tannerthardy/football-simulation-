import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const p = (deserialize(readFileSync(process.argv[2])) as any[]).find(q => q.id === process.argv[3]);
for (const slot of process.argv.slice(4)) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const tr = sim.recordCommands({ actor: { team: 'O', slot }, from: 0, to: 8 }); sim.run();
  console.log(slot, JSON.stringify(tr.steps.flatMap((s: any) => s.blockingChanges ?? []).map((c: any) => ({ t: c.t, reason: c.reason, from: c.previous, to: c.current }))).slice(0, 700));
}
