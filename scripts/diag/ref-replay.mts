// Replay the matched run restage under the current environment; one JSON line per play.
//   npm run -s ref -- node --import tsx scripts/diag/ref-replay.mts <arm> [seed...]
// Reads out/matched-restage/seed{N}-run.json (scripts/diag/edge/capture-runs.ts N --label N-run),
// writes out/ref/<arm>.jsonl. Compare arms with scripts/diag/ref-compare.py.
// REF_PLACEBO=<slot>:<sign> (ref:report --placebo N): after the first tick, nudge that body (C, LG, RG, RT, LT, or LB
// for the first linebacker) 1e-3 yd sideways. No mechanism changes; the arm measures how far divergence alone moves
// paired yards on this set (the noise floor of a paired delta).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [arm, ...seedArgs] = process.argv.slice(2);
const seeds = seedArgs.length ? seedArgs.map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const rows: string[] = [];
const placebo = process.env.REF_PLACEBO ? (() => { const [slot, sign] = process.env.REF_PLACEBO!.split(':'); return { slot, d: (sign === '-1' ? -1 : 1) * 1e-3 }; })() : null;
const nudge = (sim: any) => {
  if (!placebo) return;
  const tick0 = sim.tick.bind(sim); let done = false;
  sim.tick = () => { tick0(); if (done) return; done = true;
    const a = sim.agents.find((x: any) => placebo.slot === 'LB' ? x.team !== sim.offense[0].team && /LB/.test(x.slot) : x.slot === placebo.slot);
    if (a) a.body.pos.y += placebo.d; };
};
for (const seed of seeds) {
  let i = 0;
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    const id = `s${seed}-${i++}`, st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    let row: any = { id, scheme: st.offCall?.run?.scheme ?? 'other', qb: st.offCall?.formation?.qb ?? '?' };
    try {
      const sim: any = new PlaySim(st); nudge(sim); const r = sim.run();
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
