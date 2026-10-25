/** node --import tsx scripts/contact-height-lab.ts [out/height.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { heightPulse, steadyHands } from '../src/lab/contact-height.js';
import { sourceVersion } from './source-version.js';

const pulses = [-0.3, 0, 0.3].flatMap(offset => [6, 12, 24, 48].flatMap(substeps =>
  [[0, 1], [0.7, 1], [1.4, -1]].map(([angle, side]) => heightPulse({ offset, substeps, angle, side }))));
const result = { sourceSha256: sourceVersion(), units: { height: 'yards', deviation: 'yards', velocity: 'yards/s', momentumError: 'kg yd/s' },
  definitions: { pulse: 'Prescribed active 80 kg yd/s pair impulse; 100 kg bodies; no torso contact; 0.2 s; isolates height response, not passive energy.',
    sustained: 'Five seconds of equal-strength opposing hand drive; no resetting body support.' },
  pulses, sustained: [0.2, 0.8].flatMap(posture => [6, 12, 24, 48].map(n => steadyHands(posture, n))) };
const path = process.argv[2] ?? 'out/contact-height.json';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
console.log(`Saved ${path}; largest momentum error ${Math.max(...pulses.map(p => p.momentumError))}`);
