// Replay the matched run restage under the current environment; one JSON line per play.
//   npm run -s ref -- node --import tsx scripts/diag/ref-replay.mts <arm> [seed...]
// Reads out/matched-restage/seed{N}-run.json (scripts/diag/edge/capture-runs.ts N --label N-run),
// writes out/ref/<arm>.jsonl. Compare arms with scripts/diag/ref-compare.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [arm, ...seedArgs] = process.argv.slice(2);
const seeds = seedArgs.length ? seedArgs.map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const rows: string[] = [];
for (const seed of seeds) {
  let i = 0;
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    const id = `s${seed}-${i++}`, st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    let row: any = { id, scheme: st.offCall?.run?.scheme ?? 'other', qb: st.offCall?.formation?.qb ?? '?' };
    try {
      const sim: any = new PlaySim(st), r = sim.run();
      const ho = sim.events.find((e: any) => e.type === 'handoff' || e.type === 'pitch');
      row = { ...row, yards: +r.yards.toFixed(2), outcome: r.outcome, handoff: ho?.t ?? null, fumble: sim.events.some((e: any) => e.type === 'fumble'),
        broken: sim.events.filter((e: any) => e.type === 'broken_tackle').length,
        brokenGrab: sim.events.filter((e: any) => e.type === 'broken_tackle' && e.note === 'engaged grab slipped').length, missed: sim.events.filter((e: any) => e.type === 'missed_tackle').length };
    } catch (e: any) { row.error = String(e?.message ?? e).slice(0, 200); }
    rows.push(JSON.stringify(row));
  }
}
mkdirSync('out/ref', { recursive: true });
writeFileSync(`out/ref/${arm}-${seeds.join('_')}.jsonl`, rows.join('\n') + '\n');
console.log(arm, seeds.join(','), rows.length);
