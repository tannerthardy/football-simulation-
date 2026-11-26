/** Call description step 1b (src/playbook/ir/align.ts): the alignment resolved from the description alone, with no
 * front, coverage, pressure or personnel name read, equals today's alignment across the whole catalog; and a front
 * that is not in the catalog, written only as a description, aligns with no code added. Counts are printed. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignDefense, alignOffense } from '../src/playbook/alignment.js';
import { COVERAGES, FRONTS, PRESSURES } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { alignDefenseFromDescription, alignOffenseFromDescription } from '../src/playbook/ir/align.js';
import { describeDefense, describeFormation } from '../src/playbook/ir/describe.js';
import type { DefenseDescription } from '../src/playbook/ir/types.js';
import { DEF_PERSONNEL, type Coverage, type DefensivePlayCall, type DefSlot, type Pressure } from '../src/playbook/types.js';

const LOS = 40, BALLS = [CENTER_Y, CENTER_Y - 6.2, CENTER_Y + 6.2];
const run = <T>(f: () => T): { ok: T } | { err: string } => { try { return { ok: f() }; } catch (e) { return { err: String((e as Error).message) }; } };
const fits = (p: Pressure, c: Coverage) => p.coverages.includes(c.id) || (!!c.family && p.coverages.includes(c.family));
const same = (call: DefensivePlayCall, off: ReturnType<typeof alignOffense>, present: DefSlot[]) => {
  const a = run(() => alignDefense(call, off, present)), b = run(() => alignDefenseFromDescription(describeDefense(call), off, present));
  try { expect(b).toEqual(a); return true; } catch { return false; }
};

describe('alignment from the description alone', () => {
  it('offense: every formation, flipped and not, at each ball spot', () => {
    let n = 0;
    for (const f of FORMATIONS) for (const flip of [false, true]) for (const y of BALLS) {
      expect(alignOffenseFromDescription(describeFormation(f), flip, LOS, y), f.id).toEqual(alignOffense(f, flip, LOS, y)); n++;
    }
    console.log(`ir align: offense ${n}`);
  });

  it('defense: every formation x front x personnel x coverage, pressures, disguises', () => {
    const bad: string[] = []; let n = 0, p = 0, d = 0;
    for (const f of FORMATIONS) {
      const off = alignOffense(f, false, LOS, CENTER_Y);
      for (const front of FRONTS) for (const personnel of front.personnel) for (const coverage of COVERAGES) {
        n++; if (!same({ personnel, front, coverage, pressure: null, label: '' }, off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[])) bad.push(`${f.id} ${front.id} ${personnel} ${coverage.id}`);
      }
    }
    for (const fid of ['gun_doubles_11', 'gun_trips_11']) {
      const off = alignOffense(FORMATIONS.find((x) => x.id === fid)!, false, LOS, CENTER_Y);
      for (const pressure of PRESSURES) for (const coverage of COVERAGES.filter((c) => fits(pressure, c))) for (const front of FRONTS) for (const personnel of front.personnel) {
        p++; if (!same({ personnel, front, coverage, pressure, label: '' }, off, Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[])) bad.push(`${fid} ${pressure.id} ${coverage.id} ${front.id} ${personnel}`);
      }
    }
    const off = alignOffense(FORMATIONS.find((x) => x.id === 'gun_doubles_11')!, false, LOS, CENTER_Y);
    const over = FRONTS.find((x) => x.id === 'over')!, present = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
    for (const coverage of COVERAGES) for (const shown of COVERAGES) if (shown.id !== coverage.id) {
      d++; if (!same({ personnel: 'nickel', front: over, coverage, shown, pressure: null, label: '' }, off, present)) bad.push(`${coverage.id} shown as ${shown.id}`);
    }
    console.log(`ir align: defense ${n}, pressures ${p}, disguises ${d}, unequal ${bad.length}${bad.length ? ': ' + bad.slice(0, 20).join('; ') : ''}`);
    expect(bad).toEqual([]);
  });

  it('a 5-1 front not in the catalog, written only as a description, aligns to legal spots', () => {
    const base = describeDefense({ personnel: 'nickel', front: FRONTS.find((x) => x.id === 'over')!, coverage: COVERAGES.find((c) => c.id === 'cover3')!, pressure: null, label: '' });
    const where: Partial<Record<DefSlot, { tech: '0' | '2' | '5' | '9'; side: 'S' | 'W'; depth: number }>> = {
      DE_S: { tech: '5', side: 'S', depth: 0.9 }, DT_S: { tech: '2', side: 'S', depth: 0.9 }, DT_W: { tech: '2', side: 'W', depth: 0.9 },
      DE_W: { tech: '5', side: 'W', depth: 0.9 }, LB_W: { tech: '9', side: 'W', depth: 1.0 }, LB_M: { tech: '0', side: 'S', depth: 4.5 },
    };
    const desc: DefenseDescription = {
      ...base,
      players: base.players.map((p) => ({ who: p.who, ...(where[p.who.slot] ? { where: where[p.who.slot] } : {}), what: { coverage: p.what.coverage } })),
      alignment: { subPackage: true, frontRules: [], secondLevel: { 1: [[0, 4.5]] } },
      front: { ...base.front, preset: { ns: 'front', id: 'five_one_described' }, name: '5-1 (described)', offField: { slots: {}, fits: {} } },
    };
    const off = alignOffense(FORMATIONS.find((x) => x.id === 'gun_doubles_11')!, false, LOS, CENTER_Y);
    const a = alignDefenseFromDescription(desc, off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]);
    const onLine = Object.values(a.spots).filter((s) => s!.pos.x - LOS < 2);
    const ys = Object.values(a.spots).map((s) => s!.pos.y);
    console.log('ir align: 5-1 described:', Object.values(a.spots).map((s) => `${s!.slot} ${(s!.pos.x - LOS).toFixed(1)}/${(s!.pos.y - CENTER_Y).toFixed(1)} ${s!.role.kind}${s!.zone ? ':' + s!.zone : ''}`).join(', '));
    expect(onLine.length).toBe(5);
    expect(Object.values(a.spots).every((s) => s!.pos.x > LOS)).toBe(true);
    expect(ys.every((y) => y > 0 && y < 53.3)).toBe(true);
    expect(new Set(Object.values(a.spots).map((s) => `${s!.pos.x.toFixed(2)},${s!.pos.y.toFixed(2)}`)).size).toBe(Object.keys(a.spots).length);
    expect(a.rushers.length).toBeGreaterThanOrEqual(4);
  });
});
