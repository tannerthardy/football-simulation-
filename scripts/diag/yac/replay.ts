// Replay captured PlaySetups on this checkout's engine; per-play pass metrics as JSONL.
// node --import tsx scripts/diag/yac/replay.ts SETUPS.bin OUT.jsonl (run in each checkout to compare engines on identical setups)
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { Rng } from '../../../src/core/rng.js';
import { PlaySim, type PlaySetup } from '../../../src/sim/playsim.js';
import { CoverageScouting } from '../../../src/sim/qbmind.js';
import { ScoutingReport } from '../../../src/sim/recognition.js';
const [inp, out] = [process.argv[2], process.argv[3]];
const saved = deserialize(readFileSync(inp)) as Array<{ game: number; index: number; setup: Buffer }>;
const rows: string[] = [];
for (const s of saved) {
  const setup = deserialize(s.setup) as PlaySetup;
  if (typeof setup.seed !== 'number') setup.seed = Object.assign(new Rng(0), setup.seed);
  if (setup.scouting) setup.scouting = Object.assign(new ScoutingReport(), setup.scouting);
  if (setup.coverageScouting) setup.coverageScouting = Object.assign(new CoverageScouting(), setup.coverageScouting);
  let r;
  try { const sim = new PlaySim(setup); r = sim.run();
    const ev = r.events;
    const catchE = ev.find(e => e.type === 'catch');
    const contact = catchE ? ev.find(e => e.type === 'carrier_contact' && e.t >= catchE.t) : undefined;
    const st = r.stats;
    const after = (types: string[]) => catchE ? ev.filter(e => types.includes(e.type) && e.t >= catchE.t).length : 0;
    // First contact's defender: did he make the tackle?
    const firstD = contact?.b;
    const tackler = ev.filter(e => e.type === 'tackle' || e.type === 'tackle_wrap').at(-1)?.a;
    rows.push(JSON.stringify({ key: `${s.game}:${s.index}`, comp: !!st.completed, yac: st.yac ?? null, sep: st.separation ?? null,
      air: st.completedAirYards ?? st.airYards ?? null, yards: (r as { yards?: number }).yards ?? null, sack: ev.some(e => e.type === 'sack'),
      int: ev.some(e => e.type === 'interception'), outcome: (r as { outcome?: string }).outcome ?? null,
      catchT: catchE?.t ?? null, contactT: contact ? +(contact.t - catchE!.t).toFixed(2) : null, contactNote: contact?.note ?? null,
      firstTackled: firstD !== undefined && tackler === firstD, missed: after(['missed_tackle']), broken: after(['broken_tackle']),
      td: ev.some(e => e.type === 'touchdown'), dur: +r.duration.toFixed(2), evN: ev.length }));
  } catch (err) { rows.push(JSON.stringify({ key: `${s.game}:${s.index}`, error: String(err).slice(0, 120) })); }
}
writeFileSync(out, rows.join('\n') + '\n');
process.stderr.write(`${rows.length} plays -> ${out}\n`);
