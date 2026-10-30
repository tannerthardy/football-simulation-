import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
for (const f of process.argv.slice(2)) {
  const set = deserialize(readFileSync(f)) as any[]; const dead: string[] = [];
  for (const p of set) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup))); const r = sim.run();
    if (!sim.events.some((e: any) => e.type === 'snap') && (r.outcome === 'timeout' || sim.events[0]?.type === 'penalty')) dead.push(`${p.id}:${r.outcome}/${sim.events[0]?.type}`); }
  console.log(f, set.length, 'dead-ball:', dead.join(' ') || 'none');
}
