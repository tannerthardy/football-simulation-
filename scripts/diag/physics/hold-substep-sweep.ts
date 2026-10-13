/** One tackle-panel rep across fixed resolutions, to see where its ending settles.
 * node --import tsx scripts/diag/physics/hold-substep-sweep.ts angle speed cut(0|1) seed [mode=center] [n,n,...]
 */
import { rep } from '../tackle/panel.js';

const [angle, speed] = [Number(process.argv[2]), Number(process.argv[3])];
const cut = process.argv[4] === '1', seed = Number(process.argv[5]);
const handContact = (process.argv[6] ?? 'center') as 'center' | 'patch';
const ns = (process.argv[7] ?? '0,12,16,24,32,48,64,96,128,192').split(',').map(Number);
for (const n of ns) {
  const r = rep({ angle, speed, cut, difficulty: 'difficult' }, 1, seed, { handContact, substeps: n || undefined });
  console.log(`${n ? String(n).padStart(4) : 'adpt'}: ${r.ending}${r.carrierState === 'down' ? '(fell)' : ''} ${(r.afterContact ?? NaN).toFixed(1)}`);
}
