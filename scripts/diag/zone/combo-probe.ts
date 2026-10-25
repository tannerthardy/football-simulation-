/** Stretch doubles on native inputs: is the pair ever joined (both members
 * engaged on the down defender), and on each joined read, which keeper gate
 * holds (chest angle, support, loaded hands, control), whether the climber's
 * own read of the surface agrees, and when (if) it releases. Observation only.
 * node --import tsx scripts/diag/zone/combo-probe.ts [runs=wz_strong,oz_strong]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { contactControl } from '../../../src/sim/engagement.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import type { Agent } from '../../../src/sim/agent.js';

const runs = (process.argv[2] ?? 'wz_strong,oz_strong').split(',');
const chest = (a: Agent, d: Agent) => { const to = Math.atan2(d.pos.y - a.pos.y, d.pos.x - a.pos.x);
  return Math.abs(Math.atan2(Math.sin(to - a.facing), Math.cos(to - a.facing))) / (Math.PI / 2); };
const totals: Record<string, number> = {};
const bump = (k: string) => { totals[k] = (totals[k] ?? 0) + 1; };
for (const run of runs) for (const [o, d] of [[31, 32], [41, 42], [51, 52]]) for (const front of ['over', 'under']) for (const flip of [false, true]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const combos = new Set(sim.offense.flatMap((a) => a.behavior instanceof RunBlocker && a.behavior.plan.combination ? [a.behavior.plan.combination] : []));
  const info = [...combos].map((c) => ({ c, joinedAt: null as number | null, releasedAt: null as number | null, reads: 0, why: {} as Record<string, number>, firstContact: null as number | null }));
  while (sim.phase === 'live' && sim.t < 3.5) {
    (sim as unknown as { tick(): void }).tick();
    const fc = sim.events.find((ev) => ['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle'].includes(ev.type));
    for (const x of info) {
      if (fc && x.firstContact === null) x.firstContact = fc.t;
      const c = x.c, e = c.defender.engagement;
      const joined = !!e && c.members.every((m) => m.engagement === e);
      if (joined && x.joinedAt === null) x.joinedAt = sim.t;
      if (c.released && x.releasedAt === null) x.releasedAt = sim.t;
      if (!joined || c.released || x.firstContact !== null) continue;
      if (Math.abs(sim.t * 20 - Math.round(sim.t * 20)) > 1e-6 || Math.round(sim.t * 20) % 5) continue; // every 0.25 s
      x.reads++;
      for (const keeper of c.members) {
        const hands = keeper === e!.blocker ? e!.hands : e!.helperHands?.get(keeper);
        const base = keeper.body.support ? availability(keeper.body.support, supportParams(keeper.profile), fatigueFactor(keeper.body.energy)) : 1;
        const loaded = !!hands && Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 1e-6;
        const control = contactControl(e!, keeper);
        const fails = [chest(keeper, c.defender) >= .65 ? 'chest' : '', base <= .6 ? 'support' : '', !hands ? 'no hands' : !loaded ? 'unloaded' : '',
          control === null || control <= -.12 ? 'control' : ''].filter(Boolean);
        const k = fails.length ? fails.join('+') : 'eligible';
        x.why[k] = (x.why[k] ?? 0) + 1; bump(k);
      }
    }
  }
  for (const x of info) {
    const name = `${run} ${o}/${d} ${front}${flip ? ' flip' : ''}`.padEnd(26);
    const f = (v: number | null) => v === null ? '  -  ' : v.toFixed(2);
    console.log(`${name} ${x.c.members.map((m) => m.slot).join('+').padEnd(6)} on ${x.c.defender.slot.padEnd(5)} backer ${(x.c.backer?.slot ?? 'none').padEnd(5)} joined ${f(x.joinedAt)} released ${f(x.releasedAt)} first contact ${f(x.firstContact)} | keeper gates per member-read: ${JSON.stringify(x.why)}`);
    bump(x.joinedAt === null ? 'never joined' : x.releasedAt === null ? 'joined, never released' : 'released');
  }
}
console.log('\ntotals', JSON.stringify(totals));
