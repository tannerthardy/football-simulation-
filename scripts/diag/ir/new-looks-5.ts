/** Step 5 new looks, before (develop) and after (this branch): run unchanged on both trees.
 *   npx tsx scripts/diag/ir/new-looks-5.ts
 * (1) bunch + stack, empty: roles none (no back, no outlet): who is the checkdown, where the ball goes.
 * (2) tackle over, inside zone to the heavy side: roles named in the description (carrier RB): how the covered tackle
 *     and the end man block (their first block contact and its target), yards.
 * (3) the 5-1 nickel through a stem (shown Over, 1.0 s) and a motion (Z across), inside zone: its shape at the snap
 *     (defenders within 2 yd of the line; the Will's and Mike's depth).
 * (4) a two-back set (I pro) where the second back (F) carries: roles { carrier: F, back: RB, outlet: RB }. */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { BASE_LINE, inlineOf, olDepth, tackleOf } from '../../../src/playbook/alignment.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { describeDefense } from '../../../src/playbook/ir/describe.js';
import { callOfDescription, formationOfSnap } from '../../../src/playbook/ir/entry.js';
import { alignOffenseFromSnap, describeOffenseSnap, type OffenseSnapDescription, type SkillPlayer } from '../../../src/playbook/ir/offense.js';
import type { DefenseDescription } from '../../../src/playbook/ir/types.js';
import type { DefSlot, DefensivePlayCall, OffensivePlayCall, PersonnelId } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const N = Number(process.env.N ?? 16), LOS = 35, BALL = CENTER_Y;
const rng = new Rng(404);
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 }), away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
const line = BASE_LINE, T = tackleOf(line), dep = olDepth({});
const skill = (slot: SkillPlayer['who']['slot'], side: 'L' | 'R' | 'C', anchor: SkillPlayer['where']['anchor'], depth: number,
  flags: Partial<SkillPlayer['where']> = {}): SkillPlayer => ({ who: { slot }, where: { side, anchor, depth, backfield: false, onLine: false, inline: false, counts: true, attached: false, ...flags } });
const tackleOver = {
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
  roles: { carrier: 'RB', back: 'RB', outlet: 'RB' },
} as OffenseSnapDescription;
const bunch = {
  preset: { ns: 'formation', id: 'bunch_and_stack' }, line, qb: { depth: 4.5 },
  linemen: describeOffenseSnap(FORMATION_BY_ID.gun_doubles_11, {}).linemen,
  players: [
    skill('Y', 'R', { kind: 'offset', y: inlineOf(line) }, 0.83, { onLine: true, inline: true, attached: true }),
    skill('Z', 'R', { kind: 'offset', y: inlineOf(line) + 2 }, 1.2),
    skill('H', 'R', { kind: 'offset', y: inlineOf(line) + 1 }, 2.0),
    skill('X', 'L', { kind: 'sideline', room: { early: 11, late: 13.5 } }, 0.74, { onLine: true }),
    skill('RB', 'L', { kind: 'share', share: 1, min: 5.5, room: { early: 11, late: 13.5 } }, 2.2),
  ],
  roles: {},
} as OffenseSnapDescription;
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
const tally = (m: Map<string, number>) => [...m].sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(', ');
type Case = { id: string; offCall: OffensivePlayCall; offDesc?: OffenseSnapDescription; personnel: PersonnelId; defCall: DefensivePlayCall; defDesc?: DefenseDescription; probe: string };
const five = fiveOne(), fiveCall = callOfDescription(five);
const to = alignOffenseFromSnap(tackleOver, false, LOS, BALL);
const izHeavy = { ...RUN_BY_ID.iz_strong, direction: (to.strongSign === -1 ? 'strong' : 'weak') as 'strong' | 'weak' };
const ipro = FORMATION_BY_ID.i_pro_21;
const iproDesc = { ...describeOffenseSnap(ipro, { kind: 'run', run: { scheme: 'insideZone', direction: 'strong' } }), roles: { carrier: 'F', back: 'RB', outlet: 'RB' } } as OffenseSnapDescription;
const over43 = { personnel: 'base43' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over cover3' };
const CASES: Case[] = [
  { id: '(1) bunch + stack (empty, no back, no outlet), stick vs Over nickel cover 3', offCall: { formation: formationOfSnap(bunch, '11'), flip: false, kind: 'pass', pass: PASS_BY_ID.stick, label: 'stick' }, offDesc: bunch, personnel: '11',
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' }, probe: 'pass' },
  { id: `(2) tackle over, inside zone to the heavy side (${izHeavy.direction}) vs Over base`, offCall: { formation: formationOfSnap(tackleOver, '12'), flip: false, kind: 'run', run: izHeavy, label: 'IZ heavy' }, offDesc: tackleOver, personnel: '12', defCall: over43, probe: 'line' },
  { id: '(3) 5-1 nickel through a stem (shown Over, 1.0 s) and Z across motion, inside zone, gun doubles', offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ', motion: { slot: 'Z', kind: 'across' } } as OffensivePlayCall, personnel: '11',
    defCall: { ...fiveCall, frontStem: { from: FRONT_BY_ID.over, secondsBeforeSnap: 1.0 } }, defDesc: five, probe: 'shape' },
  { id: '(4) I pro, inside zone, the second back (F) carries', offCall: { formation: ipro, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ F' }, offDesc: iproDesc, personnel: '21', defCall: over43, probe: 'carrier' },
];
for (const c of CASES) {
  console.log(`\n${c.id}`);
  const offense = pickOffense(home, c.personnel), defense = pickDefense(away, c.defCall.personnel);
  let yards = 0, throws = 0; const out = new Map<string, number>(), tgt = new Map<string, number>(), notes = new Map<string, number>();
  const seeds = new Rng(99);
  for (let i = 0; i < N; i++) {
    try {
      const sim = new PlaySim({ offense, defense, offCall: c.offCall, defCall: c.defCall, offDesc: c.offDesc, defDesc: c.defDesc, los: LOS, ballY: BALL, firstDownX: LOS + 10, seed: seeds.nextU32() });
      if (c.probe === 'shape') {
        const on = sim.defense.filter((d) => d.pos.x - sim.los < 2).length, w = sim.slot('LB_W')!, m = sim.slot('LB_M')!;
        const k = `on the line ${on}, Will ${(w.pos.x - sim.los).toFixed(1)} deep, Mike ${(m.pos.x - sim.los).toFixed(1)} deep`; notes.set(k, (notes.get(k) ?? 0) + 1);
      }
      const r = sim.run();
      yards += r.yards; out.set(r.outcome, (out.get(r.outcome) ?? 0) + 1);
      if (c.probe === 'pass' && r.stats.target) { const t = sim.agents.find((a) => a.player.id === r.stats.target)?.slot ?? '?'; tgt.set(t, (tgt.get(t) ?? 0) + 1); }
      if (c.probe === 'carrier') { const car = r.events.find((e) => e.type === 'carrier_contact'); const k = `carrier ${car?.a !== undefined ? sim.agents[car.a].slot : 'none'}`; notes.set(k, (notes.get(k) ?? 0) + 1); }
      if (c.probe === 'line') for (const s of ['RT', 'LT', 'LG']) {
        const e = r.events.find((x) => x.type === 'block_contact' && x.a !== undefined && sim.agents[x.a].slot === s);
        const k = `${s} first block: ${e?.b !== undefined ? sim.agents[e.b].slot : 'none'}`; notes.set(k, (notes.get(k) ?? 0) + 1);
      }
    } catch (e) { throws++; if (throws === 1) console.log(`  THROW: ${(e as Error).message}`); }
  }
  console.log(`  plays ${N}, throws ${throws}, mean ${(yards / Math.max(1, N - throws)).toFixed(2)} yd; outcomes ${tally(out)}`);
  if (tgt.size) console.log(`  targets: ${tally(tgt)}`);
  if (notes.size) console.log(`  ${tally(notes)}`);
}
