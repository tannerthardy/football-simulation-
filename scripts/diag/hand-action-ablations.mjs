/** Targeted request interventions; leave ownership, capacities and the World
 * law unchanged. Plain/observed executions apply the same intervention. */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const directory = process.argv[2] ?? 'out/hand-action-protection';
const variants = [
  ['handover-hand-controls', ['PULL_HANDOVER=1'], '', ''],
  ['combined-remove-Y', ['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'], 'Y:DE_S', ''],
  ['offense-remove-Y', ['RUN_CONTACT_COMPONENTS=1','HAND_MOTOR=1','RUN_HANDS=1'], 'Y:DE_S', ''],
  ['defense-remove-Y', ['PULL_HANDOVER=1','HAND_MOTOR=1','DL_HANDS=1'], 'Y:DE_S', ''],
  ['combined-only-Y', ['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'], '', 'Y:DE_S'],
  ['combined-remove-RT', ['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'], 'RT:DE_W', ''],
  ['combined-remove-RG', ['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'], 'RG:DT_W', ''],
];
const runs = [];
for (const [name, flags, remove, keep] of variants) {
  console.log(`Collecting ${name}: remove=${remove || 'none'}, keep=${keep || 'all'}`);
  const output = `${directory}/${name}.json.gz`, receipt = `${directory}/${name}-receipt.json`;
  const run = spawnSync(process.execPath, ['scripts/baseline.mjs', '--candidate', '--receipt', receipt,
    ...flags.flatMap(flag => ['--flag', flag]), '--', process.execPath, '--import', 'tsx', 'scripts/diag/defense/hand-action-panel.ts', output],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FLOW_INPUTS: `${directory}/hand-inputs.json`,
      FLOW_STOP: '25', FLOW_TRACE: '1', CONTACT_TRACE: '1', CONTACT_SNAPSHOT: '', HAND_REMOVE: remove, HAND_KEEP: keep } });
  writeFileSync(`${directory}/${name}.log`, (run.stdout ?? '') + (run.stderr ?? ''));
  runs.push({ name, flags, remove, keep, output, receipt, exitCode: run.status, error: run.error?.message });
  writeFileSync(`${directory}/ablations.json`, JSON.stringify(runs, null, 2) + '\n');
  if (run.status !== 0 || run.error) throw Error(`${name} failed`);
  console.log(`${name} complete`);
}
