/** Repeated maximal bull rushes with ordinary rest between snaps: how much a
 * lineman's energy, and his speed/force factor, change across a drive.
 * Uses the bull-rush panel's fixture and the game's between-play recovery law.
 *
 * node --import tsx scripts/diag/fatigue/repeat-panel.ts [--reps 12] [--rest 35]
 */
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { run } from '../runblock/bullrush-panel.js';

const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const reps = Number(arg('--reps', '12')), rest = Number(arg('--rest', '35'));
// Same law as Game.recoverAll for a stamina-60 player.
const rate = 0.012 + 0.022 * 0.6;
let dl = 1, ol = 1;
console.log(`rep | DL energy at snap | DL speed/force factor | OL energy | yd driven (brace, identical bodies) `);
for (let k = 1; k <= reps; k++) {
  const r = run({ brace: 'brace3', same: true, energy: dl, blockerEnergy: ol });
  console.log(`${String(k).padStart(3)} | ${dl.toFixed(3)} | ${fatigueFactor(dl).toFixed(4)} | ${ol.toFixed(3)} | ${r.driven.toFixed(2)}`);
  dl -= r.dEnergy; ol -= r.bEnergy;
  dl += (1 - dl) * (1 - Math.exp(-rest * rate)); ol += (1 - ol) * (1 - Math.exp(-rest * rate));
}
