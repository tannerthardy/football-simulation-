/** Paired arm-contact/no-arm-contact release fixtures, mirror and timestep
 * checks. node --import tsx scripts/press-contact-lab.ts [out/press.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { release } from '../src/lab/scenarios.js';
import { sourceVersion } from './source-version.js';

const pairs = [3, 5, 7, 9, 11].flatMap(seed => ([1, -1] as const).flatMap(side =>
  [6, 12, 24].map(substeps => {
    const o = { seed, side, substeps };
    const hands = release({ ...o, press: true }), noHands = release({ ...o, press: false });
    return { ...o, hands, noHands, deltaDepth: hands.depth - noHands.depth, deltaReroute: hands.rerouted - noHands.rerouted };
  })));
const mirrorError = Math.max(...pairs.filter(p => p.side === 1).map(p => {
  const mirror = pairs.find(q => q.seed === p.seed && q.substeps === p.substeps && q.side === -1)!;
  return Math.max(Math.abs(p.hands.depth - mirror.hands.depth), Math.abs(p.hands.rerouted - mirror.hands.rerouted));
}));
const convergenceError = Math.max(...pairs.filter(p => p.substeps === 6).map(p => {
  const fine = pairs.find(q => q.seed === p.seed && q.side === p.side && q.substeps === 24)!;
  return Math.max(Math.abs(p.hands.depth - fine.hands.depth), Math.abs(p.hands.rerouted - fine.hands.rerouted));
}));
const result = { sourceSha256: sourceVersion(),
  definitions: { fixture: 'Vertical release against a stationary square corner 0.9 yd beyond the LOS, shading inside by 0.4 yd; 1.2 s; generated rosters held equal per pair.',
    control: 'Press disabled on the same bodies/geometry. Ordinary torso contact remains possible; this isolates the arm jam, not all receiver/corner collisions.',
    loadedTime: 'Duration of 20 Hz physics ticks carrying nonzero hand-joint force.',
    peakHandForce: 'Largest mean force magnitude over a 20 Hz tick, not an instantaneous impulse peak.',
    scope: 'Mechanical transfer fixture, not NFL calibration or a claim about man-coverage success rates.' },
  units: { depth: 'yards', reroute: 'yards outward', loadedTime: 'seconds', peakHandForce: 'kg yd/s^2', handImpulse: 'kg yd/s', momentumError: 'kg yd/s' },
  mirrorError, convergenceError, pairs };
const path = process.argv[2] ?? 'out/press-contact.json';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
console.log(`Saved ${path}; mirror error ${mirrorError} yd; coarse/fine error ${convergenceError} yd`);
