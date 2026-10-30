import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const h = createHash('sha256'); let n = 0; const t0 = Date.now();
for (const seed of [7, 9]) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).slice(0, 70)) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const r = sim.run(); n++;
  h.update(JSON.stringify({ y: r.yards, o: r.outcome, ev: r.events.map((e: any) => [e.t, e.type, e.a, e.b]), end: sim.agents.map((a: any) => [a.pos.x.toFixed(6), a.pos.y.toFixed(6)]) }));
}
console.log(`plays ${n} hash ${h.digest('hex').slice(0, 16)} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
