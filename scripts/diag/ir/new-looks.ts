/** Step 4: new looks given only as descriptions, run in the sim (16 seeds each), with the legality check first.
 *   npx tsx scripts/diag/ir/new-looks.ts
 * Reports per case: checker output; throws or NaN; the defense's run-fit jobs (FIT_RULES) on seed 1; each player's
 * behaviour on seed 1; mean yards and outcomes; on runs, defenders never touched by a blocker before the tackle, and
 * who made first contact. */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { BASE_LINE, inlineOf, olDepth, tackleOf } from '../../../src/playbook/alignment.js';
import { PASS_BY_ID, PASS_CONCEPTS, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { alignDefenseFromDescription } from '../../../src/playbook/ir/align.js';
import { checkDefense, checkOffense } from '../../../src/playbook/ir/check.js';
import { describeDefense, describePass } from '../../../src/playbook/ir/describe.js';
import { callOfDescription, formationOfSnap } from '../../../src/playbook/ir/entry.js';
import { alignOffenseFromSnap, describeOffenseSnap, type OffenseSnapDescription, type SkillPlayer } from '../../../src/playbook/ir/offense.js';
import type { DefenseDescription } from '../../../src/playbook/ir/types.js';
import { alignOffense } from '../../../src/playbook/alignment.js';
import { conceptFits } from '../../../src/game/concept-fit.js';
import { DEF_PERSONNEL, type DefensivePlayCall, type DefSlot, type OffensivePlayCall, type PersonnelId, type ReceiverRef } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const N = Number(process.env.N ?? 16), LOS = 35, BALL = CENTER_Y;
const rng = new Rng(404);
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 }), away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });

// Hand-written descriptions (steps 1b and 1c), repeated here.
const line = BASE_LINE, T = tackleOf(line), dep = olDepth({});
const skill = (slot: SkillPlayer['who']['slot'], side: 'L' | 'R' | 'C', anchor: SkillPlayer['where']['anchor'], depth: number,
  flags: Partial<SkillPlayer['where']> = {}): SkillPlayer => ({ who: { slot }, where: { side, anchor, depth, backfield: false, onLine: false, inline: false, counts: true, attached: false, ...flags } });
const tackleOver: OffenseSnapDescription = {
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
// Bunch right off an attached Y, stack left; F->H and H->RB so 11 personnel fields the bodies (empty backfield).
const bunch: OffenseSnapDescription = {
  preset: { ns: 'formation', id: 'bunch_and_stack' }, line, qb: { depth: 4.5 },
  linemen: describeOffenseSnap(FORMATION_BY_ID.gun_doubles_11, {}).linemen,
  players: [
    skill('Y', 'R', { kind: 'offset', y: inlineOf(line) }, 0.83, { onLine: true, inline: true, attached: true }),
    skill('Z', 'R', { kind: 'offset', y: inlineOf(line) + 2 }, 1.2),
    skill('H', 'R', { kind: 'offset', y: inlineOf(line) + 1 }, 2.0),
    skill('X', 'L', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 0.74, { onLine: true }),
    skill('RB', 'L', { kind: 'share', share: 1, min: 5.5, room: { early: 11, late: 13.5 } }, 2.2),
  ],
};
function fiveOne(): DefenseDescription {
  const base = describeDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '5-1' });
  const where: Partial<Record<DefSlot, { tech: '0' | '2' | '5' | '9'; side: 'S' | 'W'; depth: number }>> = {
    DE_S: { tech: '5', side: 'S', depth: 0.9 }, DT_S: { tech: '2', side: 'S', depth: 0.9 }, DT_W: { tech: '2', side: 'W', depth: 0.9 },
    DE_W: { tech: '5', side: 'W', depth: 0.9 }, LB_W: { tech: '9', side: 'W', depth: 1.0 }, LB_M: { tech: '0', side: 'S', depth: 4.5 },
  };
  return { ...base, players: base.players.map((p) => ({ who: p.who, ...(where[p.who.slot] ? { where: where[p.who.slot] } : {}), what: { coverage: p.what.coverage } })),
    alignment: { subPackage: true, frontRules: [], secondLevel: { 1: [[0, 4.5]] } },
    front: { ...base.front, preset: { ns: 'front', id: 'five_one_described' }, name: '5-1 (described)', offField: { slots: {}, fits: {} } } };
}
const job = (j: any) => (j ? `${j.kind}:${j.gap}${j.side > 0 ? '+' : '-'}${j.inside ? `(${j.inside.gap})` : ''}` : 'NONE');

type Case = { id: string; offCall: OffensivePlayCall; offDesc?: OffenseSnapDescription; personnel: PersonnelId; defCall: DefensivePlayCall; defDesc?: DefenseDescription };
function cases(): Case[] {
  const gd = FORMATION_BY_ID.gun_doubles_11, five = fiveOne(), fiveCall = callOfDescription(five);
  const over = { personnel: 'base43' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over cover3' };
  const c3 = { personnel: 'nickel' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over nickel cover3' };
  // (b) the heavy side: the side with both tackles (negative y as described); the run's direction relative to strength.
  const to = alignOffenseFromSnap(tackleOver, false, LOS, BALL), heavy = -1;
  const iz = { ...RUN_BY_ID.iz_strong, direction: (to.strongSign === heavy ? 'strong' : 'weak') as 'strong' | 'weak' };
  // (c) a catalog pass concept whose read the bunch + stack field supports.
  const bo = alignOffenseFromSnap(bunch, false, LOS, BALL), refs = new Set((Object.keys(bo.numbering) as ReceiverRef[]).filter((r) => bo.numbering[r]));
  const pass = PASS_BY_ID.stick && conceptFits(PASS_BY_ID.stick, refs) ? PASS_BY_ID.stick : PASS_CONCEPTS.find((c) => c.family === 'quick' && conceptFits(c, refs))!;
  return [
    { id: '(a1) 5-1 nickel vs gun doubles, inside zone', offCall: { formation: gd, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' }, personnel: '11', defCall: fiveCall, defDesc: five },
    { id: '(a2) 5-1 nickel vs gun doubles, slant-flat', offCall: { formation: gd, flip: false, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: 'slant-flat' }, personnel: '11', defCall: fiveCall, defDesc: five },
    { id: `(b) tackle over, inside zone to the heavy side (${iz.direction}) vs Over base`, offCall: { formation: formationOfSnap(tackleOver, '12'), flip: false, kind: 'run', run: iz, label: 'IZ heavy' }, offDesc: tackleOver, personnel: '12', defCall: over },
    { id: `(c) bunch + stack, ${pass.id} vs Over nickel cover 3`, offCall: { formation: formationOfSnap(bunch, '11'), flip: false, kind: 'pass', pass, label: pass.id }, offDesc: bunch, personnel: '11', defCall: c3 },
  ];
}

for (const c of cases()) {
  console.log(`\n${c.id}`);
  const off = c.offDesc ? alignOffenseFromSnap(c.offDesc, false, LOS, BALL) : alignOffense(c.offCall.formation, false, LOS, BALL, { kind: c.offCall.kind, pass: c.offCall.pass, run: c.offCall.run });
  const routes = c.offCall.pass ? describePass(c.offCall.pass).routes : [];
  const offIssues = c.offDesc ? checkOffense(c.offDesc, off, routes) : checkOffense(describeOffenseSnap(c.offCall.formation, { kind: c.offCall.kind, pass: c.offCall.pass, run: c.offCall.run }), off, routes);
  const dd = c.defDesc ?? describeDefense(c.defCall), present = Object.keys(DEF_PERSONNEL[c.defCall.personnel]) as DefSlot[];
  const defIssues = checkDefense(dd, alignDefenseFromDescription(dd, off, present), off);
  console.log(`  check: ${[...offIssues, ...defIssues].map((x) => `${x.level} ${x.kind}: ${x.detail}`).join('; ') || 'clean'}`);
  const offense = pickOffense(home, c.personnel), defense = pickDefense(away, c.defCall.personnel);
  let yards = 0, throws = 0, nan = 0; const outcomes = new Map<string, number>(), first = new Map<string, number>(), untouched = new Map<string, number>(), targets = new Map<string, number>();
  const seeds = new Rng(99);
  for (let i = 0; i < N; i++) {
    let sim: PlaySim;
    try {
      sim = new PlaySim({ offense, defense, offCall: c.offCall, defCall: c.defCall, offDesc: c.offDesc, defDesc: c.defDesc, los: LOS, ballY: BALL, firstDownX: LOS + 10, seed: seeds.nextU32() });
      if (i === 0) {
        console.log(`  defense jobs: ${sim.defense.map((a) => `${a.slot} ${job(a.runFit)}`).join(', ')}`);
        console.log(`  offense behaviours: ${sim.offense.map((a) => `${a.slot}:${a.behavior?.kind ?? 'none'}`).join(', ')}`);
        console.log(`  defense behaviours: ${sim.defense.map((a) => `${a.slot}:${a.behavior?.kind ?? 'none'}`).join(', ')}`);
      }
      const r = sim.run();
      if (sim.agents.some((a) => !Number.isFinite(a.pos.x) || !Number.isFinite(a.pos.y))) nan++;
      yards += r.yards; outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + 1);
      const fc = r.events.find((e) => e.type === 'carrier_contact' && e.b !== undefined && sim.agents[e.b]?.team === 'D');
      const fs = fc ? sim.agents[fc.b!].slot : 'none'; first.set(fs, (first.get(fs) ?? 0) + 1);
      if (c.offCall.kind === 'run') {
        const end = fc?.t ?? Infinity;
        const touched = new Set(r.events.filter((e) => e.type === 'block_contact' && e.t <= end && e.b !== undefined).map((e) => sim.agents[e.b!].slot));
        for (const d of sim.defense) if (!touched.has(d.slot) && Math.abs(sim.defAlign.spots[d.slot as DefSlot]!.pos.y - BALL) < 7 && sim.defAlign.spots[d.slot as DefSlot]!.pos.x - LOS < 6)
          untouched.set(d.slot, (untouched.get(d.slot) ?? 0) + 1);
      } else if (r.stats.target) { const t = sim.agents.find((a) => a.player.id === r.stats.target)?.slot ?? '?'; targets.set(t, (targets.get(t) ?? 0) + 1); }
    } catch (e) { throws++; if (throws === 1) console.log(`  THROW: ${(e as Error).message}`); }
  }
  const tally = (m: Map<string, number>) => [...m].sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`  plays ${N}, throws ${throws}, NaN ${nan}, mean ${(yards / Math.max(1, N - throws)).toFixed(2)} yd; outcomes ${tally(outcomes)}`);
  console.log(`  first contact: ${tally(first)}`);
  if (c.offCall.kind === 'run') console.log(`  box defenders never blocked before first contact (plays): ${tally(untouched)}`);
  else console.log(`  targets: ${tally(targets)}`);
}
