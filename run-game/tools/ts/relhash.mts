import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8'; import { createHash } from 'node:crypto';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const set = deserialize(readFileSync(process.argv[2])) as any[];
if (process.argv[3] === 'log') (globalThis as any).__rel = [];
const h = createHash('sha256');
for (const p of set) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup))); const r = sim.run(); h.update(JSON.stringify([r.yards, sim.events.length, sim.agents.map((a: any) => a.pos)])); }
console.log(process.argv[3] ?? 'plain', h.digest('hex').slice(0, 16));
