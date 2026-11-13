/**
 * Motion plans by formation, slot and kind, from the installed alignment:
 * duration and set spot, or "none" when the planner finds no legal path
 * that keeps a step from every teammate.
 *
 *   node --import tsx scripts/diag/motion-plans.ts [kind]
 */
import { Rng } from '../../src/core/rng.js';
import { CENTER_Y } from '../../src/core/field.js';
import { generateTeam } from '../../src/league/team.js';
import { alignOffense } from '../../src/playbook/alignment.js';
import { FORMATIONS } from '../../src/playbook/formations.js';
import type { MotionKind, SkillSlot } from '../../src/playbook/types.js';
import { derivePhysical } from '../../src/players/physical.js';
import { canMotion, planMotion } from '../../src/sim/motion.js';

const only = process.argv[2] as MotionKind | undefined;
const team = generateTeam(new Rng(7), 'Plans', 'PLN', { strength: 0.55 });
const wr = team.roster.find(p => p.position === 'WR')!, rb = team.roster.find(p => p.position === 'RB')!;
const los = 40;
for (const f of FORMATIONS) for (const kind of (only ? [only] : ['across', 'jet', 'empty', 'return'] as MotionKind[])) {
  const off = alignOffense(f, false, los, CENTER_Y, { kind: 'pass' });
  for (const slot of Object.keys(f.slots) as SkillSlot[]) {
    if (!canMotion(off, slot)) continue;
    const prof = derivePhysical(off.spots[slot].backfield ? rb : wr);
    const plan = planMotion(off, { slot, kind }, prof);
    const p0 = off.spots[slot].pos;
    console.log(`${f.id.padEnd(16)} ${slot.padEnd(3)} ${kind.padEnd(7)} from (${(p0.x - los).toFixed(1)},${(p0.y - CENTER_Y).toFixed(1)}) `
      + (plan ? `${plan.seconds.toFixed(2)} s, ${plan.legs.length} legs [${plan.legs.map(l => `(${(l.to.x - los).toFixed(2)},${(l.to.y - CENTER_Y).toFixed(1)})${l.stop ? '|' : ''}`).join(' ')}]` : 'none'));
  }
}
