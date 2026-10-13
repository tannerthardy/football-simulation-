/** Is a held outcome knife-edge? Re-run a hold witness at a fixed fine
 * resolution with the tackler's start nudged sideways by a few millimetres.
 * If the ending flips under perturbations far smaller than the numerical
 * error at coarse resolution, the case sits on a physical threshold and its
 * resolution sensitivity is a symptom of that, not a broken law.
 * node --import tsx scripts/diag/physics/hold-sensitivity.ts [angle=180] [speed=6] [substeps=192] [mode=center] [cut=0] [seed=3001]
 */
import { PlaySim } from '../../../src/sim/playsim.js';
import { rep } from '../tackle/panel.js';

const [angle, speed, n] = [Number(process.argv[2] ?? 180), Number(process.argv[3] ?? 6), Number(process.argv[4] ?? 192)];
const mode = (process.argv[5] ?? 'center') as 'center' | 'patch';
const cut = process.argv[6] === '1', seed = Number(process.argv[7] ?? 3001);
let nudge = 0, applied = false;
const tick = (PlaySim.prototype as any).tick;
(PlaySim.prototype as any).tick = function (this: PlaySim) {
  if (!applied) { applied = true; const d = this.defense.find((a) => a.slot === 'MLB' || a.slot.startsWith('LB'))!; d.body.pos = { x: d.pos.x, y: d.pos.y + nudge }; }
  return tick.call(this);
};
const out: string[] = [];
for (const dy of [-0.02, -0.01, -0.005, -0.002, 0, 0.002, 0.005, 0.01, 0.02]) {
  nudge = dy; applied = false;
  const r = rep({ angle, speed, cut, difficulty: 'difficult' }, 1, seed, { handContact: mode, substeps: n });
  out.push(`${(dy * 1000).toFixed(0).padStart(3)} mm: ${r.ending}${r.carrierState === 'down' ? '(fell)' : ''} ${(r.afterContact ?? NaN).toFixed(1)}`);
}
console.log(`${angle}/${speed}${cut ? ' cut' : ''} seed ${seed} at ${n} substeps (${mode}), tackler start nudged sideways:\n  ${out.join('\n  ')}`);
