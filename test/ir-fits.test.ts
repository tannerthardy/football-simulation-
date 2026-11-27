/** Run-fit assignment as shared rules (step 3a; src/playbook/ir/fits.ts). The pure function, faithful mode, gives the
 * same jobs as today's `buildRunFits` (src/sim/run-fits.ts) across the catalog and its call variations, and on bodies
 * as a real play places them. The label-free mode's differences from it are printed. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { DefensiveCoordinator, OffensiveCoordinator, type Situation } from '../src/game/playcaller.js';
import { alignDefense, alignOffense, type DefenseAlignment, type OffenseAlignment } from '../src/playbook/alignment.js';
import { COVERAGES, FRONTS, PRESSURES } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { alignDefenseFromDescription } from '../src/playbook/ir/align.js';
import { describeDefense } from '../src/playbook/ir/describe.js';
import { runFitJobs } from '../src/playbook/ir/fits.js';
import { DEF_PERSONNEL, type Coverage, type DefSlot, type DefensivePlayCall, type Pressure } from '../src/playbook/types.js';
import { buildRunFits, faithfulRunFits, FIT_RULES, type RunFitJob } from '../src/sim/run-fits.js';
import { PlaySim } from '../src/sim/playsim.js';

const LOS = 40;
const fits = (p: Pressure, c: Coverage) => p.coverages.includes(c.id) || (!!c.family && p.coverages.includes(c.family));
/** today's buildRunFits on a stand-in for the sim: the bodies on their resolved spots, in the description's order. */
function today(call: DefensivePlayCall, a: DefenseAlignment, off: OffenseAlignment, order: DefSlot[]): Partial<Record<DefSlot, RunFitJob>> {
  const defense = order.filter((s) => a.spots[s]).map((slot, idx) => ({ slot, pos: a.spots[slot]!.pos, idx }));
  const sim = { defense, defAlign: a, defCall: call, offAlign: off, los: off.los, ballY: off.ballY, trace: {}, slot: (n: string) => defense.find((d) => d.slot === n) };
  const m = faithfulRunFits(sim as never);
  return Object.fromEntries([...m].map(([d, j]) => [(d as unknown as { slot: DefSlot }).slot, j]));
}
const short = (j: RunFitJob | undefined) => (j ? `${j.kind}:${j.gap}${j.side > 0 ? '+' : '-'}${j.inside ? `(${j.inside.gap}${j.inside.side > 0 ? '+' : '-'})` : ''}` : '-');

describe('run-fit assignment from the description', () => {
  it('faithful: equals buildRunFits across the catalog and its call variations; label-free differences printed', () => {
    let n = 0; const bad: string[] = []; const diff = new Map<string, number>(); let diffCalls = 0, unownedF = 0, unownedL = 0; const kindDiff = new Map<string, number>();
    const one = (label: string, call: DefensivePlayCall, off: OffenseAlignment) => {
      const desc = describeDefense(call), present = Object.keys(DEF_PERSONNEL[call.personnel]) as DefSlot[];
      const a = alignDefense(call, off, present), b = alignDefenseFromDescription(desc, off, present);
      const t = today(call, a, off, desc.players.map((p) => p.who.slot)), f = runFitJobs(desc, b, off), l = runFitJobs(desc, b, off, { labelFree: true });
      n++;
      try { expect(f.jobs).toEqual(t); } catch { bad.push(label); }
      if (f.unowned.length) unownedF++; if (l.unowned.length) unownedL++;
      let differs = false;
      for (const s of Object.keys(f.jobs) as DefSlot[]) if (short(f.jobs[s]) !== short(l.jobs[s])) {
        differs = true; const k = `${f.jobs[s]!.kind} -> ${l.jobs[s]!.kind}: ${call.front.id}/${call.personnel} ${s}`; diff.set(k, (diff.get(k) ?? 0) + 1);
        const g = `${f.jobs[s]!.kind} -> ${l.jobs[s]!.kind}`; kindDiff.set(g, (kindDiff.get(g) ?? 0) + 1);
      }
      if (differs) diffCalls++;
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
    // Call variations the playcaller adds: line games, gap exchanges, spill.
    const variants: Array<[string, Partial<DefensivePlayCall>]> = [
      ...(['angle', 'slant', 'pinch'] as const).flatMap((kind) => (['S', 'W'] as const).map((dir) => [`${kind} ${dir}`, { dlGame: { kind, dir } }] as [string, Partial<DefensivePlayCall>])),
      ['exchange S', { gapExchange: { edge: 'DE_S', backer: 'LB_S' } }], ['exchange W', { gapExchange: { edge: 'DE_W', backer: 'LB_W' } }],
      ['spill plug', { runPolicy: { edge: 'spill', linebacker: 'plug' } }],
    ];
    const cov = ['cover1', 'cover2', 'cover3', 'cover4', 'cover3_buzz', 'cover2man'].map((id) => COVERAGES.find((c) => c.id === id)!).filter(Boolean);
    for (const fid of ['gun_doubles_11', 'i_pro_21', 'ace_12', 'gun_trips_11']) {
      const off = alignOffense(FORMATIONS.find((x) => x.id === fid)!, false, LOS, CENTER_Y);
      for (const [vname, v] of variants) for (const front of FRONTS) for (const personnel of front.personnel) for (const coverage of cov)
        one(`${fid} ${vname} ${front.id} ${personnel} ${coverage.id}`, { personnel, front, coverage, pressure: null, label: '', ...v }, off);
    }
    console.log(`ir fits: calls ${n}, faithful unequal ${bad.length}${bad.length ? ': ' + bad.slice(0, 10).join('; ') : ''}`);
    console.log(`ir fits: calls with an unowned gap: faithful ${unownedF}, label-free ${unownedL}; calls where label-free differs ${diffCalls}`);
    console.log('ir fits: label-free differences by kind (player-calls): ' + [...kindDiff].sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join('; '));
    console.log('ir fits: label-free differences (count, front/personnel slot: faithful -> label-free):\n' + [...diff].sort((p, q) => q[1] - p[1]).slice(0, 45).map(([k, v]) => `  ${v} ${k}`).join('\n'));
    expect(bad).toEqual([]);
  });

  it('faithful: equals buildRunFits on the bodies as a real play places them', () => {
    const rng = new Rng(21), schemes = ['air-raid', 'spread', 'west-coast', 'wide-zone', 'power'];
    const sit = (r: Rng): Situation => ({ down: 1 + Math.floor(r.next() * 4), distance: [1, 2, 3, 5, 7, 10, 15][Math.floor(r.next() * 7)], yardline: 5 + Math.floor(r.next() * 90), quarter: 1 + Math.floor(r.next() * 4), clock: 900 * r.next(), scoreDiff: 0, ballY: CENTER_Y + [-6.2, 0, 6.2][Math.floor(r.next() * 3)], hurry: false });
    let n = 0; const bad: string[] = [];
    for (let t = 0; t < 4; t++) {
      const o = generateTeam(rng, `A${t}`, `A${t}`, { strength: 0.6 }), d = generateTeam(rng, `B${t}`, `B${t}`, { strength: 0.6 }); (o as { offScheme: string }).offScheme = schemes[t % 5];
      const oc = new OffensiveCoordinator(o, rng.fork(`oc${t}`)), dc = new DefensiveCoordinator(d, rng.fork(`dc${t}`));
      for (let i = 0; i < 15; i++) {
        const s = sit(rng), offCall = oc.call(s, d), offense = pickOffense(o, offCall.formation.personnel);
        const { call: defCall, prefs } = dc.call(s, offCall.formation.personnel, o, offense, offCall.formation);
        const los = 10 + s.yardline;
        const sim = new PlaySim({ offense, defense: pickDefense(d, defCall.personnel), offCall, defCall, los, ballY: s.ballY, firstDownX: los + s.distance, seed: rng.nextU32(), manPrefs: prefs, down: s.down });
        const t0 = Object.fromEntries([...faithfulRunFits(sim)].map(([a, j]) => [a.slot, j]));
        const desc = { ...describeDefense(sim.defCall), players: [] as ReturnType<typeof describeDefense>['players'] };
        const full = describeDefense(sim.defCall);
        desc.players = sim.defense.map((a) => full.players.find((p) => p.who.slot === a.slot)!).filter(Boolean);
        const pos = Object.fromEntries(sim.defense.map((a) => [a.slot, { ...a.pos }]));
        const f = runFitJobs(desc, sim.defAlign, sim.offAlign, { pos });
        n++;
        try { expect(f.jobs).toEqual(t0); } catch { bad.push(`${offCall.label} vs ${defCall.label}`); }
        // FIT_RULES (step 3c): the sim's jobs are the shared function's label-free jobs on the same bodies.
        const live = Object.fromEntries([...buildRunFits(sim)].map(([x, { rush: _rush, ...j }]) => [x.slot, j])); // FIT_REACH's rush lane is the sim's, not the shared jobs'
        try { expect(live).toEqual(FIT_RULES ? runFitJobs(desc, sim.defAlign, sim.offAlign, { pos, labelFree: true }).jobs : t0); } catch { bad.push(`wiring: ${offCall.label} vs ${defCall.label}`); }
      }
    }
    console.log(`ir fits: real plays ${n}, faithful unequal ${bad.length}${bad.length ? ': ' + bad.slice(0, 5).join('; ') : ''}`);
    expect(bad).toEqual([]);
  });
});
