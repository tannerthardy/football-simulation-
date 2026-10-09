import { Rng } from '../../src/core/rng.js';
import { generatePlayer } from '../../src/players/generator.js';
import { derivePhysical } from '../../src/players/physical.js';
import { stepBody, type Body } from '../../src/physics/kinematics.js';
import { World, type Intent } from '../../src/physics/world.js';
const rng = new Rng(5);
const p = derivePhysical(generatePlayer(rng, 'WR'));
for (const [label, cmd] of [['straight', (t: number): Intent => ({ vel: { x: 9, y: 0 } })], ['cut', (t: number): Intent => ({ vel: t < 1.5 ? { x: 9, y: 0 } : { x: 0, y: 9 } })], ['cut-facing', (t: number): Intent => ({ vel: t < 1.5 ? { x: 9, y: 0 } : { x: 0, y: 9 }, facing: 0 })]] as const) {
  for (const sub of [1, 2, 4, 8]) {
    const a: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: p };
    const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: p };
    const w = new World([a], { substeps: sub });
    let maxd = 0;
    for (let k = 0; k < 50; k++) { const t = k * 0.05; w.step([cmd(t)], 0.05); stepBody(b, cmd(t), 0.05); maxd = Math.max(maxd, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)); }
    console.log(label, 'sub', sub, 'max pos diff', maxd.toFixed(4), 'final v diff', Math.hypot(a.vel.x-b.vel.x,a.vel.y-b.vel.y).toFixed(4), 'facing', a.facing.toFixed(3), b.facing.toFixed(3), 'energy', a.energy.toFixed(4), b.energy.toFixed(4));
  }
}
