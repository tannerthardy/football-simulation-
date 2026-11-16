// The cov7 observer case for the QB lane's belief fix (Integration, 2026-11-15): does observing the cov7 abandonment
// play change it? Prints, per kind and policy arm, EQUAL or the first differing frame (tick, time, field) of the plain vs observed execution.
//   node --import tsx scripts/diag/cov7-observer-purity.ts            (the engine defaults)
// On engine-68 defaults the run arms are equal and the deception arms differ: the observer scores Z every tick through
// the QB's `evaluate`, which is not pure (its first call creates his `believed` map and adds to `outSeen`, and each call
// fills the receiver forecasts' caches). With belief advanced per tick and `evaluate` pure, every arm prints EQUAL.
import { captureSetup } from './saved-play.js';
import { abandonmentSetup, BLOCK_LOOK_UNTIL, firstExecutionDifference, runAbandonment } from './cov7-abandonment.js';

let differ = 0;
for (const kind of ['run', 'deception'] as const) {
  const bytes = captureSetup(abandonmentSetup(kind, BLOCK_LOOK_UNTIL));
  for (const support of [false, true]) {
    const d = firstExecutionDifference(runAbandonment(bytes, support, false).execution, runAbandonment(bytes, support, true).execution);
    if (d) differ++;
    console.log(`${kind.padEnd(9)} ${support ? 'support' : 'man    '} ${d ? `DIFFER: ${d}` : 'EQUAL'}`);
  }
}
process.exitCode = differ ? 1 : 0;
