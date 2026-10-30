import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const set = deserialize(readFileSync(process.argv[2])) as any[];
const rows = JSON.parse(readFileSync(process.argv[3], 'utf8'));
let agree = 0, n = 0; const off: string[] = [];
for (const r of rows) {
  if (r.released < 0 || !r.climber) continue; n++;
  const p = set.find(q => q.id === r.id);
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const tr = sim.recordCommands({ actor: { team: 'O', slot: r.climber }, from: 0, to: 8 });
  sim.run();
  const ch = tr.steps.flatMap((s: any) => s.blockingChanges ?? []).filter((c: any) => c.reason === 'combination-release');
  const t = ch[0]?.t;
  if (t !== undefined && Math.abs(t - r.released) <= 0.0501) agree++; else off.push(`${r.id} ${r.climber} hook ${t} vs ${r.released} ${JSON.stringify(ch[0] ?? null).slice(0, 160)}`);
}
console.log(`hook agrees on ${agree}/${n}`); for (const o of off) console.log(' ', o);
