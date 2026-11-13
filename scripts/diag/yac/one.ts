// Run one captured setup with frames recorded; print a compact per-frame digest as JSON.
// node --import tsx scripts/diag/yac/one.ts SETUPS.bin GAME INDEX OUT.json
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { Rng } from '../../../src/core/rng.js';
import { PlaySim, type PlaySetup } from '../../../src/sim/playsim.js';
import { CoverageScouting } from '../../../src/sim/qbmind.js';
import { ScoutingReport } from '../../../src/sim/recognition.js';
const [inp, g, i, out] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const s = (deserialize(readFileSync(inp)) as Array<{ game: number; index: number; setup: Buffer }>).find(x => x.game === g && x.index === i)!;
const setup = deserialize(s.setup) as PlaySetup;
if (typeof setup.seed !== 'number') setup.seed = Object.assign(new Rng(0), setup.seed);
if (setup.scouting) setup.scouting = Object.assign(new ScoutingReport(), setup.scouting);
if (setup.coverageScouting) setup.coverageScouting = Object.assign(new CoverageScouting(), setup.coverageScouting);
setup.record = true; setup.recordEvery = 1;
const sim = new PlaySim(setup);
const r = sim.run();
writeFileSync(out, JSON.stringify({ slots: sim.agents.map(a => `${a.team}:${a.slot}`), frames: r.frames, events: r.events.map(e => [e.t, e.type, e.a, e.b, e.note]),
  call: sim.offCall.label, cov: sim.defCall.label, stats: { yac: r.stats.yac, yards: r.yards } }));
