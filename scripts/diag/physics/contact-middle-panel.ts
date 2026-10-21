/** Three fixed native pursuit/tackle checks, not the broad tackle panel.
 * Decision: does the torso-only middle also appear with ordinary acquisition,
 * or do the attained requests/grips produce another outcome? No tuned winner.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { rep, type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const output = process.argv[2];
if (process.argv.length !== 3 || !output?.endsWith('.json')) throw new Error('Usage: contact-middle-panel.ts OUTPUT.json');
const source = sourceVersion(), wall = performance.now(), cpu = process.cpuUsage();
const inputs: Cell[] = [0, 90, 135].map(angle => ({ angle, speed: 8, cut: false, difficulty: 'difficult' }));
const rows = inputs.map(cell => rep(cell, 1, 3000));
if (sourceVersion() !== source) throw new Error('Source changed during collection');
const used = process.cpuUsage(cpu);
const receipt = { source, toolSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  panelSha256: createHash('sha256').update(readFileSync('scripts/diag/tackle/panel.ts')).digest('hex'),
  node:process.version, inputs, seed:3000, side:1, rosterSeeds:[61,62], world:'accepted defaults',
  limitations:['Fixed requested path; production pursuer and tackle controller.',
    'Only three selected bearings, no NFL or tackle-frequency conclusion.',
    'Panel contact marker includes missed attempts; actual grasp/torso impulse remain separate.'],
  runtime:{wallSeconds:(performance.now()-wall)/1000,cpuSeconds:(used.user+used.system)/1e6}, rows };
mkdirSync(dirname(output),{recursive:true}); writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
