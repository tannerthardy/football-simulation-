/**
 * Matched snaps in the common play format: replay the snaps saved by
 * `matched-restage.ts capture <seed>` under this process's settings and write
 * them as common plays, so the mechanics operators (scripts/mechanics/metrics.py,
 * scripts/diag/depth/*.py) measure the same snaps arm by arm.
 *
 *   <ARM ENV> node --import tsx scripts/diag/matched-common.ts <arm> <seed>...
 *
 * Writes out/matched-restage/common-<arm>.jsonl.gz. Settings are read at load,
 * so each arm runs in its own process.
 */
import { createWriteStream, readFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import type { PlayLog } from '../../src/game/game.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { commonPlay } from '../mechanics/sim-export.js';
import { restoreSetup } from './saved-play.js';

const [arm, ...seeds] = process.argv.slice(2);
if (!arm || !seeds.length) { console.error('usage: matched-common.ts <arm> <seed>...'); process.exit(1); }
const gz = createGzip(); gz.pipe(createWriteStream(`out/matched-restage/common-${arm}.jsonl.gz`));
let n = 0;
for (const seed of seeds) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8')) as Array<{ pass: boolean; setup: string }>;
  plays.forEach((p, i) => {
    const sim = new PlaySim({ ...restoreSetup(Buffer.from(p.setup, 'base64')), record: true });
    const r = sim.run(), pass = sim.offCall.kind === 'pass';
    const log = { kind: pass ? 'pass' : 'run', yards: r.yards,
      plan: { concept: pass ? sim.offCall.pass!.id : sim.offCall.run!.scheme, coverage: sim.defCall.coverage.id,
        front: sim.defCall.front.id, defPersonnel: sim.defCall.personnel, formation: sim.offCall.formation.id },
      replay: { frames: r.frames!, los: sim.los, events: r.events,
        players: sim.agents.map(a => ({ team: a.team, pos: a.player.position })) } } as unknown as PlayLog;
    const c = commonPlay(log, `s${seed}-${i}`);
    if (c) { gz.write(JSON.stringify(c) + '\n'); n++; }
  });
}
gz.end(() => console.log(`${arm}: ${n} plays -> out/matched-restage/common-${arm}.jsonl.gz`));
