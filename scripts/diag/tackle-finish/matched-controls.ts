/** Matched native tackle exposure: six preserved constructors, original RNG
 * plus four named forks. Run this identical operator on base and candidate.
 * No game population or NFL estimate is implied. All output stays in out/.
 * node --import tsx scripts/diag/tackle-finish/matched-controls.ts
 */
import { strict as assert } from 'node:assert';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Rng } from '../../../src/core/rng.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { bytesHash, captureSetup, executionIdentity, restoreSetup } from '../saved-play.js';

const fixture = readFileSync('test/fixtures/responsibility-ledger-cases.json');
const cases = JSON.parse(fixture.toString()).plays;
const ids = ['S9-P062', 'R7-P075', 'M9-P000', 'S9-P027', 'R7-P083', 'M25-P021'];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output = 'out/tackle-finish/matched';
mkdirSync(output, { recursive: true });
PlaySim.recordedSingleStream = true;
const started = performance.now(), all = [];
for (const id of ids) for (let shift = 0; shift <= 4; shift++) {
  const bytes = Buffer.from(cases.find((p: { id: string }) => p.id === id).setup, 'base64');
  const setup = restoreSetup(bytes);
  const fork = shift ? `g10-contact-finish:${shift}` : null;
  if (fork) setup.seed = (setup.seed instanceof Rng ? setup.seed : new Rng(setup.seed)).fork(fork);
  const replayConstructorSha256 = bytesHash(captureSetup(setup));
  const initialRng = JSON.stringify(setup.seed);
  const sim = new PlaySim(setup), rows: unknown[] = [];
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    const c = sim.carrier;
    const preHash = hash({ t: sim.t, bodies: sim.agents.map(a => a.body), intents,
      rng: sim.rng, streams: [...(sim as any).streams], mindRng: sim.agents.map(a => (a.mind as any).rng),
      joints: sim.world.joints.map(({ a, b, ...j }) => ({ ...j,
        a: sim.agents.find(x => x.body === a)?.idx, b: sim.agents.find(x => x.body === b)?.idx })) });
    const before = c ? { slot: c.slot, pos: { ...c.pos }, vel: { ...c.vel }, support: structuredClone(c.body.support) } : null;
    const report = step(intents, dt);
    assert(Number.isFinite(report.work.residual) && Math.abs(report.work.residual) < 1e-8, 'work ledger');
    const grips = sim.world.joints.filter(j => j.kind === 'grasp').map(({ a, b, ...j }) => ({ ...j,
      a: sim.agents.find(x => x.body === a)?.idx, b: sim.agents.find(x => x.body === b)?.idx }));
    rows.push({ t: sim.t, endpoint: sim.world.time, preHash, before,
      after: c ? { pos: { ...c.pos }, vel: { ...c.vel }, support: structuredClone(c.body.support) } : null,
      grips, contacts: report.contacts, falls: report.falls, downs: report.downs,
      work: { ...report.work }, passiveGraspWork: report.passiveGraspWork });
    return report;
  };
  const result = sim.run();
  const summary = { id, shift, fork, originalConstructorSha256: bytesHash(bytes),
    replayConstructorSha256, initialRng, result: { outcome: result.outcome, yards: result.yards, duration: result.duration } };
  writeFileSync(`${output}/${id}-${shift}.json`, JSON.stringify({ summary, result, rows }));
  all.push(summary);
}
const receipt = { identity: executionIdentity(), operatorSha256: bytesHash(readFileSync(import.meta.filename)),
  fixtureSha256: bytesHash(fixture), recordedSingleStream: PlaySim.recordedSingleStream,
  constructors: ids.length, streamsPerConstructor: 5, elapsedMs: performance.now() - started, all };
writeFileSync(`${output}/summary.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
