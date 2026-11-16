// SIGHT_PURE on a saved play set: one JSON line per play (id, outcome, yards, a hash of the final positions), for joining arms. usage: [SIGHT_PURE=1] node --import tsx scripts/diag/effective-mass/sight-pure-compare.mts FILE [max] > out.jsonl
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const [file, max] = [process.argv[2]!, Number(process.argv[3] ?? 1e9)];
const tag = file.replace(/.*\//, '').replace('.json', '');
for (const [i, p] of (JSON.parse(readFileSync(file, 'utf8')) as any[]).entries()) {
  if (i >= max) break;
  try { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const r = sim.run();
    console.log(JSON.stringify({ id: `${tag}-${i}`, outcome: r.outcome, yards: +r.yards.toFixed(3), pass: !!r.pass, hash: createHash('md5').update(JSON.stringify(sim.agents.map((a: any) => [+a.pos.x.toFixed(3), +a.pos.y.toFixed(3)]))).digest('hex').slice(0, 8) }));
  } catch (e: any) { console.log(JSON.stringify({ id: `${tag}-${i}`, error: String(e?.message ?? e).slice(0, 80) })); }
}
