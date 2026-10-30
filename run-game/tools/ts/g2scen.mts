import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deserialize } from 'node:v8';
const root = process.cwd();
const lab = await import(root + '/lab-app/engine.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const plays = deserialize(readFileSync(process.argv[2])) as any[];
mkdirSync('out/lab/scenarios', { recursive: true });
for (const id of process.argv.slice(3)) {
  const p = plays.find(q => q.id === id);
  const sc = { format: lab.SCENARIO_FORMAT, id: `g2-${id}`, name: `G2 ordinary ${id} ${p.concept} vs ${p.front} (normal game seed ${id.slice(1, 2)}, captured on develop b559fdc5)`,
    created: new Date().toISOString(), setup: lab.storeSetup(restoreSetup(Buffer.from(p.setup))), interventions: [], flags: {}, source: { kind: 'builder' } };
  writeFileSync(`out/lab/scenarios/g2-${id}.json`, JSON.stringify(sc));
  console.log('wrote', `out/lab/scenarios/g2-${id}.json`);
}
