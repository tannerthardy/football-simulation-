/** Call description step 1c (src/playbook/ir/offense.ts): the offense placed from the description alone, the play's
 * decisions written in by the describer, equals today's alignOffense with the same play context across the catalog;
 * and an unbalanced line and a tight bunch with a stack, written only as descriptions, align with no code added. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignOffense, type AlignContext, type OffenseAlignment } from '../src/playbook/alignment.js';
import { PASS_CONCEPTS, RUN_CONCEPTS, SCREEN_CONCEPTS } from '../src/playbook/concepts.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { alignOffenseFromSnap, describeOffenseSnap, type OffenseSnapDescription, type SkillPlayer } from '../src/playbook/ir/offense.js';
import { BASE_LINE, inlineOf, olDepth, tackleOf } from '../src/playbook/alignment.js';

const LOS = 40, BALLS = [CENTER_Y, CENTER_Y - 6.2, CENTER_Y + 6.2];
const CTXS: Array<[string, AlignContext]> = [
  ['none', {}],
  ...[...PASS_CONCEPTS, ...SCREEN_CONCEPTS].map((c) => [`pass ${c.id}`, { kind: 'pass', pass: c }] as [string, AlignContext]),
  ...RUN_CONCEPTS.flatMap((c) => (['strong', 'weak'] as const).map((direction) => [`run ${c.id} ${direction}`, { kind: 'run', run: { scheme: c.scheme, direction } }] as [string, AlignContext])),
];

/** What a legality check would read: who is on the line, and whether each end of it is an eligible (skill) player. */
function lineFacts(a: OffenseAlignment) {
  const on = Object.values(a.spots).filter((s) => s.onLine).sort((p, q) => p.pos.y - q.pos.y);
  const ol = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
  return { onLine: on.length, ends: [on[0].slot, on[on.length - 1].slot], endsEligible: !ol.has(on[0].slot) && !ol.has(on[on.length - 1].slot),
    spots: Object.values(a.spots).map((s) => `${s.slot} ${(LOS - s.pos.x).toFixed(2)}/${(s.pos.y - CENTER_Y).toFixed(2)}${s.onLine ? ' on' : ''}${s.backfield ? ' back' : ''}`).join(', ') };
}

describe('offense from the description alone', () => {
  it('every formation x flip x ball spot x play context equals alignOffense', () => {
    const bad: string[] = []; let n = 0;
    for (const f of FORMATIONS) for (const [name, ctx] of CTXS) {
      const d = describeOffenseSnap(f, ctx);
      for (const flip of [false, true]) for (const y of BALLS) {
        n++;
        try { expect(alignOffenseFromSnap(d, flip, LOS, y)).toEqual(alignOffense(f, flip, LOS, y, ctx)); } catch { bad.push(`${f.id} ${name} ${flip} ${y}`); }
      }
    }
    console.log(`ir offense: formations ${FORMATIONS.length}, play contexts ${CTXS.length}, alignments ${n}, unequal ${bad.length}${bad.length ? ': ' + bad.slice(0, 12).join('; ') : ''}`);
    expect(bad).toEqual([]);
  });

  it('an unbalanced line (tackle over) and a tight bunch with a stack, written only as descriptions, align with no code added', () => {
    const line = BASE_LINE, T = tackleOf(line), dep = olDepth({});
    const skill = (slot: SkillPlayer['who']['slot'], side: 'L' | 'R' | 'C', anchor: SkillPlayer['where']['anchor'], depth: number,
      flags: Partial<SkillPlayer['where']> = {}): SkillPlayer => ({ who: { slot }, where: { side, anchor, depth, backfield: false, onLine: false, inline: false, counts: true, attached: false, ...flags } });
    // Tackle over: the left tackle lines up outside the right tackle; the Y is the short side's end man, attached where the left tackle stood.
    const unbalanced: OffenseSnapDescription = {
      preset: { ns: 'formation', id: 'unbalanced_tackle_over' }, line, qb: { depth: 1.6 },
      linemen: [{ who: { slot: 'LG' }, where: { y: line.cg, depth: dep.LG } }, { who: { slot: 'C' }, where: { y: 0, depth: dep.C } },
        { who: { slot: 'RG' }, where: { y: -line.cg, depth: dep.RG } }, { who: { slot: 'RT' }, where: { y: -T, depth: dep.RT } },
        { who: { slot: 'LT' }, where: { y: -(T + line.gt), depth: dep.RT } }],
      players: [
        skill('Y', 'L', { kind: 'offset', y: T }, 0.83, { onLine: true, inline: true, attached: true }),
        skill('X', 'R', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 0.74, { onLine: true }),
        skill('Z', 'L', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 1.2),
        skill('H', 'R', { kind: 'offset', y: T + line.gt + 1.3 }, 1.2),
        skill('RB', 'C', { kind: 'offset', y: 0 }, 6.5, { backfield: true, counts: false }),
      ],
    };
    // Tight bunch to the right off an attached Y, and a stack on the left: the H directly behind the X (a share of 1 of the widest on his side).
    const bunch: OffenseSnapDescription = {
      preset: { ns: 'formation', id: 'bunch_and_stack' }, line, qb: { depth: 4.5 },
      linemen: describeOffenseSnap(FORMATIONS[0], {}).linemen,
      players: [
        skill('Y', 'R', { kind: 'offset', y: inlineOf(line) }, 0.83, { onLine: true, inline: true, attached: true }),
        skill('Z', 'R', { kind: 'offset', y: inlineOf(line) + 2 }, 1.2),
        skill('F', 'R', { kind: 'offset', y: inlineOf(line) + 1 }, 2.0),
        skill('X', 'L', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 0.74, { onLine: true }),
        skill('H', 'L', { kind: 'share', share: 1, min: 5.5, room: { early: 11, late: 13.5 } }, 2.2),
        skill('RB', 'L', { kind: 'offset', y: 1 }, 4.5, { backfield: true, counts: false }),
      ],
    };
    for (const [name, d] of [['unbalanced', unbalanced], ['bunch+stack', bunch]] as const) {
      const a = alignOffenseFromSnap(d, false, LOS, CENTER_Y), facts = lineFacts(a);
      console.log(`ir offense: ${name}: on the line ${facts.onLine}, ends ${facts.ends.join('/')} eligible ${facts.endsEligible}; ${facts.spots}`);
      expect(new Set(Object.values(a.spots).map((s) => `${s.pos.x.toFixed(2)},${s.pos.y.toFixed(2)}`)).size).toBe(Object.keys(a.spots).length);
      expect(facts.onLine).toBe(7);
      expect(facts.endsEligible).toBe(true);
    }
  });
});
