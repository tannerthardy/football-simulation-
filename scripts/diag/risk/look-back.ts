// A defender running with his man looks back for the ball: how far each joint set reaches (neck by speed + 30 deg eye,
// + trunk to TRUNK_RANGE, + hips), and the speed an isolated CB body loses over 0.5 s holding that look, at 100 / 80 /
// 60% of his top speed, for a ball straight behind (180) and at 135 deg. Reads only.
// usage: npx tsx scripts/diag/risk/look-back.ts
import { Rng } from '../../../src/core/rng.js';
import { DT } from '../../../src/core/units.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { stepBody, TRUNK_RANGE, type Body } from '../../../src/physics/kinematics.js';
const deg = (r: number) => (r * 180) / Math.PI, rad = (d: number) => (d * Math.PI) / 180;
const p = generatePlayer(new Rng(7), 'CB' as any, 0.6) as any, prof = derivePhysical(p);
const NECK = 90, NECK_SPRINT = 45, EYE = 30;
console.log(`CB vmax ${prof.vmax.toFixed(2)} yd/s, backpedal ${prof.backpedal}; TRUNK_RANGE ${deg(TRUNK_RANGE).toFixed(0)} deg`);
for (const share of [1, 0.8, 0.6]) {
  const neck = NECK - (NECK - NECK_SPRINT) * share;
  console.log(`speed ${share * 100}%: head only ${(neck + EYE).toFixed(0)} deg | + trunk ${(neck + deg(TRUNK_RANGE) + EYE).toFixed(0)} deg | + hips: any`);
  for (const ball of [135, 180]) {
    // Centre the head on the ball: neck first, then trunk, then hips (lookJoints' order), and with the eye cone only the hips beyond neck + trunk + eye.
    for (const [name, eyeOnly] of [['centre', false], ['eye edge', true]] as const) {
      const over = Math.max(0, ball - neck - (eyeOnly ? EYE : 0)), trunk = Math.min(over, deg(TRUNK_RANGE)), hips = Math.max(0, over - deg(TRUNK_RANGE));
      const b: Body = { pos: { x: 0, y: 0 }, vel: { x: prof.vmax * share, y: 0 }, facing: 0, energy: 1, profile: prof };
      const v0 = prof.vmax * share;
      for (let t = 0; t < 0.5 - 1e-9; t += DT) stepBody(b, { vel: { x: v0, y: 0 }, facing: rad(hips), look: rad(hips + trunk) } as any, DT);
      const v = Math.hypot(b.vel.x, b.vel.y);
      console.log(`   ball ${ball} (${name}): trunk ${trunk.toFixed(0)} hips ${hips.toFixed(0)} deg -> speed ${v0.toFixed(2)} to ${v.toFixed(2)} yd/s (${((1 - v / v0) * 100).toFixed(1)}% lost); trunk at 0.5 s ${deg(b.trunk ?? 0).toFixed(0)}`);
    }
  }
}
