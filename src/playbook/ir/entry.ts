/**
 * A call with no preset (step 4): an offense and a defense given only as descriptions. The snap aligns from the
 * descriptions themselves (PlaySetup.offDesc / defDesc). Code that still reads call fields gets:
 * - for the defense, the lowered call (`lowerDefense`);
 * - for the offense, a formation synthesized from the description, as close as its vocabulary allows: each player's
 *   side, an offset (a number) or the wide or slot split, and his depth; the QB alignment from his depth; the
 *   personnel from the bodies.
 * The synthesized formation cannot carry an unbalanced line (it has no linemen): anything that reads formation.slots
 * rather than the alignment sees only the skill players.
 */
import { GUN_QB_DEPTH, PISTOL_QB_DEPTH } from '../formations.js';
import type { DefensivePlayCall, Formation, PersonnelId, SlotAlignment } from '../types.js';
import { describeDefense } from './describe.js';
import { lowerDefense } from './lower.js';
import type { OffenseSnapDescription } from './offense.js';
import type { DefenseDescription } from './types.js';

export function formationOfSnap(d: OffenseSnapDescription, personnel: PersonnelId): Formation {
  const q = d.qb.depth;
  const qb = q < 2.5 ? 'under' : Math.abs(q - PISTOL_QB_DEPTH) < Math.abs(q - GUN_QB_DEPTH) ? 'pistol' : 'gun';
  const slots: Formation['slots'] = {};
  for (const p of d.players) {
    const a = p.where.anchor;
    const split: SlotAlignment['split'] = p.where.inline ? 'inline' : a.kind === 'offset' ? Math.abs(a.y) : a.kind === 'sideline' ? 'wide' : 'slot';
    slots[p.who.slot] = { side: p.where.side, split, depth: p.where.depth };
  }
  return { id: d.preset.id, name: `${d.preset.id} (described)`, personnel, qb, slots, tags: ['described'] };
}

export function callOfDescription(d: DefenseDescription): DefensivePlayCall {
  return lowerDefense(d);
}

/** A call's description over a base description (step 5). Code that changes a call's coverage, strength or pressure
 * (the motion re-check, the passer's look model) or its front (a stem) aligns from this rather than re-describing a
 * lowered call, so a described front keeps its own data. With no base (every catalog call) it is `describeDefense(call)`.
 * With a base and the same front, the base keeps its front, alignment data and each player's spot and fit; coverage,
 * pressure and the call's other fields come from the call. A different front (a stem from a catalog front) is that
 * front's own description. */
export function describeOver(base: DefenseDescription | undefined, call: DefensivePlayCall): DefenseDescription {
  const d = describeDefense(call);
  if (!base || call.front.id !== base.front.preset.id) return d;
  return { ...d, front: base.front, alignment: base.alignment, ...(base.concede ? { concede: base.concede } : {}),
    players: d.players.map((p) => {
      const o = base.players.find((q) => q.who.slot === p.who.slot);
      const { where: _w, fit: _f, ...rest } = p;
      return { ...rest, ...(o?.where ? { where: o.where } : {}), ...(o?.fit ? { fit: o.fit } : {}) };
    }) };
}
