/** Sequential matched controller/hand ablations. Each child uses the shared
 * launcher, records its source/profile and proves observer/plain identity.
 * Node 22.23.3; run from repository root. All artifacts stay in ignored out/.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'out/coupled-run-contact';
mkdirSync(directory, { recursive: true });
const manifests = [
  'data/reviews/run-game-contact/input-manifest.json',
  'data/reviews/run-game-contact/input-manifest-fresh.json',
  'data/reviews/current/run-game-integration-inputs.json',
];
const inputs = manifests.flatMap(path => JSON.parse(readFileSync(path, 'utf8')).inputs);
if (inputs.length !== 60 || new Set(inputs.map(row => row.id)).size !== 60) throw new Error('Expected 60 distinct declared controls');
const inputPath = join(directory, 'inputs.json');
const inputText = JSON.stringify({ inputs, measurement: 'Actual live frames through 3.5 seconds; no endpoint substitution.' }, null, 2) + '\n';
writeFileSync(inputPath, inputText);
const arms = [
  ['default', []],
  ['offense', ['RUN_CONTACT_COMPONENTS=1']],
  ['defense', ['PULL_HANDOVER=1']],
  ['combined', ['RUN_CONTACT_COMPONENTS=1', 'PULL_HANDOVER=1']],
  ['motor', ['HAND_MOTOR=1']],
  ['offense-hands', ['RUN_CONTACT_COMPONENTS=1', 'HAND_MOTOR=1', 'RUN_HANDS=1']],
  ['defense-hands', ['PULL_HANDOVER=1', 'HAND_MOTOR=1', 'DL_HANDS=1']],
  ['combined-hands', ['RUN_CONTACT_COMPONENTS=1', 'PULL_HANDOVER=1', 'HAND_MOTOR=1', 'RUN_HANDS=1', 'DL_HANDS=1']],
];
const index = { protocol: 'coupled-run-contact-v1', manifests, inputSha256: createHash('sha256').update(inputText).digest('hex'),
  stop: 3.5, bodyCapacities: 'unchanged', handContact: 'center', handFight: 'baseline ratings walk, HAND_FIGHT off', arms: [] };
for (const [name, flags] of arms) {
  const output = join(directory, `${name}.json`), receipt = join(directory, `${name}-receipt.json`);
  const args = ['scripts/baseline.mjs', '--candidate', '--receipt', receipt,
    ...flags.flatMap(flag => ['--flag', flag]), '--', process.execPath, '--import', 'tsx',
    'scripts/diag/defense/flow-panel.ts', output];
  console.log(`Collecting ${name}: ${flags.join(', ') || 'all experiments off'}`);
  const run = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, FLOW_INPUTS: inputPath, FLOW_STOP: '3.5', FLOW_TRACE: '1', CONTACT_TRACE: '1', CONTACT_SNAPSHOT: '' } });
  writeFileSync(join(directory, `${name}.log`), (run.stdout ?? '') + (run.stderr ?? ''));
  index.arms.push({ name, flags, output, receipt, exitCode: run.status, error: run.error?.message });
  writeFileSync(join(directory, 'panel-index.json'), JSON.stringify(index, null, 2) + '\n');
  if (run.status !== 0 || run.error) throw new Error(`${name} failed; inspect ${name}.log`);
  const data = JSON.parse(readFileSync(output, 'utf8'));
  if (data.panel.length !== inputs.length || !data.panel.every(row => row.observerNeutral)) throw new Error(`${name} lacks complete neutral observations`);
  console.log(`${name}: ${data.panel.length} neutral pairs; ${data.panel.filter(row => !row.live).length} ended, ${data.panel.filter(row => row.live).length} live at window`);
}
