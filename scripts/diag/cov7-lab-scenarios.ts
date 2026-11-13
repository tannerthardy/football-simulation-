/** Writes the four COV-7 arms (#271 fixture) as Play Lab scenarios, so each
 * can be replayed and probed with `npm run lab:replay`. Lab switches are
 * global, so the support arms set PASS_FIRST=0 for every defender, not only
 * CB_S; the expected results recorded here come from that global run.
 * `cov7-abandonment.ts` (per-corner switch) stays the authority.
 *
 * Usage: node --import tsx scripts/diag/cov7-lab-scenarios.ts [out-dir] [--until seconds] [--defaults]
 * By default the scenes pin the fixture test's EDGE_CONTAIN=0 SEAL_HOLD=0;
 * `--defaults` records today's switches instead. */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abandonmentSetup, BLOCK_LOOK_UNTIL } from './cov7-abandonment.js';
import { bytesHash, captureSetup, restoreSetup } from './saved-play.js';
import { PlaySim } from '../../src/sim/playsim.js';

const PINNED = { EDGE_CONTAIN: '0', SEAL_HOLD: '0' };

/** Engine switches are read when the engine loads, so each arm's expected
 * result is measured in a fresh process with that arm's switches. */
function measure(file: string, flags: Record<string, string>) {
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--measure', file],
    { env: { ...process.env, ...flags }, encoding: 'utf8', maxBuffer: 1 << 26 })) as { outcome: string; yards: number; events: number };
}

function main() {
  assert.equal(process.version, 'v22.23.3');
  const m = process.argv.indexOf('--measure');
  if (m >= 0) {
    const result = new PlaySim(restoreSetup(readFileSync(process.argv[m + 1]))).run();
    console.log(JSON.stringify({ outcome: result.outcome, yards: result.yards, events: result.events.length }));
    return;
  }
  const args = process.argv.slice(2), u = args.indexOf('--until');
  const until = u >= 0 ? Number(args.splice(u, 2)[1]) : BLOCK_LOOK_UNTIL;
  const d = args.indexOf('--defaults'), base = d >= 0 ? (args.splice(d, 1), {}) : PINNED;
  const out = args[0] ?? 'out/lab/scenarios';
  mkdirSync(out, { recursive: true });
  for (const kind of ['run', 'deception'] as const) {
    const bytes = captureSetup(abandonmentSetup(kind, until)), setupFile = `${out}/cov7-${kind}-until${until}.setup.bin`;
    writeFileSync(setupFile, bytes);
    for (const arm of ['man', 'support'] as const) {
      const flags: Record<string, string> = arm === 'support' ? { ...base, PASS_FIRST: '0' } : { ...base };
      const result = measure(setupFile, flags);
      const id = `cov7-${kind}-${arm}${until === BLOCK_LOOK_UNTIL ? '' : `-until${until}`}`;
      writeFileSync(`${out}/${id}.json`, JSON.stringify({ format: 'play-lab-scenario-v1', id,
        name: `COV-7 ${kind === 'run' ? 'Toss' : 'PA Shot'} · ${arm === 'man' ? 'retain man (default)' : 'support (global PASS_FIRST=0)'}`
          + (until === BLOCK_LOOK_UNTIL ? '' : ` · look until ${until}s`),
        created: new Date().toISOString(),
        setup: { encoding: 'v8-base64', sha256: bytesHash(bytes), bytes: bytes.toString('base64') },
        interventions: [], flags,
        source: { kind: 'saved-play', playId: id, identity: null,
          text: `COV-7 fixture (scripts/diag/cov7-abandonment.ts), ${kind}; CB_S marks Z with alley D/-1; Z block look until ${until}s.`
            + (arm === 'support' ? ' Global PASS_FIRST=0 stands in for the per-corner switch.' : ''),
          original: result } }, null, 1));
      console.log(id, result.outcome, Number(result.yards.toFixed(2)));
    }
  }
}

main();
