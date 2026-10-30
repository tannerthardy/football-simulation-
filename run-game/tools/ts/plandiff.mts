import { readFileSync } from 'node:fs';
const root = process.argv[2], rows = process.argv[3];
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const caps: Record<string, any[]> = {};
for (const line of readFileSync(rows, 'utf8').trim().split('\n').slice(1)) {
  const [seed, index] = line.split(',');
  caps[seed] ??= JSON.parse(readFileSync(`${root}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  const sim = new PlaySim(restoreSetup(Buffer.from(caps[seed][+index].setup, 'base64')));
  const t = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'stalk')
    .map((a: any) => `${a.slot}>${a.behavior.plan.target?.slot ?? '-'}`).sort().join(' ');
  console.log(`${seed},${index},${t}`);
}
