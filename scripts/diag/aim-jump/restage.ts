// Matched restage for pursuit changes (TKL-2, Stage 4). Replays the saved snaps
// from matched-restage.ts (out/matched-restage/seed<N>.json) k times each: shift 0
// is the saved RNG, shifts 1..k-1 fork it (`rng.fork('shift:j')`), so every arm sees
// the same snaps under the same k dice. Each replay writes its play in the common
// format (sim-export.ts commonPlay) for scripts/mechanics/pursuit_aim.py, plus a row
// of native outcomes. Run once per arm, in that arm's checkout.
//   node --import tsx scripts/diag/aim-jump/restage.ts ARM K SEED... [--out out/aim/restage]
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import type { PlayLog } from '../../../src/game/game.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { commonPlay } from '../../mechanics/sim-export.js';
import { restoreSetup } from '../saved-play.js';
const args = process.argv.slice(2);
const oi = args.indexOf('--out'), outDir = oi >= 0 ? args.splice(oi, 2)[1] : 'out/aim/restage';
const [arm, k, ...seeds] = args;
mkdirSync(outDir, { recursive: true });
const gz = createGzip(), done = new Promise<void>(r => gz.pipe(createWriteStream(`${outDir}/${arm}.jsonl.gz`)).on('finish', () => r()));
const rows: unknown[] = [];
for (const seed of seeds) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8')) as Array<{ pass: boolean; call: string; setup: string }>;
  plays.forEach((p, i) => {
    for (let j = 0; j < Number(k); j++) {
      const setup = restoreSetup(Buffer.from(p.setup, 'base64'));
      if (j > 0) setup.seed = (typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed).fork(`shift:${j}`);
      const sim = new PlaySim({ ...setup, record: true });
      const r = sim.run();
      const id = `S${seed}-${i}-k${j}`;
      const log = { index: i, kind: p.pass ? 'pass' : 'run', yards: r.yards, nullified: false,
        replay: { frames: r.frames!, events: r.events, los: setup.los, firstDownX: setup.firstDownX, flip: false,
          players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position })) } } as unknown as PlayLog;
      const common = commonPlay(log, id);
      if (common) gz.write(JSON.stringify(common) + '\n');
      const n = (t: string) => r.events.filter(e => e.type === t).length;
      rows.push({ id, snap: `${seed}:${i}`, shift: j, pass: p.pass, yards: +r.yards.toFixed(2), outcome: r.outcome,
        missed: n('missed_tackle'), broken: n('broken_tackle'), td: n('touchdown') > 0 });
    }
  });
  process.stderr.write(`seed ${seed}: ${rows.length} replays\n`);
}
gz.end(); await done;
writeFileSync(`${outDir}/${arm}.rows.json`, JSON.stringify(rows));
