/** Call description step 2a (src/playbook/ir/check.ts): the legality and accounting checker, run over the whole catalog
 * (counts by kind, with an example, are printed; the catalog is not fixed here), over the three hand-written
 * descriptions (none has an error), and over one deliberately illegal description per error kind. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignOffense, BASE_LINE, inlineOf, olDepth, tackleOf, type AlignContext } from '../src/playbook/alignment.js';
import { PASS_CONCEPTS, RUN_CONCEPTS, SCREEN_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGES, FRONTS, PRESSURES } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { alignDefenseFromDescription } from '../src/playbook/ir/align.js';
import { checkDefense, checkOffense, type Issue } from '../src/playbook/ir/check.js';
import { describeDefense, describePass } from '../src/playbook/ir/describe.js';
import { alignOffenseFromSnap, describeOffenseSnap, type OffenseSnapDescription, type SkillPlayer } from '../src/playbook/ir/offense.js';
import type { DefenseDescription, RouteJob } from '../src/playbook/ir/types.js';
import { DEF_PERSONNEL, type Coverage, type DefSlot, type Pressure, type ReceiverRef } from '../src/playbook/types.js';

const LOS = 40;
const CTXS: Array<[string, AlignContext]> = [
  ['none', {}],
  ...[...PASS_CONCEPTS, ...SCREEN_CONCEPTS].map((c) => [`pass ${c.id}`, { kind: 'pass', pass: c }] as [string, AlignContext]),
  ...RUN_CONCEPTS.flatMap((c) => (['strong', 'weak'] as const).map((direction) => [`run ${c.id} ${direction}`, { kind: 'run', run: { scheme: c.scheme, direction } }] as [string, AlignContext])),
];
const fits = (p: Pressure, c: Coverage) => p.coverages.includes(c.id) || (!!c.family && p.coverages.includes(c.family));
const errors = (xs: Issue[]) => xs.filter((x) => x.level === 'error');
const kinds = (xs: Issue[]) => new Set(xs.map((x) => x.kind));

/** Tally by level and kind: how many calls show it, and the first example. */
function tally() {
  const t = new Map<string, { calls: number; example: string }>();
  return {
    add(call: string, xs: Issue[]) {
      for (const x of new Map(xs.map((i) => [`${i.level} ${i.kind}`, i])).values()) {
        const k = `${x.level} ${x.kind}`, e = t.get(k) ?? { calls: 0, example: `${call}: ${x.detail}` };
        e.calls++; t.set(k, e);
      }
    },
    print(title: string, n: number) {
      console.log(`ir check: ${title}: ${n} calls\n` + [...t].sort().map(([k, v]) => `  ${k}: ${v.calls} (e.g. ${v.example})`).join('\n'));
    },
  };
}

const offense = (d: OffenseSnapDescription, routes: RouteJob[] = []) => checkOffense(d, alignOffenseFromSnap(d, false, LOS, CENTER_Y), routes);
/** Every numbered receiver given a downfield route. */
const allRoutes = (d: OffenseSnapDescription): RouteJob[] => {
  const a = alignOffenseFromSnap(d, false, LOS, CENTER_Y);
  return (Object.keys(a.numbering) as ReceiverRef[]).map((who) => ({ who, route: { ns: 'route', id: 'go' } }));
};

// The hand-written offensive descriptions of step 1c (test/ir-offense.test.ts), repeated here.
const line = BASE_LINE, T = tackleOf(line), dep = olDepth({});
const skill = (slot: SkillPlayer['who']['slot'], side: 'L' | 'R' | 'C', anchor: SkillPlayer['where']['anchor'], depth: number,
  flags: Partial<SkillPlayer['where']> = {}): SkillPlayer => ({ who: { slot }, where: { side, anchor, depth, backfield: false, onLine: false, inline: false, counts: true, attached: false, ...flags } });
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
// Empty: the step-1c draft also had a back, which made 12 men (this checker caught it).
const bunch: OffenseSnapDescription = {
  preset: { ns: 'formation', id: 'bunch_and_stack' }, line, qb: { depth: 4.5 },
  linemen: describeOffenseSnap(FORMATIONS[0], {}).linemen,
  players: [
    skill('Y', 'R', { kind: 'offset', y: inlineOf(line) }, 0.83, { onLine: true, inline: true, attached: true }),
    skill('Z', 'R', { kind: 'offset', y: inlineOf(line) + 2 }, 1.2),
    skill('F', 'R', { kind: 'offset', y: inlineOf(line) + 1 }, 2.0),
    skill('X', 'L', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 0.74, { onLine: true }),
    skill('H', 'L', { kind: 'share', share: 1, min: 5.5, room: { early: 11, late: 13.5 } }, 2.2),
  ],
};
// The 5-1 of step 1b (test/ir-align.test.ts), repeated here.
const gunDoubles = alignOffense(FORMATIONS.find((x) => x.id === 'gun_doubles_11')!, false, LOS, CENTER_Y);
const nickel = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
function fiveOne(): DefenseDescription {
  const base = describeDefense({ personnel: 'nickel', front: FRONTS.find((x) => x.id === 'over')!, coverage: COVERAGES.find((c) => c.id === 'cover3')!, pressure: null, label: '' });
  const where: Partial<Record<DefSlot, { tech: '0' | '2' | '5' | '9'; side: 'S' | 'W'; depth: number }>> = {
    DE_S: { tech: '5', side: 'S', depth: 0.9 }, DT_S: { tech: '2', side: 'S', depth: 0.9 }, DT_W: { tech: '2', side: 'W', depth: 0.9 },
    DE_W: { tech: '5', side: 'W', depth: 0.9 }, LB_W: { tech: '9', side: 'W', depth: 1.0 }, LB_M: { tech: '0', side: 'S', depth: 4.5 },
  };
  return {
    ...base,
    players: base.players.map((p) => ({ who: p.who, ...(where[p.who.slot] ? { where: where[p.who.slot] } : {}), what: { coverage: p.what.coverage } })),
    alignment: { subPackage: true, frontRules: [], secondLevel: { 1: [[0, 4.5]] } },
    front: { ...base.front, preset: { ns: 'front', id: 'five_one_described' }, name: '5-1 (described)', offField: { slots: {}, fits: {} } },
  };
}
const defense = (d: DefenseDescription, off = gunDoubles, present = nickel) => checkDefense(d, alignDefenseFromDescription(d, off, present), off);

describe('legality and accounting check', () => {
  it('the catalog: every formation x play context; every formation x front x personnel x coverage, and the pressures', () => {
    const o = tally(); let no = 0;
    for (const f of FORMATIONS) for (const [name, ctx] of CTXS) {
      const d = describeOffenseSnap(f, ctx), routes = ctx.pass ? describePass(ctx.pass).routes : [];
      o.add(`${f.id} ${name}`, offense(d, routes)); no++;
    }
    o.print('offense', no);
    const t = tally(), ignored = new Set<string>(); let n = 0;
    const one = (label: string, call: Parameters<typeof describeDefense>[0], off: typeof gunDoubles) => {
      const d = describeDefense(call), present = Object.keys(DEF_PERSONNEL[call.personnel]) as DefSlot[];
      let xs: Issue[];
      try { xs = checkDefense(d, alignDefenseFromDescription(d, off, present), off); } catch (e) { xs = [{ level: 'error', kind: 'throws', detail: String((e as Error).message) }]; }
      if (xs.some((x) => x.kind === 'front-spot-ignored')) ignored.add(`${call.front.id}×${call.personnel}`);
      t.add(label, xs); n++;
    };
    for (const f of FORMATIONS) {
      const off = alignOffense(f, false, LOS, CENTER_Y);
      for (const front of FRONTS) for (const personnel of front.personnel) for (const coverage of COVERAGES)
        one(`${f.id} ${front.id} ${personnel} ${coverage.id}`, { personnel, front, coverage, pressure: null, label: '' }, off);
    }
    for (const fid of ['gun_doubles_11', 'gun_trips_11']) {
      const off = alignOffense(FORMATIONS.find((x) => x.id === fid)!, false, LOS, CENTER_Y);
      for (const pressure of PRESSURES) for (const coverage of COVERAGES.filter((c) => fits(pressure, c))) for (const front of FRONTS) for (const personnel of front.personnel)
        one(`${fid} ${pressure.id} ${coverage.id} ${front.id} ${personnel}`, { personnel, front, coverage, pressure, label: '' }, off);
    }
    t.print('defense', n);
    console.log(`ir check: front x personnel pairs whose spots are ignored: ${ignored.size}: ${[...ignored].sort().join(', ')}`);
    expect(ignored.size).toBe(8);
  });

  it('the hand-written descriptions have no errors', () => {
    for (const [name, xs] of [['tackle over', offense(unbalanced)], ['bunch+stack', offense(bunch, allRoutes(bunch))], ['5-1', defense(fiveOne())]] as const) {
      console.log(`ir check: ${name}: ${xs.length ? xs.map((x) => `${x.level} ${x.kind}: ${x.detail}`).join('; ') : 'clean'}`);
      expect(errors(xs), name).toEqual([]);
    }
  });

  it('one illegal description per error kind is caught', () => {
    const put = (d: OffenseSnapDescription, slot: string, f: (p: SkillPlayer) => SkillPlayer) => ({ ...d, players: d.players.map((p) => (p.who.slot === slot ? f(p) : p)) });
    const where = (p: SkillPlayer, w: Partial<SkillPlayer['where']>) => ({ ...p, where: { ...p.where, ...w } });
    const noBacks = describeOffenseSnap(FORMATIONS.find((f) => f.id === 'gun_spread_10')!, { kind: 'run', run: { scheme: 'splitZone', direction: 'strong' } });
    const cases: Array<[string, Issue[]]> = [
      ['offense-count', offense({ ...bunch, players: bunch.players.filter((p) => p.who.slot !== 'H') })],
      ['line-count', offense(put(bunch, 'X', (p) => where(p, { onLine: false, depth: 1.2 })))],
      ['backs-count', offense({ ...bunch, players: [...bunch.players, skill('RB', 'C', { kind: 'offset', y: 0 }, 6.5, { backfield: true, counts: false })] })],
      ['end-ineligible', offense(put(bunch, 'X', (p) => ({ ...p, who: { ...p.who, eligible: false } })))],
      ['covered-route', offense(put(bunch, 'Z', (p) => where(p, { onLine: true, depth: 0.74 })), allRoutes(bunch))],
      ['motion-count', offense({ ...bunch, motion: [{ slot: 'Z', toward: 'parallel' }, { slot: 'H', toward: 'away' }] })],
      ['motion-forward', offense({ ...bunch, motion: [{ slot: 'H', toward: 'line' }] })],
      ['overlap', offense(put(bunch, 'F', (p) => where(p, { side: 'C', anchor: { kind: 'offset', y: 0 }, depth: 4.5, backfield: true })))],
      ['structural:receiver', offense({ ...bunch, requires: [{ kind: 'receiver', ref: 'W4' }] })],
      ['structural:slicer', offense(noBacks)],
      ['defense-count', defense({ ...fiveOne(), players: fiveOne().players.slice(1) })],
      ['neutral-zone', defense({ ...fiveOne(), players: fiveOne().players.map((p) => (p.who.slot === 'DE_S' ? { ...p, where: { ...p.where!, depth: 0.1 } } : p)) })],
      ['overlap', defense({ ...fiveOne(), players: fiveOne().players.map((p) => (p.who.slot === 'DT_W' ? { ...p, where: { tech: '2', side: 'S', depth: 0.9 } } : p)) })],
      ['structural:stem', defense({ ...fiveOne(), call: { ...fiveOne().call, frontStem: { from: FRONTS.find((f) => !f.personnel.includes('nickel'))!, secondsBeforeSnap: 1 } } })],
      ['structural:creep', defense({ ...fiveOne(), call: { ...fiveOne().call, creep: { slot: 'LB_M', secondsBeforeSnap: 1 } } })],
      ['structural:presnap-time', defense({ ...fiveOne(), call: { ...fiveOne().call, creep: { slot: 'LB_M', secondsBeforeSnap: 5 } } })],
    ];
    {
      const d = fiveOne(), a = alignDefenseFromDescription(d, gunDoubles, nickel); delete a.spots.FS;
      cases.push(['unaligned', checkDefense(d, a, gunDoubles)]);
    }
    for (const [kind, xs] of cases) {
      console.log(`ir check: control ${kind}: ${errors(xs).map((x) => `${x.kind}: ${x.detail}`).join('; ')}`);
      expect(kinds(errors(xs)).has(kind), kind).toBe(true);
    }
  });
});
