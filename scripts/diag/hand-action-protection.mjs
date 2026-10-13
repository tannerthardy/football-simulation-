/** Execute each action independently before combinations. Baseline is collected
 * separately at actual 4ded6b6; this driver never switches branches or changes
 * runtime source, the solver, capacities, or the default profile. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? 'out/hand-action-protection';
mkdirSync(directory, { recursive: true });
const manifestPath = 'docs/reviews/hand-action-protection-inputs.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [group, ids] of [['all', manifest.inputs.map(row => row.id)], ['four', manifest.handCases],
  ['hand', [...manifest.handCases, ...manifest.oppositeSideControls]], ['gap', manifest.gapCases]])
  writeFileSync(join(directory, `${group}-inputs.json`), JSON.stringify({ inputs: manifest.inputs.filter(row => ids.includes(row.id)) }, null, 2) + '\n');
if (process.argv.includes('--prepare')) process.exit(0);
const arms = [
  ['default', 'all', []],
  ['components', 'hand', ['RUN_CONTACT_COMPONENTS=1']],
  ['offensive-hands-alone', 'hand', ['HAND_MOTOR=1', 'RUN_HANDS=1']],
  ['defensive-hands-alone', 'hand', ['HAND_MOTOR=1', 'DL_HANDS=1']],
  ['hands-alone-combined', 'hand', ['HAND_MOTOR=1', 'RUN_HANDS=1', 'DL_HANDS=1']],
  ['components-defensive-hands', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'HAND_MOTOR=1', 'DL_HANDS=1']],
  ['handover', 'gap', ['PULL_HANDOVER=1']],
  ['controllers', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'PULL_HANDOVER=1']],
  ['offense', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'HAND_MOTOR=1', 'RUN_HANDS=1']],
  ['defense', 'hand', ['PULL_HANDOVER=1', 'HAND_MOTOR=1', 'DL_HANDS=1']],
  ['combined', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'PULL_HANDOVER=1', 'HAND_MOTOR=1', 'RUN_HANDS=1', 'DL_HANDS=1']],
  // Repeat observer controls with the shed-decision hook and request-only
  // normalized hashes, preserving the earlier measured collector receipts.
  ['trace-default', 'hand', []],
  ['trace-combined', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'PULL_HANDOVER=1', 'HAND_MOTOR=1', 'RUN_HANDS=1', 'DL_HANDS=1']],
  ['trace-offense-remove-Y', 'hand', ['RUN_CONTACT_COMPONENTS=1', 'HAND_MOTOR=1', 'RUN_HANDS=1'], 'Y:DE_S'],
];
const index = { protocol: 'hand-action-protection-arms-v1', comparisonCommit: manifest.comparisonCommit,
  manifestSha256: createHash('sha256').update(readFileSync(manifestPath)).digest('hex'), windowSeconds: manifest.windowSeconds,
  parkedReachTrack: 'excluded: RUN_CONTACT_TRACK=0 in every arm', arms: [] };
for (const [name, group, flags, remove = ''] of arms) {
  console.log(`Collecting ${name}: ${flags.join(', ')}`);
  const output = join(directory, `${name}.json.gz`), receipt = join(directory, `${name}-receipt.json`);
  const run = spawnSync(process.execPath, ['scripts/baseline.mjs', '--candidate', '--receipt', receipt,
    ...flags.flatMap(flag => ['--flag', flag]), '--', process.execPath, '--import', 'tsx', 'scripts/diag/defense/hand-action-panel.ts', output],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FLOW_INPUTS: join(directory, `${group}-inputs.json`),
      FLOW_STOP: String(manifest.windowSeconds), FLOW_TRACE: '1', CONTACT_TRACE: '1', CONTACT_SNAPSHOT: '', HAND_REMOVE: remove, HAND_KEEP: '' } });
  writeFileSync(join(directory, `${name}.log`), (run.stdout ?? '') + (run.stderr ?? ''));
  index.arms.push({ name, group, flags, remove, output, receipt, exitCode: run.status, error: run.error?.message });
  writeFileSync(join(directory, 'arms.json'), JSON.stringify(index, null, 2) + '\n');
  if (run.status !== 0 || run.error) throw Error(`${name} failed; inspect ${name}.log`);
  console.log(`${name} complete`);
}
