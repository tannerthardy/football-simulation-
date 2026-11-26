/** Step 3a perturbation cases on the label-free run-fit rules (src/playbook/ir/fits.ts): jobs before and after a
 * change of body, width, package, offensive personnel or pressure. Printed for review; two assertions: a relabelled
 * spot keeps its job (b), and a declared concession is reported as conceded, not unowned (f). */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignOffense, type DefenseAlignment, type OffenseAlignment } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURES } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { alignDefenseFromDescription } from '../src/playbook/ir/align.js';
import { describeDefense } from '../src/playbook/ir/describe.js';
import { runFitJobs, type FitResult } from '../src/playbook/ir/fits.js';
import type { DefenseDescription } from '../src/playbook/ir/types.js';
import { DEF_PERSONNEL, type DefPersonnelId, type DefSlot, type Pressure } from '../src/playbook/types.js';

const LOS = 40;
const off = (id: string) => alignOffense(FORMATION_BY_ID[id], false, LOS, CENTER_Y);
const call = (front: string, personnel: DefPersonnelId, cov: string, pressure: Pressure | null = null) =>
  describeDefense({ personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure, label: '' });
const place = (d: DefenseDescription, o: OffenseAlignment) => alignDefenseFromDescription(d, o, d.players.map((p) => p.who.slot));
const side = (o: OffenseAlignment, s: number) => (s === o.strongSign ? 'S' : 'W');
function show(title: string, d: DefenseDescription, a: DefenseAlignment, o: OffenseAlignment, r: FitResult): string {
  const rows = (Object.keys(r.jobs) as DefSlot[]).map((s) => {
    const j = r.jobs[s]!, sp = a.spots[s]!;
    return `${s.padEnd(5)} ${(sp.pos.x - LOS).toFixed(1).padStart(4)}/${(sp.pos.y - o.ballY).toFixed(1).padStart(5)} ${j.kind.padEnd(8)} ${j.gap}${side(o, j.side)}${j.inside ? ` (inside ${j.inside.gap}${side(o, j.inside.side)})` : ''}`;
  });
  const g = (xs: FitResult['unowned']) => xs.map((x) => `${x.gap}${side(o, x.side)}`).join(' ') || 'none';
  return `ir fits case: ${title}\n  ${rows.join('\n  ')}\n  unowned: ${g(r.unowned)}; conceded: ${g(r.conceded)}`;
}
const lf = (d: DefenseDescription, a: DefenseAlignment, o: OffenseAlignment) => runFitJobs(d, a, o, { labelFree: true });
/** The same alignment and call with two slot labels exchanged (each man keeps his spot, role and job data). */
function relabel(d: DefenseDescription, a: DefenseAlignment, x: DefSlot, y: DefSlot): [DefenseDescription, DefenseAlignment] {
  const sw = (s: DefSlot) => (s === x ? y : s === y ? x : s);
  const players = d.players.map((p) => ({ ...p, who: { ...p.who, slot: sw(p.who.slot) } }));
  const spots: DefenseAlignment['spots'] = {};
  for (const [s, sp] of Object.entries(a.spots) as Array<[DefSlot, NonNullable<DefenseAlignment['spots'][DefSlot]>]>) spots[sw(s)] = { ...sp, slot: sw(s) };
  return [{ ...d, players }, { ...a, spots }];
}

describe('run-fit perturbations (label-free)', () => {
  it('prints the six cases', () => {
    const out: string[] = [];
    // (a) 4-3 Over base, single-high, against 11 personnel with an attached end.
    const ace = off('ace_11'), base = call('over', 'base43', 'cover3'), aA = place(base, ace), rA = lf(base, aA, ace);
    out.push(show('(a) Over base43 cover3 vs ace_11', base, aA, ace, rA));
    out.push(show('(a) faithful, same call', base, aA, ace, runFitJobs(base, aA, ace)));
    // (b) a safety's body in the Sam's spot: the SS and LB_S labels exchanged, each man on his spot.
    const [bD, bA] = relabel(base, aA, 'LB_S', 'SS'), rB = lf(bD, bA, ace);
    out.push(show('(b) Sam and SS labels exchanged (label-free)', bD, bA, ace, rB));
    out.push(show('(b) same, faithful', bD, bA, ace, runFitJobs(bD, bA, ace)));
    const sw = (s: DefSlot) => (s === 'LB_S' ? 'SS' : s === 'SS' ? 'LB_S' : s) as DefSlot;
    for (const s of Object.keys(rA.jobs) as DefSlot[]) expect(rB.jobs[sw(s)], s).toEqual({ ...rA.jobs[s], ...(rA.jobs[s]!.partner ? { partner: sw(rA.jobs[s]!.partner as DefSlot) } : {}) });
    // (c) the Sam widened 1, 2 and 3 yd toward the field (a 4-2-5 apex), the same call, against 2x2 and ace.
    for (const [fid, o] of [['ace_11', ace], ['gun_doubles_11', off('gun_doubles_11')]] as const) {
      const d = call('over', 'base43', 'cover3'), a0 = place(d, o);
      for (const w of [0, 1, 2, 3]) {
        const a = { ...a0, spots: { ...a0.spots, LB_S: { ...a0.spots.LB_S!, pos: { x: a0.spots.LB_S!.pos.x, y: a0.spots.LB_S!.pos.y + o.strongSign * w } } } };
        const r = lf(d, a, o), j = r.jobs.LB_S!;
        out.push(`ir fits case: (c) ${fid} Sam widened ${w} yd: at ${(a.spots.LB_S!.pos.y - o.ballY).toFixed(1)}: ${j.kind} ${j.gap}${side(o, j.side)}${j.inside ? ` (inside ${j.inside.gap}${side(o, j.inside.side)})` : ''}; unowned ${r.unowned.map((x) => `${x.gap}${side(o, x.side)}`).join(' ') || 'none'}`);
      }
    }
    // (d) nickel and dime Over, single-high, against 11 personnel (ace and 2x2).
    for (const [fid, o] of [['ace_11', ace], ['gun_doubles_11', off('gun_doubles_11')]] as const) for (const p of ['nickel', 'dime'] as const) {
      const d = call('over', p, 'cover3'), a = place(d, o);
      out.push(show(`(d) Over ${p} cover3 vs ${fid}`, d, a, o, lf(d, a, o)));
      if (p === 'dime') out.push(show(`(d) Over dime cover3 vs ${fid}, faithful`, d, a, o, runFitJobs(d, a, o)));
    }
    // (e) a second tight end (12 personnel), by shell.
    const twelve = off('ace_12');
    for (const cov of ['cover3', 'cover4', 'cover2']) {
      const d = call('over', 'base43', cov), a = place(d, twelve);
      out.push(show(`(e) Over base43 ${cov} vs ace_12`, d, a, twelve, lf(d, a, twelve)));
    }
    // (f) an overload pressure that leaves a gap unowned, then the same call declaring it.
    const gd = off('gun_doubles_11');
    const found = PRESSURES.map((p) => {
      const cov = p.coverage ?? p.coverages[0]; const c = COVERAGE_BY_ID[cov]; if (!c) return null;
      const d = call('over', 'nickel', c.id, p), a = place(d, gd), r = lf(d, a, gd);
      return r.unowned.some((x) => x.gap !== 'D') ? { p, d, a, r } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x);
    out.push(`ir fits case: (f) pressures from Over nickel vs gun_doubles_11 that leave an interior gap unowned: ${found.map((x) => `${x.p.id} (${x.r.unowned.map((g) => `${g.gap}${side(gd, g.side)}`).join(' ')})`).join(', ') || 'none'}`);
    if (found.length) {
      const { p, d, a, r } = found[0];
      out.push(show(`(f) ${p.id}`, d, a, gd, r));
      const conc = { ...d, concede: r.unowned.map((g) => ({ gap: g.gap, side: side(gd, g.side) as 'S' | 'W' })) };
      const rc = lf(conc, a, gd);
      out.push(show(`(f) ${p.id}, the call declares the concession`, conc, a, gd, rc));
      expect(rc.unowned).toEqual([]); expect(rc.conceded.length).toBe(r.unowned.length);
    }
    // The dime DB where the sources put him (beside the Mike, inside: fangio-system.md 21 and 234), the same call.
    for (const [fid, o] of [['ace_11', ace], ['gun_doubles_11', gd]] as const) {
      const d = call('over', 'dime', 'cover3'), a0 = place(d, o), m = a0.spots.LB_M!;
      const a = { ...a0, spots: { ...a0.spots, DB: { ...a0.spots.DB!, pos: { x: m.pos.x, y: m.pos.y + o.strongSign * 2.5 } } } };
      out.push(show(`(d) Over dime cover3 vs ${fid}, the DB beside the Mike on the strong side`, d, a, o, lf(d, a, o)));
    }
    // The reference matrix's fronts against a pro set (two backs, one tight end) and a singleback set, cover 3.
    for (const fid of ['i_pro_21', 'ace_11']) for (const [front, p] of [['over', 'base43'], ['even', 'base43'], ['tite', 'base34'], ['bear34', 'base34'], ['odd', 'base34']] as const) {
      const o = off(fid), d = call(front, p, 'cover3'), a = place(d, o);
      out.push(show(`(matrix) ${front} ${p} cover3 vs ${fid}`, d, a, o, lf(d, a, o)));
    }
    console.log(out.join('\n'));
  });
});
